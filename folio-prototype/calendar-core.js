/* 日程的按日投影：仅处理数据，不规定月历或时间轴的视觉布局。 */
(function (root) {
  "use strict";
  const DAY = 86400000;
  function dateValue(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) throw new Error("无效日期");
    const value = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(value) || new Date(value).toISOString().slice(0,10) !== date) throw new Error("无效日期");
    return value;
  }
  function timeValue(at) {
    if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(at || "")) throw new Error("无效时刻");
    return dateValue(at.slice(0,10)) + (Number(at.slice(11,13))*60 + Number(at.slice(14,16)))*60000;
  }
  function dayEntries(entries, date) {
    const start = dateValue(date), end = start + DAY;
    return entries.flatMap(entry => {
      if (entry.startAt && entry.endAt) {
        const eventStart = timeValue(entry.startAt), eventEnd = timeValue(entry.endAt);
        if (eventEnd <= eventStart) throw new Error("结束时间必须晚于开始时间");
        // 半开区间：凌晨 00:00 结束不占用次日；跨日事项每天各显示一段。
        if (eventStart >= end || eventEnd <= start) return [];
        return [{...entry, displayDate:date, allDay:false,
          startMinute:(Math.max(eventStart,start)-start)/60000,
          endMinute:(Math.min(eventEnd,end)-start)/60000,
          continuesBefore:eventStart<start, continuesAfter:eventEnd>end}];
      }
      if (entry.date !== date) return [];
      const minute = entry.at ? (timeValue(entry.at)-start)/60000 : null;
      if (minute !== null && (minute < 0 || minute >= 1440)) throw new Error("事项日期与时刻不一致");
      return [{...entry, displayDate:date, allDay:minute===null,
        startMinute:minute, endMinute:minute, continuesBefore:false, continuesAfter:false}];
    }).sort((a,b)=> Number(b.allDay)-Number(a.allDay)
      || (a.startMinute ?? 0)-(b.startMinute ?? 0) || a.id.localeCompare(b.id));
  }
  function focusEvent(entries, minute) {
    const timed=entries.filter(entry=>!entry.allDay&&!entry.completed)
      .slice().sort((a,b)=>a.startMinute-b.startMinute||a.id.localeCompare(b.id));
    return timed.filter(entry=>entry.startMinute<=minute&&entry.endMinute>minute).at(-1)
      || timed.find(entry=>entry.startMinute>=minute)
      || timed.at(-1) || entries.find(entry=>!entry.allDay) || entries[0] || null;
  }
  function remainingFraction(entry, date, minute) {
    if(entry.kind!=="course" || entry.endMinute<=entry.startMinute) return null;
    if(date<entry.displayDate) return 1;
    if(date>entry.displayDate) return 0;
    return Math.max(0,Math.min(1,(entry.endMinute-minute)/(entry.endMinute-entry.startMinute)));
  }
  function timelineState(entries, date, minute) {
    const timed=entries.filter(entry=>!entry.allDay&&!entry.completed)
      .slice().sort((a,b)=>a.startMinute-b.startMinute||a.id.localeCompare(b.id));
    const today=timed.filter(entry=>entry.displayDate===date);
    const current=today.filter(entry=>entry.startMinute<=minute&&entry.endMinute>minute).at(-1);
    const next=today.find(entry=>entry.startMinute>minute);
    const ended=entries.filter(entry=>!entry.allDay&&entry.displayDate===date
      &&(entry.endMinute<=minute||(entry.completed&&entry.startMinute<=minute)))
      .sort((a,b)=>b.endMinute-a.endMinute||b.startMinute-a.startMinute)[0];
    const anchor=current||ended;
    return {currentId:current?.id||null,anchorId:anchor?.id||null,nextId:next?.id||null,
      minutesUntilNext:anchor&&next ? next.startMinute-minute : null,waiting:Boolean(!current&&anchor&&next)};
  }
  function activeRemainingFraction(entry,date,minute) {
    if(entry.displayDate!==date||entry.completed||entry.allDay||entry.endMinute<=entry.startMinute
      ||minute<entry.startMinute||minute>=entry.endMinute) return null;
    if(entry.startAt&&entry.endAt) {
      const start=timeValue(entry.startAt),end=timeValue(entry.endAt),now=dateValue(date)+minute*60000;
      return Math.max(0,Math.min(1,(end-now)/(end-start)));
    }
    return (entry.endMinute-minute)/(entry.endMinute-entry.startMinute);
  }
  function connectionExperienced(next, date, minute) {
    if(!next) return false;
    if(date!==next.displayDate) return date>next.displayDate;
    return next.allDay ? Boolean(next.completed) : next.startMinute<=minute;
  }
  const api = {dayEntries, focusEvent, remainingFraction, timelineState, activeRemainingFraction, connectionExperienced};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FolioCalendar = api;
})(typeof globalThis === "undefined" ? this : globalThis);
