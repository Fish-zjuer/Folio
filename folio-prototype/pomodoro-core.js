(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioPomodoroCore=api;})(globalThis,()=>{
 'use strict';const GOAL=25*60000,clean=()=>({version:1,active:null,sessions:[]}),copy=v=>JSON.parse(JSON.stringify(v));
 function restore(raw){if(raw?.version!==1)return clean();const valid=s=>s&&typeof s.id==='string'&&Number.isFinite(s.createdAt)&&Array.isArray(s.segments),fix=s=>({...s,segments:s.segments.filter(p=>p&&Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.end>=p.start),runningFrom:Number.isFinite(s.runningFrom)?s.runningFrom:null});return {version:1,active:valid(raw.active)?fix(raw.active):null,sessions:(Array.isArray(raw.sessions)?raw.sessions:[]).filter(valid).map(fix).slice(-5000)};}
 function elapsed(state,now){const a=state.active;if(!a)return state.sessions.at(-1)?.completed?GOAL:0;return Math.min(GOAL,a.segments.reduce((n,p)=>n+p.end-p.start,0)+(a.runningFrom!==null?Math.max(0,now-a.runningFrom):0));}
 function closeSegment(a,now){if(a.runningFrom===null)return;const before=a.segments.reduce((n,p)=>n+p.end-p.start,0),end=Math.max(a.runningFrom,Math.min(now,a.runningFrom+GOAL-before));if(end>a.runningFrom)a.segments.push({start:a.runningFrom,end});a.runningFrom=null;}
 function act(raw,action,now,info={}){const s=restore(copy(raw));if(action==='start'){if(s.active){if(s.active.runningFrom===null)s.active.runningFrom=now;}else{if(!info.id)throw Error('计时标识缺失');s.active={id:info.id,createdAt:now,runningFrom:now,segments:[],courseId:info.courseId||'',termId:info.termId||''};}}
  else if(action==='pause'){if(s.active)closeSegment(s.active,now);}
  else if(action==='finish'||action==='tick'){if(!s.active)return s;const complete=elapsed(s,now)>=GOAL;if(action==='tick'&&!complete)return s;closeSegment(s.active,now);s.sessions.push({...s.active,endedAt:s.active.segments.at(-1)?.end||now,completed:complete,kind:'pomodoro'});s.active=null;}
  else throw Error('未知计时操作');return s;
 }
 return {GOAL,clean,restore,elapsed,act};
});
