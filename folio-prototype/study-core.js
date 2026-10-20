/* Optional local study records; no fabricated sleep, chapters or completed work. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioStudyCore=api;})(globalThis,()=>{
 'use strict';const DAY=86400000,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const at=d=>Date.parse(d+'T00:00:00+08:00'),day=ms=>new Date(ms+8*3600000).toISOString().slice(0,10),add=(d,n)=>day(at(d)+n*DAY);
 const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(at(d))&&day(at(d))===d;
 const clean=()=>({version:1,nights:[],coffee:[],cards:[],focusGoal:90,sleepGoal:8});
 function restore(raw){const s=clean();if(raw?.version!==1)return s;for(const k of ['nights','coffee','cards'])if(Array.isArray(raw[k]))s[k]=raw[k].filter(v=>v&&typeof v==='object').slice(-2000);if(Number.isFinite(raw.focusGoal)&&raw.focusGoal>=15&&raw.focusGoal<=720)s.focusGoal=raw.focusGoal;if(Number.isFinite(raw.sleepGoal)&&raw.sleepGoal>=4&&raw.sleepGoal<=12)s.sleepGoal=raw.sleepGoal;return s;}
 function record(state,kind,values,today){if(!validDay(today))throw Error('日期不正确');const s=restore(JSON.parse(JSON.stringify(state)));
  if(kind==='night'){const hours=Number(values.hours),date=values.date;if(!validDay(date)||date>today||!Number.isFinite(hours)||hours<0||hours>24)throw Error('请填写有效日期与0–24小时睡眠');s.nights=s.nights.filter(r=>r.date!==date);s.nights.push({date,hours});}
  else if(kind==='coffee'){const count=Number(values.count);if(!Number.isInteger(count)||count<0||count>30)throw Error('杯数应为0–30的整数');s.coffee=s.coffee.filter(r=>r.date!==today);s.coffee.push({date:today,count});}
  else if(kind==='card'){if(!String(values.question||'').trim()||!String(values.answer||'').trim())throw Error('请填写问题和答案');s.cards.push({id:values.id,title:String(values.title||'').trim().slice(0,120),courseId:values.courseId||'',termId:values.termId||'',question:values.question.trim().slice(0,2000),answer:values.answer.trim().slice(0,4000),createdDay:today,reviews:[]});}
  else if(kind==='review'){const c=s.cards.find(c=>c.id===values.id),level=Number(values.level);if(!c||![0,1,2,3,4].includes(level))throw Error('复习记录不正确');c.reviews=Array.isArray(c.reviews)?c.reviews:[];c.reviews=c.reviews.filter(r=>r.date!==today);c.reviews.push({date:today,level});c.reviews=c.reviews.slice(-100);}
  else if(kind==='delete-card')s.cards=s.cards.filter(c=>c.id!==values.id);
  else if(kind==='goals'){const f=Number(values.focusGoal),h=Number(values.sleepGoal);if(!Number.isFinite(f)||f<15||f>720||!Number.isFinite(h)||h<4||h>12)throw Error('专注15–720分钟，睡眠4–12小时');s.focusGoal=f;s.sleepGoal=h;}
  else throw Error('不支持的学习记录');return s;
 }
 function review(card,today){const rows=(card.reviews||[]).filter(r=>validDay(r.date)&&r.date<=today&&[0,1,2,3,4].includes(r.level)).sort((a,b)=>a.date.localeCompare(b.date)),last=rows.at(-1),interval=last?[1,1,3,7,14][last.level]:0,elapsed=last?Math.max(0,(at(today)-at(last.date))/DAY):null;return {...card,reviews:rows,level:last?.level??0,lastDay:last?.date||null,due:!last||elapsed>=interval,interval,memory:last?clamp(Math.exp(-elapsed/Math.max(1,interval))*last.level/4):0};}
 function streak(byDay,today){let count=0,cursor=(byDay[today]||0)>0?today:add(today,-1);while((byDay[cursor]||0)>0&&count<10000){count++;cursor=add(cursor,-1);}return count;}
 function examTime(e,end=true){return /^\d\d:\d\d$/.test(e[end?'end':'start']||'')?Date.parse(e.date+'T'+e[end?'end':'start']+':00+08:00'):at(e.date)+(end?DAY-1:0);}
 function model(input){const {today,now=Date.now(),study=clean(),tasks=[],focus={},courses=[],exams=[],academic={},termId:requestedTermId}=input;const term=courses.find(c=>c.id===requestedTermId)||courses[0],termId=term?.id,cards=(study.cards||[]).filter(c=>!c.termId||c.termId===termId).map(c=>review(c,today));
  const dueTime=t=>{if(t.deadline)return Date.parse(t.deadline+'T'+(t.deadlineClock||'23:59')+':00+08:00');if(t.endAt)return Date.parse(t.endAt+(t.endAt.length===16?':00+08:00':''));return NaN;};
  const todos=tasks.filter(t=>!['event','lesson'].includes(t.kind)),pending=todos.filter(t=>!t.completed),deadlines=pending.map(t=>({...t,due:dueTime(t)})).filter(t=>Number.isFinite(t.due)).sort((a,b)=>a.due-b.due),termExams=exams.filter(e=>(!termId||e.semesterId===termId)&&validDay(e.date)).sort((a,b)=>examTime(a,false)-examTime(b,false)),upcoming=termExams.find(e=>examTime(e)>=now)||null;
  return {today,now,study,allTasks:tasks,tasks:todos,pending,deadlines,focus,courses:term?.courses||[],termId,term,academic,cards,reviewDue:cards.filter(c=>c.due),reviewed:cards.filter(c=>c.lastDay===today).length,exams:termExams,upcoming,daysToExam:upcoming?Math.max(0,Math.ceil((at(upcoming.date)-at(today))/DAY)):null,streak:streak(focus.byDay||{},today),focusDays:Array.from({length:7},(_,i)=>{const date=add(today,i-6);return {date,ms:focus.byDay?.[date]||0};}),nights:Array.from({length:7},(_,i)=>{const date=add(today,i-6);return {date,hours:study.nights.find(n=>n.date===date)?.hours??null};}),coffee:study.coffee.find(c=>c.date===today)?.count??null};
 }
 return {DAY,clamp,at,day,add,validDay,clean,restore,record,review,streak,examTime,model};
});
