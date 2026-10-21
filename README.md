# Folio

由 **Fish（[@Fish-zjuer](https://github.com/Fish-zjuer)）** 发起、设计和主导的校园个人助理。

把课表、日程、作业、成绩、目标和 AI 对话放在一起。首页包含可自由配置的 2×2 工作台：纸感图形、像素插画和数据组件共用可扩展的 Widget API。

当前版本为 **1.0（2026-10-21）**，Android 9及以上，仅安卓。安装包和校验文件见 [GitHub Releases v1.0](https://github.com/Fish-zjuer/Folio/releases/tag/v1.0)；这是第一个公开版本，产品仍处于早期阶段。

本版包含首页对话与 2×2 工作台、日程/课表、待办、作业热力图、课程/考试、学业/成绩、目标测算、深色与跟随系统、本地提醒、学校教务连接、Widget API v1 和卡片包。AI 模型不内置，由用户配置。详见 [1.0 变更与验证边界](folio-android/RELEASE-1.0.md)。

## 许可与署名

- 代码：**GPL-3.0-only**，见 [LICENSE](LICENSE)。
- 原始界面、交互、文案、图形与视觉设计版权归 **Fish** 所有；代码开源不转移设计版权，见 [NOTICE.md](NOTICE.md)。
- “Folio”名称与图标不随代码许可授权；修改版需使用不同名称和图标。
- 第三方：Celechron（GPL-3.0）、JetBrains Mono（OFL 1.1）；完整声明保留在 `folio-prototype/assets/licenses/` 与 `assets/fonts/`。
- 使用前请阅读 [服务条款](TERMS.md) 与 [隐私说明](PRIVACY.md)；参与贡献见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 运行结构

- `folio-prototype/`：HTML、CSS、原生 JavaScript 前端，无 npm 构建步骤。
- `folio-android/`：Java 宿主、系统 WebView、本机 HTTP 服务；学校连接、加密凭据保管、AI 请求、公开数据及用量统计桥接。
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

- 0.18：38个Node文件260项、学校协议20项及手机用量离线检查通过；菜单99项与既有学习回归137项通过。APK原签名、123运行文件一致，未真机验收。多个提前提醒目前仅App内，尚无退出后的原生后台闹钟。

- 切页修正：4 项边界单测、15 项隔离浏览器检查通过，含工作台→日程动画逐帧检查（浏览器检查为打包前一轮结果）。
- 新自适应图标：Android aapt 资源打包及声明检查通过。
- 0.11检查：33个Node文件/210项、21项隔离浏览器、学校协议20项、用量9项通过；98运行文件与APK一致，原签名、竖屏和资源核验通过。真实学校历史请求与Android文件保存器仍需真机验收。
- 合成触摸不能代替手机体验。真实学校 SSO、学在浙大、实践、真机用量授权、后台提醒及部分 AI 记忆闭环仍需继续验收与完善。

## 来源、许可与署名

请先读 [来源与许可状态](PROVENANCE.md)。已有开源许可声明保留，派生范围尚待审计；当前保留各文件与第三方已有声明，未对全项目重新指定统一许可证，也不声称全部为原创。

产品构思、交互与视觉方向：**Fish**。AI 辅助开发：**OpenAI Codex**。其他协助及第三方来源按具体文件的真实来源保留记录。

测试反馈可提交仓库 Issues，请勿上传学校密码、模型 Key、Cookie 或含个人信息的截图。校园论坛推广与正式条款仍待完善。
