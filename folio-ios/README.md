# Folio iOS · 原网页验证工程

这一阶段验证「现有网页能否在 iOS 原样承载」，不重画页面。Swift/UIKit + WKWebView 加载 `../folio-prototype` 的同一份 HTML/CSS/JS/SVG。`prepare_assets.py` 与 Android 使用同一份资源清单，逐字节复制并核验实际 `.app` 中的资源。网页与 Android 源码不受本工程修改。

2026-10-27：iPhone SE（第三代）和 iPhone 16 Pro 的真实 iOS18.5 模拟器已通过页面及 UIKit 交互验证，各79项网页检查、19张页面截图和4张全机交互截图。具体提交、CI结果与限制见[验证记录](VALIDATION-2026-10-27.md)。

## 当前边界

- 这是模拟器验证工程，不是完成迁移的 iOS 客户端，也不是可分发的 TestFlight 安装包。
- 验证版只提供网页容器、本地静态资源服务、桥接入口及窗口颜色；账号/SSO、AI 原生网络代理、凭据保管、原生记录仓库、通知、文件导入导出等尚未接入。不支持的操作明确失败。
- 模拟器测试使用独立的虚构教务/作业数据。注入必须同时满足 Debug、模拟器和显式 `--folio-simulator-qa` 参数。使用非持久的测试 WebKit 存储，与正常运行数据隔离；不传密码或模型密钥到 CI。
- 页面截图使用真实 iOS WKWebView 的 snapshot；全机截图、键盘和翻页由 XCUITest 生成，附模拟器录像。不是浏览器设备尺寸模拟图，也不是重新绘制的设计稿。
- 模拟器不等同真机：性能、后台通知、相机及真实学校会话仍待有设备的测试者验收。
- iOS 适配脚本只修正 WebKit 对工作台 flex/aspect-ratio 的宽度计算：四格与便签板两侧对齐、保持方形，小屏可纵向滚动。没有改原网页 CSS 或重画美术。
- 公开天气/资讯沿用原网页请求，仅放行原有 Open-Meteo / Hacker News 指定路径。模拟器用固定缓存，额外阻止并记录外网请求；学校和模型访问不因此放开。
- Xcode16.4 / iOS18.5 的 Swift WebKit 运行库存在[官方记录的模拟器问题](https://developer.apple.com/forums/thread/785964)。CI 对这一组合使用最低部署18.4的兼容设置；项目声明的iOS17支持尚未验证，不能以该次通过声称已支持。

## 无苹果设备的验证流程

GitHub Actions 使用公开仓库标准 `macos-15` runner，自动选择已安装的两种 iPhone 模拟器。无需开发者证书或付费服务，不调用远程模型/学校账号，不上传到 TestFlight。

1. 编译真正的 iOS App 和 XCUITest runner。
2. 校验 `.app/WebAssets` 与当前 Git 提交中的原网页资源一致。
3. 生成首页、工作台、日程、课表、课程、考试、成绩、关系网、设置的两套颜色截图，以及原有确认卡。
4. 检查同源 iframe、IndexedDB、crypto、布局溢出、运行异常、便签贴出/收回与 AI 待确认写入边界。
5. 用 XCUITest 实际输入、弹出键盘、左右滑动和点击菜单，导出截图、录像、`.xcresult` 和 JSON。

CI 产物在对应 Actions 运行的 Artifacts 中，保留7天。`ci-result.json` 是整体结论；`screens/report.json` 是网页检查，不能单独替代 UI 测试是否通过。失败也上传日志和截图。

`ios-review-compact/regular` 是便于下载的小型截图/JSON包；`ios-webview-compact/regular` 还包含完整录像、日志和Xcode结果。下载两份review包到同一目录后，可以生成离线图集：

```sh
python3 tools/make_gallery.py Reports/review
```

将下载目录命名为 `ios-webview-compact` 和 `ios-webview-regular`（工具也接受 `compact` / `regular`），然后在 Windows 浏览器打开生成的 `index.html`。
图集也包含 XCUITest 的真实键盘、滑动后工作台与菜单截图，链接到每台设备的整体结果及网页检查详情。

## 在 macOS 上复现

```sh
python3 tools/prepare_assets.py --qa
python3 tools/generate_project.py
python3 tools/ci_run.py --size regular
```

正常运行前使用全新的 `Generated/` 目录执行 `prepare_assets.py`（不带 `--qa`），然后打开 `Folio.xcodeproj`。项目不包含签名配置、证书或账号。TestFlight 会在原生能力接入及真机测试阶段另行处理。

本机 Windows 只可验证资源复制、JS 测试逻辑和项目文件生成；只有云端成功结果才算实际 Xcode 编译与 iOS 模拟器验收。许可和品牌沿用根仓库的 GPL-3.0-only、NOTICE 与第三方声明，原美术资源不作修改。
