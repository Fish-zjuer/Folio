# iOS 原网页承载验证 · 2026-10-27

本记录对应早期提交 `a635db4`。后续已扩展原生桥接和未签名设备包，最新范围见[README](README.md)与[设备签名交接](DEVICE-TESTING.md)；下文保留当次验证边界。

现有 HTML/CSS/JS/SVG 已在真实 iOS WKWebView 中运行，验证范围内的页面和基础交互通过。学校登录、AI 原生代理、通知及文件能力尚未迁移；这不是可交付的 iOS 正式客户端或 TestFlight 构建。

## 可复查证据

- [GitHub Actions：两种尺寸均通过](https://github.com/Fish-zjuer/Folio/actions/runs/40449901860)。
- 测试提交：`a635db4be911bd874a7ef94b438a301861531e63`。后续仅有文档与离线图集工具修改。
- 设备：iPhone SE（第三代，375点宽）与 iPhone 16 Pro（402点宽），iOS18.5 模拟器、Xcode16.4。
- 各79项网页检查通过，运行异常及 CSP 违规均为0；各1项 XCUITest 场景通过，整体退出码0。
- 各19张 WKWebView 页面截图：9页的明暗两套颜色与1张待确认卡。另各4张 UIKit 全机截图：系统安全区、真实滑动后的工作台、键盘输入、菜单点击，共46张。
- Actions 的 `ios-review-compact` / `ios-review-regular` 包含截图与JSON；完整 `ios-webview-*` 还包含模拟器录像、编译日志和 `.xcresult`。产物保留7天，可下载到本地用 `tools/make_gallery.py` 生成离线图集。

## 验证内容

1. Xcode 编译、安装与启动，实际 `.app/WebAssets` 中155个运行资源与源清单逐字节一致。
2. 首页、工作台、日程、课表、课程、考试、成绩、关系网、设置的页面宽度、明暗切换、横向溢出；工作台四格与便签板边缘对齐并保持方形。
3. 关系网同源 iframe、IndexedDB、crypto、本地桥接入口；原有便签贴出与撤回、AI草稿未确认前不写入、新作业默认入队。
4. XCUITest 发送真实系统触摸：首页滑到工作台、再滑回首页，输入并核对文本，显示系统键盘，点击功能菜单。
5. 虚构教务数据仅在 Debug + 模拟器 + 显式QA启动参数同时满足时注入；测试使用非持久存储并阻断外网请求，不使用学校账号或模型密钥。

## 与现有版本的隔离

- 新宿主、适配脚本及QA均在独立 `folio-ios/` 中，未修改原155个网页运行文件，也未改Android代码、版本、签名或已发布APK。
- 公共仓库补收原本已在本机存在的 `focus-session-store.js`：它曾被过宽的忽略规则漏掉，内容与原件一致，不是新增页面改造。
- iOS适配只解决 WebKit 的工作台 flex/aspect-ratio 宽度计算；美术仍使用原文件。
- Android test.16 APK SHA256保持 `f2095a1e462ad7d48b9a32813f91418c2d15000366b4120085674254f01b4ef5`。

## 仍未验证或未实现

- 真实学校SSO、考试数据、AI模型网络请求及凭据保管；未实现的原生操作明确失败。
- 原生通知、文件导入导出、相机、后台行为及实体设备的性能与手感。
- iOS17兼容性：本轮按照[Apple记录的Swift WebKit模拟器问题](https://developer.apple.com/forums/thread/785964)对iOS18.5 CI使用最低部署18.4的临时设置，不能据此宣称iOS17已经通过。
- TestFlight签名、上传和分发；未使用Apple开发者账号、证书或付费构建服务。

下一阶段在此宿主内逐项补学校会话与凭据、AI代理、文件和通知桥接，继续沿用原前端协议。
