/* 日程内部的横向视图：左滑看右侧周课表，右滑回月历，不增加独立页面。 */
const schedulePager=document.getElementById("schedule-pager"),schedulePanels=schedulePager.querySelector(".schedule-panels");
const scheduleMonthPanel=document.getElementById("schedule-month-view"),scheduleWeekPanel=document.getElementById("schedule-week-view");
const scheduleMonthTab=document.getElementById("calendar-tab-month"),scheduleWeekTab=document.getElementById("calendar-tab-week");
const timetableScroll=document.getElementById("timetable-scroll"),timetableGrid=document.getElementById("timetable-grid");
let scheduleView="month",timetableMonday=calendarAddDays(calendarSelectedDay,-calendarWeekday(calendarSelectedDay));
let timetableDayTap={date:null,time:0};
let timetableScale=FolioTimetable.scale();
function timetableRoom(room) {return room.replace("玉泉新桥门乒乓球房","乒乓球房").replace("玉泉教 ","教").replace("电气实验楼 ","实验").replaceAll(" ","");}
const timetableMinute=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
const defaultTimetableTimes=[["08:00","08:45"],["08:50","09:35"],["10:00","10:45"],["10:50","11:35"],["11:40","12:25"],["13:25","14:10"],["14:15","15:00"],["15:05","15:50"],["16:15","17:00"],["17:05","17:50"],["18:50","19:35"],["19:40","20:25"],["20:30","21:15"]];
function openTimetableGroup(group,origin) {
  if(group.entries.length===1) {openCalendarEvent(group.entries[0],origin);return;}
  openHomeworkSheet("这些安排时间重叠",origin);
  const choices=make("div","timetable-conflicts");
  group.entries.forEach(entry=>choices.append(action(`${entry.title} · ${calendarClock(entry.startMinute)}–${calendarClock(entry.endMinute)}`,
    ()=>openCalendarEvent(entry,origin),"timetable-conflict-choice")));
  homeworkBody.append(choices);
}
function renderTimetable() {
  const available=Math.max(1,timetableScroll.clientHeight),tight=available<450;
  const fit=available>1?{fitHeight:available}:{};
  const times=calendarSemester.calendar?.sessionTime;
  const allTimes=times?.length>1?times.slice(1):(window.FolioApp?.native?FolioBackend.defaultTimes:null);
  // 课表只保留教务原版 13 节（到 21:15）；个人事项由日程处理，不再拉伸课表。
  const configuredTimes=(allTimes?allTimes.slice(0,13):defaultTimetableTimes);
  const rangeStart=timetableMinute(configuredTimes[0][0]),rangeEnd=timetableMinute(configuredTimes.at(-1)[1]);
  let pending=document.getElementById("timetable-untimed");if(!pending){pending=make("section","timetable-untimed");pending.id="timetable-untimed";timetableScroll.append(pending);}pending.replaceChildren();
  for(let day=0;day<7;day++){const date=calendarAddDays(timetableMonday,day);for(const e of FolioQueue.calendarEntries(FolioTodo.materialize(structuredClone(homeworkState.items),date),"timetable").filter(e=>e.kind==="day"&&e.date===date))pending.append(action(`${shortDate(date)} · ${e.title} · 时间待定`,event=>openCalendarEvent(e,event.currentTarget),"small-action"));}pending.hidden=!pending.children.length;
  const dayEntries=Array.from({length:7},(_,day)=>{const date=calendarAddDays(timetableMonday,day);
    return FolioCalendar.dayEntries(calendarCourses(date,"timetable"),date).filter(entry=>entry.endMinute>rangeStart&&entry.startMinute<rangeEnd);});
  try{timetableScale=FolioTimetable.scale(configuredTimes,fit);}
  catch{timetableScale=FolioTimetable.scale(defaultTimetableTimes,fit);}
  timetableScroll.classList.toggle("is-tight",tight);
  const sunday=calendarAddDays(timetableMonday,6);
  document.getElementById("timetable-range").textContent=`${shortDate(timetableMonday)} — ${shortDate(sunday)}`;
  const teachingWeeks=new Map();for(let day=0;day<7;day++){const info=FolioCourses.weekInfo(calendarSemester,calendarAddDays(timetableMonday,day));if(info)teachingWeeks.set(`${info.periodId}-${info.week}`,`${info.label} · 第 ${info.week} 周（${info.parity}）`);}
  document.getElementById("timetable-teaching-week").textContent=[...teachingWeeks.values()].join(" / ")||"非教学周";
  const days=document.getElementById("timetable-days");days.replaceChildren(make("span","timetable-axis-heading","节"));
  timetableGrid.replaceChildren();timetableGrid.style.height=`${timetableScale.height}px`;
  const axis=make("div","timetable-axis");axis.setAttribute("aria-hidden","true");
  timetableScale.periods.forEach(period=>{
    const label=make("div","timetable-period");label.style.top=`${period.top}px`;
    label.append(make("strong","",period.number==null?"":String(period.number)),make("span","",period.clock));axis.append(label);
  });
  timetableGrid.append(axis);
  let total=0;
  for(let day=0;day<7;day++) {
    const date=calendarAddDays(timetableMonday,day);
    const heading=action("",()=>{
      const now=performance.now(),double=timetableDayTap.date===date&&now-timetableDayTap.time<300;
      timetableDayTap={date,time:now};
      selectCalendarDay(date);
      if(scheduleView==="week"||currentScreen==="timetable")renderTimetable();
      if(double){timetableDayTap={date:null,time:0};showCalendarView("month");}
    },"timetable-day");
    heading.setAttribute("aria-label",`选择${shortDate(date)}；快速双击查看当天日程`);
    heading.classList.toggle("is-today",date===homeworkState.today);
    heading.classList.toggle("is-selected",date===calendarSelectedDay);
    heading.append(make("span","",["一","二","三","四","五","六","日"][day]),make("strong","",String(Number(date.slice(8)))));days.append(heading);
    const column=make("div",`timetable-course-column${date===homeworkState.today ? " is-today" : ""}`);column.dataset.date=date;
    timetableScale.periods.forEach(period=>{const line=make("i","timetable-grid-line");line.style.top=`${period.top}px`;column.append(line);});
    const entries=dayEntries[day];total+=entries.length;
    FolioTimetable.groups(entries).forEach(group=>{
      const entry=group.entries[0],top=timetableScale.at(group.start),height=timetableScale.at(group.end)-top;
      const block=action("",event=>openTimetableGroup(group,event.currentTarget),"timetable-course-block");
      block.style.top=`${top+1}px`;block.style.height=`${Math.max(1,height-2)}px`;
      const rule=group.entries.length===1&&entry.kind==="course"?FolioCourses.patternLabel(entry.session):"",showRule=rule&&rule!=="每周";
      block.style.setProperty("--course-color",entry.color||"#8DABA0");block.style.setProperty("--title-lines",String(Math.max(1,Math.min(4,Math.floor((height-(showRule?32:22))/15)))));
      const title=group.entries.length===1 ? entry.title : `${entry.title} +${group.entries.length-1}`;
      block.title=title;block.append(make("span","timetable-course-name",title));if(showRule)block.append(make("span","timetable-course-rule",entry.session.customRepeat?"指定周":rule));block.append(make("span","timetable-course-room",group.entries.length===1 ? timetableRoom(entry.room||entry.location||"地点未填") : "时间重叠"));
      block.setAttribute("aria-label",group.entries.map(e=>`${shortDate(date)}，${e.title}，${calendarClock(e.startMinute)}至${calendarClock(e.endMinute)}，${e.room||e.location||"地点未填"}${e.kind==="course"?`，${FolioCourses.ruleLabel(e.session,calendarSemester)}`:"，事项"}`).join("；"));
      const goals=group.entries.filter(e=>e.kind==="course").map(e=>window.FolioGoalUI?.label(calendarSemester.id,e.courseId)).filter(Boolean);if(goals.length){block.classList.add("has-goal-reminder");block.title=goals.join("；");block.setAttribute("aria-label",`${block.getAttribute("aria-label")}，${goals.join("；")}`);}
      column.append(block);
    });
    timetableGrid.append(column);
  }
  if(!total) timetableGrid.append(make("p","timetable-empty","这周没有课程。"));
  requestAnimationFrame(updateTimetableOverflow);
}
function updateTimetableOverflow() {
  const region=timetableScroll.getBoundingClientRect();
  const count=[...timetableGrid.querySelectorAll(".timetable-course-block")].filter(block=>block.getBoundingClientRect().bottom>region.bottom+1).length;
  const more=document.getElementById("timetable-more");more.textContent=count ? "下方还有安排 ↓" : "";
  more.style.visibility=count ? "visible" : "hidden";more.disabled=!count;
}
function showCalendarView(view) {
  if(window.FolioPageRail?.enabled&&FolioPageRail.split){FolioPageRail.go(view==="week"?"timetable":"calendar");return;}
  if(!["month","week"].includes(view)) return;
  const oldPanel=scheduleView==="month" ? scheduleMonthPanel : scheduleWeekPanel;
  if(oldPanel.contains(document.activeElement)) (view==="month" ? scheduleMonthTab : scheduleWeekTab).focus({preventScroll:true});
  const changed=scheduleView!==view;scheduleView=view;schedulePager.dataset.view=view;
  scheduleMonthPanel.inert=view!=="month";scheduleWeekPanel.inert=view!=="week";
  scheduleMonthPanel.setAttribute("aria-hidden",String(view!=="month"));scheduleWeekPanel.setAttribute("aria-hidden",String(view!=="week"));
  scheduleMonthTab.setAttribute("aria-selected",String(view==="month"));scheduleWeekTab.setAttribute("aria-selected",String(view==="week"));
  scheduleMonthTab.tabIndex=view==="month" ? 0 : -1;scheduleWeekTab.tabIndex=view==="week" ? 0 : -1;
  if(view==="week") {
    if(changed) {timetableMonday=calendarAddDays(calendarSelectedDay,-calendarWeekday(calendarSelectedDay));timetableScroll.scrollTop=0;}
    renderTimetable();
  } else {renderCalendarMonth();renderCalendarAgenda(changed);}
}
scheduleMonthTab.addEventListener("click",()=>showCalendarView("month"));scheduleWeekTab.addEventListener("click",()=>showCalendarView("week"));
[scheduleMonthTab,scheduleWeekTab].forEach(tab=>tab.addEventListener("keydown",event=>{
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
  event.preventDefault();const view=event.key==="Home" ? "month" : event.key==="End" ? "week" : scheduleView==="month" ? "week" : "month";
  showCalendarView(view);(view==="month" ? scheduleMonthTab : scheduleWeekTab).focus({preventScroll:true});
}));
function changeTimetableWeek(delta) {
  timetableMonday=calendarAddDays(timetableMonday,delta*7);
  selectCalendarDay(calendarAddDays(timetableMonday,calendarWeekday(calendarSelectedDay)));
  timetableScroll.scrollTop=0;renderTimetable();
}
document.getElementById("timetable-prev").addEventListener("click",()=>changeTimetableWeek(-1));
document.getElementById("timetable-next").addEventListener("click",()=>changeTimetableWeek(1));
document.getElementById("timetable-this-week").addEventListener("click",()=>{selectCalendarDay(homeworkState.today);timetableMonday=calendarAddDays(homeworkState.today,-calendarWeekday(homeworkState.today));timetableScroll.scrollTop=0;renderTimetable();});
document.getElementById("timetable-more").addEventListener("click",()=>timetableScroll.scrollBy({top:timetableScroll.clientHeight*.7,behavior:"auto"}));
timetableScroll.addEventListener("scroll",updateTimetableOverflow,{passive:true});
let timetableMeasuredHeight=0,timetableResizeFrame=0;
new ResizeObserver(()=>{
  if(scheduleView!=="week"&&currentScreen!=="timetable"||!timetableScroll.clientHeight||timetableMeasuredHeight===timetableScroll.clientHeight)return;
  timetableMeasuredHeight=timetableScroll.clientHeight;
  cancelAnimationFrame(timetableResizeFrame);timetableResizeFrame=requestAnimationFrame(()=>renderTimetable());
}).observe(timetableScroll);
let scheduleSuppressClick=0;
FolioGesture.bind(schedulePager,{
  axis:"x",
  enabled:()=>!window.FolioPageRail?.enabled&&currentScreen==="calendar"&&homeworkLayer.hidden,
  // 月历自己的手势负责换月与折叠，只有日历外的横滑才切换整个页面。
  ignore:target=>Boolean(target.closest(".schedule-month,input,textarea,select,[contenteditable=true]")),
  start:()=>({index:scheduleView==="month"?0:1,width:schedulePager.clientWidth}),
  move(swipe){
    schedulePager.classList.add("is-dragging");
    const allowed=FolioGesture.pageOffset(swipe.dx,swipe.extra.index,swipe.extra.width);
    schedulePanels.style.setProperty("--swipe-offset",`${allowed}px`);
  },
  end(swipe,event,cancelled){
    scheduleSuppressClick=performance.now()+350;
    void schedulePanels.getBoundingClientRect();schedulePager.classList.remove("is-dragging");
    const next=FolioGesture.destination(swipe.extra.index,swipe.dx,swipe.velocityX,swipe.extra.width,cancelled);
    if(next!==swipe.extra.index)showCalendarView(next===0?"month":"week");
    schedulePanels.style.setProperty("--swipe-offset","0px");
  }
});
schedulePager.addEventListener("click",event=>{if(performance.now()<scheduleSuppressClick) {event.preventDefault();event.stopPropagation();}},true);
document.addEventListener("preview-screen-change",event=>{if(window.FolioPageRail?.enabled&&FolioPageRail.split)return;if(event.detail.screen==="calendar") {if(scheduleView==="week")timetableMonday=calendarAddDays(calendarSelectedDay,-calendarWeekday(calendarSelectedDay));showCalendarView(scheduleView);}});
document.addEventListener("folio-data-change",()=>{if(scheduleView==="week"||currentScreen==="timetable")renderTimetable();});
document.addEventListener("folio-goals-change",()=>{if(scheduleView==="week"||currentScreen==="timetable")renderTimetable();});
showCalendarView("month");

document.addEventListener("folio-schedule-overrides-change",()=>{if(scheduleView==="week"||currentScreen==="timetable")renderTimetable();});
