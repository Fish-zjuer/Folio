/* 个人待办：内容、时间、重复和 App 内提醒。沿用白色分组与底部弹层。 */
function todoTimeLabel(item) {
  if (FolioTodo.mode(item)==="range") {
    const start=`${shortDate(item.startAt.slice(0,10))} ${item.startAt.slice(11)}`;
    const end=item.endAt.slice(0,10)===item.startAt.slice(0,10) ? item.endAt.slice(11) : `${shortDate(item.endAt.slice(0,10))} ${item.endAt.slice(11)}`;
    return `${start}—${end}`;
  }
  if (item.deadline) return `${shortDate(item.deadline)}${item.deadlineClock ? ` ${item.deadlineClock}` : ""} 截止`;
  if (item.occurrenceDay) return `${shortDate(item.occurrenceDay)} · 不设时段`;
  return "不设时间";
}
function todoRepeatLabel(item) {
  const rule=item.repeat;
  if (!rule || rule.kind==="none") return "不重复";
  const unit={daily:"天",weekly:"周",monthly:"个月"}[rule.kind];
  let text=`每 ${rule.interval||1} ${unit}`;
  if (rule.kind==="weekly") text+=` · ${rule.weekdays.map(n=>`周${["","一","二","三","四","五","六","日"][n]}`).join("、")}`;
  if (rule.until) text+=` · 至 ${shortDate(rule.until)}`;
  return text;
}
function todoReminderLabel(minutes) {
  if (minutes==null) return "不提醒";
  if (!minutes) return "到时提醒";
  return minutes%1440===0 ? `提前 ${minutes/1440} 天` : minutes%60===0 ? `提前 ${minutes/60} 小时` : `提前 ${minutes} 分钟`;
}
function renderRichTodos() {
  const container=document.getElementById("todo-list"); container.replaceChildren();
  const items=FolioTodo.listItems(homeworkState.items);
  const list=make("ul","settings-group todo-rich-list");
  items.forEach(item=>{
    const li=make("li","todo-rich-row");
    const button=action("",event=>openTodoDetail(item,event.currentTarget),"homework-entry");
    button.dataset.itemId=item.id; button.setAttribute("aria-label",`查看${item.title}`);
    const head=make("div","homework-headline"); head.append(make("h3","",item.title));
    if (item.completed) head.append(make("span","deadline-badge","已完成"));
    button.append(head);
    if (item.body) button.append(make("p","todo-content-preview",item.body));
    const flags=make("div","todo-flags");
    if(item.important) flags.append(make("span","todo-flag is-important","重要"));
    if(item.urgent) flags.append(make("span","todo-flag is-urgent","紧急"));
    if(item.kind==="event") flags.append(make("span","todo-flag","事项"));
    if(item.kind==="homework") flags.append(make("span","todo-flag","自定义作业"));
    if(!item.completed&&FolioQueue.important(item,window.FolioGoalUI?.queueOptions()))flags.append(make("span","todo-flag is-important",FolioQueue.urgency(item,homeworkState.today,window.FolioGoalUI?.queueOptions())!=="normal"?"🔥 抓紧完成":"重要课程作业"));
    if(flags.children.length) button.append(flags);
    button.append(make("p","homework-meta",todoTimeLabel(item)));
    if(item.repeat?.kind!=="none" && item.repeat) button.append(make("p","todo-rule-meta",`↻ ${todoRepeatLabel(item)}`));
    if(item.reminderMinutes!=null) button.append(make("p","todo-rule-meta",`${todoReminderLabel(item.reminderMinutes)} · App 内`));
    button.append(make("p",`homework-mount${item.mountedOn&&!item.completed ? " is-mounted" : ""}`,queueLabel(item)));
    li.append(button); list.append(li);
  });
  container.append(items.length ? list : make("p","list-empty","还没有待办，从右上角添加。"));
  updateTodoReminders();
}
function openTodoDetail(item,origin) {
  openHomeworkSheet(item.title,origin);
  homeworkBody.append(make("p","item-detail-meta",item.kind==="homework" ? "自定义作业" : item.kind==="event" ? "事项" : "个人待办"));
  if(FolioQueue.important(item,window.FolioGoalUI?.queueOptions()))homeworkBody.append(make("p","goal-course-reminder","重要课程作业，优先提前安排；截止前 3 天提醒。"));
  if(item.body) homeworkBody.append(make("p","todo-detail-content",item.body));
  const facts=make("dl","item-facts");
  const rows=[...(item.location?[["地点",item.location]]:[]),["时间",todoTimeLabel(item)],["重要性",item.important ? "重要" : "一般"],["紧急性",item.urgent ? "紧急" : "不紧急"],["重复",todoRepeatLabel(item)],["提醒",`${todoReminderLabel(item.reminderMinutes)}${item.reminderMinutes!=null ? " · App 内" : ""}`],["便签",queueLabel(item)]];
  rows.forEach(([label,text])=>facts.append(make("dt","",label),make("dd","",text))); homeworkBody.append(facts);
  const actions=make("div","item-actions");
  actions.append(action("编辑",event=>openTodoEditor(item,event.currentTarget),"small-action"));
  if(!item.completed && !item.repeatTemplate) {
    actions.append(action(item.parentId ? "完成本次" : "标记完成",()=>{FolioQueue.complete(item);closeHomeworkSheet();commit(item.parentId ? "本次已完成，后续重复安排仍保留" : "待办已完成");},"sheet-submit"));
    const moveControls=createQueueMoveControls(item);
    if(!item.mountedOn) actions.append(action("现在挂上",()=>moveControls.moveNow()));
    homeworkBody.append(moveControls.element);
  }
  homeworkBody.append(actions);
  if(item.parentId) {
    const next=homeworkState.items.filter(entry=>entry.parentId===item.parentId && !entry.completed && entry.occurrenceDay>item.occurrenceDay).sort((a,b)=>a.occurrenceDay.localeCompare(b.occurrenceDay))[0];
    if(next) homeworkBody.append(make("p","queue-hint",`下一次：${todoTimeLabel(next)}`));
  }
}
function selectField(label,options,selected) {
  const wrapper=make("label","queue-field"), input=make("select");
  options.forEach(([value,text])=>input.append(new Option(text,value))); input.value=selected;
  wrapper.append(make("span","",label),input); return {label:wrapper,input};
}
function checkField(label,checked) {
  const wrapper=make("label","queue-check"), input=make("input"); input.type="checkbox"; input.checked=Boolean(checked);
  wrapper.append(input,make("span","",label)); return {label:wrapper,input};
}
function openTodoEditor(selected,origin,preset={}) {
  const parent=selected ? homeworkState.items.find(item=>item.id===(selected.parentId||selected.id)) : null;
  const initialDate=preset.date||homeworkState.today;
  openHomeworkSheet(parent ? (parent.kind==="event"?"编辑事项":"编辑待办") : preset.kind==="event"?"添加事项":"添加待办与事项",origin);
  homeworkLayer.querySelector(".preview-sheet").classList.add("todo-edit-sheet");
  if(parent?.repeatTemplate) homeworkBody.append(make("p","queue-hint","正在编辑整组重复事项，下面的时间是首次安排。完成仍按每次分别记录。"));
  const form=make("form","queue-form todo-editor");
  function section(title) {const node=make("section","todo-form-section");node.append(make("h3","",title));form.append(node);return node;}
  const content=section("内容");
  const title=field("标题","text",parent?.title||""); title.input.required=true;title.input.maxLength=100;title.input.placeholder="简短说清要做什么";
  const bodyLabel=make("label","queue-field"), body=make("textarea");body.value=parent?.body||"";body.rows=4;body.maxLength=5000;body.placeholder="细节、步骤、材料、零碎的想法…";bodyLabel.append(make("span","","内容"),body);
  const kind=selectField("类型",[["todo","普通待办"],["event","事项"],["homework","自定义作业"]],parent?.kind||preset.kind||"todo");
  const course=field("关联课程（选填）","text",parent?.course||preset.course||"");course.input.maxLength=80;
  const location=field("地点（选填）","text",parent?.location||"");location.input.maxLength=160;
  content.append(title.label,bodyLabel,kind.label,course.label,location.label);
  const flags=section("重要与紧急");
  const important=checkField("重要",parent?.important), urgent=checkField("紧急",parent?.urgent);
  const flagRow=make("div","todo-check-row");flagRow.append(important.label,urgent.label);flags.append(flagRow);
  const timing=section("时间安排");
  const timeMode=selectField("时间方式",[["none","不设时间"],["deadline","截止时间"],["range","指定时间段"]],parent ? FolioTodo.mode(parent) : preset.timeMode||"none");timing.append(timeMode.label);
  const ddlSection=make("div","todo-time-fields");
  const deadline=field("截止日期","date",parent?.deadline||(preset.date||"")), deadlineClock=field("截止时刻（选填）","time",parent?.deadlineClock||"");
  deadlineClock.input.placeholder="23:59";ddlSection.append(deadline.label,deadlineClock.label);
  const rangeSection=make("div","todo-time-fields");
  const startDate=field("开始日期","date",parent?.startAt?.slice(0,10)||initialDate), startClock=field("开始时刻","time",parent?.startAt?.slice(11)||"09:00");
  const endDate=field("结束日期","date",parent?.endAt?.slice(0,10)||initialDate), endClock=field("结束时刻","time",parent?.endAt?.slice(11)||"10:00");
  [deadlineClock,startClock,endClock].forEach(entry=>{entry.input.pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]";entry.input.maxLength=5;entry.input.step="60";});
  startClock.input.required=true;endClock.input.required=true;
  rangeSection.append(startDate.label,startClock.label,endDate.label,endClock.label);timing.append(ddlSection,rangeSection);
  const recurrence=section("重复");
  const rule=selectField("重复周期",[["none","不重复"],["daily","每天"],["weekly","每周"],["monthly","每月"]],parent?.repeat?.kind||"none");recurrence.append(rule.label);
  const repeatSection=make("div","todo-repeat-fields");
  const firstDay=field("首次日期","date",parent?.createdDay||initialDate);
  const interval=field("间隔","number",parent?.repeat?.interval||1);interval.input.min="1";interval.input.max="365";interval.input.step="1";
  const weekFields=make("div","todo-weekdays");
  const defaultWeekday=(new Date(FolioTodo.value(FolioTodo.anchor(parent||{createdDay:initialDate})||initialDate)).getUTCDay()+6)%7+1;
  const weekdays=["周一","周二","周三","周四","周五","周六","周日"].map((day,index)=>{const check=checkField(day,parent?.repeat?.weekdays?.includes(index+1)||(!parent?.repeat?.weekdays && index+1===defaultWeekday));weekFields.append(check.label);return check.input;});
  let weekdaysDirty=Boolean(parent?.repeat?.weekdays?.length);
  weekdays.forEach(input=>input.addEventListener("change",()=>{weekdaysDirty=true;}));
  const until=field("重复结束日期（选填）","date",parent?.repeat?.until||"");
  repeatSection.append(firstDay.label,interval.label,weekFields,until.label);recurrence.append(repeatSection);
  const remind=section("提前提醒");
  const reminder=selectField("App 内提醒",[["none","不提醒"],["0","到时提醒"],["10","提前 10 分钟"],["30","提前 30 分钟"],["60","提前 1 小时"],["1440","提前 1 天"],["custom","自定义提前量"]],parent?.reminderMinutes==null ? "none" : parent.reminderChoice || ([0,10,30,60,1440].includes(parent.reminderMinutes) ? String(parent.reminderMinutes) : "custom"));
  const reminderCustom=make("div","todo-reminder-custom");
  const amount=field("提前量","number",parent?.reminderAmount ?? parent?.reminderMinutes ?? 15);amount.input.min="0";amount.input.max="525600";amount.input.step="1";
  const unit=selectField("单位",[["1","分钟"],["60","小时"],["1440","天"]],String(parent?.reminderUnit||1));reminderCustom.append(amount.label,unit.label);
  const reminderHint=make("p","queue-hint","先设定截止时间或开始时间，再设置提前提醒。");remind.append(reminder.label,reminderCustom,reminderHint);
  const queueSection=section("便签队列"), queue=checkField("加入便签队列",parent?.queued);
  queueSection.append(queue.label,make("p","queue-hint",parent?.repeatTemplate ? "对整个重复待办生效；每次安排独立挂载和完成。" : "默认不入队；选择后，与作业一起分批挂上。"));
  const error=make("p","form-error");error.setAttribute("role","alert");
  const saveBar=make("div","todo-save-bar"), submit=make("button","sheet-submit",parent ? "保存修改" : "添加");submit.type="submit";saveBar.append(error,submit);form.append(saveBar);
  function toggle(node,visible) {node.hidden=!visible;node.querySelectorAll("input,select,textarea").forEach(input=>{input.disabled=!visible;});}
  function updateFields() {
    toggle(course.label,kind.input.value!=="todo");toggle(location.label,kind.input.value==="event");
    toggle(ddlSection,timeMode.input.value==="deadline");toggle(rangeSection,timeMode.input.value==="range");
    toggle(repeatSection,rule.input.value!=="none");
    toggle(firstDay.label,rule.input.value!=="none" && timeMode.input.value==="none");
    toggle(weekFields,rule.input.value==="weekly");
    if(rule.input.value==="weekly" && !weekdaysDirty) {
      const date=timeMode.input.value==="range" ? startDate.input.value : timeMode.input.value==="deadline" ? deadline.input.value||homeworkState.today : firstDay.input.value;
      const weekday=(new Date(FolioTodo.value(date)).getUTCDay()+6)%7;
      weekdays.forEach((input,index)=>{input.checked=index===weekday;});
    }
    interval.label.querySelector("span").textContent=`间隔（${{daily:"天",weekly:"周",monthly:"月"}[rule.input.value]||"次"}）`;
    reminder.input.disabled=timeMode.input.value==="none";reminderHint.hidden=timeMode.input.value!=="none";
    toggle(reminderCustom,timeMode.input.value!=="none" && reminder.input.value==="custom");
  }
  [kind.input,timeMode.input,rule.input,reminder.input].forEach(input=>input.addEventListener("change",updateFields));updateFields();
  [firstDay.input,deadline.input,startDate.input].forEach(input=>input.addEventListener("change",updateFields));
  form.addEventListener("submit",event=>{
    event.preventDefault();
    const draft={title:title.input.value.trim(),body:body.value.trim(),kind:kind.input.value,course:kind.input.value!=="todo" ? course.input.value.trim() : "",location:kind.input.value==="event" ? location.input.value.trim() : "",
      source:"personal",important:important.input.checked,urgent:urgent.input.checked,timeMode:timeMode.input.value,createdDay:firstDay.input.value||homeworkState.today,
      deadline:timeMode.input.value==="deadline" ? deadline.input.value : null,deadlineClock:timeMode.input.value==="deadline" ? deadlineClock.input.value : null,
      startAt:timeMode.input.value==="range" ? `${startDate.input.value}T${startClock.input.value}` : null,endAt:timeMode.input.value==="range" ? `${endDate.input.value}T${endClock.input.value}` : null,
      repeat:{kind:rule.input.value,interval:Number(interval.input.value),weekdays:weekdays.flatMap((input,index)=>input.checked ? [index+1] : []),until:until.input.value||null},
      reminderMinutes:timeMode.input.value==="none" || reminder.input.value==="none" ? null : reminder.input.value==="custom" ? Number(amount.input.value)*Number(unit.input.value) : Number(reminder.input.value),
      reminderChoice:timeMode.input.value==="none" ? "none" : reminder.input.value,reminderAmount:Number(amount.input.value),reminderUnit:Number(unit.input.value),queued:queue.input.checked};
    try {FolioTodo.validate(draft);} catch(problem) {error.textContent=problem.message;return;}
    if(parent) {
      const queueChanged=Boolean(parent.queued)!==draft.queued;
      Object.assign(parent,draft);FolioQueue.setQueued(parent,draft.queued);
      if(queueChanged) homeworkState.items.filter(item=>item.parentId===parent.id).forEach(item=>{FolioQueue.setQueued(item,draft.queued);});
    } else homeworkState.items.push({...draft,id:`t-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,completed:false,mountedOn:null,mountDate:null});
    closeHomeworkSheet();commit(parent ? `${draft.kind==="event"?"事项":"待办"}已更新` : draft.queued ? "已添加并加入队列" : `已添加${draft.kind==="event"?"事项":"待办"}`);
  });
  homeworkBody.append(form);
}
function todoDemoNow() {
  const clock=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
  return `${homeworkState.today}T${clock}`;
}
function todoReminderEntries() {
  return homeworkState.items.map(item=>({item,at:FolioTodo.reminderAt(item)})).filter(entry=>entry.at).sort((a,b)=>a.at.localeCompare(b.at));
}
function updateTodoReminders() {
  const now=todoDemoNow(),ready=todoReminderEntries().filter(entry=>entry.at<=now).length;
  const button=document.getElementById("todo-reminders");button.textContent=ready ? `提醒 · ${ready}` : "提醒";
}
document.getElementById("todo-reminders").addEventListener("click",event=>{
  openHomeworkSheet("App 内提醒",event.currentTarget);
  const entries=todoReminderEntries(),now=todoDemoNow();
  homeworkBody.append(make("p","queue-hint",`示例日期：${shortDate(homeworkState.today)}。提醒以截止时刻或时间段开始时刻为准。`));
  if(!entries.length) homeworkBody.append(make("p","list-empty","暂无提醒，编辑待办时可设置。"));
  const list=make("ul","settings-group");
  entries.forEach(({item,at})=>{
    const li=make("li"),button=action("",event=>openTodoDetail(item,event.currentTarget),"homework-entry");
    button.append(make("h3","todo-reminder-title",item.title),make("p","homework-meta",`${shortDate(at.slice(0,10))} ${at.slice(11)} · ${at<=now ? "已到提醒时间" : "尚未到时间"}`));li.append(button);list.append(li);
  });if(entries.length) homeworkBody.append(list);
});
document.getElementById("add-todo").addEventListener("click",event=>openTodoEditor(null,event.currentTarget));
setInterval(updateTodoReminders,60000);
renderRichTodos();
