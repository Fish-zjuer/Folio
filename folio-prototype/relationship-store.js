/* Shared durable store: memory for rendering, segmented IndexedDB for persistence. */
(()=>{'use strict';const C=FolioRelationshipCore,S=window.FolioRelationshipStorage,listeners=new Set(),flushers=new Set();let state=C.empty(),error='',loaded=false,tail=Promise.resolve();
 const db=!!S&&typeof indexedDB!=='undefined';
 const read=()=>{if(!loaded)throw Error('关系网正在读取，请稍候');return structuredClone(state);};
 const notify=()=>{for(const f of listeners){try{f(read());}catch(e){console.error(e);}}document.dispatchEvent(new Event('folio-relationships-change'));};
 function marker(){try{localStorage.setItem(C.KEY,JSON.stringify({version:1,storage:'indexeddb-v1',revision:state.revision}));}catch{/* The committed database remains authoritative when localStorage is full. */}}
 const ready=(async()=>{try{if(db){const saved=await S.load();if(saved)state=C.restore(saved);else{const raw=JSON.parse(localStorage.getItem(C.KEY));if(raw?.storage)throw Error('关系网分段存储缺失，请导入备份恢复');state=C.restore(raw);await S.save(state,-1);}loaded=true;marker();}else{state=C.restore(JSON.parse(localStorage.getItem(C.KEY)));loaded=true;}}catch(e){error=e.message;loaded=true;throw e;}})();ready.catch(()=>{});
 function enqueue(fn){const task=tail.then(async()=>{await ready;if(error)throw Error(error+'；请先保留本机数据');return fn();});tail=task.catch(()=>{});return task;}
 async function check(){const actual=C.restore(db?await S.load():JSON.parse(localStorage.getItem(C.KEY)));if(JSON.stringify(actual)!==JSON.stringify(state)){state=actual;notify();throw Error('关系网已有变化，请重新读取后再保存');}}
 async function publish(next,backup=null){if(db){await S.save(next,state.revision,backup);}else localStorage.setItem(C.KEY,JSON.stringify(next));state=next;error='';if(db)marker();notify();return read();}
 const replace=(nodes,revision)=>enqueue(async()=>{await check();if(revision!==state.revision)throw Error('关系网已有变化，请重新读取后再保存');return publish(C.restore({...state,nodes,revision:state.revision+1,updatedAt:new Date().toISOString()}));});
 const expand=()=>enqueue(async()=>{await check();return publish(C.expand(state));});
 async function flush(){await ready;for(const f of flushers)await f();await tail;if(error)throw Error(error);}
 async function apply(proposal){if(proposal.status!=='pending')return;await flush();return enqueue(async()=>{await check();const d=C.validateDraft({operation:proposal.operation,targetId:proposal.targetId,fields:proposal.fields}),id=d.operation==='create_relationship'?'chat-'+proposal.id:d.targetId;
  if(proposal.appliedFingerprint===C.fingerprint(state)){proposal.status='confirmed';return;}
  if(proposal.before!==C.fingerprint(state))throw Error('关系网已有变化，请重新搜索并生成草稿，未覆盖任何内容');
  await publish(C.apply(state,d,{id}));proposal.appliedFingerprint=C.fingerprint(state);proposal.status='confirmed';proposal.confirmedAt=new Date().toISOString();
 });}
 async function importSnapshot(raw,before,keepBackup=true){await flush();return enqueue(async()=>{await check();if(before&&before!==C.fingerprint(state))throw Error('本机关系网已有变化，请重新读取文件');const normalized=C.restore(raw),next={...normalized,revision:state.revision+1,updatedAt:new Date().toISOString()};return publish(next,keepBackup?{createdAt:new Date().toISOString(),state:read()}:null);});}
 async function reload(){await ready;await tail;state=C.restore(db?await S.load():JSON.parse(localStorage.getItem(C.KEY)));error='';notify();return read();}
 window.FolioRelationships={ready,read,replace,expand,apply,importSnapshot,async backup(){await ready;return db?S.backup():null;},search:async args=>{await flush();await check();return C.search(state,args);},detail:async(id,args)=>{await flush();await check();return C.read(state,id,args);},get error(){return error;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},addFlusher(fn){flushers.add(fn);return()=>flushers.delete(fn);},flush,reload};
 window.addEventListener('storage',e=>{if(e.key===C.KEY)reload().catch(e=>{error=e.message;});});
})();
