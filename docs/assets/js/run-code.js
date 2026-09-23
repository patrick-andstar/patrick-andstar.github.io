/*
 * 在网页里直接运行 / 编辑代码块（P1）
 *
 * 用法：什么都不用写。普通 `` ```cpp `` 代码块会自动长出一条工具栏：
 *     [编辑] [运行]                    运行的是笔记里的原始代码
 *     [还原] [收起] [运行]              编辑过之后，「还原」才出现
 *
 * 后端：Judge0 CE 公共实例 https://ce.judge0.com
 *   - 免 API key，实测 CORS 预检回显本站域名，静态站可以直连，不需要任何代理服务
 *   - 实测往返 2.5~8.3 s（中位 ≈4 s，波动纯粹来自排队），所以加载态是必须的
 *   - 代价：代码会离开浏览器发到第三方；共享实例，可用性不由我们控制
 *
 * 编辑器：CodeMirror 6，从 esm.sh 动态 import —— **点「编辑」才拉**，首屏不受影响。
 *   - 不持久化：改完刷新回原文。这是刻意的：静态站上「改了却存不下来」比
 *     「改了就是临时的」更让人困惑。想留住改动就改 md 文件。
 *   - CDN 拉不到时会降级：编辑按钮报错，但「运行」照常可用。
 *
 * 四个必须注意的实现点（都踩过，别绕回去）：
 *   1. 用 document$.subscribe() 而不是只挂 DOMContentLoaded —— 本站开了
 *      navigation.instant，切页不触发整页加载，只挂后者的话「从首页点进去」
 *      的页面没有工具栏。
 *   2. 语言靠 div.highlight 上的 language-xxx 类识别，依赖 mkdocs.yml 里
 *      pymdownx.highlight.pygments_lang_class = true；默认 DOM 里完全看不出
 *      代码块是什么语言。
 *   3. 提交给 Judge0 必须 base64_encoded=true，原因见 API 常量处。
 *   4. basicSetup 与语言包**必须共享同一份 @codemirror/state**，否则
 *      new EditorView({extensions:[basicSetup, cpp()]}) 会抛
 *      "Unrecognized extension value in extension set"。实测 esm.sh 对 ^6
 *      依赖解析到同一个模块 URL，天然去重，混用没问题。
 */
(function () {
  'use strict';

  // ---- 语言表 ------------------------------------------------------------

  // language-xxx 里的 xxx -> Judge0。
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

  // language-xxx 里的 xxx -> CodeMirror 语言包。
  // 只能覆盖 LANGS 里的子集：没有语言包的（比如将来加 C#）只给「运行」不给「编辑」。
  var CM_CDN = 'https://esm.sh/';
  var CM_CORE = CM_CDN + 'codemirror@6.0.1';
  var CM_LANGUAGE = CM_CDN + '@codemirror/language@6';       // HighlightStyle / syntaxHighlighting / indentUnit
  var CM_AUTOCOMPLETE = CM_CDN + '@codemirror/autocomplete@6';
  var CM_TAGS = CM_CDN + '@lezer/highlight@1';               // tags；@codemirror/language 不再导出它

  var CM_LANG = {
    cpp:        { url: CM_CDN + '@codemirror/lang-cpp@6',        fn: 'cpp' },
    c:          { url: CM_CDN + '@codemirror/lang-cpp@6',        fn: 'cpp' },
    python:     { url: CM_CDN + '@codemirror/lang-python@6',     fn: 'python' },
    py:         { url: CM_CDN + '@codemirror/lang-python@6',     fn: 'python' },
    javascript: { url: CM_CDN + '@codemirror/lang-javascript@6', fn: 'javascript' },
    js:         { url: CM_CDN + '@codemirror/lang-javascript@6', fn: 'javascript' },
    java:       { url: CM_CDN + '@codemirror/lang-java@6',       fn: 'java' },
    go:         { url: CM_CDN + '@codemirror/lang-go@6',         fn: 'go' }
  };

  // ---- 常量 --------------------------------------------------------------

  // 必须用 base64_encoded=true。
  // 用 false 时，只要代码里出现任何非 ASCII 字符（中文注释、中文输出），Judge0 会直接
  // 返回 400："some attributes for this submission cannot be converted to UTF-8"。
  // 纯英文的测试代码能过，所以这个问题很容易到写中文笔记时才炸出来。
  var API = 'https://ce.judge0.com/submissions?base64_encoded=true&wait=true';
  var FETCH_TIMEOUT_MS = 40000;    // 实测中位 4s、最慢 8.3s，给足余量
  var MIN_GAP_MS = 1200;           // 全局最小请求间隔，避免连点把自己打成限流
  var MAX_CODE_BYTES = 60 * 1024;  // 太大的别发

  var lastRunAt = 0;
  var running = false;

  // ---- 小工具 ------------------------------------------------------------

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

  // Pygments 会在代码末尾补一个换行；留着的话编辑器里会多出一条空行，
  // 「改动后是否与原文一致」的判断也会被它带偏，所以统一去掉。
  function codeOf(div) {
    var code = div.querySelector('pre code');
    return code ? code.textContent.replace(/\n$/, '') : '';
  }

  // ---- 动态加载 CodeMirror ----------------------------------------------

  var modCache = {};

  function loadMod(url) {
    if (!modCache[url]) {
      modCache[url] = import(url).catch(function (e) {
        // 失败的 promise 不能留在缓存里，否则用户重试永远失败
        delete modCache[url];
        throw e;
      });
    }
    return modCache[url];
  }

  // 语法着色用 Material 自己的高亮变量。好处是深浅色主题切换时编辑器
  // 自动跟着变，不需要重建实例，也不需要监听主题事件。
  function tagSpecs(tagMod) {
    var tags = (tagMod && tagMod.tags) || {};
    var specs = [];

    function mod(fn, base) {
      try { return fn(base); } catch (e) { return null; }
    }

    // 逐个字段做存在性检查：@lezer/highlight 升级时标签集合变了也只是少一种颜色，
    // 不会让整个编辑器建不起来
    function add(list, style) {
      var out = [];
      for (var i = 0; i < list.length; i++) if (list[i]) out.push(list[i]);
      if (!out.length) return;
      var spec = { tag: out.length === 1 ? out[0] : out };
      for (var k in style) spec[k] = style[k];
      specs.push(spec);
    }

    add([tags.comment], { color: 'var(--md-code-hl-comment-color)', fontStyle: 'italic' });
    add([tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword,
         tags.definitionKeyword], { color: 'var(--md-code-hl-keyword-color)' });
    add([tags.string, tags.character, mod(tags.special, tags.string)],
      { color: 'var(--md-code-hl-string-color)' });
    add([tags.number, tags.bool, tags.null, tags.atom],
      { color: 'var(--md-code-hl-number-color)' });
    add([mod(tags.function, tags.variableName), mod(tags.function, tags.propertyName),
         tags.labelName], { color: 'var(--md-code-hl-function-color)' });
    add([tags.typeName, tags.className, tags.namespace, tags.macroName],
      { color: 'var(--md-code-hl-special-color)' });
    add([mod(tags.constant, tags.variableName), mod(tags.standard, tags.name)],
      { color: 'var(--md-code-hl-constant-color)' });
    add([tags.operator, tags.punctuation, tags.bracket],
      { color: 'var(--md-code-hl-operator-color)' });
    add([tags.variableName, tags.propertyName, mod(tags.definition, tags.variableName),
         mod(tags.local, tags.variableName), tags.self],
      { color: 'var(--md-code-hl-name-color)' });
    add([tags.invalid, tags.deleted, tags.meta, tags.processingInstruction],
      { color: 'var(--md-code-hl-generic-color)' });
    return specs;
  }

  // 字号/行高/字体/内边距直接从静态代码块上量，量出来的值比猜 Material 的
  // em 层级靠谱 —— 进出编辑态时不该「跳」一下。颜色则一律用变量，跟主题走。
  function cmTheme(cs) {
    var padTop = cs.paddingTop || '0.55rem';
    var padBottom = cs.paddingBottom || '0.55rem';
    var padSide = cs.paddingLeft || '0.7rem';
    var t = {
      '&': {
        backgroundColor: 'var(--md-code-bg-color)',
        color: 'var(--md-code-fg-color)',
        borderRadius: '0.1rem',
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight === 'normal' ? '1.55' : cs.lineHeight
      },
      '.cm-scroller': { fontFamily: cs.fontFamily, lineHeight: 'inherit', overflow: 'auto' },
      '.cm-content': { padding: padTop + ' 0 ' + padBottom, caretColor: 'var(--md-accent-fg-color)' },
      '.cm-line': { padding: '0 ' + padSide },
      // basicSetup 自带行号与折叠栏，这里藏掉 —— 静态代码块没有行号，
      // 进出编辑态时保持同一副样子
      '.cm-gutters': { display: 'none' },
      '.cm-activeLine': { backgroundColor: 'transparent' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--md-default-fg-color)' },
      '&.cm-focused': { outline: 'none' },
      '.cm-selectionBackground, .cm-content ::selection':
        { backgroundColor: 'var(--md-code-hl-color)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        { backgroundColor: 'var(--md-code-hl-color)' },
      '.cm-matchingBracket, &.cm-focused .cm-matchingBracket':
        { backgroundColor: 'var(--md-code-hl-color)', outline: 'none' },
      '.cm-tooltip': {
        backgroundColor: 'var(--md-default-bg-color)',
        border: '1px solid var(--md-default-fg-color--lightest)',
        color: 'var(--md-default-fg-color)'
      },
      '.cm-panels': {
        backgroundColor: 'var(--md-default-bg-color)',
        color: 'var(--md-default-fg-color)'
      }
    };
    return t;
  }

  function cmExtensions(cm, langCore, autoMod, tagMod, langFn, cs) {
    return [
      // basicSetup 已经带了 autocompletion，而同一个 facet 取**先出现**的配置，
      // 所以要放在它前面才生效。只关「边打边弹」，Ctrl-Space 手动补全仍然可用。
      autoMod.autocompletion({ activateOnTyping: false }),
      cm.basicSetup,
      cm.EditorView.lineWrapping,
      langCore.indentUnit.of('    '),
      cm.EditorView.theme(cmTheme(cs)),
      langCore.syntaxHighlighting(langCore.HighlightStyle.define(tagSpecs(tagMod))),
      langFn()
    ];
  }

  function setEditorOpen(state, open) {
    state.open = open;
    state.editorHost.hidden = !open;
    // pre 归 Material 管，它自己的 display 规则比 [hidden] 的 UA 样式更硬，
    // 所以这里必须用内联样式
    if (state.pre) state.pre.style.display = open ? 'none' : '';
    state.btnEdit.textContent = open ? '收起' : '编辑';
    state.btnEdit.title = open
      ? '收起编辑器，回到只读代码'
      : '就地编辑这段代码（改动不会保存，刷新即还原）';
    state.btnEdit.setAttribute('aria-label', state.btnEdit.title);
    state.btnReset.hidden = !(open && state.dirty);
    if (open && state.view) state.view.focus();
  }

  function resetEditor(state) {
    state.dirty = false;
    state.text = state.original;
    if (state.view) {
      state.view.dispatch({
        changes: { from: 0, to: state.view.state.doc.length, insert: state.original }
      });
    }
    state.btnReset.hidden = true;
  }

  function openEditor(state) {
    if (state.open || state.loading) return;
    if (state.view) { setEditorOpen(state, true); return; }

    var spec = CM_LANG[state.langKey];
    state.loading = true;
    state.btnEdit.disabled = true;
    state.btnEdit.textContent = '载入编辑器…';

    // 并行拉五个模块。实测首次约 0.15~0.5 s（esm.sh 有 CDN 缓存）。
    Promise.all([
      loadMod(CM_CORE),
      loadMod(spec.url),
      loadMod(CM_LANGUAGE),
      loadMod(CM_AUTOCOMPLETE),
      loadMod(CM_TAGS)
    ]).then(function (m) {
      var cm = m[0], langMod = m[1], langCore = m[2], autoMod = m[3], tagMod = m[4];
      var langFn = langMod[spec.fn];
      if (typeof langFn !== 'function') {
        throw new Error('语言包缺少 ' + spec.fn + ' 导出');
      }
      var cs = window.getComputedStyle(state.preCode || state.pre);

      state.view = new cm.EditorView({
        doc: state.text,
        extensions: cmExtensions(cm, langCore, autoMod, tagMod, langFn, cs)
          .concat([
            cm.EditorView.updateListener.of(function (u) {
              if (!u.docChanged) return;
              state.text = u.state.doc.toString();
              var dirty = state.text !== state.original;
              if (dirty !== state.dirty) {
                state.dirty = dirty;
                state.btnReset.hidden = !(state.open && dirty);
              }
            })
          ]),
        parent: state.editorHost
      });

      state.loading = false;
      state.btnEdit.disabled = false;
      setEditorOpen(state, true);
    }).catch(function (e) {
      state.loading = false;
      state.btnEdit.disabled = false;
      state.btnEdit.textContent = '编辑';
      renderError(state.panel, '编辑器加载失败',
        '需要从 CDN 取 CodeMirror：' + ((e && e.message) || e) +
        '。代码照旧可以直接运行，不受影响。');
    });
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

  function run(state) {
    var judgeLang = state.judgeLang;
    var panel = state.panel;
    var btn = state.btnRun;

    // 编辑器打开时跑编辑器里的内容，否则跑笔记里的原文
    var code = state.text;
    if (!code.trim()) {
      renderError(panel, '代码是空的', '没有可以提交的内容。');
      return;
    }
    if (code.length > MAX_CODE_BYTES) {
      renderError(panel, '代码过大',
        '超过 ' + Math.round(MAX_CODE_BYTES / 1024) + ' KB，未提交运行。');
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
          renderError(panel, '请求超时',
            '判题服务 ' + (FETCH_TIMEOUT_MS / 1000) + ' 秒未响应，稍后重试。');
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

    var pre = div.querySelector('pre');
    if (!pre) return;

    div.dataset.rcReady = '1';
    div.classList.add('rc-host');

    var original = codeOf(div);
    var state = {
      langKey: langKey,
      judgeLang: LANGS[langKey],
      original: original,
      text: original,
      dirty: false,
      open: false,
      loading: false,
      view: null,
      pre: pre,
      preCode: pre.querySelector('code')
    };

    var tools = h('div', 'rc-tools');

    var btnEdit = h('button', 'rc-btn rc-btn--edit', '编辑');
    btnEdit.type = 'button';
    btnEdit.disabled = !CM_LANG[langKey];

    var btnReset = h('button', 'rc-btn rc-btn--reset', '还原');
    btnReset.type = 'button';
    btnReset.title = '丢弃改动，回到笔记里的原始代码';
    btnReset.setAttribute('aria-label', btnReset.title);
    btnReset.hidden = true;

    var btnRun = h('button', 'rc-btn rc-btn--run', '运行');
    btnRun.type = 'button';
    btnRun.title = '在 ' + LANGS[langKey].label + ' (' + LANGS[langKey].ver + ') 上运行这段代码';
    btnRun.setAttribute('aria-label', btnRun.title);

    tools.appendChild(btnEdit);
    tools.appendChild(btnReset);
    tools.appendChild(btnRun);
    div.appendChild(tools);

    // 编辑器容器放在 <pre> 之后、工具栏之前：<pre> 与它互斥显示，
    // 工具栏在窄屏下会变成正常流排在它们下面
    var editorHost = h('div', 'rc-editor');
    editorHost.hidden = true;
    div.insertBefore(editorHost, tools);

    var panel = h('div', 'rc-out');
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    // 输出面板放在代码块外面，别被 highlight 的定位和样式影响
    div.parentNode.insertBefore(panel, div.nextSibling);

    state.btnEdit = btnEdit;
    state.btnReset = btnReset;
    state.btnRun = btnRun;
    state.editorHost = editorHost;
    state.panel = panel;

    if (btnEdit.disabled) {
      btnEdit.title = '这个语言没有配编辑器，只能运行';
      btnEdit.setAttribute('aria-label', btnEdit.title);
    } else {
      btnEdit.title = '就地编辑这段代码（改动不会保存，刷新即还原）';
      btnEdit.setAttribute('aria-label', btnEdit.title);
      btnEdit.addEventListener('click', function () {
        if (state.open) setEditorOpen(state, false);
        else openEditor(state);
      });
    }

    btnReset.addEventListener('click', function () { resetEditor(state); });
    btnRun.addEventListener('click', function () { run(state); });
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
