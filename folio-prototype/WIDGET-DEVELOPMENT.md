# Folio Widget API v1

四个槽位是组件宿主，不与内置组件清单绑定。用户仍可添加、留空、更换与长按换位。内置和开发者组件最终进入同一个 `FolioWorkbench` 注册表；不得在组件中自行改四格布局或假定固定位置。

## 五分钟接入

完整例子：`widgets/example/weekly-focus.js`；类型定义：`widgets/widget-api.d.ts`。

1. 在 `widgets/你的命名空间/` 写 JS、CSS 或 SVG。无需框架、构建器或后端服务。
2. 调用 `FolioWidgetSDK.register({...})`，ID 使用 `作者/组件名`，如 `example/weekly-focus`。重启后更新版本仍保留同一 ID，用户位置才不会丢失。
3. 把 `{id:'example/weekly-focus',script:'widgets/example/weekly-focus.js'}` 加到 `widgets/catalog.js` 的清单。示例默认未启用，不强行占用用户格子。
4. 打开工作台“+”，查看缩略图、所需数据并添加。移除再添加，核对计时器/订阅没有重复；在320/390/430宽度看正方形是否溢出。
5. Android构建会打包 `widgets/` 的JS/CSS/SVG/WOFF2。远程脚本、QA文件、私钥不允许进入运行清单。

```js
FolioWidgetSDK.register({
  apiVersion: 1,
  id: 'your-name/my-widget', version: '1.0.0', name: '我的组件',
  description: '一句话说明作用', permissions: ['focus'],
  preview(root, ctx) { /* 只画静态示意，不读用户数据。 */ },
  mount(root, ctx) {
    const value = document.createElement('strong'); root.append(value);
    ctx.subscribe('focus', data => {
      value.textContent = (data.lastWeek / 3600000).toFixed(1) + ' h';
    });
    // 自己创建的计时器、Observer、window事件等，必须清理。
    return () => value.remove();
  }
});
```

## 生命周期

- `preview`：浮层打开时创建，关闭或重开时销毁。不能读取真实数据、保存偏好或跳转；不要拿 `mount` 当缩略图实现。
- `mount`：只在添加、更换或应用恢复布局时执行。返回清理函数或 `{destroy()}`。更换/清空时先销毁，随后移除DOM；拖动换位保留同一实例，不重新挂载。
- `ctx.subscribe(dataset, callback)`：立即给一次快照，数据变化、返回工作台、恢复可见时更新；页面不在工作台时不推送。移除自动取消，也可调用返回的取消函数。计时类组件如需秒级重绘，应自己设置计时器并用 `ctx.onDispose()` 清理。
- `ctx.onDispose(fn)`：注册额外清理。即便组件自身销毁函数报错，宿主也会取消数据订阅。
- 一个组件挂载失败只显示该格错误，不应拖垮另外三格。

## 数据接口

必须先在 `permissions` 声明，再用 `ctx.read(name)` / `subscribe(name, fn)`。返回的是深拷贝、深冻结快照，禁止写原始学业数据；不会给账号密码、Cookie、模型配置或Key。

| 数据名 | 当前v1返回结构 | 边界 |
| --- | --- | --- |
| `courses` | 学期数组：id、label、stale、calendar、courses；课程有id/title/credits/teacher/sessions | 没同步不补示例；credits未知为null；不同学期不得混加 |
| `tasks` | 非重复模板的事项数组：id/title/kind/course/completed、截止/时段、便签状态 | 不包含账号、附件正文、模型数据；不要从DDL虚构工时 |
| `exams` | 所有学期已排考试：id/title/semesterId/courseId/date/start/end/room | 自行按学期筛选；未公布的时间不补造 |
| `academic` | `{summary,hidden,practice,example}`；summary中普通/主修/加权分开 | 遵守成绩隐藏及待揭晓；缺数据可能summary=null；不要读取原缓存绕过隐私 |
| `focus` | total/lastWeek/thisWeek/today（毫秒）、days、byDay（日期→毫秒）、buildings | 北京时间周一至周日，暂停不算，未结束搭建最多45min；预览不会产生成果 |

`ctx.dataMode`：`local`是Android本地记录，仍不代表学校已成功同步；`demo`是浏览器演示环境。`ctx.today`遵从应用当前日期（浏览器可能为可调演示日），专注历史按真实北京时间。字段新增兼容v1；字段移除或语义变化需要升级API主版本。

## 偏好与交互

`ctx.preferences.get('key', fallback)` / `.set('key', value)`只访问该组件命名空间。键限字母数字下划线短横线，单值最多64KB、JSON可序列化；不提供修改任务/目标的写接口。真实计时请进入宿主专注流程，避免另开一套相互不一致的记录。

`ctx.open('focus')`进入专注搭建；其余允许值见类型定义。只在组件可见且非预览时生效，不允许任意URL、网络请求或原生操作。按钮如需支持长按换位，设置 `button.dataset.widgetHold = ''`，宿主会处理长按、防误点、交换；普通按钮只负责自己的点击。不要在组件内劫持页面横滑。

根容器已适应槽位尺寸并裁切统一圆角。名称/说明由选择浮层显示，勿重复堆在卡片内；必要数字标签可以保留。建议用SVG或CSS容器单位，颜色延续暖纸色、灰绿、淡紫，CSS限定在自己的root内，避免全局选择器。尊重`prefers-reduced-motion`；不要持续运行离屏动效。

## 信任和发布边界

v1是**审核后随App一起打包的JS接口**，不是在线插件商店，也不是不可信代码沙箱。开发者脚本与宿主同一JS上下文，声明式权限是此SDK的访问约束，无法阻止恶意脚本绕开SDK直接访问宿主全局。Android的JavascriptInterface还会注入子frame，因此当前不提供“套个iframe就安全”的外部运行入口，CSP继续禁frame。

编入清单即需代码审查，不应加载未知远程代码。未来若做用户自行安装插件，应先提供真正隔离的执行环境、原生桥接来源认证、安装授权/撤销/更新验签；不能把v1接口称为已经具备这些能力。

兼容旧内置接口：`FolioWorkbench.apiVersion === 1`、`register`、`registerMany`、`listComponents`、`getLayout`继续可用。第三方作者优先使用SDK，以得到数据与生命周期支持；不要读取未文档化的宿主变量。


## 课表本地排除与通用事项（0.6）

`ctx.coursesOn(YYYY-MM-DD, termId?)` 要求声明 courses，返回已应用校历、调课和用户本地排除的只读当天课程；预览或销毁后的上下文不能读取。建议计算忙碌时段的组件使用此接口，而不是自行把原始 sessions 当实际排课。courses 快照也含 scheduleExclusions 供展示；排除更新会触发订阅。tasks 中 kind=event 为通用“事项”，可有 location/startAt/endAt/repeat，不应混入作业统计。
