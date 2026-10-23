/* 手机端真实数据编排。单模块校验、缓存、发布；失败不会清空已有数据。 */
(function(){
  "use strict";
  if(!window.FolioApp?.native)return;
  const B=FolioBackend,N=FolioNative,flights=new Map();
  let state=N.cache(),captcha="",accountEpoch=0,browserSite=null;
  const connectedRequest=FolioSchoolConnection.create({call:(op,args)=>N.call(op,args),decode:B.decode,nativeRecovery:true});
  const request=async(module,args={})=>{const epoch=accountEpoch;const result=await connectedRequest(module,args);if(epoch!==accountEpoch)throw new Error("学校账号已切换，请重新同步");if(module!=="calendar"&&state.lastLoginWarning){delete state.lastLoginWarning;localStorage.setItem(N.storageKey,JSON.stringify(state));}return result;};
  function term(id){let found=FolioCourses.semesters.find(t=>t.id===id);if(!found){found=B.emptyTerm(id);FolioCourses.semesters.push(found);}return found;}
  function store(module,data,warning=null){const next=structuredClone(state);next.protocolVersion=3;next.modules[module]={data,updatedAt:new Date().toISOString(),warning};next.terms=structuredClone(B.sortTerms(FolioCourses.semesters,FolioCourses.semesters[0]?.id));localStorage.setItem(N.storageKey,JSON.stringify(next));state=next;return data;}
  function updateCredits(records){const values=new Map((state.modules.courseCredits?.data||[]).map(c=>[`${c.termId}:${c.courseId}`,c]));for(const c of records)values.set(`${c.termId}:${c.courseId}`,c);const data=[...values.values()];for(const t of FolioCourses.semesters)for(const course of t.courses){const credit=values.get(`${t.id}:${course.id}`);if(credit){course.credits=credit.credits;if(!course.code&&credit.courseCode)course.code=credit.courseCode;}}store("courseCredits",data);return data;}
  function bindAccount(info){
    const nextId=info?.accountId||"";if(!nextId)return false;if(state.accountId===nextId){if(info.authenticated){delete state.lastLoginWarning;localStorage.setItem(N.storageKey,JSON.stringify(state));}return false;}
    accountEpoch++;const keys={academic:"folio-academic-v1",goals:"folio-goals-v1"},profiles=JSON.parse(localStorage.getItem("folio-school-profiles-v1")||"{}"),oldId=state.accountId||"unverified-0.2";
    const oldHomework=homeworkState.items.filter(i=>i.source==="school");profiles[oldId]={school:structuredClone(state),academic:localStorage.getItem(keys.academic),goals:localStorage.getItem(keys.goals),homework:oldHomework};
    const profile=profiles[nextId],fresh={version:1,protocolVersion:3,accountId:nextId,modules:{},terms:[B.emptyTerm()]};state=profile?.school?B.migrateCache(profile.school).cache:fresh;state.accountId=nextId;
    let privacy=FolioAcademic.fresh();try{const a=JSON.parse(localStorage.getItem(keys.academic)||"{}");if(typeof a.hideGrades==="boolean")privacy.hideGrades=a.hideGrades;if(a.reveal)privacy.reveal={...privacy.reveal,enabled:a.reveal.enabled,seen:{}};}catch{}
    if(info.warning)state.lastLoginWarning=info.warning;state.needsInitialSync=info.authenticated===true||info.initialSync===true;
    localStorage.setItem("folio-school-profiles-v1",JSON.stringify(profiles));localStorage.setItem(N.storageKey,JSON.stringify(state));localStorage.setItem(keys.academic,profile?.academic||JSON.stringify(privacy));localStorage.setItem(keys.goals,profile?.goals||"null");
    homeworkState.items=[...homeworkState.items.filter(i=>i.source!=="school"),...(profile?.homework||[])];localStorage.setItem(homeworkDemo.storageKey,JSON.stringify(homeworkState));
    // Existing screens close over the active semester; reload only after the isolated state is durable.
    if(typeof location!=="undefined")location.reload();return true;
  }
  function failed(module,error){const next=structuredClone(state);next.modules[module]={...next.modules[module],warning:error.message};try{localStorage.setItem(N.storageKey,JSON.stringify(next));state=next;}catch{}document.dispatchEvent(new Event("folio-school-change"));}
  function publish(){document.dispatchEvent(new Event("folio-data-change"));document.dispatchEvent(new Event("folio-exams-change"));document.dispatchEvent(new Event("folio-school-change"));if(typeof renderCourses==="function")renderCourses();}
  async function refresh(module,selected=FolioCourses.semesters[0].id){
    const key=module==="courses"?`courses:${selected}`:module;if(flights.has(key))return flights.get(key);
    const work=(async()=>{try{
      if(module==="grades"){
        const raw=await request("grades"),fresh=B.grades(raw);let majorIds=null;
        try{const items=B.array(await request("major"),"items");majorIds=new Set(items.map(g=>`school-grade-${g.xkkh}`));store("major",[...majorIds]);store("majorCourses",items.map(g=>({code:FolioAcademic.courseCode({id:g.xkkh,courseCode:g.kch}),schoolId:g.xkkh})).filter(g=>g.code));}catch(error){failed("major",error);const prior=state.modules.major?.data;if(prior)majorIds=new Set(prior);}
        const old=new Map((state.modules.grades?.data||[]).map(g=>[g.id,g]));
        const records=fresh.map(g=>{term(g.termId);let points=FolioAcademic.gradePoints(g.original,g.grading);if(g.grading==="percent"&&typeof g.reportedFive==="number"&&g.reportedFive>=0&&g.reportedFive<=5){const five=g.reportedFive;points={five,four43:five>4?({5:4.3,4.8:4.2,4.5:4.1,4.2:4}[five]??4):five,four:Math.min(4,five),gpaIncluded:true};}return {...g,...points,major:majorIds?majorIds.has(g.id):old.get(g.id)?.major??false,score:FolioAcademic.percentScore(g.original,g.grading),earned:g.grading==="passFail"?/^(合格|P)$/.test(g.original):points.five!==null&&points.five>0};});
        if(!records.every(g=>FolioAcademic.validRecord("grades",g)))throw new Error("成绩包含无法识别的分制或学分，保留已有成绩");
        const merged=new Map(old);for(const g of records)merged.set(g.id,g);const data=[...merged.values()];updateCredits(B.courseCredits(raw));const catalogs=B.restoreCourseCatalog(FolioCourses.semesters,data);for(const catalog of catalogs){const existing=term(catalog.id);existing.courses=catalog.courses;}store(module,data);FolioAcademicDemo.grades=data;publish();return data;
      }
      if(module==="courses"){
        const t=term(selected);if(!/^20\d{2}-20\d{2}-[12]$/.test(selected))throw new Error("这个学期缺少教务学期编号");
        let config=state.modules[`calendar:${selected}`]?.data||null;if(config)try{B.calendar(config,selected);}catch{config=null;}
        try{const candidate=await request("calendar",{term:selected});const normalized=B.calendar(candidate,selected);config=candidate;t.calendar=normalized;store(`calendar:${selected}`,config);}catch(error){failed(`calendar:${selected}`,error);}
        const halves=selected.endsWith("1")?["1|秋","1|冬"]:["2|春","2|夏"],parts=[];
        // 一个半学期失败时，整张课表保留，不用残缺结果覆盖。
        for(const season of halves)parts.push(B.timetable(await request("courses",{year:selected.slice(0,9),season,captcha}),selected,season,config));
        // In Celechron, ExamDto.xf completes the credit missing from timetable sessions,
        // including courses whose exam date has not yet been announced.
        try{const raw=await request("exams");updateCredits(B.courseCredits(raw));}catch(error){failed("courseCredits",error);}
        const fresh=B.mergeCourses(parts),credits=new Map((state.modules.courseCredits?.data||[]).filter(g=>g.termId===selected).map(g=>[g.courseId,g.credits]));
        const previous=new Map(t.courses.map(c=>[c.id,c]));t.courses=fresh.map(c=>({...c,code:c.code||(state.modules.courseCredits?.data||[]).find(g=>g.termId===selected&&g.courseId===c.id)?.courseCode||previous.get(c.id)?.code||null,credits:c.credits??credits.get(c.id)??previous.get(c.id)?.credits??null,exams:(state.modules.exams?.data||[]).filter(e=>e.courseId===c.id&&e.semesterId===selected)}));
        const restored=B.restoreCourseCatalog([t],(state.modules.grades?.data||[]).filter(g=>g.termId===selected));t.courses=restored[0].courses;t.stale=false;store(key,t.courses);publish();return t.courses;
      }
      if(module==="homework"){
        const fresh=B.homework(await request("homework")),freshIds=new Set(fresh.map(i=>i.id)),merged=B.mergeHomework(homeworkState.items,fresh),items=merged.filter(i=>i.source!=="school"||freshIds.has(i.id)),next={...homeworkState,items,today:B.today()};
        localStorage.setItem(homeworkDemo.storageKey,JSON.stringify(next));homeworkState.items=items;homeworkState.today=next.today;commit();store(module,fresh);publish();return homeworkState.items.filter(i=>i.kind==="homework");
      }
      if(module==="exams"){
        const raw=await B.examPages(page=>request("exams",{page})),data=B.exams(raw);for(const exam of data)term(exam.semesterId);updateCredits(B.courseCredits(raw));officialExamRecords.splice(0,officialExamRecords.length,...data.filter(e=>!e.unscheduled));
        for(const t of FolioCourses.semesters)for(const c of t.courses)c.exams=data.filter(e=>e.courseId===c.id&&e.semesterId===t.id);
        store(module,data);publish();return data;
      }
      if(module==="practice"){
        const [detailsResult,summaryResult]=await Promise.allSettled([request("practice").then(B.practice),request("practiceSummary").then(B.practiceSummary)]);
        if(detailsResult.status==="rejected"&&summaryResult.status==="rejected"){failed("practiceSummary",summaryResult.reason);throw detailsResult.reason;}
        const warning=[detailsResult,summaryResult].filter(r=>r.status==="rejected").map(r=>r.reason.message).join("；")||null;
        let summary;
        if(summaryResult.status==="fulfilled"){summary=summaryResult.value;store("practiceSummary",summary);}else{failed("practiceSummary",summaryResult.reason);summary=state.modules.practiceSummary?.data;}
        const groups=detailsResult.status==="fulfilled"?detailsResult.value:structuredClone(state.modules.practice?.data||["第二课堂","第三课堂","第四课堂"].map((title,i)=>({id:["second","third","fourth"][i],title,points:null,detailsAvailable:false,items:[]})));
        summary?.points?.forEach((p,i)=>{if(p!==null)groups[i].points=p;});
        store(module,groups,warning);FolioAcademicDemo.practice=groups;publish();return groups;
      }
      throw new Error("未知模块");
    }catch(error){failed(key,error);throw error;}})();flights.set(key,work);try{return await work;}finally{flights.delete(key);}
  }
  function warnings(){const id=FolioCourses.semesters[0]?.id;return [['grades','成绩'],['major','主修'],[`courses:${id}`,'课表'],['exams','考试'],['homework','作业'],['practice','实践']].map(([key,label])=>({label,warning:state.modules[key]?.warning||(key==='practice'?state.modules.practiceSummary?.warning:null)})).filter(e=>e.warning);}
  window.FolioSchool={idle:()=>Promise.allSettled([...flights.values()]),refresh,bindAccount,warnings,cache:()=>state,login:site=>{browserSite=site;return N.call("school.login",{site});},authenticate:site=>N.call("school.authenticate",{site}),setCaptcha:value=>{captcha=String(value).trim().slice(0,20);},
    setCalendar(dates){if(dates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d))||!(dates[0]<=dates[1]&&dates[1]<dates[2]&&dates[2]<=dates[3]))throw new Error("请填写连续、顺序正确的四个日期");const t=FolioCourses.semesters[0],raw={startEnd:dates,sessionTime:[]};t.calendar={...B.calendar(raw,t.id),manual:true};store(`calendar:${t.id}`,raw);publish();},
    async sync(){const jobs=[...Object.keys({grades:1,courses:1,homework:1,practice:1}).map(m=>FolioAcademicUI.refresh(m)),refresh("exams")];const result=await Promise.allSettled(jobs),warning=FolioSchoolConnection.failureSummary(warnings());if(warning)state.lastLoginWarning=warning;else delete state.lastLoginWarning;localStorage.setItem(N.storageKey,JSON.stringify(state));return result;},
    async setTerm(id){if(!/^20\d{2}-20\d{2}-[12]$/.test(id))throw new Error("学期编号不正确");const existing=term(id);FolioCourses.semesters.splice(FolioCourses.semesters.indexOf(existing),1);FolioCourses.semesters.unshift(existing);store("activeTerm",id);location.reload();}
  };
  window.addEventListener("folio-school-login",async()=>{const site=browserSite,epoch=accountEpoch;browserSite=null;if(!site)return;
    // Dismissing the official login rotates native cookie generation. Let requests
    // started before that rotation finish before launching a fresh sync; otherwise
    // refresh() reuses the old doomed in-flight exam request and never retries.
    await Promise.allSettled([...flights.values()]);if(epoch!==accountEpoch)return;
    const modules=site==='academic'?['grades','courses','exams']:site==='homework'?['homework']:['practice'];await Promise.allSettled(modules.map(m=>m==='exams'?refresh(m):FolioAcademicUI.refresh(m)));});
  let homeworkAt=0,homeworkBusy=false;
  async function refreshHomeworkIfStale(){
    if(homeworkBusy||!state.accountId||Date.now()-homeworkAt<60000)return;
    homeworkBusy=true;homeworkAt=Date.now();
    try{await refresh("homework");}catch{}finally{homeworkBusy=false;}
  }
  document.addEventListener("DOMContentLoaded",()=>{
    if(state.needsInitialSync){state.needsInitialSync=false;localStorage.setItem(N.storageKey,JSON.stringify(state));FolioSchool.sync().then(()=>{if(warnings().length&&typeof announce==='function')announce('学校数据未全部更新，请在教务连接查看具体原因。');}).catch(()=>{});}
    refreshHomeworkIfStale();
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshHomeworkIfStale();});
  window.addEventListener("focus",()=>refreshHomeworkIfStale());
})();
