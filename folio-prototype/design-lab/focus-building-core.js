(function(root){
  'use strict';const F=typeof module!=='undefined'&&module.exports?require('./focus-core.js'):root.FolioFocus;
  const GOAL=45*60000;
  const duration=s=>s.segments.reduce((n,p)=>n+p.end-p.start,0);
  function begin(state,now){if(state.active){F.resume(state,now);return}const last=state.sessions.at(-1);if(last?.buildingDraft&&!last.building){state.sessions.pop();state.active={...last,runningFrom:now};delete state.active.endedAt;delete state.active.buildingDraft}else F.start(state,now)}
  function complete(state,now){if(!state.active||F.elapsed(state,now)<GOAL)return false;F.pause(state,now);let left=GOAL;const clipped=[];for(const p of state.active.segments){if(left<=0)break;const end=p.start+Math.min(left,p.end-p.start);clipped.push({start:p.start,end});left-=end-p.start}state.active.segments=clipped;const completedAt=clipped.at(-1).end;F.finish(state,completedAt);const session=state.sessions.at(-1);session.building={id:'house-'+session.createdAt+'-'+completedAt,completedAt,minutes:45};delete session.buildingDraft;return true}
  function rest(state,now){if(complete(state,now))return;F.finish(state,now);const last=state.sessions.at(-1);if(last&&!last.building)last.buildingDraft=duration(last)>0}
  function elapsed(state,now){if(state.active)return Math.min(GOAL,F.elapsed(state,now));const last=state.sessions.at(-1);return last&&(last.building||last.buildingDraft)?Math.min(GOAL,duration(last)):0}
  function collection(state){return state.sessions.filter(s=>s.building).map(s=>({...s.building}))}
  const api={GOAL,begin,complete,rest,elapsed,collection};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FolioBuilding=api;
})(typeof globalThis==='undefined'?this:globalThis);
