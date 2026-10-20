/* Export is a user-initiated snapshot. No fake background-sync switches. */
(()=>{
 'use strict';const key='folio-calendar-export-v1';let preferences={termId:FolioCourses.semesters[0]?.id,includeExams:true},busy=false;
 try{preferences={...preferences,...JSON.parse(localStorage.getItem(key)||'{}')};}catch{}
 const rows=()=>[...document.querySelectorAll('.setting-row')];
 const options=rows().find(r=>r.querySelector('.setting-title')?.textContent==='课表导出选项'),exportButton=rows().find(r=>r.querySelector('.setting-title')?.textContent==='导出为 iCal 文件');
 function term(){return FolioCourses.semesters.find(t=>t.id===preferences.termId)||FolioCourses.semesters[0];}
 function update(){const t=term();if(options){options.disabled=false;options.setAttribute('aria-label','课表导出选项');options.querySelector('.setting-subtitle').textContent=(t?.label||'选择学期')+(preferences.includeExams?' · 包含考试':' · 仅课程');}if(exportButton){exportButton.disabled=busy;exportButton.setAttribute('aria-label','导出所选学期为 iCal 文件');}}
 function save(){localStorage.setItem(key,JSON.stringify(preferences));update();}
 function openOptions(){const box=FolioChatUI.openPanel('课表导出选项'),label=document.createElement('label'),select=document.createElement('select'),checkLabel=document.createElement('label'),check=document.createElement('input'),note=document.createElement('p'),saveButton=document.createElement('button');label.className='chat-field';label.textContent='导出学期';select.setAttribute('aria-label','导出学期');for(const t of FolioCourses.semesters){const o=document.createElement('option');o.value=t.id;o.textContent=t.label;select.append(o);}select.value=term()?.id;label.append(select);checkLabel.className='chat-check';check.type='checkbox';check.checked=preferences.includeExams;checkLabel.append(check,document.createTextNode('包含已排定时间的考试'));note.className='chat-panel-note';note.textContent='按真实校历、单双周和本地排课排除生成逐次事件。导出后可由你导入支持iCal的日历；这是快照，后续更新需重新导出，请避免重复导入。';saveButton.type='button';saveButton.className='chat-primary';saveButton.textContent='保存选项';saveButton.onclick=()=>{preferences={termId:select.value,includeExams:check.checked};try{save();FolioChatUI.closePanel();}catch{note.textContent='未能保存选项，请重试。';}};box.append(label,checkLabel,note,saveButton);}
 async function download(){if(busy)return;try{const data=FolioCalendarExport.build(term(),{exams:typeof officialExamRecords==='undefined'?[]:officialExamRecords,includeExams:preferences.includeExams,excluded:window.FolioScheduleOverrides?.excluded});busy=true;update();
  if(window.FolioApp?.native){const result=await FolioNative.call('app.calendar.export',data);if(result.saved)announce(`已保存 ${data.count} 条日历事件`);else if(result.cancelled)announce('已取消导出');}
  else{const url=URL.createObjectURL(new Blob([data.content],{type:'text/calendar;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=data.filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);announce(`已生成 ${data.count} 条日历事件`);}
 }catch(error){announce(error.message||'导出失败，原数据保留');}finally{busy=false;update();}}
 if(options)options.onclick=openOptions;if(exportButton)exportButton.onclick=download;update();document.addEventListener('folio-school-change',update);
 window.FolioCalendarExportUI={openOptions,download};
})();
