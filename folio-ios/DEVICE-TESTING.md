# Folio iOS 测试包 · 签名交接

这是 iPhoneOS / arm64 的 Release 设备构建，原网页与美术资源随包携带。文件名明确带 `unsigned`：本项目目前没有用于分发的 Apple 签名或描述文件，**IPA 尚未签名，不能直接安装，也不是 TestFlight 下载包**。不要把模拟器 App 当成设备安装包。

普通 Apple 账号可以用于免费个人开发签名，不要求购买 Apple Developer Program 会员；免费描述文件有效期为7天，并有设备数量等限制。TestFlight 分发属于另一条流程。参见 [Apple账号与免费测试限制](https://developer.apple.com/help/account/basics/about-your-developer-account)。

## 个人自签安装（Windows 或 Mac）

可使用 [Sideloadly官网](https://sideloadly.io/)提供的工具，按其[官方FAQ](https://sideloadly.io/faq)操作。本项目没有实测该第三方工具安装当前IPA，具体兼容性以实际结果为准。

1. 在电脑安装 Sideloadly；需要 Apple 设备驱动时，按其官方说明安装相应组件。
2. 用数据线连接目标 iPhone，解锁并信任电脑。
3. 将 `folio-ios-0.1.0-build.2-unsigned.ipa` 导入工具，选择目标设备，用签名者自己的 Apple 账号完成签名和安装。不要把账号密码或验证码发到本仓库。
4. 若出现“未受信任的开发者”，到“设置 → 通用 → VPN与设备管理”中找到签名账号并信任。
5. 若系统要求开发者模式，到“设置 → 隐私与安全性 → 开发者模式”开启，按提示重启并再次确认。参见 [Apple开发者模式说明](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)。
6. 免费签名到期后需续签；更新时保持同一签名账号和Bundle ID，并先备份本地数据，避免因删除应用丢失记录。

签名只覆盖相应描述文件中登记的设备，不会把本包变成任何人都能安装的通用包。测试者不必在手机iCloud中登录签名者的账号。

## 交给签名协助者

1. 先比对旁边的 SHA256 和 `device-verification.json`，确认来源、提交和平台。
2. 请有 iOS 签名经验的人使用自己的合法签名配置接手；不要把 Apple 密码、私钥或学校/模型凭据提交到本项目。
3. 使用开发/Ad Hoc 分发时，签名者需为相应 Bundle ID 与测试设备配置有效描述文件，并对主 App 及嵌入框架一致签名。签名后需重新核对包和描述文件；本项目没有宣称该步骤已完成。
4. 如需 TestFlight，由 Apple Developer Program 成员在自己的团队下配置 App Store Connect、归档签名及上传。此 unsigned 包不能直接上传并代替签名。

有 Mac 的协助者也可从同一提交复现：`python3 tools/prepare_assets.py`、`swift tools/render_icon.swift`、`python3 tools/generate_project.py`，在 Xcode 打开 `Folio.xcodeproj` 后选择其团队与 Bundle ID 签名。请使用新检出目录，避免把带模拟器夹具的 Generated 目录带入设备构建。

官方签名步骤见 [Apple：设备测试分发](https://developer.apple.com/documentation/xcode/distributing-your-app-to-registered-devices) 和 [Apple：测试与发行](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)。

## 权利与品牌声明

Folio 原始设计及依法享有的相关权利归 Fish 所有。Folio 名称、图标及官方发行身份不随代码许可一并授权。

本次允许个人自签、安装和测试。未经 Fish 书面许可，不得以 Folio 名称、图标或官方身份重新签名、打包后上架 App Store、通过 TestFlight 对外分发或收费经营；不得冒充官方或声称获得 Fish 背书。Fish 保留就侵害其依法享有权利的行为，要求下架、向平台投诉及依法追究责任的权利。可转发官方仓库与Release链接。

以上保留品牌权利，不撤回或缩减 GPL-3.0 授予的代码和受覆盖二进制的使用、修改、再分发及收费权利。合规采用不同名称、图标并明确非官方身份的 GPL 衍生版，仍按相应许可处理。详见根目录 `LICENSE`、`NOTICE.md`、`TRADEMARK.md`。

## 首轮测试范围

- 启动、明暗与跟随系统、首页输入/图片选择、横向页面、四格卡片、关系网。
- 自己的学校账号原生输入、官方网页登录返回后同步，成绩/课程/考试/作业；需验证码时用官网。读取失败应保留原缓存。诊断只含端点、状态码和Cookie名称，不要反馈密码、Cookie值或原始个人响应。
- 自行配置模型HTTPS地址与API Key，读取模型、正常对话和已确认的本地修改；重新启动后配置与记录仍在。
- iCal、关系网ZIP和同账号加密同步文件的保存/导入；先用可丢弃的测试数据，核对后再确认覆盖。
- 系统通知权限、测试通知与事项提醒。iOS每次安排最近60条，打开应用时续排；系统专注模式等设置可能影响展示。

不支持读取其他App使用时长。日记与录音入口继续隐藏。真实学校SSO、第三方模型兼容性、系统文件选择器/相机、后台通知与实体设备性能需要实际手机测试，模拟器结果不代替这些验收。原Android发布物未修改。
