/* 日程视觉原型；课程为本地课表示例，与作业/待办共用已有状态。 */
const calendarSemester=FolioCourses.semesters[0];
let calendarSelectedDay=homeworkState.today;
// 视觉验收可通过 URL 指定演示时刻；不改变设备时间或保存的任务。
const calendarPreviewTime=(()=>{const value=new URLSearchParams(location.search).get("previewTime");return FolioTodo.validClock(value) ? value : null;})();
let calendarMonth=calendarSelectedDay.slice(0,7);
let calendarCollapsed=false;
let calendarProjectedItems=[];
let calendarDayEvents=[];
let calendarCountdownState=null;
const calendarAgenda=document.getElementById("schedule-agenda");
const calendarAbove=document.getElementById("schedule-more-above");
const calendarBelow=document.getElementById("schedule-more-below");
const calendarLocate=document.getElementById("schedule-locate");
function renderCalendarPet(row) {
  const pet=row.querySelector(".schedule-pet-progress");
  if(pet) FolioSnakeProgress.render(pet,Number(row.dataset.progressElapsed),row.style.getPropertyValue("--course-color"),
    {periods:Number(row.dataset.periods),duration:Number(row.dataset.duration)});
}
const calendarPetObserver=new ResizeObserver(entries=>entries.forEach(({target})=>renderCalendarPet(target)));
previewScreens.calendar=document.getElementById("calendar-screen");
screenNames.calendar="日程";
screenFocusTargets.calendar=previewScreens.calendar.querySelector("[data-back-menu]");
const calendarWeekday=date=>(new Date(FolioQueue.dateValue(date)).getUTCDay()+6)%7;
const calendarAddDays=(date,days)=>FolioTodo.addDays(date,days);
const calendarClock=minutes=>minutes===1440 ? "24:00" : `${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;
function calendarCourses(date,surface="calendar") {
  return [...FolioCourses.onDate(calendarSemester,date,undefined,surface),...(surface==="timetable"?FolioQueue.calendarEntries(FolioTodo.materialize(structuredClone(homeworkState.items),date),surface):[])];
}
function renderCalendarMonth(month=calendarMonth,target=null) {
  if(!target)document.getElementById("schedule-month-title").textContent=`${month.slice(0,4)} 年 ${Number(month.slice(5))} 月`;
  const grid=target||document.getElementById("schedule-month-grid");grid.replaceChildren();
  const first=`${month}-01`, firstValue=FolioQueue.dateValue(first);
  const last=new Date(firstValue);last.setUTCMonth(last.getUTCMonth()+1,0);
  const size=Math.ceil((calendarWeekday(first)+last.getUTCDate())/7)*7;
  grid.dataset.weeks=String(size/7);
  const start=calendarAddDays(first,-calendarWeekday(first));
  const currentMonday=calendarAddDays(homeworkState.today,-calendarWeekday(homeworkState.today));
  for(let offset=0;offset<size;offset+=7) {
    const monday=calendarAddDays(start,offset);
    const week=make("div",`schedule-month-week${monday===currentMonday ? " is-current-week" : ""}`);
    for(let day=0;day<7;day++) {
      const date=calendarAddDays(monday,day), courses=calendarCourses(date), exams=currentExams().filter(exam=>exam.date===date);
      const button=action("",()=>selectCalendarDay(date),"schedule-date");
      button.dataset.date=date;
      button.classList.toggle("is-outside-month",date.slice(0,7)!==month);
      button.classList.toggle("is-today",date===homeworkState.today);
      button.classList.toggle("has-exam",exams.length>0);
      button.setAttribute("aria-pressed",String(date===calendarSelectedDay));
      if(date===homeworkState.today) button.setAttribute("aria-current","date");
      button.setAttribute("aria-label",`${shortDate(date)}，${courses.length}门课${exams.length?`，${exams.length}场考试`:""}${date===homeworkState.today ? "，今天" : ""}`);
      const number=make("span","schedule-date-number");
      if(exams.length){
        const indicator=make("i","schedule-exam-indicator");indicator.setAttribute("aria-hidden","true");number.append(indicator);
      }
      number.append(make("span","",String(Number(date.slice(8)))));button.append(number);
      const markers=make("span","schedule-course-markers");markers.setAttribute("aria-hidden","true");
      const markerLimit=4;
      courses.slice(0,markerLimit).forEach(course=>{const square=make("i","schedule-course-square");square.style.backgroundColor=course.color;markers.append(square);});
      if(courses.length>markerLimit) {const more=make("span","schedule-course-overflow","+");more.title=`另有 ${courses.length-markerLimit} 门课`;markers.append(more);}
      button.append(markers);week.append(button);
    }
    grid.append(week);
  }
  if(!target&&typeof syncCalendarFold==="function")syncCalendarFold(false);
}
function calendarNowMinute() {
  const clock=calendarPreviewTime||new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
  return Number(clock.slice(0,2))*60+Number(clock.slice(3));
}
function openCalendarEvent(entry,origin,semester=calendarSemester) {
  if(entry.itemId&&entry.personal){const item=homeworkState.items.find(i=>i.id===entry.itemId)||FolioTodo.materialize(structuredClone(homeworkState.items),entry.date).find(i=>i.id===entry.itemId);if(item)openTodoDetail(item,origin);return;}
  if(entry.kind==="exam"){openExamDetail(entry.examId,origin);return;}
  if(entry.kind!=="course") {
    let item=homeworkState.items.find(item=>item.id===entry.itemId);
    if(!item) {
      item=calendarProjectedItems.find(item=>item.id===entry.itemId);
      if(item) homeworkState.items.push(item);
    }
    if(item) openItem(item,origin);
    return;
  }
  openHomeworkSheet(entry.title,origin);
  const facts=make("dl","item-facts");
  const breaks=entry.periods===3 ? [45,95] : [45];
  const breakTimes=breaks.map(offset=>`${calendarClock(entry.startMinute+offset)}–${calendarClock(entry.startMinute+offset+5)}`).join("、");
  [["时间",`${shortDate(entry.date)} · ${entry.start}–${entry.end}`],["地点",entry.room],["上课周次",FolioCourses.ruleLabel(entry.session,semester)],["教学周",`${entry.teachingWeek.label} · 第 ${entry.teachingWeek.week} 周（${entry.teachingWeek.parity}）`],["节次",`${entry.periods} 节 · 课间 ${breakTimes}`],
    ["路线", "绿色转角进入课间，蓝色转角课间结束，棕色终点课程结束。"]].forEach(([label,value])=>facts.append(make("dt","",label),make("dd","",value)));
  homeworkBody.append(facts);
  const course=semester.courses.find(course=>course.id===entry.courseId);
  if(course)homeworkBody.append(action("调整／排除这段排课",event=>window.FolioScheduleOverrideUI?.open(semester,course,event.currentTarget,entry),"small-action"));
  const goalReminder=window.FolioGoalUI?.label(semester.id,entry.courseId);
  if(goalReminder)homeworkBody.append(make("p","goal-course-reminder",goalReminder));
  homeworkBody.append(action("自定义进度形象",()=>{closeHomeworkSheet();showPreviewScreen("pixel");},"small-action"));
}
function calendarEventDescription(entry) {
  if(entry.kind==="exam")return `${entry.room||"教室待公布"} · ${entry.seat?`${entry.seat} 号`:"座号待公布"}`;
  if(entry.kind==="course") return entry.room;
  const item=calendarProjectedItems.find(item=>item.id===entry.itemId);
  const subject=item?.course;
  let text=item?.timeMode==="pending"?"时间待定":item?.kind==="lesson"?"上课／实验":item?.kind==="event"?"事项":"待办";
  if(entry.kind==="deadline") text=entry.allDay ? `${shortDate(entry.date)}截止` : `${calendarClock(entry.startMinute)} 截止`;
  else if(entry.kind==="mount") text="推荐这天做";
  else if(entry.continuesBefore||entry.continuesAfter)
    text=`${shortDate(entry.startAt.slice(0,10))} ${entry.startAt.slice(11)} — ${shortDate(entry.endAt.slice(0,10))} ${entry.endAt.slice(11)}`;
  return [subject,item?.location,text].filter(Boolean).join(" · ");
}
function renderCalendarAgenda(position=false) {
  const previous=calendarAgenda.scrollTop;
  const focusedEvent=document.activeElement?.dataset.eventId;
  calendarProjectedItems=FolioTodo.materialize(structuredClone(homeworkState.items),calendarSelectedDay);
  calendarDayEvents=FolioCalendar.dayEntries([...calendarCourses(calendarSelectedDay),...FolioExams.entries(currentExams(),calendarSelectedDay),...FolioQueue.calendarEntries(calendarProjectedItems)],calendarSelectedDay);
  const weekday=["周一","周二","周三","周四","周五","周六","周日"][calendarWeekday(calendarSelectedDay)];
  document.getElementById("schedule-day-title").textContent=`${shortDate(calendarSelectedDay)} · ${weekday}`;
  const counts=[
    [calendarDayEvents.filter(e=>e.kind==="course").length,"门课"],
    [calendarDayEvents.filter(e=>e.kind==="exam").length,"场考试"],
    [calendarDayEvents.filter(e=>e.kind==="deadline").length,"项到期"],
    [calendarDayEvents.filter(e=>e.kind==="mount").length,"项推荐"],
    [calendarDayEvents.filter(e=>["range","day"].includes(e.kind)&&e.itemKind!=="event").length,"项待办"],
    [calendarDayEvents.filter(e=>["range","day"].includes(e.kind)&&e.itemKind==="event").length,"项事项"],
  ];
  const summary=counts.slice(1).filter(([n])=>n).map(([n,label])=>`${n} ${label}`);
  const summaryElement=document.getElementById("schedule-day-summary");
  summaryElement.textContent=summary.join(" · ")||"这一天没有安排";
  summaryElement.hidden=!summary.length&&Boolean(counts[0][0]);
  const isToday=calendarSelectedDay===homeworkState.today, now=calendarNowMinute();
  const timeline=FolioCalendar.timelineState(calendarDayEvents,homeworkState.today,now);
  const target=isToday ? calendarDayEvents.find(entry=>entry.id===timeline.anchorId)||FolioCalendar.focusEvent(calendarDayEvents,now) : calendarDayEvents[0];
  const countdownKey=`${calendarSelectedDay}:${timeline.nextId}`;
  const growing=calendarCountdownState?.key===countdownKey&&!calendarCountdownState.waiting&&timeline.waiting;
  calendarCountdownState=timeline.minutesUntilNext!==null ? {key:countdownKey,waiting:timeline.waiting} : null;
  calendarLocate.textContent=isToday ? calendarPreviewTime ? `定位 ${calendarPreviewTime}` : "定位现在" : "回到开头";
  calendarLocate.disabled=!calendarDayEvents.length;
  calendarPetObserver.disconnect();
  calendarAgenda.replaceChildren();
  const list=make("ul","schedule-event-list");
  list.setAttribute("aria-label","按时间排列的安排");
  const untimedList=make("ul","schedule-unscheduled-list"),timedEvents=calendarDayEvents.filter(entry=>!entry.allDay);
  calendarDayEvents.forEach(entry=>{
    if(timeline.anchorId && entry.id===timeline.nextId && timeline.minutesUntilNext!==null) {
      const gap=timeline.minutesUntilNext;
      const blank=make("li",`schedule-gap${timeline.waiting ? " is-waiting" : ""}${growing ? " is-growing" : ""}`);blank.setAttribute("aria-label",`离下一项还有${Math.floor(gap/60)}小时${gap%60}分钟`);
      const rail=make("span","schedule-gap-rail");rail.setAttribute("aria-hidden","true");
      const label=make("span","schedule-gap-label",`${Math.floor(gap/60) ? `${Math.floor(gap/60)}h` : ""}${gap%60 ? `${gap%60}m` : ""}`);
      label.title="距下一项";label.setAttribute("aria-hidden","true");blank.append(rail,label);list.append(blank);
    }
    const li=make("li",entry.allDay ? "schedule-unscheduled-item" : "schedule-event"), row=action("",event=>openCalendarEvent(entry,event.currentTarget),"schedule-event-button");
    // 课程和考试保持原样；作业/待办用简化便签剪 paper 背景区分。
    li.classList.toggle("is-paper-task",entry.kind!=="course"&&entry.kind!=="exam"&&!["event","lesson"].includes(entry.itemKind));
    if(!entry.allDay) {
      const index=timedEvents.indexOf(entry);
      li.classList.toggle("has-experienced-connection",FolioCalendar.connectionExperienced(timedEvents[index+1],homeworkState.today,now));
      li.classList.toggle("has-experienced-incoming",FolioCalendar.connectionExperienced(entry,homeworkState.today,now));
    }
    li.style.setProperty("--course-color",entry.color||"#B0AEA5");
    const rail=make("span","schedule-event-rail"), dot=make("i","schedule-event-dot");
    rail.setAttribute("aria-hidden","true");rail.append(dot);
    const time=make("span","schedule-event-outside-time");
    time.setAttribute("aria-hidden","true");
    if(!entry.allDay) {
      time.append(make("span","schedule-event-start",calendarClock(entry.startMinute)));
      if(entry.endMinute!==entry.startMinute) time.append(make("span","schedule-event-end",calendarClock(entry.endMinute)));
    }
    row.dataset.eventId=entry.id;
    if(entry.itemId) row.dataset.itemId=entry.itemId;
    row.classList.toggle("is-completed",Boolean(entry.completed));
    const meta=calendarEventDescription(entry);
    const current=isToday&&entry.id===timeline.currentId;
    const next=entry.kind==="course"&&isToday&&entry===target&&entry.startMinute>now;
    const courseRemaining=FolioCalendar.remainingFraction(entry,homeworkState.today,now);
    const remaining=current ? FolioCalendar.activeRemainingFraction(entry,homeworkState.today,now) : null;
    if(entry.kind==="course"&&courseRemaining===0) {
      li.classList.add("is-finished-course");row.classList.add("is-finished-course");
    }
    if(entry.kind!=="exam"&&current&&remaining!==null) {
      row.classList.add("has-course-progress");
      row.style.setProperty("--course-color",entry.color||"#B0AEA5");
      row.dataset.remaining=String(remaining);
      row.dataset.progressElapsed=String(1-remaining);
      row.dataset.periods=String(entry.periods||1);
      row.dataset.duration=String(entry.endMinute-entry.startMinute);
      const progress=make("span","schedule-pet-progress");
      progress.setAttribute("aria-hidden","true");
      row.append(progress);
    }
    const heading=make("span","schedule-event-heading");
    heading.append(make("span","schedule-event-title",entry.title));
    if(entry.kind==="exam"){row.classList.add("is-exam");heading.append(make("span","schedule-exam-type",entry.type));}
    if(current||next) {
      row.classList.add("is-current-event");
      li.classList.add("is-current-event");
    } else if(entry.completed) heading.append(make("span","schedule-event-status is-finished","已完成"));
    const information=make("span","schedule-event-information");
    if(entry.kind==="course"||entry.kind==="exam") {
      const location=make("span","schedule-location-icon");
      location.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
      information.append(location);
    }
    information.append(make("span","schedule-event-meta",meta));
    const goalReminder=entry.kind==="course"?window.FolioGoalUI?.label(calendarSemester.id,entry.courseId):null;
    row.append(heading,information);
    if(goalReminder)row.append(make("span","goal-course-reminder",goalReminder));
    const description=[entry.title,entry.allDay ? meta : `${calendarClock(entry.startMinute)}${entry.endMinute!==entry.startMinute ? `至${calendarClock(entry.endMinute)}` : ""}`,entry.kind==="exam"?meta:entry.room||(!entry.allDay ? meta : "")].filter(Boolean).join("，");
    row.setAttribute("aria-label",`${description}${entry.completed ? "，已完成" : ""}${current ? "，正在进行" : next ? "，下一节课" : ""}${remaining!==null ? `，还剩 ${Math.round(remaining*100)}%` : ""}`);
    if(goalReminder)row.setAttribute("aria-label",`${row.getAttribute("aria-label")}，${goalReminder}`);
    if(entry.allDay) {li.append(row);untimedList.append(li);}
    else {li.append(time,rail,row);list.append(li);}
  });
  if(untimedList.children.length) {
    const section=make("section","schedule-unscheduled");section.setAttribute("aria-label","没有具体时间的事项");
    section.append(make("h3","schedule-unscheduled-heading","当天要做"),untimedList);calendarAgenda.append(section);
  }
  if(list.children.length) calendarAgenda.append(list);
  if(!calendarDayEvents.length) calendarAgenda.append(make("p","schedule-empty","这天没有安排。"));
  calendarAgenda.querySelectorAll(".has-course-progress").forEach(row=>calendarPetObserver.observe(row));
  if(focusedEvent) [...calendarAgenda.querySelectorAll("[data-event-id]")].find(row=>row.dataset.eventId===focusedEvent)?.focus({preventScroll:true});
  requestAnimationFrame(()=>{calendarAgenda.querySelectorAll(".has-course-progress").forEach(renderCalendarPet);if(position) locateCalendar();else calendarAgenda.scrollTop=previous;updateCalendarOverflow();});
}
function locateCalendar() {
  const now=calendarNowMinute(),timeline=FolioCalendar.timelineState(calendarDayEvents,homeworkState.today,now);
  const entry=calendarSelectedDay===homeworkState.today ? calendarDayEvents.find(entry=>entry.id===timeline.anchorId)||FolioCalendar.focusEvent(calendarDayEvents,now) : calendarDayEvents[0];
  const row=[...calendarAgenda.querySelectorAll("[data-event-id]")].find(row=>row.dataset.eventId===entry?.id);
  calendarAgenda.scrollTo({top:row&&!entry.allDay ? row.getBoundingClientRect().top-calendarAgenda.getBoundingClientRect().top+calendarAgenda.scrollTop-4 : 0,behavior:"auto"});
  updateCalendarOverflow();
}
function updateCalendarOverflow() {
  const region=calendarAgenda.getBoundingClientRect();
  let above=0,below=0;
  calendarAgenda.querySelectorAll(".schedule-event,.schedule-unscheduled-item").forEach(row=>{
    const rect=row.getBoundingClientRect();if(rect.top<region.top-1) above++;if(rect.bottom>region.bottom+1) below++;
  });
  calendarAbove.textContent=above ? `上方还有 ${above} 项 ↑` : "";
  calendarBelow.textContent=below ? `下方还有 ${below} 项 ↓` : "";
  calendarAbove.disabled=!above;calendarBelow.disabled=!below;
  calendarAbove.style.visibility=above ? "visible" : "hidden";
  calendarBelow.style.visibility=below ? "visible" : "hidden";
}
function selectCalendarDay(date) {
  const restoreFocus=document.activeElement?.classList.contains("schedule-date");
  calendarSelectedDay=date;calendarMonth=date.slice(0,7);renderCalendarMonth();renderCalendarAgenda(true);
  if(restoreFocus) previewScreens.calendar.querySelector(`.schedule-date[data-date="${date}"]`)?.focus({preventScroll:true});
}
document.getElementById("schedule-prev").addEventListener("click",()=>changeCalendarMonth(-1));
document.getElementById("schedule-next").addEventListener("click",()=>changeCalendarMonth(1));
function changeCalendarMonth(delta) {
  if(calendarCollapsed){selectCalendarDay(calendarAddDays(calendarSelectedDay,delta*7));return;}
  const date=new Date(FolioQueue.dateValue(`${calendarMonth}-01`));date.setUTCMonth(date.getUTCMonth()+delta);
  selectCalendarDay(date.toISOString().slice(0,10));
}
document.getElementById("schedule-today").addEventListener("click",()=>selectCalendarDay(homeworkState.today));
calendarLocate.addEventListener("click",locateCalendar);
calendarAbove.addEventListener("click",()=>calendarAgenda.scrollBy({top:-calendarAgenda.clientHeight*.8,behavior:"auto"}));
calendarBelow.addEventListener("click",()=>calendarAgenda.scrollBy({top:calendarAgenda.clientHeight*.8,behavior:"auto"}));
calendarAgenda.addEventListener("scroll",updateCalendarOverflow,{passive:true});
new ResizeObserver(()=>{if(currentScreen==="calendar")updateCalendarOverflow();}).observe(calendarAgenda);
document.getElementById("calendar-add").addEventListener("click",event=>openTodoEditor(null,event.currentTarget,{date:calendarSelectedDay,timeMode:"range",kind:"event"}));
document.addEventListener("preview-screen-change",event=>{
  if(event.detail.screen==="calendar") {renderCalendarMonth();renderCalendarAgenda(true);}
});
document.addEventListener("folio-data-change",()=>{renderCalendarMonth();renderCalendarAgenda(false);});
document.addEventListener("folio-goals-change",()=>renderCalendarAgenda(false));
document.addEventListener("folio-exams-change",()=>{renderCalendarMonth();renderCalendarAgenda(false);});
setInterval(()=>{if(currentScreen==="calendar"&&homeworkLayer.hidden)renderCalendarAgenda(false);},60000);
renderCalendarMonth();renderCalendarAgenda();
