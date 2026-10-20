# 学习组件后端逻辑（2026-10-20）

本文件记录新增 18 枚独立卡 + 8 枚三分区便当的**只读数据后端**。不改 CSS、不改卡片几何；前端 `single-bindings.js` / `bento-art.js` 只消费本模块输出。

## 分层

```
学校同步/本地记录/专注账本/番茄账本
        ↓  Widget API 只读快照
widget-sdk.js  (courses/tasks/exams/academic/focus/study)
        ↓
widgets/study/library.js  (按当前学期建 schedule，读 ctx)
        ↓
study-widget-core.js  (纯函数：校验、派生、优先级)
        ↓
single-bindings.js / bento-art.js  (只改 DOM 属性，不写记录)
```

`study-widget-core.js` 不访问 DOM、不读写 localStorage、不发网络请求；相同输入相同输出。持久化仍由 `RecordRepository`（Android `study`/`pomodoro`/`focus`）和 `study-store.js` / `pomodoro-store.js` 负责。

## 18 个独立组件的数据契约

| 组件 | 后端字段 | 真实来源 |
| --- | --- | --- |
| 专注蛇 | `activeMinutes`, `streak` | 番茄当前会话 + 专注账本 |
| 连胜蛇 | `streak` | 专注账本 `byDay` |
| 今日时间蛇 | `daySchedule`, `allTasks`, `courseProgress` | 当前学期课表/校历 + 待办/事项 |
| 考试沙漏 | `daysToExam`, `exams` | 当前学期有日期考试 |
| 待办与小芽 | `tasks` | 本机任务（含学校作业，不含 event） |
| 复习曲线 | `cards` | 本机闪卡 + 自评 |
| 绩点台阶 | `academic` | 成绩页同源摘要/目标/隐藏策略 |
| DDL 跑道 | `deadlines` | 未完成任务按截止时间 |
| 课程书脊 | `courseProgress` | 课表已结束课次/总课次 |
| 今日三环 | `focus`, `tasks`, `cards`, `reviewed`, `reviewDue`, `study` | 专注/任务/闪卡 |
| 考试多米诺 | `exams` | 当前学期考试排序 |
| 轻重缓急 | `pending`, `deadlines`, `tasks` | 重要/紧急 + 三天内截止 |
| 周积木 | `focusDays`, `schedule`, `courseProgress`, `nextClass` | 7 天专注 + 当前学期排课 |
| 昨夜月相 | `nights`, `study.sleepGoal` | 本机睡眠记录（缺失≠0） |
| 掌握度马赛克 | `cards` | 闪卡自评/复习间隔 |
| 闪卡扇 | `cards` | 闪卡队列 |
| 考试登山 | `daysToExam` | 最近未结束考试 21 天窗口 |
| 作业拼图 | `project`, `projects` | 已确认的作业计划步骤（按时长加权） |

## 8 个便当组合

`study/bento-today`、`-learning`、`-finals`、`-routine`、`-review`、`-tomato`、`-assignments`、`-grades` 复用上表字段；`contracts` 中逐项列出必需字段，缺字段会由测试直接失败。

## 本轮新增/修正

1. 新增 `study-widget-core.js`：把原先散在 `library.read` 的 `schedule/daySchedule/nextClass/courseProgress/activeMinutes/tomatoCount/卡片优先级` 收进纯后端；`library.read` 只负责取快照和构建学年日程。
2. **日程缓存失效**：原来只用 `courses[0]` 当缓存键，改校历、恢复/新增排课排除不会重建；现在键包含学期 id、`calendar`、全部课程和 `scheduleExclusions`。
3. `courseProgress` 只统计当前学期；无排课记录返回 `null`，不伪造 0%。
4. `activeMinutes` 仍只表示真实番茄当前会话（≤45 分钟）；番茄数只统计当天真正完成的会话；45 分钟搭建走专注账本，不混成番茄。
5. `cards` 的优先级由后端统一计算：重要课程优先、到期优先、临近上课优先；`reviewDue` 同步重算。
6. 空数据保持空：睡眠缺失为 `null`、咖啡未记录为 `null`、无考试/计划不生成占位。
7. 26 项契约测试（18 独立 + 8 便当）与日程缓存、空数据、重要课程优先级测试。

## 已修 / 未完成（2026-10-20 审计后）

### 已在 0.12–0.15-test 修复

1. **记录容量 2 MB 上限**：`RecordRepository` 改为 256 KB 分片 + 清单，最大 16 MB；旧格式可读，清单最后写，失败不推进 revision；`Vault` 清理旧分片。0.12 APK 已包含。
2. **当前学期 `courses[0]` 假设**：`library.read` 用 `FolioBackend.currentTerm()` 选学期，`study-core.model` 按 `termId` 选；显式传入后不再依赖数组顺序。
3. **“已交纸张”语义**：学校作业新增 `schoolCompleted`，只由学校完成字段置真；本地勾选只改 `completed`。作业便当改用 `schoolSubmitted`。
4. **学业卡学期作用域**：`academic-ui.overview()` 新增 `termSummary` / `termCourseGrades`；台阶与四环用当前学期，全量 `summary`/`series` 保留给成绩页。
5. **三件事/四象限排序**：新增 `plantTasks` / `quadrantTasks`，按重要、紧急、截止时间排序，不再按存储顺序取。

### 仍未完成

6. **真实学校数据未验收**：F15 课程读不全、F21 已完成作业状态仍未用真实账号闭环；组件数据再完整也不能补上学校同步本身缺失的课程/状态。
7. **日程仍在 `library.read` 构建**：`study-widget-core` 接收前端逐日 `coursesOn` 的 `schedule`；还没有原生排课索引。
8. **截断没有溢出提示**：`deadline` 有限槽位，`mosaic` 固定 48 格、`fan` 有限格；超出静默消失，没有“+N”或翻页。
9. **45 分钟搭建没有进入专注卡/番茄便当**：`focus` 蛇和 `focusBands` 只看 25 分钟番茄账本。
10. **专注/番茄没有原生后台服务**：应用退后台/被杀没有系统闹钟，只在回页面补算；跨午夜/进程重启未真机验证。
11. **本地记录没有备份/导出/迁移/跨设备**：失败无重试队列，native 与本地缓存分叉时只有错误事件。
12. **生产环境不校验契约**：26 项 `contracts` 只在测试里使用，缺字段仍可能静默显示空值。

### P2 — 产品语义/体验边界

13. **课程进度是“已结束课次/总课次”**，不是出勤/掌握/作业完成；`books`、`courseSquares` 容易被误读。
14. **睡眠/咖啡只支持手动录入**，没有传感器；这是明确的“未接入”，不是 bug。
15. **考试/倒计时只处理有日期的考试**；未定日期不猜测，`daysToExam` 会为空。
16. **闪卡复习是提醒估计**，`memory` 不是掌握度测量；AI 评分需确认，且依赖用户配置模型，无离线 AI。
17. **作业计划不会把学校作业标记为已提交**；步骤完成只影响拼图，符合安全边界，但用户可能期待联动。

### 验证盲区

- 36 个 Node 文件、117 项浏览器 UI、19 项隔离后端、20 项学校协议 + 9 项记录仓库 Java 测试通过；**没有真机、真实学校账号、真实模型 Key**。
- 后端 19 项使用 `study-integration.html` 的虚构原生桥接；`RecordRepositoryTest` 覆盖 90 万字符多分片往返，但未在 Android 真机跑 SharedPreferences 大记录。
- `study-widget-core.test` 用固定日期/虚构课程，不覆盖真实校历、跨午夜番茄、2000 张卡实际容量。
- 0.17-test 已打包，见 `../folio-android/RELEASE-0.17.md`；仍未发布 GitHub Release。

## 验证

- `node study-widget-core.test.cjs`：9项通过。
- 前端全量测试文件 36 个通过。
- 隔离浏览器 4196：117 项学习卡片 UI/挂载检查通过；后端流程 19 项通过（清空隔离 QA 存储后重跑）。
- 未打包 0.12，未真机。

## 边界

- 真实学校课表/成绩仍依赖同步；`schedule` 只由当前学期 `coursesOn` 构建，校历缺失时课程进度留空。
- `daysToExam` 用实际结束时间；没有日期/时间的考试不猜测。
- 闪卡复习间隔是提醒估计，不是掌握度测量；AI 评分必须草稿确认。
- 睡眠/咖啡/闪卡/计划都是本机记录，不与学校数据混写。
