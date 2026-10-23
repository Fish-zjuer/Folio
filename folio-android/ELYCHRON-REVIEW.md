# Elychron 后端审查（2026-10-22）

来源：[Elychron](https://github.com/Elyyyyyyyyxer/Elychron)，GPLv3/Celechron衍生项目。只读参考目录 `../Elychron-reference`，没有运行外部脚本或引入其前端。

本次从GitHub codeload取得源码快照；未核对到Git提交SHA，因此不能将它称为某个已固定提交。
归档SHA256：`03589a02c440ba2b7d2d74dc19e2e074d535785371b2c14be7ee15aadf12499a`。

## 有价值的部分

|文件|判断/处理|
|---|---|
|lib/http/timetable_fetch_policy.dart|按学期/日期控制空结果查询、减少无效请求有价值。Flutter新增纯策略实现：同学期、上海日期、手动强刷可绕过；测试覆盖。尚未接到现网抓取。|
|lib/http/calendar_config_parser.dart|远程→同学期缓存→本地估算的层次值得保留。估算必须标明，不能将一个学期的日期复制到另一个学期。|
|lib/http/zjuServices/eta.dart|当前学期课表备用源有潜力，但需独立CAS/Cookie适配及真实账号验证，不直接替换历史课表查询。未接入。|
|lib/http/zjuServices/zdbk.dart、lib/model/exam.dart|考试主要接口和当前字段与Folio基本相同，换库不能证明缺考场/座位已解决。旧版模型还记录了qzksdd、qmksdd、qmkssj等兼容字段，本轮Folio新增兼容解析。|
|lib/http/zjuServices/grs_new.dart|研究生接口与本科不同，不能靠本科字段兜底声称已支持研究生。仍待明确范围。|

本轮实际落地：本科考试分页完整读取后才替换缓存，失败保留缓存；兼容新旧地点/座位字段、HTML空白和全角冒号，不捏造缺失座位。Flutter纯缓存策略参考其思路实现，并标注来源。未引入其整套后端或替换现有登录。

“全面SOTA”是作者描述，不作为稳定性证据。后续优先验证ETA备用课表和同学期缓存策略；需要合成协议测试、有效空结果与错误空结果区分，以及未打开官网的真实登录验收。保留GPL来源与主项目许可。
