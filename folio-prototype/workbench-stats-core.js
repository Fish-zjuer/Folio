(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioStats=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';const DAY=86400000,ZONE=8*3600000,finite=Number.isFinite;
  const day=ms=>new Date(ms+ZONE).toISOString().slice(0,10),at=d=>Date.parse(d+'T00:00:00Z')-ZONE;
  const monday=d=>{const ms=at(d);return ms-((new Date(ms+ZONE).getUTCDay()+6)%7)*DAY;};
  function duration(ms){if(!finite(ms))return {value:'—',unit:''};return ms>=3600000?{value:(ms/3600000).toFixed(1).replace(/\.0$/,''),unit:'h'}:{value:ms>0&&ms<60000?'<1':String(Math.floor(ms/60000)),unit:'min'};}
  function focus(raw,now){
    const sessions=raw?.version===1&&Array.isArray(raw.sessions)?raw.sessions:[],active=raw?.version===1?raw.active:null,segments=[];
    function collect(source,limit=Infinity){let left=limit;for(const p of source||[]){if(!finite(p?.start)||!finite(p?.end)||p.start<0||p.end<p.start||p.start>now)continue;const end=Math.min(p.end,now,p.start+left);if(end>p.start){segments.push({start:p.start,end});left-=end-p.start;}if(left<=0)break;}return left;}
    sessions.forEach(s=>{if(Array.isArray(s?.segments))collect(s.segments);});
    if(active&&Array.isArray(active.segments)){const left=collect(active.segments,45*60000);if(finite(active.runningFrom))collect([{start:active.runningFrom,end:now}],left);}
    // A corrupt or duplicate record cannot count the same minute twice.
    const merged=[];for(const p of segments.sort((a,b)=>a.start-b.start)){const last=merged.at(-1);if(last&&p.start<=last.end)last.end=Math.max(last.end,p.end);else merged.push({...p});}
    const byDay={};for(const p of merged){let cursor=p.start;while(cursor<p.end){const d=day(cursor),end=Math.min(p.end,at(d)+DAY);byDay[d]=(byDay[d]||0)+end-cursor;cursor=end;}}
    const today=day(now),start=monday(today),sum=(from,to)=>merged.reduce((n,p)=>n+Math.max(0,Math.min(to,p.end)-Math.max(from,p.start)),0),lastWeek=[];
    for(let i=0;i<7;i++){const d=day(start-7*DAY+i*DAY);lastWeek.push({date:d,ms:byDay[d]||0});}
    const buildings=sessions.filter(s=>s?.building&&finite(s.building.completedAt)&&s.building.completedAt<=now).map(s=>({...s.building}));
    return {total:merged.reduce((n,p)=>n+p.end-p.start,0),thisWeek:sum(start,now),lastWeek:sum(start-7*DAY,start),previousWeek:sum(start-14*DAY,start-7*DAY),today:byDay[today]||0,days:Object.keys(byDay).length,buildings,lastWeekDays:lastWeek,byDay,weekStart:day(start),sessions:sessions.length};
  }
  function tasks(items,today,clock='00:00'){
    const records=items.filter(i=>i&&!i.repeatTemplate),pending=records.filter(i=>!i.completed),completed=records.filter(i=>i.completed),homework=pending.filter(i=>i.kind==='homework'),todos=pending.filter(i=>i.kind==='todo');
    const deadline=i=>i.deadline||(i.timeMode==='range'?i.endAt?.slice(0,10):null),deadlineClock=i=>i.deadline?i.deadlineClock||'23:59':i.endAt?.slice(11,16)||'23:59';
    const overdue=pending.filter(i=>deadline(i)&&(deadline(i)<today||deadline(i)===today&&deadlineClock(i)<clock));
    const next3=pending.filter(i=>deadline(i)&&!overdue.includes(i)&&at(deadline(i))<at(today)+3*DAY&&deadline(i)>=today);
    const undated=pending.filter(i=>!deadline(i));
    return {total:records.length,completed,pending,homework,todos,overdue,next3,undated};
  }
  function semester(term,today,clock,onDate){
    const periods=term?.calendar?.periods||[],dates=periods.flatMap(p=>[p.start,p.end]).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')).sort();
    if(term?.stale||!dates.length||!finite(at(dates[0]))||at(dates.at(-1))-at(dates[0])>370*DAY)return null;
    const start=monday(today),rows=[];for(let ms=at(dates[0]);ms<=at(dates.at(-1));ms+=DAY){const d=day(ms);for(const c of onDate(term,d))rows.push({...c,date:d});}
    const amount=entries=>entries.reduce((n,c)=>n+(finite(c.periods)?c.periods:0),0),remaining=rows.filter(c=>c.date>today||c.date===today&&c.end>clock),thisWeek=rows.filter(c=>at(c.date)>=start&&at(c.date)<start+7*DAY),nextWeek=rows.filter(c=>at(c.date)>=start+7*DAY&&at(c.date)<start+14*DAY);
    return {total:amount(rows),remaining:amount(remaining),thisWeek:amount(thisWeek),nextWeek:amount(nextWeek),days:new Set(remaining.map(c=>c.date)).size,courses:term.courses.length,rows,remainingRows:remaining,thisWeekRows:thisWeek,nextWeekRows:nextWeek};
  }
  return {day,at,monday,duration,focus,tasks,semester};
});
