# 0.23-test.5（2026-10-22，本地测试）

- APK：`dist/folio-0.23-test.5.apk`，650,566 字节，versionCode 105 / versionName 0.23-test.5。
- SHA256：`903ceebddafcd041f4c9785927fe8c29c85a7067a43838e567d9a42f17e0ce5f`。
- 原证书连续性、Android 9+/target 34/竖屏及 144 个 Web 运行资源逐字节核验通过，无 QA 夹具或私钥进入资源。
- 对应源码：`dist/folio-0.23-test.5-source.zip`，466 个文件，SHA256 `029d75f4d56cbdf410a14011724c4274e505b8b866294c7223d4223f167afd3f`。
- 基于当前未打包源码重新构建，包含此前的 Agent 过程摘要/工具过程、日记/录音、离线同步等近期改动；本轮只调整摘要展开键样式。

## 本轮改动

- Agent 消息的“思考摘要/工具过程”展开键原本是文本字符 `⌄`，在部分字体下偏小、基线与文字不齐。
- 换成 20×20 的内联 SVG chevron，默认向下；展开时以自身中心旋转 180°，不改变布局宽度或位置。
- 箭头使用 `align-self:center` 与摘要标题、状态文字的中线对齐；摘要列宽从 12px 调整为 20px，给箭头留出稳定空间。
- `chat.css` 与 `agent-progress-ui.js` 缓存号更新为 `process-chevron1`，避免覆盖安装后继续读旧资源。

## 验证

- `agent-progress-ui.js` 语法检查通过；`agent-core.test.cjs` 11 项通过。
- APK 签名、版本号、竖屏、target 34 和 144 个 Web 资源逐字节匹配通过。
- 未进行真实手机安装与真机视觉验收；展开/收起状态使用隔离浏览器截图检查。

## 后续

- 最新公开版仍是 GitHub `v1.0`；本包为本地测试版，未推送 GitHub。
- 真机重点看 320px 窄屏、深色模式、系统字体放大和长标题截断时箭头是否仍居中。
