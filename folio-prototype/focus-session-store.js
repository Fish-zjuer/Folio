/* Persist a focus action before publishing it. Read-only previews never create rewards. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;else root.FolioFocusStore=factory;})(typeof globalThis==='undefined'?this:globalThis,function(F,B,storage,clock,onChange){
  'use strict';clock=clock||Date.now;onChange=onChange||(()=>{});const KEY='folio-focus-study-v1';let state=F.clean();
  function reload(){try{state=F.restore(JSON.parse(storage.getItem(KEY)));}catch{state=F.clean();}}
  function change(action){reload();const next=F.restore(JSON.parse(JSON.stringify(state)));action(next,clock());storage.setItem(KEY,JSON.stringify(next));state=next;onChange();}
  reload();
  return {reload,snapshot(){return JSON.parse(JSON.stringify(state));},elapsed(){return B.elapsed(state,clock());},
    toggle(){change((s,now)=>{if(s.active&&s.active.runningFrom!==null)F.pause(s,now);else B.begin(s,now);});},
    rest(){change((s,now)=>B.rest(s,now));},
    append(session){if(!session?.id||!Array.isArray(session.segments)||session.segments.some(p=>!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.end<p.start))throw Error('专注记录无效');change(s=>{if(!s.sessions.some(v=>v.id===session.id))s.sessions.push(JSON.parse(JSON.stringify(session)));});},
    tick(){if(!state.active||state.active.runningFrom===null||F.elapsed(state,clock())<B.GOAL)return false;change((s,now)=>B.complete(s,now));return true;}
  };
});
