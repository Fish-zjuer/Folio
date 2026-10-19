# Folio

由 **Fish（[@Fish-zjuer](https://github.com/Fish-zjuer)）** 发起、设计和主导的校园个人助理。

把课表、日程、作业、成绩、目标和 AI 对话放在一起。首页包含可自由配置的 2×2 工作台：纸感图形、像素插画和数据组件共用可扩展的 Widget API。

当前仓库为**私有开发快照**，尚未准备公开发布。最后已交付的本机测试包为 0.8-test；这里的源码另含未打包的设置重排、颜色模式、横向浏览修正和折纸图标。不要把 Manifest 的 0.8-test 当作这份新源码已经发布。

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

构建需 JDK 17、Android SDK Platform/Build Tools 34，并设置适合本机的 `JAVA_HOME`、`ANDROID_HOME`。下一次打包应先将 Manifest 改为 0.9-test / versionCode 9，再运行 `build.py`、`verify_build.py`、`package_source.py`。脚本拒绝覆盖已有同名发布物。

原测试签名密钥有意不入库。保持覆盖安装必须由维护者本地提供 `folio-android/signing/folio-test.jks`；没有密钥时构建会停止，不会擅自替换。仓库不含用户账号、API Key、Cookie、个人截图、APK、构建产物。

## 扩展组件

参见 [Widget API v1](folio-prototype/WIDGET-DEVELOPMENT.md) 和 [类型定义](folio-prototype/widgets/widget-api.d.ts)。四格不绑定内置组件：可添加、更换、留空、长按换位；开发者组件与内置组件共用注册表和授权的数据快照。

## 当前验证与待完成项

- 切页修正：4 项边界单测、15 项隔离浏览器检查通过，含工作台→日程动画逐帧检查。
- 新自适应图标：Android aapt 资源打包及声明检查通过。
- 上轮整体检查：32 个 Node 文件 / 197 项、Java 全源编译通过。本轮新增 1 项导航单测；未声称重新运行全部测试。
- 合成触摸不能代替手机体验。真实学校 SSO、学在浙大、实践、真机用量授权、后台提醒及部分 AI 记忆闭环仍需继续验收与完善。

## 来源、许可与署名

请先读 [来源与许可状态](PROVENANCE.md)。已有开源许可声明保留，派生范围尚待审计；当前不对全项目作新的统一授权，也不声称全部为原创或可以直接闭源发布。

产品构思、交互与视觉方向：**Fish**。AI 辅助开发：**OpenAI Codex**。其他协助及第三方来源按具体文件的真实来源保留记录。

当前不收集公开反馈；校园论坛发布及反馈入口待测试、条款与来源审计完成后再确定。
