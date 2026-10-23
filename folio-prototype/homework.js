/* 本轮只操作本地示例；真实教务数据、日历界面和工作台便签留待接入。 */
const homeworkDemo = Object.freeze({
  today: window.FolioApp?.native ? FolioBackend.today() : "2026-10-14",
  storageKey: "folio-homework-demo-v1",
  schoolUrl: "https://courses.zju.edu.cn/",
  homework: [
    ["h01", "极限与连续 · 习题三", "微积分", "2026-10-15", "2026-10-09"],
    ["h02", "实验报告：运动与测量", "大学物理", "2026-10-16", "2026-10-10"],
    ["h03", "矩阵与线性方程组", "线性代数", "2026-10-19"],
    ["h04", "链表练习", "数据结构", "2026-10-20"],
    ["h05", "积分应用 · 习题四", "微积分", "2026-10-21"],
    ["h06", "阅读笔记", "大学英语", "2026-10-21"],
    ["h07", "电路分析练习", "电路基础与电子技术综合实验", "2026-10-22"],
    ["h08", "实验预习", "大学物理", "2026-10-23"],
    ["h09", "概率分布 · 习题二", "概率论", "2026-10-24"],
    ["h10", "程序设计小练习", "程序设计", "2026-10-25"],
  ],
});

function freshHomeworkState() {
  if(window.FolioApp?.native)return {version:1,today:homeworkDemo.today,weights:[0,0,0,0,25,45,30],weekendLimit:3,view:"compact",items:[]};
  return {version: 1, today: homeworkDemo.today, weights: [0,0,0,0,25,45,30], weekendLimit: 3, view: "compact", items: [
    ...homeworkDemo.homework.map(([id,title,course,deadline,mountedOn]) => ({id,title,course,deadline,
      source: "school", kind: "homework", queued: true, completed: false, manualDate: false,
      mountDate: mountedOn || null, mountedOn: mountedOn || null})),
    {id: "t01", title: "补充课堂上的手写作业", course: "微积分", deadline: "2026-10-21",
      source: "personal", kind: "homework", queued: false, completed: false, mountDate: null, mountedOn: null},
    {id: "t02", title: "整理本周笔记", course: "", deadline: "2026-10-18",
      source: "personal", kind: "todo", queued: false, completed: false, mountDate: null, mountedOn: null},
  ]};
}
let homeworkState = freshHomeworkState();
try {
  const saved = JSON.parse(localStorage.getItem(homeworkDemo.storageKey));
  if (saved && saved.version === 1 && Array.isArray(saved.items) && saved.items.every(item => typeof item.title === "string" && typeof item.id === "string")) {
    FolioQueue.dateValue(saved.today); FolioQueue.quotas(0, saved.weights);
    saved.items.forEach(item => { if (item.deadline) FolioQueue.dateValue(item.deadline); if (item.mountDate) FolioQueue.dateValue(item.mountDate); });
    homeworkState = saved;
    if (homeworkState.weights.length === 3) homeworkState.weights = [0,0,0,0,...homeworkState.weights];
    // 更新内置长名称示例，保留挂载、完成和用户新增事项。
    const sample=homeworkState.items.find(item=>item.source === "school" && item.id === "h07" && item.course === "电路基础");
    if (sample) sample.course=homeworkDemo.homework.find(row=>row[0] === "h07")[2];
  }
} catch { /* 存储不可用或旧数据不兼容时使用示例。 */ }
if(window.FolioApp?.native)homeworkState.today=FolioBackend.today();

let homeworkFilter = "all";
let homeworkView = homeworkState.view === "list" ? "list" : "compact";
const homeworkLayer = document.getElementById("homework-sheet-layer");
const homeworkBody = document.getElementById("homework-sheet-content");
const homeworkClose = document.getElementById("homework-sheet-close");
let homeworkOrigin = null;
const noticeStack = (() => {
  const stack = document.createElement("div");
  stack.className = "notice-stack"; stack.id = "notice-stack"; stack.setAttribute("aria-live", "polite");
  const legacy = document.getElementById("homework-feedback"), phone = document.querySelector(".phone");
  if (legacy?.parentNode) legacy.parentNode.insertBefore(stack, legacy); else if (phone) phone.append(stack); else document.body.append(stack);
  if (legacy) { legacy.hidden = true; legacy.setAttribute("aria-hidden", "true"); }
  return stack;
})();
function syncNoticeOffset() {
  const phone = document.querySelector(".phone");
  if (!phone) return;
  const height = noticeStack.getBoundingClientRect().height;
  phone.style.setProperty("--notice-stack-height", `${height}px`);
  phone.classList.toggle("has-notice-stack", height > 0);
}
if (typeof ResizeObserver === "function") new ResizeObserver(syncNoticeOffset).observe(noticeStack);
["homework", "tasks"].forEach(name => {
  previewScreens[name] = document.getElementById(`${name}-screen`);
  screenNames[name] = name === "homework" ? "作业" : "待办";
  screenFocusTargets[name] = previewScreens[name].querySelector("[data-back-menu]");
});
document.querySelectorAll("[data-back-menu]").forEach(button => button.addEventListener("click", () => goBack("menu")));
document.getElementById("homework-to-tasks").addEventListener("click", () => showPreviewScreen("tasks"));

const shortDate = date => date ? `${Number(date.slice(5,7))} 月 ${Number(date.slice(8,10))} 日` : "未设置";
function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function action(text, handler, className = "small-action") {
  const button = make("button", className, text); button.type = "button";
  button.addEventListener("click", handler); return button;
}
function announce(text) {
  const toast = document.createElement("p");
  toast.className = "demo-toast"; toast.setAttribute("role", "status"); toast.textContent = text;
  noticeStack.prepend(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  const dismiss = () => {
    if (!toast.isConnected) return;
    toast.classList.add("is-leaving");
    setTimeout(() => { toast.remove(); syncNoticeOffset(); }, 180);
  };
  const timer = setTimeout(dismiss, 2800);
  toast.addEventListener("click", () => { clearTimeout(timer); dismiss(); });
  syncNoticeOffset();
  return toast;
}
function commit(message) {
  const focusedItem = document.activeElement?.dataset.itemId;
  homeworkState.items=FolioTodo.materialize(homeworkState.items,homeworkState.today);
  FolioQueue.plan(homeworkState.items, homeworkState.weights, window.FolioGoalUI?.queueOptions());
  const queueClock=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
  FolioQueue.advance(homeworkState.items, homeworkState.today, queueClock);
  try { localStorage.setItem(homeworkDemo.storageKey, JSON.stringify(homeworkState)); } catch { /* 离线文件或限制存储时保持本轮操作。 */ }
  renderHomework(); renderTodos();
  document.dispatchEvent(new Event("folio-data-change"));
  if (focusedItem) {
    const row = [...previewScreens[currentScreen].querySelectorAll("[data-item-id]")].find(button => button.dataset.itemId === focusedItem);
    (row || screenFocusTargets[currentScreen]).focus({preventScroll:true});
  }
  if (message) announce(message);
}
function queueLabel(item) {
  if (item.completed) return "已完成";
  if (!item.queued) return "未加入便签队列";
  if (item.mountedOn) return `已挂上 · ${shortDate(item.mountedOn)}`;
  return item.mountDate ? `${shortDate(item.mountDate)}${item.mountClock?" 下午":""}挂上` : "已入队 · 待设置挂载日";
}
function entryRow(item) {
  const li = make("li", "homework-row");
  const titleButton = action("", event => openItem(item, event.currentTarget), "homework-entry");
  titleButton.setAttribute("aria-label", `查看${item.title}`);
  titleButton.dataset.itemId = item.id;
  const headline = make("div", "homework-headline");
  headline.append(make("h3", "", item.title));
  const urgency = FolioQueue.urgency(item, homeworkState.today, window.FolioGoalUI?.queueOptions());
  if (item.completed) headline.append(make("span", "deadline-badge", "已完成"));
  else if (urgency !== "normal") headline.append(make("span", "deadline-badge is-urgent", urgency === "overdue" ? "已逾期" : FolioQueue.important(item,window.FolioGoalUI?.queueOptions()) ? "🔥 抓紧完成" : "临近截止"));
  const timeText=item.source==="personal" && typeof todoTimeLabel==="function" ? todoTimeLabel(item) : item.deadline ? `${shortDate(item.deadline)}截止` : "无截止日期";
  titleButton.append(headline, make("p", "homework-meta", `${item.course ? `${item.course} · ` : ""}${timeText}`),
    make("p", `homework-mount${item.mountedOn && !item.completed ? " is-mounted" : ""}`, queueLabel(item)));
  li.append(titleButton);
  return li;
}
function heatmapCell(items, date, subject) {
  const entries=FolioQueue.pendingOn(items,date);
  const density=entries.length === 0 ? "empty" : entries.length === 1 ? "one" : "many";
  const cell=entries.length ? action("",event => {
    if (entries.length === 1) openItem(entries[0],event.currentTarget);
    else {
      openHomeworkSheet(`${subject} · ${shortDate(date)}`,event.currentTarget);
      const list=make("ul","settings-group heatmap-day-list");
      entries.forEach(item=>list.append(entryRow(item))); homeworkBody.append(list);
    }
  },`heatmap-cell is-${density}`) : make("span","heatmap-cell is-empty");
  cell.append(make("span","heatmap-square"));
  if (entries.length) {
    cell.setAttribute("aria-label",`${subject}，${shortDate(date)}${entries.every(item=>item.deadline) ? "截止" : "安排"}，${entries.length}份作业`);
    cell.dataset.heatmapDate=date; cell.dataset.heatmapSubject=subject; cell.dataset.count=entries.length;
    if (entries.length === 1) cell.dataset.itemId=entries[0].id;
    cell.title=entries.map(item=>item.title).join("、");
  } else cell.setAttribute("aria-hidden","true");
  return cell;
}
function renderHeatmap(container, items) {
  if (!items.length) { container.append(make("p","list-empty","这里还没有作业")); return; }
  const dates=Array.from({length:14},(_,index)=>new Date(FolioQueue.dateValue(homeworkState.today)+index*86400000).toISOString().slice(0,10));
  const panel=make("section","homework-heatmap"); panel.setAttribute("aria-label","按计划日期展示的未来两周作业热力图");
  const heading=make("div","heatmap-heading"); heading.append(make("h2","","未来两周"));
  const legend=make("div","heatmap-legend"); legend.setAttribute("aria-label","未完成数量：灰色零份，橙色一份，红色两份及以上");
  [["empty","0"],["one","1"],["many","2+"]].forEach(([density,text])=> { const key=make("span",`legend-key is-${density}`); key.append(make("i","heatmap-square"),make("span","",text)); legend.append(key); });
  heading.append(legend);
  const weeks=make("div","heatmap-weeks");
  const md=date=>`${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`;
  weeks.append(make("span","",items.some(item=>!item.deadline) ? "计划日" : "截止日"),make("span","",`${md(dates[0])}—${md(dates[6])}`),make("span","",`${md(dates[7])}—${md(dates[13])}`));
  const axis=make("div","heatmap-row heatmap-axis"); axis.setAttribute("aria-hidden","true"); axis.append(make("span",""));
  dates.forEach((date,index)=>axis.append(make("span",index===0 ? "is-today" : "",String(Number(date.slice(8,10))))));
  panel.append(heading,weeks,axis);
  const courseRegion=make("div","heatmap-course-region");
  const courses=make("div","heatmap-courses"); courses.tabIndex=0; courses.setAttribute("role","region"); courses.setAttribute("aria-label","课程列表，可上下滚动");
  const more=action("",()=>{
    if(courses.classList.contains("is-expanded")){courses.classList.remove("is-expanded");courses.scrollTop=0;updateMore();return;}
    courses.classList.add("is-expanded");updateMore();
  },"heatmap-more");
  function row(name,entries,total=false) {
    const node=make("div",`heatmap-row${total ? " heatmap-total" : ""}`);
    let label;
    if (total) label=make("span","heatmap-subject",name);
    else {
      label=action("",event=>{
        openHomeworkSheet(name,event.currentTarget);
        const list=make("ul","settings-group heatmap-day-list"); entries.forEach(item=>list.append(entryRow(item))); homeworkBody.append(list);
      },"heatmap-subject subject-name-button");
      const window=make("span","subject-name-window"); window.append(make("span","subject-name-text",name));
      label.append(window); label.title=name; label.setAttribute("aria-label",`查看课程全名与作业：${name}`);
    }
    node.append(label); dates.forEach(date=>node.append(heatmapCell(entries,date,name))); (total ? panel : courses).append(node);
  }
  row("合计",items,true);
  const subjects=new Map();
  items.forEach(item=> { const name=FolioQueue.homeworkSubject(item); if (!subjects.has(name)) subjects.set(name,[]); subjects.get(name).push(item); });
  subjects.forEach((entries,name)=>row(name,entries));
  courseRegion.append(courses,more); panel.append(courseRegion);
  container.append(panel);
  const outside=items.filter(item=>!item.completed && !dates.includes(FolioQueue.dateFor(item)));
  if (outside.length) {
    const undated=outside.filter(item=>!FolioQueue.dateFor(item)).length,dated=outside.length-undated;
    const description=[dated ? `窗口外 ${dated} 份` : "",undated ? `未设日期 ${undated} 份` : ""].filter(Boolean).join(" · ");
    container.append(action(`${description} · 查看列表`,()=>{homeworkView="list"; homeworkState.view="list"; commit();},"text-action heatmap-outside"));
  }
  const nameAnimations=new WeakMap();
  const motionPreference=matchMedia("(prefers-reduced-motion: reduce)");
  function updateCourseNames() {
    const viewport=courses.getBoundingClientRect();
    courses.querySelectorAll(".subject-name-window").forEach(window=>{
      const text=window.querySelector(".subject-name-text");
      const previous=nameAnimations.get(text);
      const distance=Math.max(0,text.scrollWidth-window.clientWidth);
      const bounds=window.getBoundingClientRect();
      const visible=bounds.top>=viewport.top-1 && bounds.bottom<=viewport.bottom+1;
      if (!window.clientWidth || distance<1 || !visible || motionPreference.matches) {
        previous?.animation.cancel(); nameAnimations.delete(text); return;
      }
      if (previous && Math.abs(previous.distance-distance)<1) return;
      previous?.animation.cancel();
      const hold=1500, travel=Math.max(1800,distance/18*1000), returnTime=700;
      const duration=hold+travel+hold+returnTime;
      const animation=text.animate([
        {transform:"translateX(0)",offset:0},
        {transform:"translateX(0)",offset:hold/duration},
        {transform:`translateX(-${distance}px)`,offset:(hold+travel)/duration},
        {transform:`translateX(-${distance}px)`,offset:(hold+travel+hold)/duration},
        {transform:"translateX(0)",offset:1},
      ],{duration,iterations:Infinity,easing:"linear"});
      nameAnimations.set(text,{distance,animation});
    });
  }
  function updateMore() {
    const expanded=courses.classList.contains("is-expanded");
    const bottom=courses.getBoundingClientRect().bottom;
    const unseen=expanded?0:[...courses.children].filter(node=>node.getBoundingClientRect().bottom>bottom+1).length;
    more.textContent=expanded?"收起课程 ↑":unseen?`展开全部课程（还有 ${unseen} 门）↓`:"";
    more.style.visibility=(unseen||expanded)?"visible":"hidden";
    more.disabled=!unseen&&!expanded; more.setAttribute("aria-hidden",String(!unseen&&!expanded));
    courseRegion.classList.toggle("has-more",Boolean(unseen)&&!expanded);
    courseRegion.classList.toggle("is-expanded",expanded);
  }
  courses.addEventListener("scroll",()=>{updateMore();updateCourseNames();},{passive:true});
  const observer=new ResizeObserver(()=>{if (!courses.isConnected) {observer.disconnect();return;} updateMore();updateCourseNames();}); observer.observe(courses);
  motionPreference.addEventListener("change",updateCourseNames);
  const cleanup=new MutationObserver(()=>{
    if (courses.isConnected) return;
    courses.querySelectorAll(".subject-name-text").forEach(text=>nameAnimations.get(text)?.animation.cancel());
    motionPreference.removeEventListener("change",updateCourseNames); observer.disconnect(); cleanup.disconnect();
  }); cleanup.observe(container,{childList:true});
  courses.scrollTop=Number(container.dataset.courseScroll || 0); updateMore(); updateCourseNames();
}
function renderHomework() {
  const school = FolioQueue.homeworkItems(homeworkState.items);
  document.getElementById("demo-day-value").textContent = homeworkState.today.replaceAll("-", " / ");
  document.getElementById("homework-count").textContent = `全部 ${school.length} 份 · 未完成 ${school.filter(item => !item.completed).length} 份`;
  const monday = FolioQueue.dateValue(FolioQueue.weekendFor(homeworkState.today)[0]) + 3 * 86400000;
  const nextMonday = new Date(monday + 7 * 86400000).toISOString().slice(0,10);
  const afterNext = new Date(monday + 14 * 86400000).toISOString().slice(0,10);
  const nextWeek = school.filter(item => FolioQueue.dateFor(item) >= nextMonday && FolioQueue.dateFor(item) < afterNext);
  document.getElementById("weekend-summary").textContent = `下周 ${nextWeek.length} 份 · ${nextWeek.filter(item=>item.queued && !item.completed).length} 份入队`;
  document.querySelectorAll("[data-homework-view]").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.homeworkView === homeworkView)));
  document.getElementById("homework-status-filters").hidden=homeworkView === "compact";
  const filtered = school.filter(item => homeworkFilter === "all" || (homeworkFilter === "completed" ? item.completed : !item.completed));
  const container = document.getElementById("homework-list");
  const courseScroll=container.querySelector(".heatmap-courses"); if (courseScroll) container.dataset.courseScroll=courseScroll.scrollTop;
  container.replaceChildren();
  container.classList.toggle("is-compact",homeworkView === "compact");
  container.closest(".homework-scroll").classList.toggle("heatmap-mode",homeworkView === "compact");
  if (homeworkView === "compact") {
    // 列表筛选仅属于列表；热力图恒按全部课程的未完成数量显示密度。
    renderHeatmap(container,school);
    return;
  }
  const groupRules = [
    ["已过计划日", item => FolioQueue.dateFor(item) && FolioQueue.dateFor(item)<homeworkState.today],
    ["本周", item => FolioQueue.dateFor(item)>=homeworkState.today && FolioQueue.dateFor(item)<nextMonday],
    ["下周", item => FolioQueue.dateFor(item)>=nextMonday && FolioQueue.dateFor(item)<afterNext],
    ["之后", item => FolioQueue.dateFor(item)>=afterNext],
    ["未设日期", item => !FolioQueue.dateFor(item)],
  ];
  groupRules.forEach(([caption,match]) => {
    const items = filtered.filter(match);
    if (!items.length) return;
    const section = make("section", "homework-section");
    const title = make("h2", "settings-section-title", caption);
    const list = make("ul", "settings-group");
    items.forEach(item => list.append(entryRow(item))); section.append(title,list); container.append(section);
  });
  if (!filtered.length) container.append(make("p", "list-empty", "这里还没有作业"));
}
function renderTodos() {
  if (typeof renderRichTodos==="function") {renderRichTodos();return;}
  const container = document.getElementById("todo-list"); container.replaceChildren();
  const list = make("ul", "settings-group");
  homeworkState.items.filter(item => item.source === "personal").forEach(item => list.append(entryRow(item)));
  if (list.children.length) container.append(list);
  else container.append(make("p", "list-empty", "还没有待办，从右上角添加。"));
}
document.querySelectorAll("[data-homework-filter]").forEach(button => button.addEventListener("click", () => {
  homeworkFilter = button.dataset.homeworkFilter;
  document.querySelectorAll("[data-homework-filter]").forEach(control => control.setAttribute("aria-pressed", String(control === button)));
  renderHomework();
}));
document.querySelectorAll("[data-homework-view]").forEach(button => button.addEventListener("click",() => {
  homeworkView=button.dataset.homeworkView; homeworkState.view=homeworkView; commit();
}));
document.getElementById("demo-day").addEventListener("click", event => {
  openHomeworkSheet("示例日期",event.currentTarget);
  const calendar=FolioDate.create(homeworkState.today,value => {
    homeworkState.today=value; closeHomeworkSheet(); commit("示例日期已切换，已挂便签继续保留");
  });
  homeworkBody.append(calendar.element);
});

let homeworkCloseTimer=null,homeworkBlocked=[];
function openHomeworkSheet(title, origin) {
  clearTimeout(homeworkCloseTimer);homeworkLayer.classList.remove("is-closing");
  if(homeworkLayer.hidden)homeworkBlocked=[...document.querySelector(".phone").children].filter(n=>n!==homeworkLayer).map(n=>[n,n.inert]);
  homeworkBlocked.forEach(([n])=>{n.inert=true;});
  homeworkLayer.querySelector(".preview-sheet").classList.remove("todo-edit-sheet","gap-sheet");
  homeworkOrigin = origin;
  document.getElementById("homework-sheet-title").textContent = title;
  homeworkBody.replaceChildren(); previewScreens[currentScreen].inert = true;
  homeworkLayer.querySelector(".preview-sheet").scrollTop=0;
  homeworkLayer.hidden = false; homeworkClose.focus({preventScroll:true});
}
function closeHomeworkSheet(immediate=false) {
  clearTimeout(homeworkCloseTimer);if(homeworkLayer.hidden)return;
  const finish=()=>{homeworkLayer.hidden=true;homeworkLayer.classList.remove("is-closing");homeworkBlocked.forEach(([n,v])=>{n.inert=v;});homeworkBlocked=[];
  if (homeworkOrigin?.isConnected) homeworkOrigin.focus({preventScroll:true});
  else screenFocusTargets[currentScreen].focus({preventScroll:true});
  };
  if(immediate===true||matchMedia("(prefers-reduced-motion: reduce)").matches)finish();else{homeworkLayer.classList.add("is-closing");homeworkCloseTimer=setTimeout(finish,180);}
}
document.addEventListener("preview-screen-change",()=>closeHomeworkSheet(true));
homeworkClose.addEventListener("click", closeHomeworkSheet);
document.getElementById("homework-shade").addEventListener("click", closeHomeworkSheet);
document.addEventListener("keydown", event => {
  if (homeworkLayer.hidden) return;
  if (event.key === "Escape") { event.preventDefault(); closeHomeworkSheet(); }
  if (event.key === "Tab") {
    const targets = [...homeworkLayer.querySelectorAll("button:not(:disabled), input:not([type=hidden]):not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], summary")].filter(node => !node.closest("[hidden]") && (!node.closest("details") || node.closest("details").open || node.tagName === "SUMMARY") && node.id !== "homework-shade");
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}, true);

function field(labelText, type, value = "") {
  if (type === "date") {
    const label=make("div","queue-field"), input=make("input"); input.type="hidden"; input.value=value;
    const trigger=action("",() => { calendar.element.hidden=!calendar.element.hidden; trigger.setAttribute("aria-expanded",String(!calendar.element.hidden)); },"date-trigger");
    trigger.setAttribute("aria-label",`选择${labelText}`); trigger.setAttribute("aria-expanded","false");
    const text=make("span","",value ? shortDate(value) : "选择日期");
    const icon=document.createElementNS("http://www.w3.org/2000/svg","svg"); icon.setAttribute("viewBox","0 0 24 24"); icon.setAttribute("aria-hidden","true"); icon.innerHTML=folioIcons.calendar;
    trigger.append(text,icon);
    function setValue(date) { input.value=date; text.textContent=date ? shortDate(date) : "选择日期"; calendar.setValue(date); input.dispatchEvent(new Event("change",{bubbles:true})); }
    const calendar=FolioDate.create(value,date => { setValue(date); calendar.element.hidden=true; trigger.setAttribute("aria-expanded","false"); trigger.focus({preventScroll:true}); },{clearable:labelText.includes("选填"),fallback:homeworkState.today});
    calendar.element.hidden=true;
    label.append(make("span","",labelText),input,trigger,calendar.element);
    return {label,input,setValue};
  }
  const label = make("label", "queue-field"), input = make("input");
  input.type = type; input.value = value;
  label.append(make("span", "", labelText), input); return {label,input};
}
function returnItemToInbox(item) {
  try {
    const next=structuredClone(homeworkState.items),row=next.find(r=>r.id===item.id);
    if(!row)throw Error("事项已变动，请重新打开");
    FolioQueue.returnToInbox(row,homeworkState.today);
    localStorage.setItem(homeworkDemo.storageKey,JSON.stringify({...homeworkState,items:next}));
    homeworkState.items=next;closeHomeworkSheet();commit("已卸下并收回待贴便签袋，作业和截止时间保留");
  } catch(error) { announce("未能收回便签："+error.message); }
}
function openItem(item, origin) {
  if (item.source==="personal" && typeof openTodoDetail==="function") {openTodoDetail(item,origin);return;}
  openHomeworkSheet(item.title, origin);
  homeworkBody.append(make("p", "item-detail-meta", `${item.source === "school" ? "教务作业" : item.kind === "homework" ? "自定义作业" : "个人待办"}${item.course ? ` · ${item.course}` : ""}`));
  const facts = make("dl", "item-facts");
  if(FolioQueue.important(item,window.FolioGoalUI?.queueOptions()))homeworkBody.append(make("p","goal-course-reminder",`${FolioQueue.urgency(item,homeworkState.today,window.FolioGoalUI?.queueOptions())!=="normal"&&!item.completed?"🔥 抓紧完成 · ":""}重要课程作业，优先提前安排；截止前 3 天提醒。`));
  [["截止日期", shortDate(item.deadline)], ["便签状态", queueLabel(item)]].forEach(([label,value]) => { facts.append(make("dt", "", label),make("dd", "", value)); });
  homeworkBody.append(facts);
  if(item.source==="school"&&window.FolioItemOptions){const options=FolioItemOptions.mount(homeworkBody,item),reminders=FolioItemOptions.reminders(homeworkBody,item),error=make("p","form-error");homeworkBody.append(error,action("保存显示与提醒设置",()=>{try{const values=options.read(),offsets=reminders.read();Object.assign(item,values,{reminderOffsets:offsets,reminderMinutes:offsets[0]??null});FolioQueue.setQueued(item,values.queued);closeHomeworkSheet();commit("显示与提醒设置已保存");}catch(e){error.textContent=e.message;}},"small-action"));}
  if (!item.completed) {
    let hangNowButton = null;
    const moveControls = createQueueMoveControls(item);
    homeworkBody.append(moveControls.element);
    if (item.source === "personal") {
      const label = make("label", "queue-check"); const checkbox = make("input"); checkbox.type = "checkbox"; checkbox.checked = item.queued;
      label.append(checkbox,make("span", "", "加入便签队列"));
      checkbox.addEventListener("change", () => {
        FolioQueue.setQueued(item, checkbox.checked); commit(checkbox.checked ? "已加入便签队列" : "已退出队列，待办仍保留");
        facts.querySelectorAll("dd")[1].textContent = queueLabel(item);
        moveControls.setValue(item.mountDate || homeworkState.today);
        if (hangNowButton) hangNowButton.hidden = Boolean(item.mountedOn);
      });
      homeworkBody.append(label);
    }
    const actions = make("div", "item-actions");
    hangNowButton = action("现在挂上", () => moveControls.moveNow());
    hangNowButton.hidden = Boolean(item.mountedOn);
    actions.append(hangNowButton);
    if(item.mountedOn)actions.append(action("卸下并收回待贴袋",()=>returnItemToInbox(item),"small-action"));
    actions.append(action("标记完成", () => { FolioQueue.complete(item); closeHomeworkSheet(); commit("已完成，便签已取下"); }, "sheet-submit"));
    homeworkBody.append(actions);
  }
  if (item.source === "school") {
    const link = make("a", "school-link", "打开学在浙大 ↗"); link.href = homeworkDemo.schoolUrl; link.target = "_blank"; link.rel = "noopener noreferrer";
    homeworkBody.append(link);
  }
}

document.getElementById("queue-options").addEventListener("click", event => {
  openHomeworkSheet("便签分配", event.currentTarget);
  homeworkBody.append(make("p", "queue-hint", "下周截止的作业，在本周分批挂上。比例自动归一化；已挂上的保留，手动日期优先。"));
  const form = make("form", "queue-form");
  const row = make("div", "ratio-fields");
  const days=["周一","周二","周三","周四","周五","周六","周日"];
  // 将持久化的比例转换为合计恰好 100.0 的显示值，避免显示舍入误差。
  const displayWeights=FolioQueue.quotas(1000,homeworkState.weights).map(value => value/10);
  const fields=days.map((day,index) => {
    const entry=field(day,"number",displayWeights[index]); entry.input.min="0"; entry.input.max="10000"; entry.input.step="any"; entry.input.setAttribute("aria-label",day);
    const box=make("span","ratio-input-box"); const percent=make("span","ratio-percent","%"); percent.setAttribute("aria-hidden","true");
    box.append(entry.input,percent); entry.label.append(box);
    return entry;
  });
  [4,5,6].forEach(index => row.append(fields[index].label));
  const expanded=make("details","ratio-expanded"); const summary=make("summary","","扩展 · 周一至周四");
  const extra=make("div","ratio-fields ratio-extra"); [0,1,2,3].forEach(index => extra.append(fields[index].label));
  expanded.append(summary,extra);
  const preview=make("p","normalized-preview"); preview.setAttribute("role","status");
  const weekendLimit=field("周末手动上限（每天）","number",homeworkState.weekendLimit||3);
  weekendLimit.input.min="1"; weekendLimit.input.max="20"; weekendLimit.input.step="1"; weekendLimit.input.required=true;
  const limitHint=make("p","queue-hint","工作日手动最多 1 项；周末用上面的每日上限。系统自动调配可以超过。当天已做完的也占名额，之前积压的不会重复计入。");
  const error = make("p", "form-error"); error.setAttribute("role", "alert");
  const submit = make("button", "sheet-submit", "保存设置"); submit.type = "submit";
  const values=() => fields.map(entry => Number(entry.input.value || 0));
  function updatePreview() {
    try {
      const weights=values(); const percentages=FolioQueue.quotas(1000,weights).map(value=>value/10);
      preview.textContent=`归一化后 · ${percentages.map((value,index)=>value ? `${days[index]} ${value}%` : "").filter(Boolean).join(" · ")}`;
      summary.textContent=`扩展 · 周一至周四${weights.slice(0,4).some(value=>value>0) ? " · 已设置" : ""}`;
      error.textContent=""; submit.disabled=false;
    } catch (problem) { preview.textContent=""; error.textContent=problem.message; submit.disabled=true; }
  }
  fields.forEach(entry=>entry.input.addEventListener("input",updatePreview));
  form.append(row,expanded,preview,weekendLimit.label,limitHint,error,submit); updatePreview();
  form.addEventListener("submit", event => {
    event.preventDefault();
    try { const limit=Number(weekendLimit.input.value); if(!Number.isInteger(limit)||limit<1||limit>20)throw new Error("周末上限请填 1 到 20 的整数"); homeworkState.weights=FolioQueue.normalize(values());homeworkState.weekendLimit=limit; } catch (problem) { error.textContent=problem.message; return; }
    closeHomeworkSheet(); commit("已归一化保存，尚未挂出的自动条目已更新");
  });
  homeworkBody.append(form);
  homeworkBody.append(action("重置示例", () => {
    homeworkState = freshHomeworkState(); homeworkFilter = "all"; homeworkView=homeworkState.view;
    document.querySelectorAll("[data-homework-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.homeworkFilter === "all")));
    closeHomeworkSheet(); commit("已恢复初始示例");
  }, "text-action reset-demo"));
});

commit();
