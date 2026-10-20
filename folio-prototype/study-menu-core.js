/* Context selection is separate from artwork and never mutates study records. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./study-domain-core.js'):root.FolioStudyCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioStudyMenuCore=api;})(globalThis,C=>{
 'use strict';
 const titles={focus:'这一轮专注',streak:'学习连胜',focusBars:'专注账本',tomatoes:'今日番茄',focusBands:'今日专注时段',agenda:'这一天的安排',nextRing:'下一节课',week:'这一日课表',plant:'眼前的三件事',deadline:'截止倒计时',quadrant:'轻重缓急',submitted:'学校已交作业',puzzle:'作业步骤',books:'课程进度',courseSquares:'课程进度',curve:'复习轨迹',reviewBlocks:'现在该复习的',mosaic:'知识点掌握提醒',fan:'问答闪卡',hourglass:'最近一场考试',mountain:'考试倒计时',domino:'考试进展',moons:'七夜睡眠',coffee:'今日咖啡',dayArc:'今日作息',rings:'今日三环',stairs:'本学期均绩',gradeRings:'本学期课程成绩',trend:'学期走势'};
 const defaults={tasks:'deadline',homework:'puzzle',review:'mosaic',calendar:'agenda',courses:'books',grades:'stairs',exams:'domino',focus:'focusBars',sleep:'moons',coffee:'coffee',study:'rings'};
 const urgent=(t,m)=>!!t.urgent||m.deadlines.some(d=>d.id===t.id&&d.due-m.now<3*C.DAY);
 function agenda(m,date){return [...m.schedule.filter(t=>t.date===date),...m.allTasks.filter(t=>t.kind!=='lesson'&&t.startAt?.startsWith(date)&&t.endAt).map(t=>({...t,id:'personal/'+t.id,itemId:t.id,personal:true,entryType:'personal',date,start:t.startAt.slice(11,16),end:t.endAt.slice(11,16),room:t.location||''}))].sort((a,b)=>a.start.localeCompare(b.start));}
 function select(kind,m,s={}){
  const motif=s.motif||defaults[kind]||kind, date=C.validDay(s.date)?s.date:m.today;
  let items=[],group=s.group||'',selected=null;
  if(['plant','deadline','quadrant','submitted','puzzle'].includes(motif)){
   items=motif==='plant'?(m.plantTasks||m.pending).slice(0,3):motif==='deadline'?m.deadlines:motif==='submitted'?m.tasks.filter(t=>t.kind==='homework'&&t.source==='school'&&t.schoolCompleted===true):motif==='puzzle'?m.tasks.filter(t=>t.kind==='homework'&&!t.completed):m.pending;
   if(motif==='quadrant'&&['11','10','01','00'].includes(group))items=items.filter(t=>`${t.important?1:0}${urgent(t,m)?1:0}`===group);
  } else if(['agenda','week','nextRing'].includes(motif)){
   items=motif==='nextRing'?(m.nextClass?[m.nextClass]:[]):motif==='agenda'?agenda(m,date):m.schedule.filter(t=>t.date===date);
  } else if(['books','courseSquares'].includes(motif))items=m.courseProgress;
  else if(['curve','reviewBlocks','mosaic','fan'].includes(motif)){items=motif==='reviewBlocks'?m.reviewDue:m.cards;if(s.courseId)items=items.filter(c=>c.courseId===s.courseId);if(group==='due')items=items.filter(c=>c.due);if(group==='learned')items=items.filter(c=>!c.due);}
  else if(['hourglass','mountain','domino'].includes(motif)){items=m.exams;if(group==='upcoming')items=items.filter(e=>C.examTime(e)>m.now);if(group==='finished')items=items.filter(e=>C.examTime(e)<=m.now);}
  else if(motif==='gradeRings')items=m.academic.hidden?[]:m.academic.termCourseGrades||[];
  else if(motif==='trend')items=m.academic.hidden?[]:m.academic.series||[];
  else if(motif==='moons')items=m.nights;
  else if(['focusBars','streak'].includes(motif))items=m.focusDays;
  else if(['tomatoes','focusBands'].includes(motif))items=(m.pomodoro?.sessions||[]).filter(p=>Number.isFinite(p.endedAt)&&C.day(p.endedAt)===date);
  if(s.id)selected=items.find(t=>String(t.id??t.courseId??t.termId)===String(s.id)&&(!s.date||!t.date||t.date===date))||null;
  if(s.date&&!s.id&&['moons','focusBars','streak'].includes(motif))selected=items.find(t=>t.date===date)||null;
  if(!selected&&motif==='nextRing')selected=m.nextClass;
  if(!selected&&['hourglass','mountain'].includes(motif))selected=m.upcoming;
  if(!selected&&motif==='puzzle')selected=items.find(t=>t.id===m.project?.taskId)||items[0]||null;
  if(selected)items=[selected,...items.filter(t=>t!==selected)];
  return {motif,title:titles[motif]||'学习记录',date,group,items,selected,urgent:t=>urgent(t,m)};
 }
 return Object.freeze({select,agenda,titles,defaults});
});
