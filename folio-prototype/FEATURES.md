# Celechron 功能核对与 Folio 菜单映射

来源：用户指定的官方仓库 https://github.com/Celechron/Celechron ，main 源码 ZIP，2026-10-14 下载。相邻 `Celechron-main` 是完整源码快照，不是带 Git 历史的克隆。源码未修改。

## 主入口

| Folio 入口 | 原有能力 | 源码位置 |
| --- | --- | --- |
| 接下来 | 今日安排、任务时间分配、规划与重新规划、任务执行进度 | `lib/page/flow/flow_view.dart`、`flow_controller.dart` |
| 日程 | 月历及学期日程视图、选定日期、课程与考试事件、添加及编辑日程 | `lib/page/calendar/calendar_view.dart`、`calendar_controller.dart` |
| 任务 | DDL 与固定日程、新建编辑、进度、暂停继续、完成及过期状态 | `lib/page/task/task_view.dart`、`task_edit_page.dart` |
| 学业 | 成绩概览、学期课程、作业、实践记点、课程搜索 | `lib/page/scholar/scholar_view.dart` |
| 设置 | 账号登录、教务偏好、日历同步和导出、主题、付款码、日志和关于；旧时间规划设置已从 Folio 移除 | `lib/page/option/option_view.dart` |

## 学业工具快捷入口

| Folio 入口 | 原有能力 | 源码位置 |
| --- | --- | --- |
| 日程内课表（已合并，无独立菜单入口） | 学期课表、前后半学期、课程详情 | `lib/page/scholar/course_schedule/course_schedule_view.dart` |
| 课程 | 学期课程列表及课程详情 | `lib/page/scholar/course_list/course_list_view.dart` |
| 考试 | 学期考试列表 | `lib/page/scholar/exam_list/exam_list_view.dart` |
| 成绩 | 成绩详情、多种绩点算法、学分与主修均绩 | `lib/page/scholar/grade_detail/grade_detail_view.dart` |
| 作业 | 学业页内的作业模块：总计、一天内、本周截止及作业卡片 | `lib/page/scholar/scholar_view.dart` 的 `_buildTodos` |
| 实践记点 | 第二、三、四课堂记点、明细、美育及劳育通过状态 | `lib/page/scholar/practice_score/practice_score_page.dart` |

课程搜索仍属于学业页。作业原为学业页内模块，现按用户要求新增独立完整作业页。

课表作为日程右侧的周视图，向左滑进入、向右滑返回；共用日程课程示例，切周、点击日期和课程详情可操作。课程列表/详情、日历和课表统一适配教学单双周、短学期及指定周次规则；真实校历起算与调休未接入，见 `TEACHING-WEEKS.md`。

课程入口已接通本地课程列表和详情，支持两个示例学期选择，展示教师、学分、课号、上课及考试安排和已有成绩。课程数和学分汇总独立于 UI，后续按用户指定浓缩到其他界面；未接入真实教务。详见 `COURSE-FEATURES.md`。

考试入口已接通本学期列表、倒计时与自定义考试编辑。日历以日期右上角小灰赤红点标记考试，没有考试日期底色；时间轴显示时间、教室和座号。同日多场按起止时间纵向排列并提示实际重叠，同一考试仓库供课程详情读取。AI 添加预留但未接入，详见 `EXAM-FEATURES.md`。

完整作业页与个人待办页可操作本地示例：完成、提前挂载、改日、自定义作业及可选入队。待办默认不入队。日程初稿已连接上述本地状态：月历、课程方块、当天课程/截止/挂载/待办和当前或下一节定位；课程仍为固定示例。未连接真实数据、工作台或手机通知；登录和映射表单仍为静态预览。

旧时间规划设置及可用工作时段页已移除，其他功能逐项决定。接入时只复用必要的原模型、控制器与数据库。页面与控件数量见 `DESIGN-INVENTORY.md`，队列规则见 `ASSIGNMENT-QUEUE.md`。

首页新增本机对话流程：文件/相册/拍照、模型与思考强度预览、历史恢复、逐条 usage 占位及持久 DDL 修改确认。快捷命令待设计，模型发现/按需内部工具/真实 usage 尚未连接，完整约定见 `AI-CHAT-REQUIREMENTS.md`。草稿只有确认/舍弃才结束，不因暂时离开被删除；确认后进入原有本地待办及日历数据投影。

“学业”/“成绩”入口已接通本地初稿：原始/本地方案、核心课绩点×1.2、主修归属覆写、恢复/撤销及按卡片独立的缓存刷新演示。原版成绩的五级制百分映射已核对；绩点取接口 `jd`，二级制水测不计 GPA。真实教务刷新和培养方案判定未接入，详见 `ACADEMIC-FEATURES.md`。
