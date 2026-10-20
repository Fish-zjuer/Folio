# 0.16-test · 构建与验证（2026-10-20）

## 交付物

- APK：`dist/folio-0.16-test.apk`
- 字节：537,936
- SHA256：`9751356eae55dca8ff3e9300cb0fd44359a6dbd80ae772f18140cbb2fdee6010`
- 原签名：证书 SHA-256 `8cf9e2f3bc7f3ee96f94c8c9a5d1a940bfb815decb4d2ac2a94761f75cb8e342`
- 源码包：`dist/folio-0.16-test-source.zip`，342 文件，1,274,107 字节，SHA256 `23fd22e5224cd9789f2fd50ddfba7b0f9bfdb0c0654f15a00f65ad081656d6f8`
- 0.15/0.14/0.13/0.12/0.11 保持原件。

## 本轮修正

1. 复习与闪卡三个操作按钮包进 `study-review-actions`，间距 12px，换行有行距；不再是两个黑胶囊贴在一起。
2. 作业拼图“拆解作业 / 查看步骤”与上方条目增加 8px 上距、16px 下距。
3. 学校作业刷新：本次 `/api/todos` 未返回的学校作业标 `remoteMissing`，便签 rail/incoming 不再显示；重新返回时恢复。这样已交作业即使接口不再返回，也不会继续挂便签。
4. 保留 0.15 的已完成作业不回挂、热力图展开、闪卡“开始学习”等修正。

## 验证

- 36 个前端 Node 测试文件通过。
- 117 项学习卡片 UI/挂载检查通过。
- `verify_build.py`：16/0.16-test、原签名、竖屏、118 个 Web 文件一致。
- 未连接真机、未用真实学校 SSO/模型 Key。
