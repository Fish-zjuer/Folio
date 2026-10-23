# 0.23-test.7（2026-10-23，本地修复包）

- 修复 test.6 在 Android 显示 `net::ERR_BLOCKED_BY_CSP`，无法打开关系网的问题。
- 原因：原生 WebView 为所有随包资源设置了 `frame-src 'none'`；之前的 localhost QA 没有带这个响应头，遗漏了宿主限制。
- 只允许 `https://appassets.androidplatform.net/assets/relationship-view.html` 作为内嵌页面。保留脚本、直连、其他页面等限制；关系网资源与用户数据结构不变。
- 增强 `verify_build.py`：从已编译 DEX 中核验策略和原生源码一致，检查关系网页面白名单。

## 本轮验证

- `qa/relationships-native-csp-check.mjs` 从实际 APK 提取资源，在隔离 Edge 上模拟生产 HTTPS 域名与原生 CSP 响应头。旧策略确实复现拦截，新策略 13 项通过：加载、同源、无策略错误、增加节点、深色、重载保存、其他本地与外部页面/直接连接仍被拦截，无运行异常。
- APK 原证书连续性、151 个前端资源逐字节一致、已编译原生 CSP、无私钥/夹具核验通过。
- 前端运行资源与 test.6 相同；此前 332 项 Node 与 39 项浏览器结果沿用。本次不是 Android 真机测试，实际手机安装验收仍待用户。

## 发布物

- `dist/folio-0.23-test.7.apk`，679,776 字节，versionCode 107，`app.folio.preview`，Android 9+ / target 34。
- SHA256：`21edb70c11a1428046fe8d2ddfef6cd81aab2adcdede2b814c8860941c1913dd`。
- 对应源码：`dist/folio-0.23-test.7-source.zip`，不含签名和用户数据。
- 相同包名与原签名，可覆盖安装。旧包保留；未发布 GitHub。
