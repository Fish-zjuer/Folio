/* 考试页与日历使用同一仓库；手动编辑仅影响本地原型。 */
const examsPage=document.getElementById("exams-screen");
let examViewTermId=examSemester.id;
const viewedExamSemester=()=>FolioCourses.semesters.find(t=>t.id===examViewTermId)||examSemester;
const viewedExams=()=>currentExams(examViewTermId);
document.getElementById("exam-term-label").addEventListener("click",event=>{
  openHomeworkSheet("选择考试学期",event.currentTarget);
  FolioCourses.semesters.forEach(term=>homeworkBody.append(action(`${courseTermLabel(term)}${term.id===examViewTermId?" · 当前":""}`,()=>{examViewTermId=term.id;closeHomeworkSheet();renderExams();},"course-term-option")));
});
previewScreens.exams=examsPage;screenNames.exams="考试";screenFocusTargets.exams=examsPage.querySelector("[data-back-menu]");
const examWeekday=date=>["日","一","二","三","四","五","六"][new Date(`${date}T00:00:00Z`).getUTCDay()];
const examTimeLabel=exam=>`${exam.start}–${exam.end}`;
function examNow(){return Date.parse(`${homeworkState.today}T${calendarClock(calendarNowMinute())}:00+08:00`);}
function examMetaIcon(path){const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("aria-hidden","true");svg.innerHTML=path;return svg;}
function renderExamCountdown(){
  const status=FolioExams.countdown(viewedExams(),examNow()),container=document.getElementById("exam-countdown");container.replaceChildren();
  if(status.state==="empty"){container.append(make("p","exam-countdown-empty","本学期暂无待考安排"));return;}
  const label=make("p","exam-countdown-label",status.state==="active"?"正在考试":"离最近一场考试还有");
  const line=make("div","exam-countdown-line");
  if(status.state==="upcoming")line.append(make("strong","exam-countdown-number",String(status.value)),make("span","exam-countdown-unit",status.unit));
  else line.append(make("strong","exam-active-title",status.exam.title));
  const caption=make("p","exam-countdown-caption",`${status.state==="upcoming"?`${status.exam.title} · `:""}${shortDate(status.exam.date)} ${status.exam.start}`);
  container.append(label,line,caption);
}
function renderExams(){
  document.getElementById("exam-term-label").textContent=courseTermLabel(viewedExamSemester())+"⌄";
  renderExamCountdown();const list=document.getElementById("exam-list");list.replaceChildren();
  const records=viewedExams(),groups=FolioExams.dayGroups(records);
  groups.forEach(({exams,date})=>{
    const group=make("section","exam-day-group"),dateLabel=make("div","exam-date-label");
    dateLabel.append(make("span","exam-date-month",`${Number(date.slice(5,7))} 月`),make("strong","exam-date-day",String(Number(date.slice(8)))),make("span","exam-date-week",`周${examWeekday(date)}`));
    dateLabel.setAttribute("aria-label",date);const cards=make("ul","exam-day-cards");
    exams.forEach(exam=>{
      const li=make("li"),button=action("",event=>openExamDetail(exam.id,event.currentTarget),"exam-card");button.dataset.examId=exam.id;
      button.classList.toggle("is-past",FolioExams.timestamp(exam,"end")<=examNow());
      const top=make("span","exam-card-top");top.append(make("span","exam-card-title",exam.title),make("span","exam-card-type",exam.type));
      const time=make("span","exam-card-time");time.append(examMetaIcon('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'),make("span","",examTimeLabel(exam)));
      const bottom=make("span","exam-card-bottom"),room=make("span","exam-card-room");
      room.append(examMetaIcon('<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>'),make("span","",exam.room||"教室待公布"));
      const seat=make("span",`exam-card-seat${exam.seat?"":" is-pending"}`);
      if(exam.seat)seat.append(make("strong","exam-card-seat-number",exam.seat),make("span","exam-card-seat-unit","号"));
      else seat.textContent="座号待公布";
      bottom.append(room,seat);
      const timing=make("span","exam-card-timing");timing.append(time,make("span","exam-card-source",exam.source==="custom"?"自定义":"教务"));
      button.append(top,timing,bottom);
      const conflicts=FolioExams.overlaps(exam,exams),overlapLabel=conflicts.length?`与${conflicts.map(record=>record.title).join("、")}时间重叠`:"";
      if(conflicts.length){const hint=make("span","exam-card-overlap","时间重叠");hint.title=overlapLabel;button.append(hint);}
      button.setAttribute("aria-label",`${exam.title}，${exam.type}，${shortDate(date)}，${examTimeLabel(exam)}，${exam.room||"教室待公布"}，${exam.seat?`座号 ${exam.seat}`:"座号待公布"}，${exam.source==="custom"?"自定义":"教务"}${overlapLabel?`，${overlapLabel}`:""}，查看详情`);
      li.append(button);cards.append(li);
    });group.append(dateLabel,cards);list.append(group);
  });
  const pending=window.FolioApp?.native?(FolioNative.cache().modules.exams?.data||[]).filter(e=>e.semesterId===examViewTermId&&e.unscheduled):[];
  if(pending.length){const section=make("section","exam-unscheduled");section.append(make("h3","","时间待公布"));for(const exam of pending)section.append(make("p","",`${exam.title} · ${exam.type} · ${exam.dateLabel||"具体时间待公布"}`));list.append(section);}
  if(!records.length&&!pending.length)list.append(make("p","course-empty","还没有考试安排，可以点右上角添加。"));
}
function openExamDetail(id,origin){
  const exam=[...officialExamRecords,...customExamRecords].find(record=>record.id===id);if(!exam)return;
  openHomeworkSheet(exam.title,origin);
  const facts=make("dl","item-facts");
  [["类型",exam.type],["日期",`${shortDate(exam.date)} · 周${examWeekday(exam.date)}`],["时间",examTimeLabel(exam)],["教室",exam.room||"待公布"],["座号",exam.seat||"待公布"],["来源",exam.source==="custom"?"自定义":window.FolioApp?.native?"教务":"教务示例"]].forEach(([label,value])=>facts.append(make("dt","",label),make("dd","",value)));
  const conflicts=FolioExams.overlaps(exam,currentExams(exam.semesterId));
  if(conflicts.length)facts.append(make("dt","","时间重叠"),make("dd","",conflicts.map(record=>`${record.title} ${examTimeLabel(record)}`).join("；")));
  homeworkBody.append(facts);if(exam.note)homeworkBody.append(make("p","exam-detail-note",exam.note));
  const actions=make("div","exam-detail-actions");
  if(currentScreen!=="calendar"&&exam.semesterId===examSemester.id)actions.append(action("在日历中查看",()=>{
    closeHomeworkSheet();showPreviewScreen("calendar");selectCalendarDay(exam.date);showCalendarView("month");
    requestAnimationFrame(()=>{const row=[...calendarAgenda.querySelectorAll("[data-event-id]")].find(button=>button.dataset.eventId===`exam-${exam.id}`);
      if(row)calendarAgenda.scrollTo({top:row.getBoundingClientRect().top-calendarAgenda.getBoundingClientRect().top+calendarAgenda.scrollTop-4,behavior:"auto"});updateCalendarOverflow();});
  },"small-action"));
  if(exam.source==="custom"){
    actions.append(action("编辑",()=>openExamEditor(exam,origin),"small-action"));
    actions.append(action("删除",()=>{
      openHomeworkSheet("删除这场考试？",origin);homeworkBody.append(make("p","queue-hint",exam.title));
      const row=make("div","sheet-actions");row.append(action("保留",()=>openExamDetail(id,origin),"sheet-cancel"),action("删除",()=>{
        // 本地删除可以通过提示中的撤销恢复。
        const removed=customExamRecords.find(record=>record.id===id);
        if(!persistCustomExams(customExamRecords.filter(record=>record.id!==id)))return;
        closeHomeworkSheet();const toast=announce("已删除考试");
        const undo=action("撤销",()=>{if(removed&&!customExamRecords.some(record=>record.id===id)&&persistCustomExams([...customExamRecords,removed]))announce("已恢复考试");},"exam-undo");toast.append(undo);
      },"sheet-submit"));homeworkBody.append(row);
    },"text-action exam-delete"));
  }
  homeworkBody.append(actions);
}
function openExamEditor(selected,origin){
  const editorTermId=selected?.semesterId||(currentScreen==="calendar"?examSemester.id:examViewTermId),editorTerm=FolioCourses.semesters.find(t=>t.id===editorTermId)||examSemester;
  openHomeworkSheet(selected?"编辑考试":"添加自定义考试",origin);
  const form=make("form","queue-form exam-editor");
  const title=field("考试名称","text",selected?.title||"");title.input.required=true;title.input.maxLength=100;title.input.placeholder="例如：数据结构随堂小测";
  const course=selectField("关联课程（选填）",[["","不关联课程"],...editorTerm.courses.map(record=>[record.id,record.title])],selected?.courseId||"");
  const type=selectField("考试类型",[["小测","小测"],["期中","期中"],["期末","期末"],["其他","其他"]],selected?.type||"小测");
  const date=field("考试日期","date",selected?.date||calendarSelectedDay||homeworkState.today);
  const start=field("开始时间","text",selected?.start||"09:00"),end=field("结束时间","text",selected?.end||"10:00");
  for(const input of [start.input,end.input]){input.placeholder="09:00";input.maxLength=5;input.pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]";input.required=true;}
  const room=field("教室（选填）","text",selected?.room||""),seat=field("座号（选填）","text",selected?.seat||"");room.input.maxLength=100;seat.input.maxLength=30;
  room.input.placeholder="还没通知可以留空";seat.input.placeholder="如 23 或 A-12";
  const noteLabel=make("label","queue-field"),note=make("textarea");note.rows=2;note.maxLength=2000;note.value=selected?.note||"";note.placeholder="考试范围、需要带的东西…";noteLabel.append(make("span","","备注（选填）"),note);
  const clocks=make("div","exam-form-pair"),places=make("div","exam-form-pair");clocks.append(start.label,end.label);places.append(room.label,seat.label);
  const error=make("p","exam-form-error");error.setAttribute("role","alert");error.hidden=true;
  const save=make("button","sheet-submit",selected?"保存修改":"添加考试");save.type="submit";
  form.append(title.label,course.label,type.label,date.label,clocks,places,noteLabel,error,save);
  form.addEventListener("submit",event=>{
    event.preventDefault();const record={id:selected?.id||`custom-${crypto.randomUUID()}`,semesterId:editorTermId,source:"custom",title:title.input.value.trim(),courseId:course.input.value||null,type:type.input.value,date:date.input.value,start:start.input.value.trim(),end:end.input.value.trim(),room:room.input.value.trim(),seat:seat.input.value.trim(),note:note.value.trim()};
    const problem=FolioExams.validate(record);error.textContent=problem;error.hidden=!problem;if(problem)return;
    const records=customExamRecords.filter(exam=>exam.id!==record.id);records.push(record);
    if(!persistCustomExams(records))return;closeHomeworkSheet();announce(selected?"考试已更新，日历也同步了":"已添加到考试和日历");
  });homeworkBody.append(form);
}
document.getElementById("exam-add").addEventListener("click",event=>openExamEditor(null,event.currentTarget));
document.addEventListener("preview-screen-change",event=>{if(event.detail.screen==="exams")renderExams();});
document.addEventListener("folio-exams-change",renderExams);
document.addEventListener("folio-data-change",()=>{if(currentScreen==="exams")renderExams();});
setInterval(()=>{if(currentScreen==="exams"){renderExamCountdown();examsPage.querySelectorAll("[data-exam-id]").forEach(button=>{const exam=viewedExams().find(record=>record.id===button.dataset.examId);if(exam)button.classList.toggle("is-past",FolioExams.timestamp(exam,"end")<=examNow());});}},60000);
renderExams();
