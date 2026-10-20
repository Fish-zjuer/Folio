/* 独立队列模型：日期按本地日历日计算，不依赖浏览器时区。 */
(function (root) {
  "use strict";
  const DAY = 86400000;
  function dateValue(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw new Error("无效日期");
    const value = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(value) || new Date(value).toISOString().slice(0, 10) !== date) throw new Error("无效日期");
    return value;
  }
  const iso = value => new Date(value).toISOString().slice(0, 10);
  function weekendFor(deadline) {
    const date = dateValue(deadline);
    const weekday = (new Date(date).getUTCDay() + 6) % 7;
    const monday = date - weekday * DAY;
    return [-3, -2, -1].map(offset => iso(monday + offset * DAY));
  }
  function weekFor(deadline) {
    const friday = dateValue(weekendFor(deadline)[0]);
    return [-4,-3,-2,-1,0,1,2].map(offset => iso(friday + offset * DAY));
  }
  function normalize(weights) {
    if (!Array.isArray(weights) || ![3,7].includes(weights.length) || weights.some(n => !Number.isFinite(n) || n < 0)) {
      throw new Error("请填写有效的非负比例");
    }
    const total = weights.reduce((a,b) => a+b,0);
    if (!Number.isFinite(total) || total <= 0) throw new Error("至少给一天设置大于 0 的比例");
    return weights.map(weight => weight / total * 100);
  }
  function quotas(count, weights) {
    if (!Number.isInteger(count) || count < 0) throw new Error("无效作业数量");
    const exact = normalize(weights).map(weight => count * weight / 100);
    const result = exact.map(Math.floor);
    const order = exact.map((value, index) => ({index, remainder: value - result[index]}))
      .sort((a,b) => b.remainder - a.remainder || a.index - b.index);
    const remaining = count - result.reduce((a,b) => a+b, 0);
    for (let i = 0; i < remaining; i++) result[order[i].index]++;
    return result;
  }
  function important(item, options = {}) {
    if (item.kind !== "homework" && item.source !== "school") return false;
    const date=dateFor(item);
    return (options.importantCourses || []).some(c =>
      (c.requireTerm ? item.termId===c.termId : !item.termId || item.termId===c.termId) &&
      (item.courseId ? item.courseId===c.id : c.allowTitle!==false&&item.course===c.title) &&
      (!date || !c.start || date>=c.start) && (!date || !c.end || date<=c.end));
  }
  function plan(items, weights, options = {}) {
    const groups = new Map();
    items.filter(item => !item.repeatTemplate && item.queued && dateFor(item)).forEach(item => {
      const days = weights.length === 7 ? weekFor(dateFor(item)) : weekendFor(dateFor(item));
      if (!groups.has(days[0])) groups.set(days[0], {days, items: []});
      groups.get(days[0]).items.push(item);
    });
    groups.forEach(group => {
      // 已挂载/已完成仍保留在批次数量中，避免完成一份导致其他日期漂移。
      group.items.sort((a,b) => Number(important(b,options))-Number(important(a,options)) || dateFor(a).localeCompare(dateFor(b)) || a.id.localeCompare(b.id));
      const counts = quotas(group.items.length, weights);
      const dates = counts.flatMap((count,index) => Array(count).fill(group.days[index]));
      group.items.forEach((item,index) => {
        if (!item.mountedOn && !item.manualDate && !item.completed) {
          const early=important(item,options),saturday=weekendFor(dateFor(item))[1];
          item.mountDate=early&&dates[index]>saturday?saturday:dates[index];
          item.mountClock=early&&new Date(dateValue(item.mountDate)).getUTCDay()===5?"14:00":null;
        }
      });
    });
    return items;
  }
  function advance(items, today, clock = "23:59") {
    dateValue(today);
    items.forEach(item => {
      if (!item.repeatTemplate && item.queued && !item.completed && !item.mountedOn && item.mountDate && (item.mountDate < today || item.mountDate===today&&(!item.mountClock||clock>=item.mountClock))) item.mountedOn = today;
    });
    return items;
  }
  function move(item, date, today) {
    dateValue(date); dateValue(today);
    if (item.completed) throw new Error("已完成的条目不能挂载");
    item.queued = true;
    item.manualDate = true;
    item.mountDate = date;
    item.mountClock = null;
    item.mountedOn = date <= today ? today : null;
  }
  function complete(item) { item.completed = true; item.mountedOn = null; }
  function setQueued(item, queued) {
    item.queued = Boolean(queued);
    if (!queued) { item.mountedOn = null; item.mountDate = null; item.mountClock = null; item.manualDate = false; }
  }
  function urgency(item, today, options = {}) {
    if (item.completed || !item.deadline) return "normal";
    const remaining = (dateValue(item.deadline) - dateValue(today)) / DAY;
    return remaining < 0 ? "overdue" : remaining <= (important(item,options)?3:2) ? "urgent" : "normal";
  }
  // 保护完整可用日：凌晨截止归前一晚；仅有日期不补成零点。
  function usableDays(item, today, options = {}) {
    const due = dateFor(item); dateValue(today);
    if (!due || item.completed) return Infinity;
    let day = dateValue(due);
    const clock = item.deadline ? item.deadlineClock : item.startAt?.slice(11,16);
    const cutoff = Number.isFinite(options.nightCutoffHour) ? options.nightCutoffHour : 8;
    if (clock && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock) && Number(clock.slice(0,2)) * 60 + Number(clock.slice(3)) < cutoff * 60) day -= DAY;
    return (day - dateValue(today)) / DAY;
  }
  function noticeStage(item, today, options = {}) {
    const days = usableDays(item, today, options);
    return days <= 1 ? "fire" : days <= 3 ? "smoke" : "normal";
  }
  function dayLoad(items, date, exceptIds = []) {
    return items.filter(item => !item.repeatTemplate && item.queued && !exceptIds.includes(item.id) && (item.mountDate || item.mountedOn) === date).length;
  }
  function manualLimit(items, date, options = {}) {
    if (options.capacityMode === "quota") {
      const weights = options.weights || [0,0,0,0,25,45,30], count = items.filter(item => !item.repeatTemplate && item.queued && dateFor(item) && weekFor(dateFor(item)).includes(date)).length;
      const days = weights.length === 3 ? weekendFor(iso(dateValue(date) + 7 * DAY)) : weekFor(iso(dateValue(date) + 7 * DAY));
      const index = days.indexOf(date);
      return index < 0 ? 0 : quotas(count, weights)[index];
    }
    const weekend = [0,6].includes(new Date(dateValue(date)).getUTCDay());
    const selected = weekend ? options.weekendLimit : options.weekdayLimit;
    if (Number.isInteger(selected) && selected > 0) return selected;
    return Number.isInteger(options.dailyLimit) && options.dailyLimit > 0 ? options.dailyLimit : weekend ? 3 : 1;
  }
  function manualCheck(items, item, date, today, options = {}) {
    dateValue(date); dateValue(today);
    if (!items.includes(item) || item.completed || item.repeatTemplate) return {ok:false,code:"invalid",message:"这项不能调整挂载日。"};
    if (date < today) return {ok:false,code:"past",message:"请选择今天或以后的日期。"};
    const from = item.mountDate || item.mountedOn;
    if (from === date) return {ok:true,code:"same",from};
    if (from && date > from) {
      if (noticeStage(item,today,options) !== "normal") return {ok:false,code:"urgent",message:"这项已经冒烟或着火，只能提前，不能推后。"};
      if (noticeStage(item,date,options) !== "normal") return {ok:false,code:"unsafe",message:"换到那天就会进入冒烟或着火阶段，不能推后到这一天。"};
      if (dayLoad(items,date) > manualLimit(items,date,options)) return {ok:false,code:"full",message:"那天的便签已经过多，不能手动移入。"};
      return {ok:false,code:"swap",from,message:"往后调需要和那天的一项交换。"};
    }
    if (dayLoad(items,date,[item.id]) >= manualLimit(items,date,options)) return {ok:false,code:"full",message:"那天的便签已经排满，请选更早的其他日期。"};
    return {ok:true,code:"earlier",from};
  }
  function swapCandidates(items, item, date, today, options = {}) {
    const check = manualCheck(items,item,date,today,options);
    if (check.code !== "swap") return [];
    return items.filter(other => other !== item && !other.completed && other.schoolCompleted !== true && !other.repeatTemplate && other.queued && other.mountDate === date && !other.mountedOn && noticeStage(other,today,options) === "normal");
  }
  function manualMove(items, item, date, today, options = {}, partnerId = null) {
    const check = manualCheck(items,item,date,today,options);
    if (check.ok) { if (check.code !== "same" || (!item.mountedOn && date <= today)) move(item,date,today); return {ok:true,swapped:false}; }
    if (check.code !== "swap") return check;
    const partner = swapCandidates(items,item,date,today,options).find(candidate => candidate.id === partnerId);
    if (!partner) return {ok:false,code:"partner",message:"请选择那天可交换的一项；冒烟或着火的不能交换。"};
    const earlier = check.from < today ? today : check.from;
    if (dayLoad(items,earlier,[item.id,partner.id]) >= manualLimit(items,earlier,options)) return {ok:false,code:"full",message:"原来的日期已排满，无法放入交换的便签。"};
    move(partner,earlier,today); move(item,date,today);
    return {ok:true,swapped:true};
  }
  function rail(items) {
    return items.filter(item => !item.repeatTemplate && item.queued && item.mountedOn && !item.completed && item.schoolCompleted !== true && item.remoteMissing !== true)
      .sort((a,b) => a.mountedOn.localeCompare(b.mountedOn) || a.id.localeCompare(b.id));
  }
  function calendarEntries(items) {
    return items.flatMap(item => {
      if (item.repeatTemplate) return [];
      const entries = [];
      if (item.deadline) entries.push({id: `${item.id}:deadline`, itemId: item.id, kind: "deadline", date: item.deadline, at:item.deadlineClock ? `${item.deadline}T${item.deadlineClock}` : null, title: item.title, completed: Boolean(item.completed||item.schoolCompleted)});
      else if (item.startAt) entries.push({id: `${item.id}:range`,itemId:item.id,kind:"range",date:item.startAt.slice(0,10),startAt:item.startAt,endAt:item.endAt,title:item.title,completed:Boolean(item.completed||item.schoolCompleted)});
      else if (item.scheduledDay) entries.push({id:`${item.id}:day`,itemId:item.id,kind:"day",date:item.scheduledDay,title:item.title,completed:Boolean(item.completed||item.schoolCompleted)});
      if (item.queued && !item.completed && item.schoolCompleted !== true && item.mountDate) entries.push({id: `${item.id}:mount`, itemId: item.id, kind: "mount", date: item.mountDate, title: item.title});
      return entries.map(entry=>({...entry,itemKind:item.kind||"todo",location:item.location||""}));
    });
  }
  function homeworkItems(items) {
    return items.filter(item => !item.repeatTemplate && item.kind !== "event" && (item.source === "school" || item.kind === "homework" || item.queued));
  }
  function homeworkSubject(item) { return item.source === "personal" ? "自定义" : item.course || "其他"; }
  function dateFor(item) {return item.deadline || item.startAt?.slice(0,10) || item.scheduledDay || null;}
  function pendingOn(items, date) { return items.filter(item => !item.completed && item.schoolCompleted !== true && dateFor(item) === date); }
  const api = {dateValue, weekendFor, weekFor, normalize, quotas, plan, advance, move, complete, setQueued, urgency, important, usableDays, noticeStage, dayLoad, manualLimit, manualCheck, swapCandidates, manualMove, rail, calendarEntries, homeworkItems, homeworkSubject, pendingOn, dateFor};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FolioQueue = api;
})(typeof globalThis === "undefined" ? this : globalThis);
