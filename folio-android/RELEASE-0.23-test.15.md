# 0.23-test.15 · 时间格式兼容与 AI 协议（2026-10-23）

本地 APK：`dist/folio-0.23-test.15.apk`，704,675 字节，versionCode116，原签名，可覆盖 test.14 与 v1.0.1。

SHA256：`3f9bd1ff19189d724e5d788e04ba95efaba0749f68a965d9f03a60d25baf3f1a`。

## 问题和修正

已在修改前用虚构事项复现用户截图的同一错误：草稿 startAt=2026-10-24T09:00:00、endAt=2026-10-24T21:15:00；浏览器输入框分别自动显示/返回09:00和21:15，草稿却仍带秒，确认时严格的分钟校验报“时间格式应为 09:00”。

- AI草稿生成、已有草稿打开、直接卡片确认和最终合并后的记录共用分钟规范化：合法零秒/零小数秒、日期时间间空格可转为YYYY-MM-DDTHH:mm；截止clock同样处理。旧草稿可以直接重试，不必重做或重新请求模型。
- 不自动猜测时区、不截掉非零秒、不修复非法日期；开始/结束字段确实无效时提示具体字段。结束必须晚于开始、日期校验、跨日与晚于21:15的安排仍有效。
- 日期/时刻控件同时接收input与change，兼容日期选择器只提交change事件，避免显示值与草稿不同。仍需用户确认才写入，取消不保存、失败保留草稿。
- 根据用户补充，系统提示和工具字段说明明确Asia/Shanghai、24小时补零、日期/时刻/完整时间格式、分钟精度与不带秒/时区；区分range/deadline/pending/none，规定跨午夜/跨多日使用实际结束日期、已知部分保留body、未知不猜及多个提醒整数数组。提醒0=到时，不用逗号字符串。工具报错先纠正，不能声称成功。

## 验证

- 50个Node文件346项通过，含新增格式等价/非法数据、旧草稿确认/局部更新，以及实际模型请求里的提示/工具说明和错误后参数纠正（模拟接口，不调用付费模型）。
- 14项隔离浏览器检查通过：旧草稿显示/存储一致、确认前无记录、不改时间直接保存、提醒0/位置/地点不丢、change事件改值、22:30、跨午夜、直接卡片确认、截止时刻、反向/缺失时间不写入、待定安排、新AI草稿到真实本机持久层和无运行异常。全部虚构数据、独立上下文。
- Android全量编译、原签名/155运行资源/DEX生产CSP核验通过。本轮不改原生输入窗口；Android实机仍需用户复测，未以浏览器替代厂商WebView。test.14原件保持不变。

证据：前端qa/time-confirmation-report.json、time-confirmation-node-report.json、time-confirmation-node.txt及time-confirmation-invalid-end.png；修改前复现脚本time-confirmation-repro.mjs。文档：前端AI-CONTROLS.md。备份：../folio-backups/before-time-confirmation-20261023.zip。

仅本地测试，未推送/发布GitHub；公开稳定版仍v1.0.1。此前尚未交付的test.15编译候选（补充prompt前）分别移入本机folio-backups/test15-before-time-prompt-20261023及test15-before-multiday-wording-20261023保留；交付包为本文件校验值对应的最终包。
