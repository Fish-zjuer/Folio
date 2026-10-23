import fs from 'node:fs';
const debug='http://127.0.0.1:9224',checks=[],errors=[];
async function client(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}};return{ws,send:(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}}
const browser=await client((await(await fetch(debug+'/json/version')).json()).webSocketDebuggerUrl);
const {browserContextId}=await browser.send('Target.createBrowserContext');
const {targetId}=await browser.send('Target.createTarget',{url:'about:blank',browserContextId});
const target=(await(await fetch(debug+'/json')).json()).find(t=>t.id===targetId),c=await client(target.webSocketDebuggerUrl),send=c.send;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value}
async function check(name,expression){const pass=!!await run(expression);checks.push({name,pass});if(!pass)throw Error(name)}
async function touch(type,x,y){await send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1,radiusX:2,radiusY:2}]})}
async function swipe(dx,cancel=false){const {x,y}=await run(`(()=>{const r=previewScreens[currentScreen].getBoundingClientRect();return{x:r.left+r.width*.8,y:r.top+r.height*.55}})()`);await touch('touchStart',x,y);for(let i=1;i<=8;i++){await touch('touchMove',x+dx*i/8,y);await pause(20)}await touch(cancel?'touchCancel':'touchEnd');await pause(440)}
async function hold(type){const p=await run(`(()=>{const r=document.querySelector('.academic-peek-button').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await touch(type,p.x,p.y);await pause(50)}
async function shot(name){await run(`document.getElementById('qa-native-status')?.parentElement?.setAttribute('hidden','')`);const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(new URL(name,import.meta.url),Buffer.from(r.data,'base64'))}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:4215/qa/relationships-app.html?v=panels-day'});await pause(1700);
 await run(`(async()=>{await FolioSchool.refresh('courses');await FolioAcademicUI.refresh('grades');FolioPageRail.setPages(['home','timetable','grades','settings']);showPreviewScreen('settings',{focus:false});FolioTheme.set('light');FolioReminders.open()})()`);await pause(400);
 await check('reminder actions use two readable compact columns',`(()=>{const a=[...document.querySelectorAll('.reminder-action')],r=a.map(b=>b.getBoundingClientRect());return a.length===4&&r.every(x=>x.height>=44&&x.height<=55&&x.width>120)&&Math.abs(r[0].top-r[1].top)<1&&r[2].top>r[0].bottom&&a.every(b=>getComputedStyle(b).whiteSpace==='nowrap')})()`);
 await shot('panels-reminders-light.png');
 await run(`document.querySelector('.reminder-enable input').click();document.querySelectorAll('.reminder-action').forEach(b=>b.click())`);await pause(450);
 await check('redesigned controls still save the switch and call all four native actions',`localStorage.getItem('folio-local-reminders-enabled-v1')==='on'&&['app.notification.permission','app.reminders.exact.settings','app.reminders.test','app.notification.settings'].every(op=>FolioQA.calls.some(c=>c.op===op))`);
 await run(`FolioPageRail.openPages()`);await pause(330);
 await check('sorting has one three-line handle per row with no arrow buttons',`document.querySelectorAll('.rail-pages-handle').length===document.querySelectorAll('.rail-pages-row').length&&!document.querySelector('.rail-pages-move')`);
 await shot('panels-order-light.png');
 const handle=await run(`(()=>{const row=document.querySelector('.rail-pages-row[data-page=grades]'),r=row.querySelector('.rail-pages-handle').getBoundingClientRect(),target=document.querySelector('.rail-pages-row[data-page=home]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,to:target.top+6}})()`);
 await touch('touchStart',handle.x,handle.y);await pause(70);
 await check('pressed handle lifts a detached visual row and dims the rest',`document.querySelector('.rail-pages-ghost')&&document.querySelector('.rail-pages-list.is-sorting')&&getComputedStyle(document.querySelector('.rail-pages-row:not(.is-drag-source)')).opacity<1&&document.querySelector('.is-drag-source').dataset.page==='grades'`);
 for(let i=1;i<=12;i++){await touch('touchMove',handle.x,handle.y+(handle.to-handle.y)*i/12);await pause(20)}
 await shot('panels-order-drag.png');await touch('touchEnd');await pause(240);
 await check('finger placement reorders locally and removes lifted visuals',`document.querySelector('.rail-pages-list').firstElementChild.dataset.page==='grades'&&!document.querySelector('.rail-pages-ghost')&&!document.querySelector('.is-sorting')`);
 await check('dragging alone does not write saved page preferences',`FolioPageRail.pages.map(p=>p.id).join(',')==='home,timetable,grades,settings'`);
 await run(`document.querySelector('.rail-pages-form').requestSubmit()`);await pause(230);
 await check('save preserves subset with newly dragged order',`FolioPageRail.pages.map(p=>p.id).join(',')==='grades,home,timetable,settings'`);
 await run(`FolioPageRail.openPages()`);await pause(240);
 const cancel=await run(`(()=>{const r=document.querySelector('.rail-pages-handle').getBoundingClientRect();window.__before=[...document.querySelectorAll('.rail-pages-list>.rail-pages-row')].map(n=>n.dataset.page).join(',');return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await touch('touchStart',cancel.x,cancel.y);await touch('touchMove',cancel.x,cancel.y+90);await pause(80);await touch('touchCancel');await pause(260);

 await check('cancel restores original draft order without saving',`[...document.querySelectorAll('.rail-pages-list>.rail-pages-row')].map(n=>n.dataset.page).join(',')===__before&&!document.querySelector('.rail-pages-ghost')`);
 // A gesture originating on the row body must keep ordinary scrolling.
 const scroll=await run(`(()=>{const r=document.querySelector('.rail-pages-list').getBoundingClientRect();return{x:r.left+80,y:r.bottom-25}})()`);await touch('touchStart',scroll.x,scroll.y);for(let i=1;i<=10;i++){await touch('touchMove',scroll.x,scroll.y-i*14);await pause(20)}await touch('touchEnd');await pause(100);
 await check('swiping the row label scrolls instead of starting drag',`document.querySelector('.rail-pages-list').scrollTop>30&&!document.querySelector('.rail-pages-ghost')`);
 await run(`document.querySelector('.rail-pages-list').scrollTop=0`);await pause(100);
 const auto=await run(`(()=>{const r=document.querySelector('.rail-pages-handle').getBoundingClientRect(),b=document.querySelector('.rail-pages-list').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,end:b.bottom-3}})()`);await touch('touchStart',auto.x,auto.y);await touch('touchMove',auto.x,auto.end);await pause(500);
 await check('drag near list edge automatically scrolls to offscreen positions',`document.querySelector('.rail-pages-list').scrollTop>60&&document.querySelector('.rail-pages-ghost')!==null`);
 await run(`FolioChatUI.closePanel(true,false)`);await touch('touchEnd');
 await check('closing sheet during drag removes floating row and keeps saved order',`!document.querySelector('.rail-pages-ghost')&&FolioPageRail.pages.map(p=>p.id).join(',')==='grades,home,timetable,settings'`);
 await run(`FolioChatUI.closePanel(true,false);FolioPageRail.set(false);showPreviewScreen('home',{focus:false});FolioHomeWeek.open()`);await pause(480);
 await check('day column opens at today with previous and next controls',`FolioHomeWeek.date===homeworkState.today&&document.querySelector('.home-day-prev')&&document.querySelector('.home-day-next')`);
 await run(`document.querySelector('.home-day-next').click()`);await pause(220);
 await check('next day changes queried date and hides the now marker',`FolioHomeWeek.date===FolioHomeWeekLayout.add(homeworkState.today,1)&&document.querySelector('.home-week-column').dataset.date===FolioHomeWeek.date&&!document.querySelector('.home-week-now')`);
 await run(`document.querySelector('.home-day-prev').click()`);await pause(200);
 await check('previous day can return to today and restores the current-time marker',`FolioHomeWeek.date===homeworkState.today&&document.querySelector('.home-week-now')`);
 await run(`document.querySelector('.home-day-prev').click();document.querySelector('.home-week-range').click()`);await pause(200);
 await check('opening full calendar uses the selected day while leaving home resets it',`currentScreen==='calendar'&&calendarSelectedDay===FolioHomeWeekLayout.add(homeworkState.today,-1)&&FolioHomeWeek.date===homeworkState.today`);
 await run(`showPreviewScreen('home',{focus:false});FolioHomeWeek.open()`);await pause(460);
 await check('reopening home drawer defaults back to today',`document.querySelector('.home-week').dataset.date===homeworkState.today`);
 // Check the actual last visible edge for both empty and populated lower item rows.
 for(const theme of ['light','dark'])for(const items of [false,true]){
  await run(`FolioTheme.set('${theme}');homeworkState.items=[];if(${items})homeworkState.items.push({id:'qa-lower-edge',title:'虚构事项',kind:'todo',source:'personal',placements:['home'],completed:false});document.dispatchEvent(new Event('folio-data-change'))`);await pause(250);
  await check(`${theme} bottom edge aligns with composer, lower items ${items}`,`(()=>{const panel=document.querySelector('.home-week'),bottom=panel.querySelector('.home-week-bottom'),edge=bottom.hidden?panel.querySelector('.home-week-columns'):panel.querySelector('.home-week-strip:last-child');return bottom.hidden===!${items}&&Math.abs(edge.getBoundingClientRect().bottom-document.querySelector('.composer').getBoundingClientRect().bottom)<=2})()`);
  if(items)await shot('panels-home-'+theme+'.png');
 }
 await check('dark drawer blends with the canvas and avoids a separate green slab',`getComputedStyle(document.querySelector('.home-week')).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(document.querySelector('.home-week-column')).backgroundColor==='rgb(43, 44, 39)'`);
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await run(`FolioHomeWeek.close(true);showPreviewScreen('settings',{focus:false});FolioPageRail.openPages()`);await pause(240);
 await check('320px sorting footer fits without overflow or tall buttons',`(()=>{const p=document.querySelector('.rail-pages-panel');return p.scrollWidth<=p.clientWidth+1&&[...p.querySelectorAll('.rail-pages-footer button')].every(b=>b.getBoundingClientRect().height<55)})()`);
 await run(`FolioReminders.open()`);await pause(200);await shot('panels-reminders-320-dark.png');
 await check('320px dark reminder buttons fit on one line',`[...document.querySelectorAll('.reminder-action')].every(b=>b.scrollWidth<=b.clientWidth+1&&b.getBoundingClientRect().height<=55)`);
 await check('no browser errors',`true`);checks.at(-1).pass=errors.length===0;if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify({checks,errors},null,2));
}finally{fs.writeFileSync(new URL('panels-day-report.json',import.meta.url),JSON.stringify({checks,errors},null,2));c.ws.close();await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
