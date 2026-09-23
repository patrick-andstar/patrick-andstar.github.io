# 代码运行试验台

这一页专门用来试「在网页里直接跑代码」这个功能。

**关键一点：不需要写任何额外标记。** 只要代码块标了支持的语言，它自己就会长出工具栏 ——
我笔记里所有 ` ```cpp ` 之类的块都已经自动带上了。

## 怎么用

代码块右上角（窄屏下是代码块下方）有三个按钮：

| 按钮 | 作用 |
| --- | --- |
| **运行** | 把代码发出去执行，结果显示在代码块下方（状态 / 耗时 / 内存 / 输出） |
| **编辑** | 就地变成可编辑的编辑器。**此时才从 CDN 加载编辑器**，不点不下载 |
| **还原** | 改过之后才出现，点一下丢弃改动、回到笔记里的原始代码。再点「编辑」则是收起 |

**改动不会保存。** 刷新页面就回到笔记里的原文 —— 这是刻意的：静态站上
「改了却存不下来」比「改了就是临时的」更让人困惑。想留住改动就直接改仓库里的 md 文件。

## 支持的语言

| 语言 | 版本 | 能编辑 |
| --- | --- | --- |
| C++ | GCC 14.1 | ✅ |
| C | GCC 14.1 | ✅ |
| Python | 3.14 | ✅ |
| Java | JDK 17 | ✅ |
| Go | 1.23 | ✅ |
| JavaScript | Node 22 | ✅ |

代码块标了上面任一语言就会有工具栏。标成别的（比如 ` ```text `）则完全不动 ——
这就是「不想让它跑」时的做法。

---

## 1. C++：快速幂取模

最典型的场景。注意代码里有**中文注释和中文输出**，这条路走通了才说明编码没坑。

```cpp
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;

// 快速幂：a 的 b 次方对 m 取模
ll qpow(ll a, ll b, ll m) {
    ll r = 1 % m;
    while (b) {
        if (b & 1) r = r * a % m;
        a = a * a % m;
        b >>= 1;
    }
    return r;
}

int main() {
    const ll MOD = 1000000007;
    cout << "2^100 mod 1e9+7 = " << qpow(2, 100, MOD) << "\n";

    // 拿暴力法验一下小指数，两边应当一致
    ll brute = 1;
    for (int i = 0; i < 20; i++) brute = brute * 2 % MOD;
    cout << "2^20  暴力 = " << brute << "\n";
    cout << "2^20  快速 = " << qpow(2, 20, MOD) << "\n";
}
```

试试把 `MOD` 改成别的数，或者把指数换成 `1000000000`，再点一次「运行」。

## 2. Python：同一个算法的对照

换个语言，改点东西，看看输出。

```python
MOD = 10 ** 9 + 7

def qpow(a, b, m):
    """快速幂：a 的 b 次方对 m 取模"""
    r = 1 % m
    while b:
        if b & 1:
            r = r * a % m
        a = a * a % m
        b >>= 1
    return r

print("2^100 mod 1e9+7 =", qpow(2, 100, MOD))
print("2^20  暴力 =", 2 ** 20 % MOD)
print("2^20  快速 =", qpow(2, 20, MOD))
```

## 3. JavaScript：约瑟夫环

```javascript
// 约瑟夫环：n 个人围成一圈，每数到第 k 个出列，问最后剩下谁
function josephus(n, k) {
  const alive = [];
  for (let i = 1; i <= n; i++) alive.push(i);
  let idx = 0;
  while (alive.length > 1) {
    idx = (idx + k - 1) % alive.length;
    alive.splice(idx, 1);
  }
  return alive[0];
}

for (const [n, k] of [[7, 3], [10, 4], [41, 3]]) {
  console.log(`n=${n}  k=${k}  剩下第 ${josephus(n, k)} 号`);
}
```

## 4. Go：二分查找

```go
package main

import "fmt"

// lowerBound：在有序数组里找第一个 >= x 的位置
func lowerBound(a []int, x int) int {
	lo, hi := 0, len(a)
	for lo < hi {
		mid := (lo + hi) / 2
		if a[mid] < x {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}

func main() {
	a := []int{1, 3, 3, 5, 8, 8, 8, 12}
	for _, x := range []int{0, 3, 8, 9, 12, 13} {
		fmt.Printf("lower_bound(%d) = %d\n", x, lowerBound(a, x))
	}
}
```

## 5. Java：最大子段和

```java
public class Main {
    // Kadane 一遍扫描
    static long maxSubArray(int[] a) {
        long best = a[0], cur = a[0];
        for (int i = 1; i < a.length; i++) {
            cur = Math.max(a[i], cur + a[i]);
            best = Math.max(best, cur);
        }
        return best;
    }

    public static void main(String[] args) {
        int[] a = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
        System.out.println("最大子段和 = " + maxSubArray(a));
    }
}
```

## 6. 不想让它跑的代码块

标成 ` ```text ` 就不会长按钮。适合伪代码、片段、或者只是引用的别人代码：

```text
dp[0] = 1
for i in 1..n:
    for j in m..w[i]:
        dp[j] |= dp[j - w[i]]
```

对比一下：上面这块就没有按钮。

---

## 已知限制

| 限制 | 说明 |
| --- | --- |
| **不能读输入** | 现在统一传空 stdin，所以例子都写成自包含的。要读输入的题目得把输入塞进代码里 |
| **首次运行要等几秒** | 用的是公共服务，实测往返中位约 4 秒、最慢 8 秒多，波动来自排队 |
| **代码会离开浏览器** | 请求发到第三方判题服务执行。**别在里面写任何敏感内容**（密码、内网地址、真实数据） |
| **编辑器首次加载略慢** | 点「编辑」时要从 CDN 拉约几百 KB。拉不到会降级：编辑按钮报错，但「运行」照常可用 |
| **公共实例不保证可用** | 它免费、免 key，但可用性不由我们控制。挂了就是挂了，过会儿再试 |

上面这些都是取舍的结果，不是 bug。想彻底摆脱公共实例，得自建后端 + 沙箱（Docker privileged 容器 + cgroup 限制），
代价比现在这个复习站的需要大得多。
