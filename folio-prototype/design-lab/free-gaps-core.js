/* Minute intervals on an explicit calendar day; never infer occupation from a DDL. */
(function(root){
  'use strict';
  function calculate({date,entries=[],start=480,end=1320,minimum=120,today,nowMinute=0}={}){
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>1440||end<=start||!Number.isFinite(minimum)||minimum<=0)throw new Error('无效的工作区间或空档门槛');
    const from=date===today?Math.max(start,nowMinute):start;
    if(from>=end)return [];
    const busy=entries.filter(e=>e.date===date&&!(e.kind==='task'&&e.completed)&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start&&e.end>from&&e.start<end).map(e=>({start:Math.max(from,e.start),end:Math.min(end,e.end)})).sort((a,b)=>a.start-b.start||a.end-b.end);
    const merged=[];for(const item of busy){const last=merged[merged.length-1];if(last&&item.start<=last.end)last.end=Math.max(last.end,item.end);else merged.push({...item})}
    const gaps=[];let cursor=from;
    for(const item of merged){if(item.start-cursor>=minimum)gaps.push({start:cursor,end:item.start});cursor=Math.max(cursor,item.end)}
    if(end-cursor>=minimum)gaps.push({start:cursor,end});
    return gaps;
  }
  const api={calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FolioFreeGaps=api;
})(typeof globalThis==='undefined'?this:globalThis);
