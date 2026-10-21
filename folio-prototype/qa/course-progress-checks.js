/* Synthetic course and controllable clock. This file is excluded from APKs. */
window.addEventListener('load',()=>{
 const run=document.createElement('button'),out=document.createElement('pre');
 run.textContent='检查课程进度';run.style.cssText='position:fixed;bottom:8px;right:8px;z-index:100001;padding:10px';out.id='course-progress-results';out.hidden=true;document.body.append(run,out);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 run.onclick=async()=>{
  run.disabled=true;out.hidden=true;const checks=[],ok=(name,value)=>{checks.push({name,ok:!!value});if(!value)throw Error(name);};
  const originalClock=calendarNowMinute,originalProgress=calendarProgressMinute,oldItems=structuredClone(homeworkState.items);let minute=560,observer;
  try{
   calendarNowMinute=()=>Math.floor(minute);calendarProgressMinute=()=>minute;FolioPageRail.set(false);FolioTheme.set('light');
   const day=homeworkState.today;
   homeworkState.items.push({id:'qa-progress-course',kind:'lesson',source:'personal',title:'电路与模拟电子技术综合实验',location:'实验楼 306',timeMode:'range',startAt:day+'T09:00',endAt:day+'T10:35',placements:['calendar','timetable'],queued:false});
   showPreviewScreen('calendar',{focus:false});selectCalendarDay(day);await wait(300);
   const row=[...calendarAgenda.querySelectorAll('.has-course-progress')].find(n=>n.dataset.itemId==='qa-progress-course'||n.textContent.includes('综合实验'));
   ok('当前课程显示原有蜿蜒路线',!!row);const pet=row.querySelector('.schedule-pet-progress'),svg=pet.firstElementChild,head=svg.querySelector('[data-pet-head]');
   const expectedWidth=FolioCourseProgress.gap*2+28;
   ok('进度区域随自定义间距改变，文字预留区同步后退',pet.clientWidth===expectedWidth&&parseFloat(getComputedStyle(row).paddingRight)===expectedWidth+14);
   const points=FolioSnakeProgress.route(pet.clientWidth,pet.clientHeight);ok('24像素形象与邻线保持至少2像素空隙',points[0].x-points[2].x-12-4>=2&&head.getAttribute('width')==='24');
   const heading=row.querySelector('.schedule-event-heading').getBoundingClientRect(),bounds=pet.getBoundingClientRect();ok('长课程标题不进入路线区域',heading.right<=bounds.left-10);
   const initialY=Number(head.getAttribute('y')),initialFraction=Number(pet.dataset.elapsed);let replacements=0;
   observer=new MutationObserver(records=>{replacements+=records.filter(r=>r.type==='childList').length;});observer.observe(calendarAgenda,{childList:true,subtree:true});
   minute+=1/60;await wait(1200);
   ok('秒级定时器实际更新头像位置',Number(pet.dataset.elapsed)>initialFraction&&Number(head.getAttribute('y'))>initialY);
   ok('秒级更新不重建课程列表或路线SVG',replacements===0&&pet.firstElementChild===svg);
   const before=Number(pet.dataset.elapsed);showPreviewScreen('home',{focus:false});minute+=1/60;await wait(1200);ok('离开日程后停止更新隐藏路线',Number(pet.dataset.elapsed)===before);
   observer.disconnect();observer=null;showPreviewScreen('calendar',{focus:false});selectCalendarDay(day);await wait(100);
   minute=635;updateCalendarProgress();ok('到下课边界及时移除正在进行的形象',[...calendarAgenda.querySelectorAll('.has-course-progress')].every(n=>!n.textContent.includes('综合实验')));
   minute=560;renderCalendarAgenda(true);await wait(100);FolioTheme.set('dark');await wait(100);ok('深色与浅色宽度一致',calendarAgenda.querySelector('.schedule-pet-progress')?.clientWidth===expectedWidth);FolioTheme.set('light');
   ok('无脚本异常',FolioQA.errors.length===0);out.textContent=JSON.stringify({passed:true,width:document.documentElement.clientWidth,checks},null,2);
  }catch(e){out.textContent=JSON.stringify({passed:false,error:e.message,errors:FolioQA.errors,checks},null,2);}
  finally{observer?.disconnect();calendarNowMinute=originalClock;calendarProgressMinute=originalProgress;homeworkState.items=oldItems;run.disabled=false;run.textContent='课程检查完成';out.hidden=false;out.style.cssText='position:fixed;inset:85px 10px 70px;z-index:100000;background:#eee9dd;color:#4b5149;overflow:auto;font:12px monospace;padding:12px';}
 };
 const preview=document.createElement('button');preview.textContent='查看微调';preview.style.cssText='position:fixed;bottom:55px;right:8px;z-index:100001;padding:10px';preview.onclick=()=>{
  out.hidden=true;const day=homeworkState.today,started=Date.now();
  homeworkState.items=homeworkState.items.filter(i=>i.id!=='qa-progress-course');
  homeworkState.items.push({id:'qa-progress-course',kind:'lesson',source:'personal',title:'电路与模拟电子技术综合实验',location:'实验楼 306',timeMode:'range',startAt:day+'T09:00',endAt:day+'T10:35',placements:['calendar','timetable'],queued:false});
  calendarProgressMinute=()=>560+(Date.now()-started)/60000;calendarNowMinute=()=>Math.floor(calendarProgressMinute());
  FolioPageRail.set(false);showPreviewScreen('calendar',{focus:false});selectCalendarDay(day);
 };document.body.append(preview);
});
