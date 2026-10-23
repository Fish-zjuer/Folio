/* Durable segmented snapshots. A single IndexedDB transaction commits metadata and all segments. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioRelationshipStorage=api;})(globalThis,()=>{
 'use strict';const DB='folio-relationships-v2',STORE='segments';
 function open(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(STORE);q.onerror=()=>reject(Error('关系网存储无法打开，原数据已保留'));q.onblocked=()=>reject(Error('请关闭其他Folio页面后重试'));q.onsuccess=()=>resolve(q.result);});}
 async function load(){const db=await open();try{return await new Promise((resolve,reject)=>{const t=db.transaction(STORE),store=t.objectStore(STORE),q=store.get('meta');let meta,nodes=[],failure;
  q.onsuccess=()=>{meta=q.result;if(!meta)return;if(!Number.isInteger(meta.segments)||meta.segments<1||meta.segments>8){failure=Error('关系网分段目录损坏');t.abort();return;}const parts=[];for(let i=0;i<meta.segments;i++){const p=store.get('part:'+i);p.onsuccess=()=>{parts[i]=p.result;};}t.oncomplete=()=>{for(let i=0;i<parts.length;i++){const part=parts[i];if(!Array.isArray(part)||part.length>250||i<meta.segments-1&&part.length!==250){reject(Error('关系网分段缺失，原数据已保留'));return;}nodes.push(...part);}if(parts.length!==meta.segments||nodes.length!==meta.count){reject(Error('关系网节点数量不一致'));return;}resolve({...meta.state,nodes});};};
  t.oncomplete=()=>resolve(null);t.onerror=t.onabort=()=>reject(failure||Error('关系网读取失败，原数据已保留'));
 });}finally{db.close();}}
 async function save(state,expectedRevision=null,backup=null){const db=await open();try{return await new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE),q=s.get('meta');let failure;
  q.onsuccess=()=>{const old=q.result;if(expectedRevision===-1?!!old:expectedRevision!==null&&old?.state.revision!==expectedRevision){failure=Error('关系网已有变化，请重新读取后再保存');t.abort();return;}if(backup)s.put(backup,'backup');const {nodes,...header}=state;const count=Math.ceil(nodes.length/250);for(let i=0;i<count;i++)s.put(nodes.slice(i*250,(i+1)*250),'part:'+i);for(let i=count;i<(old?.segments||0);i++)s.delete('part:'+i);s.put({segments:count,count:nodes.length,state:header},'meta');};
  t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(failure||Error('关系网未能保存，请检查设备可用空间；原数据未改变'));
 });}finally{db.close();}}
 async function backup(){const db=await open();try{return await new Promise((resolve,reject)=>{const t=db.transaction(STORE),q=t.objectStore(STORE).get('backup');let value;q.onsuccess=()=>value=q.result;t.oncomplete=()=>resolve(value||null);t.onerror=t.onabort=()=>reject(Error('导入前备份读取失败'));});}finally{db.close();}}
 return {DB,load,save,backup};
});
