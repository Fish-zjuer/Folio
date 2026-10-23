/* Isolated fictional records. Never included by the production entry. */
window.seedLearningLibrary=async()=>{
 await FolioLearning.ready;if(FolioLearning.records().length){FolioLearning.open();return;}await FolioSchool.refresh('courses');
 const catalog=FolioCourses.semesters.flatMap(t=>t.courses.map(c=>({courseId:c.id,termId:t.id})));
 for(let i=0;i<24;i++){const kind=i%6===0?'journal':i%6===1?'note':'recording',date='2026-10-'+String(22-Math.floor(i/8)).padStart(2,'0'),course=catalog[i%Math.max(1,Math.min(3,catalog.length))]||{};
  const fields={kind,date,title:kind==='journal'?'一点一点把想法留下来':kind==='note'?'课后笔记 · 反馈与稳定性':['音频放大电路 · 实验讲解','自动控制 · 课堂重点','电机与拖动 · 习题讨论'][i%3],body:kind==='journal'?'今天把一直拖着的问题重新梳理了一遍。比起急着赶进度，我更想知道自己哪里还没想明白。':'重点：反馈、稳定性与实验步骤。下次从这里继续。',...course};
  if(kind==='recording'){
   // One second of valid, silent PCM. Demo-only; no microphone permission.
   const bytes=new ArrayBuffer(16044),v=new DataView(bytes),str=(p,s)=>{for(let j=0;j<s.length;j++)v.setUint8(p+j,s.charCodeAt(j));};str(0,'RIFF');v.setUint32(4,16036,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,16000,true);
   const key='audio-demo-'+i;await new Promise((resolve,reject)=>{const req=indexedDB.open('folio-learning-audio-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('audio');req.onerror=reject;req.onsuccess=()=>{const db=req.result,tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(new Blob([bytes],{type:'audio/wav'}),key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};});fields.audio={key,mime:'audio/wav',size:16044,durationMs:1000};
  }
  await FolioLearning.applyProposal({id:'library-demo-'+i,operation:'create_learning',fields,status:'pending'});
 }
 FolioLearning.open();
};
document.addEventListener('DOMContentLoaded',async()=>{document.querySelector('body>aside')?.remove();if(!new URL(location.href).searchParams.has('test'))await seedLearningLibrary();});
