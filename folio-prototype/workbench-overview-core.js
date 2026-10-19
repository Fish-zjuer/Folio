/* Read-only numerical projections; no invented estimates and no network requests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioOverview=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const finite=Number.isFinite,DAY=86400000;
  const number=(value,digits=0)=>finite(value)?value.toFixed(digits).replace(/\.0+$/,''):'—';
  function academic({summary,hidden=false,practice=[],courses=[],coursesKnown=true,goal=null}={}){
    const points=practice.map(r=>finite(r.points)?r.points:null),known=points.filter(finite);
    const credits=courses.map(c=>c.credits),knownCredits=credits.filter(finite);
    return {gpa:hidden?null:summary?.gpa?.[0],major:hidden?null:summary?.majorGpa?.[0],weighted:hidden?null:summary?.weightedMajorGpa,
      earned:summary?.earned,unknownEarned:summary?.unknownEarned||0,hidden,
      studying:!coursesKnown?null:knownCredits.length?knownCredits.reduce((a,b)=>a+b,0):courses.length?null:0,unknownCredits:credits.length-knownCredits.length,
      practiceTotal:points.length&&known.length===points.length?known.reduce((a,b)=>a+b,0):null,practice,
      goal:goal?{...goal,projected:hidden?null:goal.projected,gap:!hidden&&finite(goal.projected)&&finite(goal.target)?goal.projected-goal.target:null}:null};
  }
  function affairs({items=[],courses=[],exams=[],today,clock='00:00',options={},queue,known={courses:true,homework:true,exams:true}}){
    const active=items.filter(i=>!i.completed&&!i.repeatTemplate),homework=active.filter(i=>i.kind==='homework');
    const classes=courses.filter(c=>c.end>clock).sort((a,b)=>a.start.localeCompare(b.start));
    const available=exams.filter(e=>e.date&&e.date>=today&&(e.date!==today||!e.end||e.end>clock)).sort((a,b)=>a.date.localeCompare(b.date)||(a.start||'').localeCompare(b.start||''));
    const days=e=>Math.round((queue.dateValue(e.date)-queue.dateValue(today))/DAY);
    return {next:classes[0]||null,classKnown:known.courses,remaining:known.courses?classes.length:null,homework:known.homework?homework.length:null,
      urgent:known.homework?homework.filter(i=>queue.important(i,options)&&queue.noticeStage(i,today,options)!=='normal').length:null,
      nextExam:available[0]||null,examDays:available.length?days(available[0]):null,fortnight:known.exams?available.filter(e=>days(e)<14).length:null,
      dayLoad:queue.dayLoad(items,today),capacity:queue.manualLimit(items,today,options),
      incoming:active.filter(i=>i.queued&&!i.mountedOn).length};
  }
  return {number,academic,affairs};
});
