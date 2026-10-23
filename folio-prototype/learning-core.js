/* Learning records are independent of tasks. Pure schema shared with AI and migration. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioLearningCore=api;})(globalThis,()=>{
 'use strict';
 const kinds=['journal','note','recording'];
 const text=(v,max,name)=>{if(typeof v!=='string'||v.length>max)throw Error(`${name}格式不正确`);return v;};
 function day(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;}
 function validate(r){
  if(!r||typeof r!=='object'||!kinds.includes(r.kind))throw Error('学习记录类型不正确');
  text(r.id,150,'记录ID');if(!r.id)throw Error('缺少记录ID');
  text(r.title,500,'标题');if(!r.title.trim())throw Error('需要标题');text(r.body,10000,'内容');if(!day(r.date))throw Error('需要有效日期');
  for(const key of ['createdAt','updatedAt'])if(!Number.isFinite(Date.parse(r[key])))throw Error('记录时间不正确');
  for(const key of ['courseId','termId','sessionId'])if(r[key]!==null&&r[key]!==undefined)text(r[key],500,'课程关联');
  if(r.audio){text(r.audio.key,150,'音频ID');if(!/^audio-[\w-]+$/.test(r.audio.key)||!Number.isFinite(r.audio.durationMs)||r.audio.durationMs<0||!Number.isSafeInteger(r.audio.size)||r.audio.size<1||r.audio.size>100*1024*1024||!/^audio\/[a-z0-9.+-]+(?:;.*)?$/i.test(r.audio.mime))throw Error('音频信息不正确');}
  return {id:r.id,kind:r.kind,title:r.title.trim(),body:r.body,date:r.date,courseId:r.courseId||null,termId:r.termId||null,sessionId:r.sessionId||null,createdAt:r.createdAt,updatedAt:r.updatedAt,...(r.audio?{audio:{key:r.audio.key,mime:r.audio.mime,size:r.audio.size,durationMs:r.audio.durationMs}}:{})};
 }
 function restore(raw){if(raw===null)return {version:1,records:[]};if(raw?.version!==1||!Array.isArray(raw.records))throw Error('学习记录格式不受支持，原数据已保留');const records=raw.records.map(validate);if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('记录ID重复');return {version:1,records};}
 function apply(state,{id,fields={},before,remove=false,now=new Date().toISOString()}){
  const source=restore(state),old=source.records.find(r=>r.id===id);
  if(before!==undefined&&before!==JSON.stringify(old))throw Error('记录已变化，请重新核对');
  if(remove)return {version:1,records:source.records.filter(r=>r.id!==id)};
  const allowed=['title','body','kind','date','courseId','termId','sessionId','audio'];for(const key of Object.keys(fields))if(!allowed.includes(key))throw Error('不支持的学习记录字段');
  const row=validate({...old,...fields,id,createdAt:old?.createdAt||now,updatedAt:now});return {version:1,records:[...source.records.filter(r=>r.id!==id),row]};
 }
 // Local schedule strings are explicitly Asia/Shanghai, independent of device timezone.
 function matching(sessions,at){const instant=+new Date(at);if(!Number.isFinite(instant))return [];const timestamp=v=>Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(v||'')?v:v+'+08:00');return sessions.filter(s=>timestamp(s.startAt)<=instant&&instant<timestamp(s.endAt));}
 function aiRecord(r){const row=validate(r);delete row.audio;return row;}
 function select(records,{kind='all',course=null,query='',from='',to=''}={},courseName=()=> ''){
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return records.filter(r=>(kind==='all'||r.kind===kind)&&(!course||r.courseId===course.courseId&&r.termId===course.termId)&&(!from||r.date>=from)&&(!to||r.date<=to)&&words.every(w=>[r.title,r.body,r.date,courseName(r)].join(' ').toLocaleLowerCase().includes(w))).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
 }
 return {kinds,day,validate,restore,apply,matching,aiRecord,select};
});
