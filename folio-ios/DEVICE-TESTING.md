# Folio iOS 测试包 · 签名交接

这是 iPhoneOS / arm64 的 Release 设备构建，原网页与美术资源随包携带。文件名明确带 `unsigned`：目前没有 Apple 开发者账号或分发证书，**IPA 尚未签名，不能直接安装，也不是 TestFlight 下载包**。不要把模拟器 App 当成设备安装包。

## 交给签名协助者

1. 先比对旁边的 SHA256 和 `device-verification.json`，确认来源、提交和平台。
2. 请有 iOS 签名经验的人使用自己的合法签名配置接手；不要把 Apple 密码、私钥或学校/模型凭据提交到本项目。
3. 使用开发/Ad Hoc 分发时，签名者需为相应 Bundle ID 与测试设备配置有效描述文件，并对主 App 及嵌入框架一致签名。签名后需重新核对包和描述文件；本项目没有宣称该步骤已完成。
4. 如需 TestFlight，由 Apple Developer Program 成员在自己的团队下配置 App Store Connect、归档签名及上传。此 unsigned 包不能直接上传并代替签名。

有 Mac 的协助者也可从同一提交复现：`python3 tools/prepare_assets.py`、`swift tools/render_icon.swift`、`python3 tools/generate_project.py`，在 Xcode 打开 `Folio.xcodeproj` 后选择其团队与 Bundle ID 签名。请使用新检出目录，避免把带模拟器夹具的 Generated 目录带入设备构建。

官方签名步骤见 [Apple：设备测试分发](https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices) 和 [Apple：测试与发行](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)。

## 首轮测试范围

- 启动、明暗与跟随系统、首页输入/图片选择、横向页面、四格卡片、关系网。
- 自己的学校账号原生输入、官方网页登录返回后同步，成绩/课程/考试/作业；需验证码时用官网。读取失败应保留原缓存。诊断只含端点、状态码和Cookie名称，不要反馈密码、Cookie值或原始个人响应。
- 自行配置模型HTTPS地址与API Key，读取模型、正常对话和已确认的本地修改；重新启动后配置与记录仍在。
- iCal、关系网ZIP和同账号加密同步文件的保存/导入；先用可丢弃的测试数据，核对后再确认覆盖。
- 系统通知权限、测试通知与事项提醒。iOS每次安排最近60条，打开应用时续排；系统专注模式等设置可能影响展示。

不支持读取其他App使用时长。日记与录音入口继续隐藏。真实学校SSO、第三方模型兼容性、系统文件选择器/相机、后台通知与实体设备性能需要实际手机测试，模拟器结果不代替这些验收。原Android发布物未修改。
