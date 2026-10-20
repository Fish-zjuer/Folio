/* Standards-based iCalendar export: real dated occurrences, stable IDs, UTF-8 line folding. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./course-data.js'):root.FolioCourses);if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioCalendarExport=api;})(typeof globalThis!=='undefined'?globalThis:this,C=>{
 'use strict';
 const encoder=new TextEncoder();
 const text=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 function fold(line){let out='',current='',bytes=0;for(const char of line){const n=encoder.encode(char).length;if(bytes+n>75){out+=current+'\r\n';current=' ';bytes=1;}current+=char;bytes+=n;}return out+current;}
 function instant(day,clock){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw Error('导出包含无效日期或时间');const date=new Date(`${day}T${clock}:00+08:00`);if(!Number.isFinite(date.getTime())||new Date(date.getTime()+8*3600000).toISOString().slice(0,10)!==day)throw Error('导出包含无效日期');return date.toISOString().replace(/[-:]|\.\d{3}/g,'');}
 function uid(value){let h=2166136261;for(const c of value)h=Math.imul(h^c.codePointAt(0),16777619);return 'folio-'+(h>>>0).toString(16)+'@folio.local';}
 function build(term,{exams=[],includeExams=true,excluded,now=new Date()}={}){
  if(!/^20\d{2}-20\d{2}-[12]$/.test(term?.id))throw Error('请选择真实学期');
  const sessions=term.courses.some(c=>c.sessions?.length),periods=term.calendar?.periods||[];
  if(sessions&&!periods.length)throw Error('缺少所选学期校历，请先更新该学期课表');
  const events=[];
  if(sessions){const start=periods.map(p=>p.start).sort()[0],end=periods.map(p=>p.end).sort().at(-1),count=Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;if(!Number.isInteger(count)||count<1||count>370)throw Error('学期日期范围异常');
   for(let i=0;i<count;i++){const day=new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10);for(const c of C.onDate(term,day,excluded))events.push({id:c.id,date:day,start:c.start,end:c.end,title:c.title,room:c.room||'',description:c.teacher?`教师：${c.teacher}`:'',kind:'course'});}
  }
  if(includeExams)for(const e of exams){if(e.semesterId!==term.id||!e.date||!e.start||!e.end||e.end<=e.start)continue;events.push({id:e.id,date:e.date,start:e.start,end:e.end,title:`${e.title} · ${e.type||'考试'}`,room:e.room||'',description:'',kind:'exam'});}
  if(!events.length)throw Error('这个学期没有可导出的真实排课或考试，请先更新课表与校历');
  events.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
  const stamp=new Date(now).toISOString().replace(/[-:]|\.\d{3}/g,''),lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Fish//Folio//ZH','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${text('Folio · '+(term.label||term.id))}`];
  const seen=new Set();for(const e of events){const key=[term.id,e.id,e.date,e.start,e.end].join('|');if(seen.has(key))continue;seen.add(key);lines.push('BEGIN:VEVENT',`UID:${uid(key)}`,`DTSTAMP:${stamp}`,`DTSTART:${instant(e.date,e.start)}`,`DTEND:${instant(e.date,e.end)}`,`SUMMARY:${text(e.title)}`,`LOCATION:${text(e.room)}`,`DESCRIPTION:${text(e.description)}`,'END:VEVENT');}
  lines.push('END:VCALENDAR');return {content:lines.map(fold).join('\r\n')+'\r\n',filename:`folio-${term.id}.ics`,count:seen.size,termId:term.id};
 }
 return {text,fold,instant,build};
});
