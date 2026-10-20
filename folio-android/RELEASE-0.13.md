# 0.13-test · 构建与验证（2026-10-20）

## 交付物

- APK：`dist/folio-0.13-test.apk`
- 字节：537,936
- SHA256：`b4fb9fc680e7cd99f49e9505a2da5ad290a7ca4f7697c7846b1545707b696778`
- 签名：原 `signing/folio-test.jks`，证书 SHA-256 `8cf9e2f3bc7f3ee96f94c8c9a5d1a940bfb815decb4d2ac2a94761f75cb8e342`
- 源码包：`dist/folio-0.13-test-source.zip`，339 文件，1,269,016 字节，SHA256 `37806eaf818030f8f49952d75b9dbc66f78d502526a8630220e7f7d80b765c2f`
- 0.12-test、0.11-test 旧包保持原件，未覆盖。

## 本轮包含

1. 主界面 home↔workbench 翻页门槛降到 12px/0.04；菜单抽屉慢速小幅不误翻，需 44px/15%，落点点击抑制 700ms。
2. 学在浙大作业完成识别覆盖 `submitted/is_submit/...` 与“已提交（可修改）/待批阅/已批阅/已完成”；`schoolCompleted` 独立保存，便签 rail/incoming/pending 同步过滤。
3. 独立学习卡只保留应用槽一层圆角，参考卡背景透明、无内阴影；便当组合不变。
4. 复习与闪卡面板去掉橙色焦点边，`chat-deck` 改为不透明 `--bg-canvas` 面板，标题不再叠首页文字。
5. 闪卡扇恢复单击换序旋转、双击打开列表、上滑打开当前卡。
6. Agent 新增独立 `create_homework` 草稿操作，强制本机 `kind=homework`；确认文案“确认添加作业/添加作业”，仍不写学校、不提交。
7. 记录分片、当前学期 `termId`、当前学期学业统计、三件事/四象限排序等 0.12 后端修复一并保留。

## 验证

- 36 个前端 Node 测试文件全部通过；`agent-core.test` 6 项、`study-widget-core.test` 9 项。
- `RecordRepositoryTest` 9 项通过。
- `test_native.py` 20 项通过。
- 隔离 4196 浏览器：117 项学习卡片 UI/挂载、19 项后端流程通过。
- 浏览器实测：20px home↔workbench、菜单慢速 40px 回弹/60px 切换、闪卡单/双/上滑、AI `create_homework` 确认写入。
- `verify_build.py`：版本/签名/竖屏/118 个打包 Web 文件一致；无 QA/fixture/私钥。

**未连接真机、未用真实学校 SSO/模型 Key。** 真实学在浙大作业状态仍需用户刷新复测。
