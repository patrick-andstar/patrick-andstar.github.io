/*
 * 在网页里直接运行代码块（P0：只读 + 一键运行）
 *
 * 用法：什么都不用写。普通 `` ```cpp `` 代码块会自动获得一个「运行」按钮。
 *
 * 后端：Judge0 CE 公共实例 https://ce.judge0.com
 *   - 免 API key，且实测 CORS 预检回显本站域名，静态站可直连
 *   - 代价：代码会离开浏览器发到第三方；共享实例，可用性不由我们控制
 *
 * 两个必须注意的实现点：
 *   1. 用 document$.subscribe() 而不是 DOMContentLoaded —— 本站开了
 *      navigation.instant，切页不会触发整页加载，只在 DOMContentLoaded 里
 *      绑事件会导致「从首页点进去」的页面没有运行按钮。
 *   2. 语言靠 div.highlight 上的 language-xxx 类识别，这依赖 mkdocs.yml 里
 *      pymdownx.highlight.pygments_lang_class = true；默认情况下 DOM 里
 *      完全看不出代码块是什么语言。
 */
(function () {
  'use strict';

  // language-xxx 里的 xxx -> Judge0 的 language_id（版本已实测）
  var LANGS = {
    cpp:        { id: 105, label: 'C++',    ver: 'GCC 14.1' },
    c:          { id: 103, label: 'C',      ver: 'GCC 14.1' },
    python:     { id: 113, label: 'Python', ver: '3.14' },
    py:         { id: 113, label: 'Python', ver: '3.14' },
    java:       { id: 91,  label: 'Java',   ver: 'JDK 17' },
    go:         { id: 107, label: 'Go',     ver: '1.23' },
    javascript: { id: 102, label: 'JS',     ver: 'Node 22' },
    js:         { id: 102, label: 'JS',     ver: 'Node 22' }
  };

  // 必须用 base64_encoded=true。
  // 用 false 时，只要代码里出现任何非 ASCII 字符（中文注释、中文输出），Judge0 会直接
  // 返回 400："some attributes for this submission cannot be converted to UTF-8"。
  // 纯英文的测试代码能过，所以这个问题很容易到写中文笔记时才炸出来。
  var API = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';
  var FETCH_TIMEOUT_MS = 40000;   // 实测往返约 4s，给足余量
  var MIN_GAP_MS = 1200;          // 全局最小请求间隔，避免用户连点把自己打成限流
  var MAX_CODE_BYTES = 60 * 1024; // 太大的别发，Judge0 也不收

  var lastRunAt = 0;
  var running = false;

  // UTF-8 安全的 base64。直接 btoa(str) 在非 Latin-1 字符上会抛
  // InvalidCharacterError，所以先过一遍 TextEncoder。
  function b64Encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64Decode(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // 响应里这几个字段是 base64 的，解码后再展示
  var B64_FIELDS = ['stdout', 'stderr', 'compile_output', 'message'];

  // Judge0 状态码 -> 展示文案。id=3 是「正常退出」，但在“运行”语境下
  // 叫「运行完成」比叫「Accepted」更准确（我们不是在判题）。
  function statusText(st) {
    var table = {
      1:  '排队中',
      2:  '执行中',
      3:  '运行完成',
      4:  '答案错误',
      5:  '超时',
      6:  '编译错误',
      7:  '运行错误（段错误）',
      8:  '运行错误（超出输出限制）',
      9:  '运行错误（浮点异常）',
      10: '运行错误（中止）',
      11: '运行错误（非零退出）',
      12: '运行错误',
      13: '内部错误',
      14: '可执行格式错误'
    };
    return (st && table[st.id]) || (st && st.description) || '未知状态';
  }

  function statusKind(st) {
    if (!st) return 'err';
    if (st.id === 3) return 'ok';
    if (st.id === 1 || st.id === 2) return 'run';
    return 'err';
  }

  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function langOf(div) {
    var m = /(?:^|\s)language-([\w+#-]+)/.exec(div.className);
    return m ? m[1].toLowerCase() : null;
  }

  function codeOf(div) {
    var code = div.querySelector('pre code');
    return code ? code.textContent : '';
  }

  // ---- 渲染结果 ----------------------------------------------------------
  function render(panel, res, judgeLang) {
    panel.innerHTML = '';

    // 先把 base64 字段解回来，后面统一当普通字符串用
    for (var k = 0; k < B64_FIELDS.length; k++) {
      var f = B64_FIELDS[k];
      if (res[f]) {
        try {
          res[f] = b64Decode(res[f]);
        } catch (e) {
          res[f] = '（输出解码失败：' + ((e && e.message) || e) + '）';
        }
      }
    }

    panel.hidden = false;

    var st = res.status || null;
    var kind = statusKind(st);

    var bar = h('div', 'rc-bar');
    bar.appendChild(h('span', 'rc-badge rc-badge--' + kind, statusText(st)));
    bar.appendChild(h('span', 'rc-lang', judgeLang.label + ' · ' + judgeLang.ver));
    if (res.time != null) bar.appendChild(h('span', 'rc-meta', res.time + ' s'));
    if (res.memory != null) bar.appendChild(h('span', 'rc-meta', res.memory + ' KB'));
    panel.appendChild(bar);

    // 编译错误优先展示 compile_output，它才是真正有用的信息
    var blocks = [
      ['编译输出', res.compile_output],
      ['标准输出', res.stdout],
      ['标准错误', res.stderr],
      ['信息', res.message]
    ];
    var shown = 0;
    for (var i = 0; i < blocks.length; i++) {
      var name = blocks[i][0], body = blocks[i][1];
      if (body == null || body === '') continue;
      panel.appendChild(h('div', 'rc-label', name));
      panel.appendChild(h('pre', 'rc-pre', body));
      shown++;
      // 编译错误时底下的运行输出没有意义，不再往下铺
      if (name === '编译输出') break;
    }
    if (shown === 0) {
      panel.appendChild(h('div', 'rc-label', '（无输出）'));
    }
  }

  function renderError(panel, msg, hint) {
    panel.innerHTML = '';
    panel.hidden = false;
    var bar = h('div', 'rc-bar');
    bar.appendChild(h('span', 'rc-badge rc-badge--err', msg));
    panel.appendChild(bar);
    if (hint) panel.appendChild(h('div', 'rc-label', hint));
  }

  // ---- 发请求 ------------------------------------------------------------
  function run(div, btn, panel) {
    var langKey = langOf(div);
    var judgeLang = LANGS[langKey];
    if (!judgeLang) return;

    var code = codeOf(div);
    if (!code.trim()) return;
    if (code.length > MAX_CODE_BYTES) {
      renderError(panel, '代码过大', '超过 ' + Math.round(MAX_CODE_BYTES / 1024) + ' KB，未提交运行。');
      return;
    }

    var now = Date.now();
    if (running || now - lastRunAt < MIN_GAP_MS) return;
    running = true;
    lastRunAt = now;

    btn.disabled = true;
    btn.classList.add('rc-btn--busy');
    btn.textContent = '运行中…';
    panel.hidden = false;
    panel.innerHTML = '';
    panel.appendChild(h('div', 'rc-bar')).appendChild(
      h('span', 'rc-badge rc-badge--run', '已提交，等待结果…')
    );

    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, FETCH_TIMEOUT_MS);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id: judgeLang.id,
        source_code: b64Encode(code),
        stdin: b64Encode('')
      }),
      signal: ctl.signal
    })
      .then(function (r) {
        if (!r.ok) {
          // 把服务端给的具体原因带出来，否则只剩一个 400 无从下手
          return r.json().catch(function () { return null; }).then(function (body) {
            var err = new Error('HTTP:' + r.status);
            err.detail = (body && (body.error || body.message)) || '';
            throw err;
          });
        }
        return r.json();
      })
      .then(function (res) {
        render(panel, res, judgeLang);
      })
      .catch(function (e) {
        var name = (e && e.name) || '';
        var msg = (e && e.message) || '';
        var detail = (e && e.detail) || '';
        if (name === 'AbortError') {
          renderError(panel, '请求超时', '判题服务 ' + (FETCH_TIMEOUT_MS / 1000) + ' 秒未响应，稍后重试。');
        } else if (msg.indexOf('HTTP:429') === 0) {
          renderError(panel, '请求过于频繁', '判题服务限流了，等几秒再试。');
        } else if (msg.indexOf('HTTP:') === 0) {
          renderError(panel, '判题服务异常',
            '返回 ' + msg.slice(5) + (detail ? '：' + detail : '，这通常是公共实例临时不可用。'));
        } else {
          renderError(panel, '无法连接判题服务', '检查网络或代理设置。代码没有被执行。');
        }
      })
      .then(function () {
        clearTimeout(timer);
        running = false;
        btn.disabled = false;
        btn.classList.remove('rc-btn--busy');
        btn.textContent = '运行';
      });
  }

  // ---- 注入 UI -----------------------------------------------------------
  function enhance(div) {
    if (div.dataset.rcReady === '1') return;
    var langKey = langOf(div);
    if (!langKey || !LANGS[langKey]) return;
    div.dataset.rcReady = '1';
    div.classList.add('rc-host');

    var btn = h('button', 'rc-btn');
    btn.type = 'button';
    btn.textContent = '运行';
    btn.title = '在 ' + LANGS[langKey].label + ' (' + LANGS[langKey].ver + ') 上运行这段代码';
    btn.setAttribute('aria-label', btn.title);
    div.appendChild(btn);

    var panel = h('div', 'rc-out');
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');

    // 输出面板放在代码块外面，别被 highlight 的定位和样式影响
    div.parentNode.insertBefore(panel, div.nextSibling);

    btn.addEventListener('click', function () { run(div, btn, panel); });
  }

  function init() {
    var list = document.querySelectorAll('div.highlight');
    for (var i = 0; i < list.length; i++) enhance(list[i]);
  }

  // 两条路都挂，因为 extra_javascript 与 Material 自己 bundle 的加载顺序不保证：
  //   - DOMContentLoaded 兜住「document$ 还没定义」的情况
  //   - document$ 兜住 navigation.instant 的切页（不触发整页加载）
  // init() 靠 dataset.rcReady 幂等，重复调用无副作用，所以这样双挂是安全的。
  document.addEventListener('DOMContentLoaded', init);

  var hooked = false;
  function hook() {
    if (hooked) return true;
    if (typeof document$ === 'undefined' || !document$.subscribe) return false;
    hooked = true;
    document$.subscribe(init);
    return true;
  }

  hook();
  var tries = 0;
  var timer = setInterval(function () {
    if (hook() || ++tries > 60) clearInterval(timer);
  }, 100);
})();
