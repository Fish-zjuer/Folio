# 来源与许可状态

此文件记录已发现的来源事实，不替代完整的法律审计，也不替权利人更改许可。

- Folio 的原始界面、交互、文案、图形与视觉设计由 **Fish** 主导完成、选择与编排，版权归 Fish 所有。AI 工具用于辅助实现与生成设计参考；Fish 主张其对原创选择、编排、修改与最终表达的权利。此前由 Fish 提供、用于风格参考的图片为 AI 工具生成，经 Fish 选择与修改后使用，不作为第三方作品收录。
- `folio-android/src/app/folio/preview/SchoolProtocol.java` 与 `folio-prototype/backend-core.js` 原有注释明确记录学校协议实现参考或改编 Celechron。保留这些注释、`LICENSE` 与 `folio-prototype/assets/licenses/Celechron-GPL-3.0.txt`。
- `folio-android/src/app/folio/preview/Network.java`、`SchoolSession.java` 等文件包含与学校协议相关的实现；改编/参考范围仍需逐文件审计。学校接口地址、字段与业务规则要与实现代码的表达区分，不能仅凭参考项目或一段注释推断所有独立代码的许可，也不能通过删注释规避真实改编义务。
- Folio 代码整体以 **GPL-3.0-only** 发布，根目录 `LICENSE` 为完整 GPLv3 文本；设计归属、署名称谓与品牌政策见 `NOTICE.md`。GPL 授权不转移设计或代码的著作权。
- JetBrains Mono 字体及其 OFL 声明见 `folio-prototype/assets/fonts/`。
- 书桌、便签与火焰等存在用户提供的设计参考文件，保留于 assets；项目所有者确认这些参考图由 AI 工具生成并由其选择/修改，未使用他人作品作为参考。若后续发现外部素材，将补充记录并处理。
- 实时服务包括 Open-Meteo、Hacker News、学校站点；校历请求使用 calendar.celechron.top。服务访问条款、数据使用和署名要求与代码许可分别核实。接入服务不意味着其数据或服务归本项目所有。
- 2026-10-21：项目所有者决定以开源方式发布，代码采用 GPL-3.0-only，设计版权与 Folio 名称/图标保留；v1.0 重新打包并附 `TERMS.md`、`PRIVACY.md`、`NOTICE.md`。公开不代表学校真实 SSO、后台通知或真机验收已经完成。
