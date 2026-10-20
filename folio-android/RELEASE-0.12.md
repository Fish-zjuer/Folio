# 0.12-test · 构建与验证（2026-10-20）

> **注意：本包早于 13:00 五项体验修正（互滑/已交识别/独立卡圆角/面板焦点边/闪卡扇手势）。这些修正只在源码，尚未重新打包；本 APK 不能用于验收这五项。**

## 交付物

- APK：`dist/folio-0.12-test.apk`
- 字节：537,936
- SHA256：`b1aeccdc244d873a1ca92347d15e6662dab70dda4e85832ad3e23484015fd274`
- 签名：原 `signing/folio-test.jks`，证书 SHA-256 `8cf9e2f3bc7f3ee96f94c8c9a5d1a940bfb815decb4d2ac2a94761f75cb8e342`
- 源码包：`dist/folio-0.12-test-source.zip`，339 文件，1,265,513 字节，SHA256 `388078f61934ac4b6a453b54281a24cc0d666e128bdec06e6c1cd41e45e52959`
- 旧 `0.11-test` APK/源码包保持不变，未覆盖。

## 本轮修正

1. **大记录分片**：`RecordRepository` 从“2 MB 单字符串”改为 256 KB 分片 + 清单，最大 16 MB；旧格式仍可读，清单最后写入，失败不推进 revision。`Vault` 增加分片清理。
2. **显式当前学期**：`library.read` 用 `FolioBackend.currentTerm()` 选当前学期并把 `termId` 传给后端；`study-core.model` 按 `termId` 选学期，不再只依赖 `courses[0]`。
3. **区分“本地完成”和“学校已交”**：学校作业新增 `schoolCompleted`，只由学校完成字段置真；本地勾选只改 `completed`。作业便当的“已交纸张”改用 `schoolSubmitted`，本地完成不再冒充已交。
4. **学业卡按当前学期**：`academic-ui.overview()` 新增 `termSummary` / `termCourseGrades`；台阶显示当前学期均绩，四环取当前学期最近四科；全量 `summary` / `series` 保留给成绩页。
5. **三件事/四象限排序**：新增 `plantTasks` / `quadrantTasks`，按重要、紧急、截止时间排序，不再按存储顺序取前三/前十四。

## 验证

- 前端 36 个 Node 测试文件全部通过；`study-widget-core.test.cjs` 9 项通过。
- `RecordRepositoryTest` 9 项通过（含 90 万字符/多分片往返）。
- `test_native.py` 20 项通过。
- 隔离 4196 浏览器：117 项学习卡片 UI/挂载检查通过；清空隔离 QA 存储后，19 项后端流程通过。
- `verify_build.py`：版本/签名/竖屏/118 个打包 Web 文件一致；无 QA/fixture/私钥。
- **未连接真机、未用真实学校 SSO、未用真实模型 Key**；安装与真机表现待用户复测。

## 已知未完成

- 真实学校 F15 课程完整性、F21 作业完成状态仍待真实账号验收。
- 番茄/专注没有原生后台闹钟，退后台/杀进程的完成通知未真机验证。
- 本地记录仍无导出/导入/跨设备迁移。
- 45 分钟“专注搭建”未进入番茄新组件；睡眠/咖啡仍手填。
- 0.12 未发布 GitHub Release。
