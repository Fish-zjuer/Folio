/* Shared record semantics. Display choices never change what a record is. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioItemPolicy=api;})(globalThis,()=>{
 'use strict';const surfaces=['calendar','timetable','todos','homework','home'],defaults={todo:['calendar','todos','home'],homework:['calendar','homework','home'],event:['calendar','home'],lesson:['calendar','timetable','home']};
 const placements=item=>Array.isArray(item.placements)?item.placements:[...(defaults[item.kind||(item.source==='school'?'homework':'todo')]||defaults.todo)];
 const shows=(item,surface)=>placements(item).includes(surface),task=item=>!['event','lesson'].includes(item.kind);
 // Only apply when creating a record; an existing or explicit opt-out stays off.
 const initialQueued=item=>typeof item.queued==='boolean'?item.queued:item.kind==='homework';
 function reminders(value){if(value==null||value==='')return [];const values=Array.isArray(value)?value:typeof value==='string'?value.split(/[,，、;；\s]+/).filter(Boolean):[value];if(values.length>12)throw Error('最多设置12个提前提醒');const out=values.map(v=>{if(typeof v==='string'&&!/^\d+$/.test(v.trim()))throw Error('提前提醒请用逗号分隔的非负整数分钟');if(typeof v!=='number'&&typeof v!=='string')throw Error('提前提醒格式不正确');const n=Number(v);if(!Number.isInteger(n)||n<0||n>525600)throw Error('提醒提前量应在0到365天之间');return n;});return [...new Set(out)].sort((a,b)=>b-a);}
 const offsets=item=>reminders(item.reminderOffsets!==undefined?item.reminderOffsets:item.reminderMinutes);
 const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(Date.parse(v+'T00:00:00Z')).toISOString().slice(0,10)===v;
 const clock=v=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v||'');
 // Records use local wall-clock minutes. Zero seconds are equivalent; never guess a timezone or repair invalid dates.
 function minuteClock(value){if(typeof value!=='string')return value;const m=/^([01]\d|2[0-3]):([0-5]\d)(?::00(?:\.0{1,9})?)?$/.exec(value.trim());return m?m[1]+':'+m[2]:value;}
 function minuteDateTime(value){if(typeof value!=='string')return value;const m=/^(\d{4}-\d{2}-\d{2})[T ](.+)$/.exec(value.trim());if(!m||!day(m[1]))return value;const time=minuteClock(m[2]);return clock(time)?m[1]+'T'+time:value;}
 function normalizeTime(source){const s={...source};for(const k of ['clock','deadlineClock']){if(['--:--','待定','未定',''].includes(s[k]))s[k]=null;else if(k in s)s[k]=minuteClock(s[k]);}
  for(const k of ['startAt','endAt'])if(k in s)s[k]=minuteDateTime(s[k]);
  if(['startAt','endAt'].some(k=>typeof s[k]==='string'&&/--:--|待定|未定/.test(s[k]))){const dates=['scheduledDay','startAt','endAt'].map(k=>String(s[k]||'').slice(0,10)).filter(day);s.timeMode='pending';s.scheduledDay=dates[0]||null;s.startAt=null;s.endAt=null;}
  return s;
 }
 function validate(item){if(item.placements!==undefined&&(!Array.isArray(item.placements)||item.placements.some(p=>!surfaces.includes(p))||new Set(item.placements).size!==item.placements.length))throw Error('请选择有效且不重复的显示位置');offsets(item);}
 function lessons(items,date,termId,surface='calendar'){return items.filter(i=>i.kind==='lesson'&&!i.repeatTemplate&&(surface==="all"||shows(i,surface))&&(!i.termId||i.termId===termId)&&clock(i.startAt?.slice(11))&&clock(i.endAt?.slice(11))&&i.startAt.slice(0,10)<=date&&i.endAt>date+"T00:00"&&i.endAt>i.startAt).map(i=>({...i,id:'personal-lesson-'+i.id,itemId:i.id,kind:'course',itemKind:'lesson',courseId:i.courseId||'personal-course-'+i.id,termId,date,start:i.startAt.slice(0,10)<date?"00:00":i.startAt.slice(11),end:i.endAt.slice(0,10)>date?"24:00":i.endAt.slice(11),room:i.location||'',color:i.color||'#B8CDC4',session:{id:i.id,personalRule:!i.repeat||i.repeat.kind==="none"?"单次":({daily:"每天",weekly:"每周",monthly:"每月"}[i.repeat.kind]||"重复")+(i.repeat.interval>1?" · 间隔"+i.repeat.interval:""),customRepeat:false,firstHalf:true,secondHalf:true,oddWeek:true,evenWeek:true},personal:true}));}
 return {surfaces,placements,shows,task,initialQueued,reminders,offsets,normalizeTime,validate,lessons,day,clock};
});
