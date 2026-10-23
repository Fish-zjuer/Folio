# 0.23-test.13 · 学校账号原生输入（2026-10-23）

本地APK：`dist/folio-0.23-test.13.apk`，704,675字节，versionCode114，原签名，可覆盖test.12与v1.0.1。

SHA256：`6c8acaa14a08333f8ee7ef6c46479430fd46b7cece34ce43e1f8c5d39b2385`。

## 问题与变更

用户确认：Folio“教务连接”的学号密码输入每增删字符仍被厂商密码箱打断。test.11/12关闭WebView自动填充及HTML autocomplete没有解决这台手机的实际问题；此前不应将浏览器属性检查当作真机修复证明。

- 教务连接不再生成网页学号/密码输入框，改由独立原生SchoolAccountEditor输入，控件创建一次并保持稳定。默认遮住密码，提供学号下一项/密码完成操作，与App一致的暖白/深炭底色、紧凑矩形按钮。
- 原生字段排除自动填充与内容捕获，getAutofillType=NONE、getAutofillValue=null、onProvideAutofillStructure不提供文本；使用不记录输入和不弹全屏编辑的IME标记。不关闭系统全局密码箱、不修改输入法或第三方密码管理设置。
- 原生窗口直接调用现有SchoolSession与加密Vault保存，只返回账号状态（不返回密码）给网页；点击“登录并同步”后接回现有账号隔离与一次同步流程。已有账号仍一键更新，点更换账号才重新输入。
- 取消不保存；重复点击不重复开窗；关闭父面板/请求取消/销毁时清理窗口和未提交文本，迟到回包不触发同步。输入窗口请求允许5分钟，保存过程防止重复提交。更换账号前验证当前账号版本并清理旧会话。
- 官方网页登录窗口未改变；原签名、数据目录与学校协议不变。原生输入窗口使用FLAG_SECURE保护凭据，未增加权限。

## 验证与限制

- Android34全量Java编译成功，原签名、155运行资源与DEX内CSP核验通过，无QA夹具或私钥。
- 新13项隔离浏览器桥接检查通过：无HTML登录字段、空参数打开原生编辑、取消不写/不登录、保存后单次同步、账号元信息显示、已有账号直更、更换入口、无JS凭据写入、重复点击、父面板关闭取消、迟到回包、无效结果拒绝与无异常。
- 上一轮21项成绩/导航/课表/官方登录请求竞争回归通过；50个Node文件341项、原生学校网络28项、学校协议33项通过。
- 以上浏览器检查使用虚构桥接，不能实际打开Android原生窗口，也不能证明厂商密码箱不再弹出。没有这台手机/厂商密码箱的实测结果；此包是待真机验证的修复候选。优先复测连续输入、连续删除、切换字段和取消后重开。

技术参考：[Android Autofill视图排除说明](https://android-developers.googleblog.com/2017/11/getting-your-android-app-ready-for.html)、[EditorInfo隐私标记](https://developer.android.com/reference/android/view/inputmethod/EditorInfo#IME_FLAG_NO_PERSONALIZED_LEARNING)。标记是对服务/输入法的请求，不代替厂商实测。

旧包全部保留，未更新GitHub正式版。源码ZIP与校验文件同目录。备份：`../folio-backups/before-native-school-entry-20261023.zip`。
