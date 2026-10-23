/* 待办模型：时间段不伪装成 DDL，重复事项每次独立完成。 */
(function(root) {
  "use strict";
  const DAY=86400000, P=typeof module!=="undefined"&&module.exports?require("./item-policy-core.js"):root.FolioItemPolicy;
  function value(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date||"")) throw new Error("请选择有效日期");
    const timestamp=Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==date) throw new Error("请选择有效日期");
    return timestamp;
  }
  const iso=timestamp=>new Date(timestamp).toISOString().slice(0,10);
  const addDays=(date,n)=>iso(value(date)+n*DAY);
  function validClock(clock) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock||""); }
  function minuteValue(at) {
    const [date,clock]=String(at||"").split("T"); value(date);
    if (!validClock(clock)) throw new Error("时间格式应为 09:00");
    return value(date)+(Number(clock.slice(0,2))*60+Number(clock.slice(3)))*60000;
  }
  const mode=item=>item.timeMode || (item.deadline ? "deadline" : "none");
  const anchor=item=>mode(item)==="range" ? item.startAt?.slice(0,10) : item.deadline || item.scheduledDay || item.createdDay;
  function validate(draft) {
    if (draft.kind!=null && !["todo","homework","event","lesson"].includes(draft.kind)) throw new Error("请选择有效类型");
    P.validate(draft);
    if (!["none","deadline","range","pending"].includes(mode(draft)))throw Error("请选择有效时间方式");
    if(mode(draft)==="pending"&&draft.scheduledDay)value(draft.scheduledDay);
    if (!draft.title.trim()) throw new Error("请填写标题");
    if (mode(draft)==="deadline") {
      value(draft.deadline); if (draft.deadlineClock && !validClock(draft.deadlineClock)) throw new Error("截止时间格式应为 09:00");
    } else if (mode(draft)==="range") {
      if (minuteValue(draft.endAt)<=minuteValue(draft.startAt)) throw new Error("结束时间必须晚于开始时间");
    }
    const repeat=draft.repeat || {kind:"none",interval:1};
    if (!["none","daily","weekly","monthly"].includes(repeat.kind)) throw new Error("请选择有效重复周期");
    if (repeat.kind!=="none") {
      value(anchor(draft));
      if (!Number.isInteger(repeat.interval)||repeat.interval<1||repeat.interval>365) throw new Error("重复间隔应为 1 到 365");
      if (repeat.kind==="weekly" && (!repeat.weekdays?.length || repeat.weekdays.some(n=>!Number.isInteger(n)||n<1||n>7))) throw new Error("至少选择一周中的一天");
      if (repeat.until && value(repeat.until)<value(anchor(draft))) throw new Error("重复结束日期不能早于首次日期");
    }
    if (P.offsets(draft).length) {
      if (mode(draft)==="none") throw new Error("设置时间后才能提前提醒");
      
    }
    return draft;
  }
  function matches(item,date) {
    const first=anchor(item), repeat=item.repeat;
    if (!repeat || repeat.kind==="none" || !first || date<first || (repeat.until && date>repeat.until)) return false;
    const delta=(value(date)-value(first))/DAY, interval=repeat.interval||1;
    if (repeat.kind==="daily") return delta%interval===0;
    if (repeat.kind==="weekly") {
      const weekDay=day=>(new Date(value(day)).getUTCDay()+6)%7;
      const weeks=Math.round(((value(date)-weekDay(date)*DAY)-(value(first)-weekDay(first)*DAY))/(7*DAY));
      return weeks%interval===0 && repeat.weekdays.includes(weekDay(date)+1);
    }
    const a=new Date(value(first)), b=new Date(value(date));
    const months=(b.getUTCFullYear()-a.getUTCFullYear())*12+b.getUTCMonth()-a.getUTCMonth();
    const last=new Date(Date.UTC(b.getUTCFullYear(),b.getUTCMonth()+1,0)).getUTCDate();
    return months%interval===0 && b.getUTCDate()===Math.min(a.getUTCDate(),last);
  }
  function occurrence(parent,date,existing) {
    const first=anchor(parent), shift=(value(date)-value(first))/DAY;
    const item={...parent,id:`${parent.id}@${date}`,parentId:parent.id,occurrenceDay:date,scheduledDay:date,repeatTemplate:false,
      completed:existing?.completed||false,queued:existing ? existing.queued : parent.queued,
      mountedOn:existing?.mountedOn||null,mountDate:existing?.mountDate||null,mountClock:existing?existing.mountClock??null:parent.mountClock??null,manualDate:existing?.manualDate||false};
    if (mode(parent)==="deadline") item.deadline=date;
    if (mode(parent)==="pending") item.scheduledDay=date;
    if (mode(parent)==="range") {
      item.startAt=`${addDays(parent.startAt.slice(0,10),shift)}T${parent.startAt.slice(11)}`;
      item.endAt=`${addDays(parent.endAt.slice(0,10),shift)}T${parent.endAt.slice(11)}`;
    }
    return item;
  }
  function materialize(items,today) {
    value(today);
    const parents=new Map(items.filter(item=>item.source==="personal"&&!item.parentId).map(item=>[item.id,item]));
    parents.forEach(parent=>{parent.repeatTemplate=Boolean(parent.repeat && parent.repeat.kind!=="none");});
    const result=items.filter(item=>{
      if (!item.parentId) return true;
      const parent=parents.get(item.parentId);
      return parent && (matches(parent,item.occurrenceDay) || item.completed || item.mountedOn || item.occurrenceDay<today);
    });
    const ids=new Map(result.map(item=>[item.id,item]));
    parents.forEach(parent=>{
      if (!parent.repeatTemplate) return;
      const start=anchor(parent)>addDays(today,-7) ? anchor(parent) : addDays(today,-7), end=addDays(today,13);
      for(let date=start;date<=end;date=addDays(date,1)) {
        if (!matches(parent,date)) continue;
        const id=`${parent.id}@${date}`,existing=ids.get(id),generated=occurrence(parent,date,existing);
        if (existing) Object.assign(existing,generated); else {result.push(generated);ids.set(id,generated);}
      }
      // 首次日期很远、或演示窗口中的实例全部完成时，仍提供下一次安排。
      const futureStart=anchor(parent)>today ? anchor(parent) : today;
      const futureEnd=addDays(futureStart,Math.max(366,(parent.repeat.interval||1)*32));
      for(let date=futureStart;date<=futureEnd;date=addDays(date,1)) {
        if (parent.repeat.until && date>parent.repeat.until) break;
        if (!matches(parent,date)) continue;
        const id=`${parent.id}@${date}`;
        if (ids.get(id)?.completed) continue;
        if (!ids.has(id)) {const child=occurrence(parent,date);result.push(child);ids.set(id,child);}
        break;
      }
    });
    return result;
  }
  function listItems(items,surface="todos") {
    const result=[];
    items.filter(item=>(item.source==="personal"||surface&&P.shows(item,surface))&&!item.parentId&&(!surface||P.shows(item,surface))).forEach(parent=>{
      if (!parent.repeatTemplate) {result.push(parent);return;}
      const children=items.filter(item=>item.parentId===parent.id).sort((a,b)=>a.occurrenceDay.localeCompare(b.occurrenceDay));
      result.push(children.find(item=>!item.completed) || children.at(-1) || parent);
    });
    return result;
  }
  function reminderTimes(item) {
    if(item.repeatTemplate||item.completed||item.schoolCompleted||mode(item)==="none"||mode(item)==="pending")return [];
    const at=mode(item)==="range"?item.startAt:item.deadlineClock?`${item.deadline}T${item.deadlineClock}`:null;
    if(!at)return [];return P.offsets(item).map(minutes=>({minutes,at:new Date(minuteValue(at)-minutes*60000).toISOString().slice(0,16)}));
  }
  function reminderAt(item){return reminderTimes(item)[0]?.at||null;}
  const api={value,addDays,mode,anchor,validClock,minuteValue,validate,matches,materialize,listItems,reminderAt,reminderTimes};
  if(typeof module!=="undefined"&&module.exports) module.exports=api; else root.FolioTodo=api;
})(typeof globalThis==="undefined"?this:globalThis);
