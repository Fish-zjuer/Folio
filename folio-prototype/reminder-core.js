/* A projection of confirmed records. Time is always Asia/Shanghai, never inferred. */
(function(root){'use strict';const T=typeof module==='object'&&module.exports?require('./todo-core.js'):root.FolioTodo,P=typeof module==='object'&&module.exports?require('./item-policy-core.js'):root.FolioItemPolicy;
 function build(items,now=Date.now()){
  const today=new Date(now+8*3600000).toISOString().slice(0,10),through=T.addDays(today,30),all=new Map();
  for(let day=today;day<=through;day=T.addDays(day,14))for(const item of T.materialize(structuredClone(items),day))all.set(item.id,item);
  const active=[],entries=[];
  for(const item of all.values())try{
   if(item.repeatTemplate||item.completed||item.schoolCompleted||item.remoteMissing||['none','pending'].includes(T.mode(item)))continue;
   const offsets=P.offsets(item);if(!offsets.length||typeof item.id!=='string'||item.id.length>300||/[\x00-\x1f\x7f]/.test(item.id))continue;
   const title=String(item.title||'事项提醒').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,160)||'事项提醒';
   const revision=JSON.stringify([String(item.kind||'todo').slice(0,12),...['startAt','endAt','deadline','deadlineClock'].map(k=>String(item[k]||'').slice(0,32)),offsets,title]);
   active.push({id:item.id,revision});
   for(const r of T.reminderTimes(item)){const at=Date.parse(r.at+'+08:00');if(at<=now||at>now+366*86400000||item.parentId&&r.at.slice(0,10)>through)continue;
    entries.push({key:JSON.stringify([item.id,r.minutes,r.at]),itemId:item.id,revision,title,kind:['homework','lesson','event'].includes(item.kind)?item.kind:'todo',at});}
  }catch{/* A malformed or pending record must not block valid reminders. */}
  entries.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));
  return {version:1,through:Date.parse(through+'T23:59:59+08:00'),entries:entries.slice(0,4096),active,limited:entries.length>4096};
 }
 const api={build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioReminderCore=api;
})(typeof globalThis==='undefined'?this:globalThis);
