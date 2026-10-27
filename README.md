# Folio

由 **Fish**（GitHub: [@Fish-zjuer](https://github.com/Fish-zjuer)；校园论坛: **一条Fish**）发起、设计和主导的校园个人助理。名字对应关系见 [AUTHORS.md](AUTHORS.md)。

把课表、日程、作业、成绩、目标和 AI 对话放在一起。首页包含可自由配置的 2×2 工作台：纸感图形、像素插画和数据组件共用可扩展的 Widget API。

当前版本为 **1.0.1 更新版（2026-10-23，内部版本117）**，Android 9及以上，仅安卓。安装包、对应源码和校验文件见 [GitHub Releases v1.0.1](https://github.com/Fish-zjuer/Folio/releases/tag/v1.0.1)；产品仍处于早期阶段。

本版包含首页对话与 2×2 工作台、日程/课表、待办、作业热力图、课程/考试、学业/成绩、目标测算、深色与跟随系统、本地提醒、学校教务连接、Widget API v1 和卡片包。AI 模型不内置，由用户配置。v1.0.1 新增关系网、逐档扩容与 ZIP 备份、同账号加密文件离线同步、AI 按需操作，完善出分目标联动与页面子集选择。本次替换原v1.0.1附件，合并账号原生输入、考试请求重试、横向页拖拽排序、成绩按住查看、首页切日、确认卡与时间格式修正；新建自定义作业默认加入工作台队列，可取消。日记和录音入口暂时隐藏。详见 [1.0.1 变更与验证边界](folio-android/RELEASE-1.0.1.md)。

修复测试包 **0.23-test.16（2026-10-26，内部版本118）** 已修复 [#1 待贴作业无法提前挂上](https://github.com/Fish-zjuer/Folio/issues/1) 与 [#2 拖便签同时带动翻页](https://github.com/Fish-zjuer/Folio/issues/2)。原签名覆盖安装，下载见 [测试版 Release](https://github.com/Fish-zjuer/Folio/releases/tag/v0.23-test.16)；修改与验证见 [说明](folio-android/RELEASE-0.23-test.16.md)。稳定版仍为上方v1.0.1。

**iOS实验测试包0.1.0 / build2**：[下载未签名IPA和签名资料](https://github.com/Fish-zjuer/Folio/releases/tag/ios-v0.1.0-test.2)。目前须测试者自行签名，未提供TestFlight，真实学校/模型及实体设备场景仍待验收；具体范围见[测试说明](folio-ios/DEVICE-TESTING.md)。Folio品牌包允许个人自签测试，未经Fish书面许可不授权使用名称、图标或官方身份上架App Store、通过TestFlight对外分发或收费；GPL代码权利保留，见[品牌政策](TRADEMARK.md)。

## 许可与署名

- 代码：**GPL-3.0-only**，见 [LICENSE](LICENSE)。
- 原始界面、交互、文案、图形与视觉设计版权归 **Fish** 所有；代码开源不转移设计版权，见 [NOTICE.md](NOTICE.md)。
- “Folio”名称与图标不随代码许可授权；修改版需使用不同名称和图标。
- Widget API v1 与所有随 Folio 分发/加载的第三方卡片必须以 GPL-3.0-only 开源并提供完整源码；不接受闭源或付费授权卡片，见 [WIDGET-API-LICENSE.md](WIDGET-API-LICENSE.md)。
- 第三方：Celechron（GPL-3.0）、JetBrains Mono（OFL 1.1）；完整声明保留在 `folio-prototype/assets/licenses/` 与 `assets/fonts/`。
- 使用前请阅读 [服务条款](TERMS.md) 与 [隐私说明](PRIVACY.md)；参与贡献见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 官方维护者、品牌与赞助：见 [维护者名单](MAINTAINERS.md)、[维护者协议](MAINTAINER-AGREEMENT.md)、[赞助与分成政策](SPONSORSHIP.md)、[品牌政策](TRADEMARK.md) 与 [治理规则](GOVERNANCE.md)。Folio 不主动向用户收费；官方维护者因 Folio 获得专项赞助时，按净额 5%–10% 支付给项目基金。

## 运行结构

- `folio-prototype/`：HTML、CSS、原生 JavaScript 前端，无 npm 构建步骤。
- `folio-android/`：Java 宿主、系统 WebView、本机 HTTP 服务；学校连接、加密凭据保管、AI 请求、公开数据及用量统计桥接。
- `folio-ios/`：独立的 UIKit/WKWebView 宿主，复用原网页资源；已有原生学校/AI/记录/文件/通知桥接和未签名 arm64 设备测试包，需他人签名后才可安装。见[测试与签名说明](folio-ios/DEVICE-TESTING.md)，当前正式发行仍仅限 Android。
- AI 模型由用户配置 Base URL、模型和 API Key。APK 不内置大模型，也不捆绑 Flutter 引擎。

## 本地预览

```sh
python -m http.server 4194 --bind 127.0.0.1 --directory folio-prototype
```

浏览 `http://127.0.0.1:4194/`。普通浏览器没有 Android 桥接；学校登录、相册和用量权限等需真机。`qa/settings-mobile.html` 是虚构数据预览；在独立端口 4195 上运行可显示自动检查按钮。不要在存放真实数据的预览端口重置存储。

## 测试与 Android 构建

前端单测为 `folio-prototype/*.test.cjs`，用 Node 逐个执行。原生离线检查：

```sh
cd folio-android
python test_native.py
python test_usage.py
```

构建需 JDK 17、Android SDK Platform/Build Tools 34，并设置适合本机的 `JAVA_HOME`、`ANDROID_HOME`。后续打包应先递增 Manifest 的 versionName / versionCode，再运行 `build.py`、`verify_build.py`、`package_source.py`。脚本拒绝覆盖已有同名发布物。

原测试签名密钥有意不入库。保持覆盖安装必须由维护者本地提供 `folio-android/signing/folio-test.jks`；没有密钥时构建会停止，不会擅自替换。仓库不含用户账号、API Key、Cookie、个人截图、APK、构建产物。

## 扩展组件

参见 [Widget API v1](folio-prototype/WIDGET-DEVELOPMENT.md) 和 [类型定义](folio-prototype/widgets/widget-api.d.ts)。四格不绑定内置组件：可添加、更换、留空、长按换位；开发者组件与内置组件共用注册表和授权的数据快照。

## 当前验证与待完成项

- 50 个 Node 测试文件、349 项通过；原生学校协议 33 项、网络 28 项、手机用量检查、离线同步 38 项通过。
- 本次 117 项隔离浏览器检查通过：作业默认入队、确认卡、时间、账号桥接、面板/日列、成绩/导航/登录竞争及正式 APK 生产 CSP；关系网与离线同步的既有验收和边界见发布说明。
- 原签名、155 个运行资源逐字节一致。合成触摸与离线检查不能代替手机体验；真实学校 SSO、考场/座位号案例、系统文件选择器、两台真机同步和后台通知仍待继续验收。
- 关系网每次扩容 250、上限 2000；满载真机绘图帧率未验证。`.folio` 是同账号加密文件转移，不是自动云同步；独立关系网 ZIP 未加密。
- 本次发布继续使用 Java + WebView，不包含实验性 Flutter 迁移，也未提供 iOS。

## 来源、许可与署名

请先读 [来源与许可状态](PROVENANCE.md)。代码以 GPL-3.0-only 发布，保留各文件与第三方已有声明；派生范围仍需逐文件审计，不声称全部为原创。

产品构思、交互与视觉方向：**Fish**。AI 辅助开发：**OpenAI Codex**。其他协助及第三方来源按具体文件的真实来源保留记录。

测试反馈可提交仓库 Issues，请勿上传学校密码、模型 Key、Cookie 或含个人信息的截图。公开反馈可在校园论坛发布帖中交流；服务条款和隐私说明见上方链接。
