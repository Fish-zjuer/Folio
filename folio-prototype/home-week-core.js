/* Read-only projection for the home drawer; no scheduling or completion writes. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./calendar-core.js'):root.FolioCalendar);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioHomeWeekLayout=api;
})(typeof globalThis==='undefined'?this:globalThis,Calendar=>{
  const add=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
  function personal(items){
    return items.filter(i=>!i.repeatTemplate).flatMap(item=>{
      const base={itemId:item.id,title:item.title,completed:!!item.completed,itemKind:item.kind||'todo',location:item.location||''},entries=[];
      if(item.startAt&&item.endAt)entries.push({...base,id:item.id+':range',kind:'range',startAt:item.startAt,endAt:item.endAt});
      if(item.deadline)entries.push({...base,id:item.id+':deadline',kind:'deadline',date:item.deadline,at:item.deadlineClock?item.deadline+'T'+item.deadlineClock:null});
      if(item.scheduledDay&&!item.startAt&&!item.deadline)entries.push({...base,id:item.id+':day',kind:'day',date:item.scheduledDay});
      return entries;
    });
  }
  function project(entries,date){
    return entries.flatMap(entry=>{try{return Calendar.dayEntries([entry],date);}catch{return [];}});
  }
  function collectDay(date,{coursesOn=()=>[],examsOn=()=>[],items=[],itemsFor=()=>items}={}){
    const entries=project([...coursesOn(date),...examsOn(date)],date).filter(e=>!e.allDay);
    const rows=new Map();
    for(const item of itemsFor(date)){
      if(item.repeatTemplate)continue;
      const matches=project(personal([item]),date);
      const undated=!item.startAt&&!item.deadline&&!item.scheduledDay;
      if(matches.length||(undated&&!item.completed))rows.set(item.id,{
        ...(matches.find(e=>e.kind==='deadline')||matches[0]||{}),id:item.id+':row',itemId:item.id,title:item.title,
        completed:!!item.completed,date:matches.length?date:null,itemKind:item.kind||'todo'
      });
    }
    return {date,entries,items:[...rows.values()]};
  }
  // Night occupies a narrow band while daytime retains useful reading height.
  function at(minute){const m=Math.max(0,Math.min(1440,minute));return m<360?m/360*.05:m<=1320?.05+(m-360)/960*.90:.95+(m-1320)/120*.05;}
  function lanes(entries){
    const groups=[],result=[];
    for(const entry of [...entries].sort((a,b)=>a.startMinute-b.startMinute||a.endMinute-b.endMinute||a.id.localeCompare(b.id))){
      const end=Math.max(entry.endMinute,entry.startMinute+35);let group=groups.at(-1);
      if(!group||entry.startMinute>=group.end){group={end,ends:[],items:[]};groups.push(group);}
      let lane=group.ends.findIndex(value=>value<=entry.startMinute);if(lane<0)lane=group.ends.length;
      group.ends[lane]=end;group.end=Math.max(group.end,end);group.items.push({entry,lane});
    }
    for(const group of groups)for(const item of group.items)result.push({...item,count:group.ends.length});
    return result;
  }
  return {add,personal,collectDay,at,lanes};
});
