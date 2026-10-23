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
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(new URL(name,import.meta.url),Buffer.from(r.data,'base64'))}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await send('Page.navigate',{url:'http://127.0.0.1:4215/qa/relationships-app.html?v=post101'});await pause(1700);
 await run(`(async()=>{await FolioSchool.refresh('courses');await FolioAcademicUI.refresh('grades');FolioPageRail.setPages(['home','timetable','grades','settings']);FolioPageRail.set(true);showPreviewScreen('timetable',{focus:false})})()`);await pause(600);
 await check('selected page order is retained rather than sorted back to defaults',`FolioPageRail.pages.map(p=>p.id).join(',')==='home,timetable,grades,settings'`);
 await run(`window.__renderCount=0;window.__realTimetable=renderTimetable;renderTimetable=function(...a){__renderCount++;return __realTimetable(...a)}`);
 await swipe(-35);
 await check('short timetable drag snaps back completely without a second gesture',`currentScreen==='timetable'&&!document.querySelector('.rail-page')&&previewScreens.timetable.style.transform===''`);
 await check('drag never rebuilds the active timetable under the finger',`__renderCount===0`);
 await swipe(-160);
 await check('one completed timetable swipe reaches grades',`currentScreen==='grades'&&!document.querySelector('.rail-page')`);
 await run(`showPreviewScreen('timetable',{focus:false})`);await pause(300);await swipe(-120,true);
 await check('cancelled timetable drag also clears its intermediate transforms',`currentScreen==='timetable'&&!document.querySelector('.rail-page')&&previewScreens.timetable.style.transform===''`);
 await run(`FolioPageRail.openPages()`);await pause(150);
 await run(`document.querySelector('.rail-pages-row[data-page=grades] .rail-pages-handle').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));document.querySelector('.rail-pages-form').requestSubmit()`);await pause(200);
 await check('reordering in settings preserves selected subset and saves the new order',`FolioPageRail.pages.map(p=>p.id).join(',')==='home,grades,timetable,settings'&&JSON.parse(localStorage.getItem('folio-horizontal-pages-v1')).join(',')==='home,grades,timetable,settings'`);
 await run(`showPreviewScreen('grades',{focus:false});FolioTheme.set('dark');FolioAcademicUI.setPreferences({hideGrades:true});document.querySelector('#grades-screen .academic-scope button').click();window.__privacyBefore=localStorage.getItem('folio-academic-v1');window.__gradesBefore=FolioAcademicDemo.grades.map(g=>g.id);`);await pause(350);
 await check('grouped semester backgrounds stay transparent in dark mode',`getComputedStyle(document.querySelector('#grades-screen .academic-grade-list')).backgroundColor==='rgba(0, 0, 0, 0)'`);
 await check('grade values start concealed and hold control is available',`!document.querySelector('.academic-peek-bar').hidden&&document.querySelectorAll('#grades-screen .academic-grade-score.is-hidden').length===2&&!document.querySelector('#grades-screen .academic-hero')`);
 await hold('touchStart');
 await check('holding reveals scores and GPA on grades page only',`document.querySelector('#grades-screen').classList.contains('is-grade-peeking')&&document.querySelector('#grades-screen .academic-hero')&&[...document.querySelectorAll('#grades-screen .academic-grade-score')].some(n=>n.textContent==='95')&&FolioAcademicUI.overview().hidden===true&&FolioAcademicUI.preferences().hideGrades===true`);
 await shot('post-101-grade-hold-dark.png');await touch('touchEnd');await pause(30);
 await check('release immediately removes actual grades from rendered page',`!document.querySelector('#grades-screen .academic-hero')&&document.querySelectorAll('#grades-screen .academic-grade-score.is-hidden').length===2&&!document.querySelector('.is-grade-peeking')`);
 await check('holding never persists privacy changes or marks a grade revealed',`localStorage.getItem('folio-academic-v1')===__privacyBefore`);
 await hold('touchStart');await touch('touchCancel');await pause(30);
 await check('touch cancellation restores hidden grades',`!document.querySelector('.is-grade-peeking')`);
 await hold('touchStart');await run(`showPreviewScreen('scholar',{focus:false})`);await touch('touchEnd');await pause(50);
 await check('navigation away clears temporary peek and scholar remains hidden',`!document.querySelector('.is-grade-peeking')&&!document.querySelector('#scholar-screen .academic-hero')&&FolioAcademicUI.preferences().hideGrades`);
 await run(`showPreviewScreen('grades',{focus:false});document.querySelector('.academic-peek-button').focus();document.querySelector('.academic-peek-button').dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));`);
 await check('keyboard hold is supported',`document.querySelector('.is-grade-peeking')!==null`);
 await run(`window.dispatchEvent(new Event('blur'))`);
 await check('window blur immediately clears keyboard peek',`!document.querySelector('.is-grade-peeking')`);
 await shot('post-101-grades-dark.png');
 await run(`FolioLiveUI.openSchool()`);await pause(150);
 await check('school credentials stay outside HTML input forms',`!document.querySelector('.school-credential-grid input')&&!document.querySelector('.school-connect-panel input[type=password]')&&document.querySelector('.school-account-entry-note')!==null`);
 await run(`FolioChatUI.closePanel();window.__nativeCall=FolioNative.call;window.__examAttempts=0;FolioNative.call=(op,input)=>{if(op==='school'&&input.module==='exams'){__examAttempts++;if(__examAttempts===1)return new Promise((resolve,reject)=>{window.__rejectOldExam=reject});}return __nativeCall(op,input)};window.__oldExam=FolioSchool.refresh('exams').catch(()=>null);true;`);await pause(30);
 await run(`(async()=>{await FolioSchool.login('academic');window.dispatchEvent(new Event('folio-school-login'))})()`);await pause(70);
 await check('official-login completion waits for the request made with old cookies',`__examAttempts===1`);
 await run(`__rejectOldExam(Error('旧认证代次已失效（测试）'))`);await pause(500);
 await check('official login then issues a fresh exam request instead of reusing the failed flight',`__examAttempts>=2&&!FolioSchool.cache().modules.exams.warning`);
 await run(`FolioNative.call=__nativeCall`);
 await run(`FolioChatUI.closePanel();FolioPageRail.set(false);showPreviewScreen('calendar',{focus:false});showCalendarView('week')`);await pause(350);
 await swipe(160);
 await check('original non-rail timetable swipe returns to month in one gesture',`scheduleView==='month'&&schedulePanels.style.getPropertyValue('--swipe-offset')==='0px'`);
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await run(`showPreviewScreen('grades',{focus:false});FolioPageRail.set(true)`);await pause(350);
 await check('320px grade page has no horizontal overflow',`previewScreens.grades.scrollWidth<=previewScreens.grades.clientWidth+1`);
 await check('no browser runtime errors',`true`);checks.at(-1).pass=errors.length===0;if(errors.length)throw Error(JSON.stringify(errors));
 console.log(JSON.stringify({checks,errors},null,2));
}finally{fs.writeFileSync(new URL('post-101-report.json',import.meta.url),JSON.stringify({checks,errors},null,2));c.ws.close();await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
