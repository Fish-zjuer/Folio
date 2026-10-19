# 来源与许可状态（待审计）

此文件记录已发现的来源事实，不替代完整的许可审计，也不替权利人更改许可。

- 新界面、组件、交互和集成代码由 Fish 主导设计，使用 AI 辅助实现。应按具体文件继续核查来源。
- `folio-android/src/app/folio/preview/SchoolProtocol.java` 与 `folio-prototype/backend-core.js` 原有注释明确记录学校协议实现参考或改编 Celechron。保留这些注释与 `folio-android/LICENSE`、`folio-prototype/assets/licenses/Celechron-GPL-3.0.txt`。原参考项目不复制进本仓库。
- 学校接口地址、字段与业务规则要同实现代码的表达区分；不能仅凭参考项目或一段注释推断所有独立代码的许可，也不能通过删注释规避真实改编义务。改编范围和适用义务尚未完成逐项审计。
- JetBrains Mono 字体及其 OFL 声明见 `folio-prototype/assets/fonts/`。
- 书桌、便签与火焰等存在用户提供的设计参考文件，保留于 assets；对外发布前还需核实这些素材的授权情况。
- 实时服务包括 Open-Meteo、Hacker News、学校站点；校历请求使用 calendar.celechron.top。服务访问条款、数据使用和署名要求与代码许可分别核实。接入服务不意味着其数据或服务归本项目所有。
- 2026-10-20：按 Fish 的决定公开仓库与0.9-test安装包，标为测试版。公开不代表来源审计、正式条款或真机验收已经完成；当前文档不对尚未核实的许可范围作结论。
