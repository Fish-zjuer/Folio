(function(root){
  'use strict';
  const clean=()=>({version:1,sessions:[],active:null});
  function segment(start,end){return {start,end:Math.max(start,end)}}
  function start(state,now){if(state.active)return;state.active={createdAt:now,runningFrom:now,segments:[]}}
  function pause(state,now){const a=state.active;if(!a||a.runningFrom===null)return;a.segments.push(segment(a.runningFrom,now));a.runningFrom=null}
  function resume(state,now){const a=state.active;if(a&&a.runningFrom===null)a.runningFrom=now}
  function finish(state,now){if(!state.active)return;pause(state,now);state.sessions.push({...state.active,endedAt:now});state.active=null}
  function validSegment(s){return s&&Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.end>=s.start}
  function restore(value){if(!value||value.version!==1||!Array.isArray(value.sessions))return clean();const sessions=value.sessions.filter(s=>s&&Array.isArray(s.segments)).map(s=>({...s,segments:s.segments.filter(validSegment)}));const a=value.active;const active=a&&Number.isFinite(a.createdAt)&&(a.runningFrom===null||Number.isFinite(a.runningFrom))&&Array.isArray(a.segments)?{...a,segments:a.segments.filter(validSegment)}:null;return {version:1,sessions,active}}
  function activeSegments(state,now){const a=state.active;if(!a)return [];return a.runningFrom===null?a.segments:[...a.segments,segment(a.runningFrom,now)]}
  function elapsed(state,now){return activeSegments(state,now).reduce((sum,s)=>sum+s.end-s.start,0)}
  function dayKey(ms){return new Date(ms+8*3600000).toISOString().slice(0,10)}
  function totalsByDay(state,now){const result={},segments=[...state.sessions.flatMap(s=>s.segments),...activeSegments(state,now)];for(const s of segments){let cursor=s.start;while(cursor<s.end){const day=dayKey(cursor),boundary=Date.parse(day+'T00:00:00Z')-8*3600000+86400000,end=Math.min(boundary,s.end);result[day]=(result[day]||0)+(end-cursor);cursor=end}}return result}
  const api={clean,start,pause,resume,finish,restore,elapsed,dayKey,totalsByDay};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FolioFocus=api;
})(typeof globalThis==='undefined'?this:globalThis);
