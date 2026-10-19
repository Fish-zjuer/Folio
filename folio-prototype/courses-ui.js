/* 课程列表与详情；汇总函数独立在 course-data.js，供后续学业界面复用。 */
const coursesPage=document.getElementById("courses-screen"),courseDetailPage=document.getElementById("course-detail-screen");
const courseTermButton=document.getElementById("course-semester"),courseList=document.getElementById("course-list");
let courseSemesterId=FolioCourses.semesters[0].id,courseSelectedId=null,courseLayout="list",courseLayoutSwitching=false;
const courseViewToggle=document.getElementById("course-view-toggle");
const courseGridIcon='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
const courseListIcon='<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>';
function applyCourseLayout(){
  courseList.dataset.layout=courseLayout;
  const label=courseLayout==="grid"?"切换为列表布局":"切换为双列布局";
  courseViewToggle.setAttribute("aria-label",label);courseViewToggle.title=label;
  courseViewToggle.setAttribute("aria-pressed",String(courseLayout==="grid"));
  courseViewToggle.querySelector("svg").innerHTML=courseLayout==="grid"?courseListIcon:courseGridIcon;
}
async function slideCourseLayout(){
  if(courseLayoutSwitching)return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){applyCourseLayout();return;}
  courseLayoutSwitching=true;courseList.setAttribute("aria-busy","true");courseList.inert=true;
  const direction=courseLayout==="grid"?-1:1;
  try{
    await courseList.animate([{transform:"translateX(0)",opacity:1},{transform:`translateX(${direction*100}%)`,opacity:0}],{duration:170,easing:"cubic-bezier(.4,0,1,1)",fill:"forwards"}).finished;
    courseList.getAnimations().forEach(animation=>animation.cancel());
    applyCourseLayout();coursesPage.querySelector(".course-list-scroll").scrollTop=0;
    await courseList.animate([{transform:`translateX(${-direction*100}%)`,opacity:0},{transform:"translateX(0)",opacity:1}],{duration:230,easing:"cubic-bezier(.22,1,.36,1)"}).finished;
  }finally{
    courseList.getAnimations().forEach(animation=>animation.cancel());courseList.inert=false;courseList.removeAttribute("aria-busy");courseLayoutSwitching=false;
    if(courseList.dataset.layout!==courseLayout)slideCourseLayout();
  }
}
courseViewToggle.addEventListener("click",()=>{courseLayout=courseLayout==="list"?"grid":"list";slideCourseLayout();});
previewScreens.courses=coursesPage;screenNames.courses="课程";screenFocusTargets.courses=coursesPage.querySelector("[data-back-menu]");
previewScreens["course-detail"]=courseDetailPage;screenNames["course-detail"]="课程详情";screenFocusTargets["course-detail"]=document.getElementById("course-detail-back");
const currentCourseSemester=()=>FolioCourses.semesters.find(term=>term.id===courseSemesterId);
const courseCreditLabel=course=>typeof course.credits==="number" ? `${course.credits} 学分` : "学分待更新";
const courseTermLabel=term=>term.label.replaceAll("—","–");
function renderSemesterLabel(term){
  const label=courseTermButton.querySelector("span");label.replaceChildren();
  const parts=courseTermLabel(term).match(/^(\d{4}–\d{4})\s*(.*)$/);
  if(parts)label.append(make("span","course-semester-years",parts[1]),document.createTextNode(" "),make("span","",parts[2]));
  else label.textContent=courseTermLabel(term);
}
function courseCreditBadge(course,maximum){
  const credit=make("span","course-list-credit"),known=typeof course.credits==="number"&&Number.isFinite(course.credits)&&course.credits>=0;
  credit.setAttribute("aria-hidden","true");
  const badge=make("span","course-credit-badge"),number=make("span","course-credit-number"),parts=known?String(course.credits).split("."):["—"];
  number.append(make("span","course-credit-whole",parts[0]));if(parts[1])number.append(make("span","course-credit-fraction",`.${parts[1]}`));
  badge.append(number,make("span","course-credit-unit","CR"));credit.append(badge);
  if(known){const meter=make("span","course-credit-meter");FolioCourses.meter(course.credits,maximum).forEach(fill=>{const cell=make("i");cell.style.setProperty("--fill",`${fill*100}%`);meter.append(cell);});credit.append(meter);}
  return credit;
}
function courseMeetings(course){
  const info=make("span","course-meetings"),groups=new Map(),term=currentCourseSemester();
  course.sessions.forEach(session=>{const key=JSON.stringify([session.room||"",FolioCourses.ruleLabel(session,term)]);if(!groups.has(key))groups.set(key,{...session,days:[]});const days=groups.get(key).days;if(!days.includes(session.day))days.push(session.day);});
  groups.forEach(session=>{
    const group=make("span","course-meeting");
    const days=make("span","course-meeting-days"),room=make("span","course-meeting-room");
    const calendarIcon=document.createElementNS("http://www.w3.org/2000/svg","svg"),locationIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    for(const icon of [calendarIcon,locationIcon]){icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("aria-hidden","true");}
    calendarIcon.innerHTML='<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3"/>';
    locationIcon.innerHTML='<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>';
    const pattern=FolioCourses.patternLabel(session),qualifiers=[];
    if(session.firstHalf===false||session.secondHalf===false)qualifiers.push((term.calendar?.periods||[]).filter(part=>(part.half==="first"?session.firstHalf:session.secondHalf)!==false).map(part=>part.label).join(""));
    if(pattern!=="每周")qualifiers.push(session.customRepeat?"指定周次":pattern);
    const weekday=`周${session.days.sort((a,b)=>a-b).map(day=>["一","二","三","四","五","六","日"][day]).join("、")}`;
    days.append(calendarIcon,make("span","",[weekday,...qualifiers].filter(Boolean).join(" · ")));group.dataset.rule=FolioCourses.ruleLabel(session,term);group.title=group.dataset.rule;
    room.append(locationIcon,make("span","",session.room||"教室待更新"));group.append(days,room);info.append(group);
  });
  if(!groups.size)info.append(make("span","course-meeting-pending","上课安排待更新"));
  return info;
}
function renderCourses(){
  const term=currentCourseSemester(),totals=FolioCourses.summary(term.courses);
  renderSemesterLabel(term);
  const stats=document.getElementById("course-list-total");stats.replaceChildren();
  stats.append(document.createTextNode("共 "),make("span","course-stat-number",String(totals.count)),document.createTextNode(" 门课程 "),make("span","course-stat-divider","·"),document.createTextNode(" "),make("span","course-stat-number",String(totals.credits)),document.createTextNode(" 学分"));
  if(totals.missingCredits)stats.append(make("span","course-stat-pending","部分学分待更新"));
  const maximum=Math.max(5,...term.courses.map(course=>Number.isFinite(course.credits)?course.credits:0));
  courseList.replaceChildren();
  term.courses.forEach(course=>{
    const item=make("li"),button=action("",()=>openCourseDetail(course.id),"course-list-row");button.dataset.courseId=course.id;
    button.style.setProperty("--course-color",course.color);
    const copy=make("span","course-list-copy"),teacher=make("span",`course-list-teacher${course.teacher?"":" is-pending"}`);
    const separator=make("span","course-teacher-divider","·");separator.setAttribute("aria-hidden","true");teacher.append(separator,document.createTextNode(course.teacher||"教师待更新"));
    copy.append(make("span","course-list-name",course.title),teacher);
    const goalReminder=window.FolioGoalUI?.label(term.id,course.id);if(goalReminder)copy.append(make("span","goal-course-reminder",goalReminder));
    const meetings=courseMeetings(course);button.append(copy,meetings,courseCreditBadge(course,maximum));
    const arrangement=[...meetings.querySelectorAll(".course-meeting")].map(group=>`${group.querySelector(".course-meeting-days").textContent}，${group.dataset.rule}，${group.querySelector(".course-meeting-room").textContent}`).join("；")||"上课安排待更新";
    button.setAttribute("aria-label",`${course.title}，${course.teacher||"教师待更新"}，${courseCreditLabel(course)}，${arrangement}${goalReminder?`，${goalReminder}`:""}，查看详情`);item.append(button);courseList.append(item);
  });
  applyCourseLayout();
  requestAnimationFrame(alignWrappedTeachers);
}
courseTermButton.addEventListener("click",()=>{
  openHomeworkSheet("选择学期",courseTermButton);
  const list=make("div","course-term-options");
  FolioCourses.semesters.forEach(term=>{const choice=action("",()=>{courseSemesterId=term.id;renderCourses();coursesPage.querySelector(".settings-scroll").scrollTop=0;closeHomeworkSheet();},"course-term-option");
    choice.append(make("span","",courseTermLabel(term)),make("span","",term.id===courseSemesterId?"✓":""));choice.setAttribute("aria-pressed",String(term.id===courseSemesterId));list.append(choice);});homeworkBody.append(list);
});
function alignWrappedTeachers(){if(coursesPage.hidden)return;courseList.querySelectorAll(".course-list-copy").forEach(copy=>{const name=copy.querySelector(".course-list-name"),teacher=copy.querySelector(".course-list-teacher");if(name&&teacher){teacher.classList.remove("is-newline");teacher.classList.toggle("is-newline",teacher.getBoundingClientRect().top>name.getBoundingClientRect().top+8);}});}
new ResizeObserver(()=>requestAnimationFrame(alignWrappedTeachers)).observe(courseList);
function courseInfo(label,value){const row=make("div","course-info-row");row.append(make("dt","",label),make("dd","",value));return row;}
function courseGroup(title){const section=make("section","course-detail-group");section.append(make("h3","settings-section-title",title));return section;}
function renderCourseAcademicFields(){
  const fields=document.querySelector("#course-detail-content .course-academic-fields"),course=currentCourseSemester().courses.find(item=>item.id===courseSelectedId);if(!fields||!course)return;fields.replaceChildren();
  const academic=typeof FolioAcademicUI!=="undefined"?FolioAcademicUI.grade(courseSemesterId,course.id):null;
  if(academic?.hidden){fields.append(courseInfo("成绩","已隐藏"));}
  else if(academic?.sealed){const row=make("div","course-info-row"),value=make("dd"),reveal=action("揭晓",event=>FolioAcademicUI.revealCourse(academic.id,event.currentTarget),"academic-tape academic-tape-row");reveal.setAttribute("aria-label",`揭晓${course.title}的成绩`);value.append(reveal);row.append(make("dt","","成绩"),value);fields.append(row);}
  else if(academic){fields.append(courseInfo("原始成绩",academic.original.original));if(academic.local.local)fields.append(courseInfo("本地主修设置",academic.local.major?"计入主修":"不计入主修"),courseInfo("本地核心课设置",academic.local.core?"绩点 ×1.2":"普通课程"));}
  else if(course.grade!=null)fields.append(courseInfo("成绩","待同步后查看"));
}
let courseDetailReturnScreen="courses";
function openCourseDetail(id,returnScreen="courses"){
  const course=currentCourseSemester().courses.find(item=>item.id===id);if(!course)return;
  courseDetailReturnScreen=returnScreen;document.getElementById("course-detail-back").setAttribute("aria-label",returnScreen==="grades"?"返回成绩页":returnScreen==="scholar"?"返回学业页":"返回课程列表");courseSelectedId=id;const body=document.getElementById("course-detail-content");body.replaceChildren();
  const hero=make("div","course-detail-hero");hero.style.setProperty("--course-color",course.color);
  hero.append(make("p","course-detail-term",`${courseTermLabel(currentCourseSemester())} · 示例`),make("h2","",course.title));
  const keyInfo=make("div","course-detail-key");keyInfo.append(make("span","",course.teacher||"教师待更新"),make("span","",courseCreditLabel(course)));hero.append(keyInfo);body.append(hero);
  const goalReminder=window.FolioGoalUI?.label(currentCourseSemester().id,course.id);if(goalReminder)hero.append(make("p","goal-course-reminder",goalReminder));
  const basic=courseGroup("课程信息"),fields=make("dl","course-info-card");fields.append(courseInfo("课号",course.code||"待更新"));
  fields.append(make("div","course-academic-fields"));basic.append(fields);body.append(basic);renderCourseAcademicFields();
  const sessions=courseGroup("上课安排"),sessionList=make("ul","course-session-list");
  course.sessions.forEach(session=>{const li=make("li"),line=make("div","course-session-time");line.append(make("strong","",`周${["一","二","三","四","五","六","日"][session.day]}`),make("span","",`${session.start}–${session.end}`));
    const rule=make("p","course-session-rule"),pattern=FolioCourses.patternLabel(session),scope=FolioCourses.ruleLabel(session,currentCourseSemester()).split(" · ").filter(text=>text!==pattern).join(" · ");
    rule.append(make("strong","",pattern));if(scope)rule.append(make("span","",scope));
    li.append(line,rule,make("p","course-session-room",session.room||"地点待更新"));sessionList.append(li);});
  if(!course.sessions.length)sessionList.append(make("li","course-empty","暂无上课安排"));sessions.append(sessionList);sessions.append(action("调整／批量排除排课",event=>window.FolioScheduleOverrideUI?.open(currentCourseSemester(),course,event.currentTarget),"small-action"));body.append(sessions);
  const exams=courseGroup("考试安排"),examList=make("ul","course-session-list");
  const linkedExams=currentExams(currentCourseSemester().id).filter(e=>e.courseId===course.id);
  linkedExams.forEach(exam=>{const li=make("li"),line=make("div","course-session-time");line.append(make("strong","",`${exam.type}${exam.source==="custom"?" · 自定义":""}`),make("span","",exam.date.replaceAll("-"," / ")));if(exam.source==="custom")li.append(make("p","course-exam-name",exam.title));li.append(line,make("p","course-exam-clock",`${exam.start}–${exam.end}`),make("p","course-session-room",`${exam.room||"教室待公布"} · ${exam.seat ? `${exam.seat} 号` : "座号待公布"}`));examList.append(li);});
  if(!linkedExams.length)examList.append(make("li","course-empty","暂无考试安排"));exams.append(examList);body.append(exams);
  body.scrollTop=0;showPreviewScreen("course-detail");
}
function returnToCourses(){const fallback=courseDetailReturnScreen;goBack(fallback);requestAnimationFrame(()=>{if(currentScreen!=="courses")return;renderCourses();courseList.querySelector(`[data-course-id="${courseSelectedId}"]`)?.focus({preventScroll:true});});}
document.getElementById("course-detail-back").addEventListener("click",returnToCourses);
document.addEventListener("preview-screen-change",event=>{if(event.detail.screen==="courses")renderCourses();});
document.addEventListener("folio-grade-visibility-change",renderCourseAcademicFields);
document.addEventListener("folio-goals-change",renderCourses);
renderCourses();
