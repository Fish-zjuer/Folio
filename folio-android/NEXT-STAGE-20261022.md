# V1.0后续快照 · 2026-10-22

> 最新：预览3也被真机证实协程JNI辅助类缺失；停止推荐2/3，改用独立Flutter预览4（code2004，同签名，20,695,223字节，SHA256 d03273b3ca061ea4bf2eff5fc4f36e9da3d3f94a62a0a25a636923aaa5b9b2fd）。按上游完整六类规则修复，最终DEX6类/8方法/4字段及旧包回归通过；界面和数据不变，未真机复测。后续段落为历史。

> 后续修订：Flutter预览2已被用户真机证实启动失败，不再推荐；最新独立包`../folio-cross-platform/dist/folio-flutter-preview-3-arm64.apk`（code2003，同一测试签名，20,678,839字节，SHA256 `02c5ef1f0dfb0898146979b158cf268e8161890c1d11ad6704c32d482c64a40b`）。修复R8/JNI描述符、补最终DEX验证；原设计首页/4便当/时钟/便签板及Luna限定学校页迁入，46测试/5张明暗浏览器截图通过，仍未真机复测。原网页345文件逐字节未变。详见Flutter STARTUP-REPAIR.md；下文为修订前快照，原APK保持。

单写者Codex，无agent调用。本轮继续0.23测试序列，仅稳定且重大更新时调整正式版名称。V1.0原件和GitHub发布保留，本轮没有推送/发布。

## 本地WebView包

- `dist/folio-0.23-test.apk`（101）已保留原件。
- 最新 `dist/folio-0.23-test.2.apk`（102），625,613字节，SHA256 `0123914e64f66aa6cd0abf93f7b4326a317be666cf353df0d0dd94b86e625f59`。原证书、139资源一致、无夹具/私钥核验通过。
- 源码ZIP：`folio-0.23-test.2-source.zip`，1,555,851字节，SHA256 `a7c311d2e0ff7e1e5b7bf34d39ca026b4a21752ed551a234689d5eec4abefa6e`，CRC/私钥排除检查通过。
- 含首批考试兼容/分页、页面子集、橙色暗色摄像头、学习记录/录音、7类真实AI设置、仅撤回手动拖出便签。
- 本修订补学校作业的本地卸下权限；queued不等于未挂上，不再建议复制同名个人事项。确认后保留原件、截止和队列，不自动重挂；学校原始字段/删除仍保护。详情可直接卸下。见RELEASE-0.23-test.2.md。
- 46个Node文件全部通过；新增5个权限事务检查和8项隔离浏览器流程。先前27项学习/误触/设置流程及33协议/19传输检查见上一记录。本轮未用真实模型、学校账号或麦克风。

## Flutter独立应用

目录 `../folio-cross-platform`，真实Flutter UI，独立ID，不能覆盖旧应用数据。已连接Android CAS/业务Cookie/原生加密凭据、Dart按账号/学期缓存及课程/考试/成绩/校历/学在待办，失败保留旧数据。真实AI请求和有界工具、可编辑确认、学校本地覆盖、四类实际设置、日记/笔记/录音播放、完整保留的对话历史、页面子集和明暗主题已经接通。

39项Flutter测试通过，analyze无问题，Web release与Android release通过。最终包`../folio-cross-platform/dist/folio-flutter-preview-2-arm64.apk`，20,228,068字节，SHA256 `e4dfef7447440a62ecaff3ecc7bba2b87b45af931a5518a483b7f5495c07979d`，code2002、独立包名、隔离测试签名，见同目录verification报告。没有用旧HTML作Flutter应用UI。复用14个SVG和已选折纸图标，但原26卡、便签板/卡片包、完整目标、通知、旧数据/音频导入等未迁完。

详见其README.md、MIGRATION.md、BACKEND-CONTRACT.md和VALIDATION.md；工具链来源和构建问题见相邻folio-toolchains/README.md。正式SDK/CI及真机验证仍缺。

## 接续

1. 真机验证0.23-test.2卸下和Flutter真实登录/麦克风/播放/系统主题/帧时间。
2. 先无损迁移旧数据，再按已接受几何把26卡、便签板、卡片包及二级菜单逐项迁入；参考原widgets/study/library.js和模型，不重新发明版式。
3. 目标/异常课程/通知和其余原生能力分模块迁移；相应功能生效后再开放AI控值，不开放无效设置或自动付费总结。
4. Elychron已审查，缓存和考试字段选择性参考；ETA等须验证适用学期，见ELYCHRON-REVIEW.md。

本轮备份 `../folio-backups/before-0.23-flutter2-20261022.zip`；测试服务4210仅前端、4212仅Flutter build/web，不服务签名/备份/整个工作区。
