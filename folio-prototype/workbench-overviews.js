/* Two native DOM widgets: live local records, independent destinations, no mock fallback on Android. */
(()=>{
  'use strict';
  const mounted=new Set(),C=FolioOverview;
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
  function currentTerm(){return FolioCourses.semesters[0];}
  function stamp(){return {today:homeworkState.today,clock:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())};}
  function model(kind){
    const t=currentTerm();
    if(kind==='academic')return C.academic({...FolioAcademicUI.overview(),courses:t?.courses||[],coursesKnown:!!t?.calendar&&!t.stale,goal:FolioGoalUI.overview()});
    const now=stamp(),native=window.FolioApp?.native,modules=window.FolioSchool?.cache().modules||{};
    return C.affairs({...now,items:homeworkState.items,courses:t?FolioCourses.onDate(t,now.today):[],exams:t?currentExams(t.id):[],
      known:{courses:!!t?.calendar&&!t.stale,homework:!native||Array.isArray(modules.homework?.data),exams:!native||Array.isArray(modules.exams?.data)},
      options:{weekdayLimit:1,weekendLimit:homeworkState.weekendLimit||3,...FolioGoalUI.queueOptions()},queue:FolioQueue});
  }
  function open(part){
    if(['grades','practice'].includes(part)){FolioAcademicUI.openOverview(part);return;}
    if(part==='courses'){courseSemesterId=currentTerm().id;renderCourses();showPreviewScreen('courses');return;}
    if(part==='calendar'){selectCalendarDay(homeworkState.today);showPreviewScreen('calendar');return;}
    if(part==='exams'){examViewTermId=currentTerm().id;renderExams();showPreviewScreen('exams');return;}
    if(part==='notes'){FolioWorkbench.openInbox();return;}
    showPreviewScreen(part);
  }
  function region(root,key,label,preview){const b=make(preview?'div':'button','overview-region overview-'+key);if(!preview){b.type='button';b.dataset.widgetHold='';b.setAttribute('aria-label',label);b.addEventListener('click',()=>open(key));}root.append(b);return b;}
  function metric(parent,label,value,unit='',cls=''){const block=make('span','overview-metric '+cls),digits=make('strong','overview-number',value);if(unit)digits.append(make('small','overview-unit',unit));block.append(make('span','overview-label',label),digits);parent.append(block);return block;}
  function sub(parent,text,cls=''){parent.append(make('span','overview-sub '+cls,text));}
  function render(root,kind,preview=false){
    const value=model(kind),signature=JSON.stringify(value);if(root._signature===signature)return;root._signature=signature;root.replaceChildren();
    if(kind==='academic'){
      const grades=region(root,'grades','查看全部成绩、总均绩、主修与加权均绩',preview);
      [['均绩',value.gpa],['主修',value.major],['加权',value.weighted]].forEach(([label,n])=>metric(grades,label,C.number(n,2)));
      const credits=region(root,'courses','查看本学期课程与学分',preview);metric(credits,'已获学分',C.number(value.earned)+(value.unknownEarned?'+':''));sub(credits,'在修 '+C.number(value.studying)+(value.unknownCredits?'+':''));
      const goal=region(root,'goals','查看并调整课程目标',preview);
      metric(goal,value.goal?value.goal.label.replace('均绩','目标'):'目标',''+C.number(value.goal?.target,2));
      sub(goal,value.goal?'预计 '+C.number(value.goal.projected,2):'尚未设置');
      if(Number.isFinite(value.goal?.gap))sub(goal,(value.goal.gap>=0?'+':'−')+C.number(Math.abs(value.goal.gap),2),'overview-gap'+(value.goal.gap<0?' is-short':''));
      const practice=region(root,'practice','查看实践记点及各课堂明细',preview);
      metric(practice,'实践',C.number(value.practiceTotal,1));const parts=make('span','overview-practice-parts');
      for(const id of ['second','third','fourth']){const r=value.practice.find(r=>r.id===id);metric(parts,{second:'二课',third:'三课',fourth:'四课'}[id],C.number(r?.points,1));}practice.append(parts);
      root.dataset.private=String(value.hidden);
    }else{
      const course=region(root,'calendar','查看今日课程日程',preview),running=value.next&&value.next.start<=stamp().clock;
      metric(course,running?'上课中':'上课',value.next?.start||'—');
      const courseCopy=make('span','overview-course-copy');sub(courseCopy,value.next?.title||(value.classKnown?'暂无课程':'课表待同步'),'overview-course-title');sub(courseCopy,value.next?.room||'');course.append(courseCopy);sub(course,'余 '+C.number(value.remaining),'overview-course-count');
      const homework=region(root,'homework','查看未完成作业与重要紧急作业',preview);metric(homework,'未交作业',C.number(value.homework));sub(homework,'重要紧急 '+C.number(value.urgent),value.urgent?'is-short':'');
      const exam=region(root,'exams','查看最近考试及未来两周考试安排',preview);metric(exam,'最近考试',C.number(value.examDays),'天');sub(exam,'两周内 '+C.number(value.fortnight)+' 场');
      const notes=region(root,'notes','展开待贴便签袋',preview);metric(notes,'今日新挂',value.dayLoad+'/'+value.capacity);const bag=make('span','overview-bag');bag.innerHTML='<svg viewBox="0 0 34 29" aria-hidden="true"><path d="m6 15-1-9 8-2 2 10M17 15l1-12 9 2-1 10" fill="#d2b67a"/><path d="M2 12h30v14H2z" fill="#c8cbb0"/><path d="M3 15h28" stroke="#93a080" stroke-width="2"/></svg>';sub(bag,'待贴 '+value.incoming);notes.append(bag);
    }
    root.dataset.example=String(!window.FolioApp?.native);
  }
  function mount(container,kind,preview=false){const root=make('div','overview-widget overview-'+kind);root.dataset.overview=kind;render(root,kind,preview);container.append(root);if(!preview)mounted.add({root,kind});}
  function update(){for(const entry of mounted){if(!entry.root.isConnected){mounted.delete(entry);continue;}render(entry.root,entry.kind);}}
  for(const name of ['folio-data-change','folio-school-change','folio-exams-change','folio-goals-change','folio-grade-visibility-change','folio-academic-calculation-change'])document.addEventListener(name,update);
  document.addEventListener('preview-screen-change',event=>{if(event.detail.screen==='workbench')update();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  setInterval(()=>{if(!document.hidden&&currentScreen==='workbench')update();},60000);
  FolioWorkbench.registerMany([
    {id:'overview-academic',label:'学业总览',description:'本地记录 · 均绩 / 学分 / 目标 / 实践',mount:c=>mount(c,'academic'),preview:c=>mount(c,'academic',true)},
    {id:'overview-affairs',label:'事务总览',description:'本地记录 · 上课 / 作业 / 考试 / 便签',mount:c=>mount(c,'affairs'),preview:c=>mount(c,'affairs',true)}
  ]);
})();
