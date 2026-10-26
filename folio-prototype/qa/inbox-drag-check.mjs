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
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(new URL(name,import.meta.url),Buffer.from(r.data,'base64'))}

async function setup(mode=true,extra=''){
 await run(`FolioChatUI.closePanel();FolioPageRail.set(${mode});showPreviewScreen('workbench',{focus:false});homeworkState.today='2026-10-23';homeworkState.items=[{id:'qa-inbox',title:'测试待贴作业',kind:'homework',source:'school',course:'测试课程',description:'学校原文',queued:true,completed:false,manualDate:true,mountDate:'2026-10-25',mountedOn:null,deadline:'2026-11-01'},{id:'qa-existing',title:'已挂作业',kind:'homework',queued:true,manualDate:true,mountDate:'2026-10-23',mountedOn:'2026-10-23'}];${extra};commit();document.querySelector('.workbench-inbox-hit').click();window.__source=document.querySelector('.workbench-incoming-note[data-item-id="qa-inbox"]');window.__initial=JSON.stringify(homeworkState.items.find(i=>i.id==='qa-inbox'));`);await pause(280);
 return run(`(()=>{const n=__source.getBoundingClientRect(),r=document.querySelector('.workbench-board').getBoundingClientRect();return{start:{x:n.x+n.width/2,y:n.y+n.height/2},end:{x:r.x+r.width*.32,y:r.y+70}}})()`);
}
async function begin(p,kind='touch',hold=30){
 if(kind==='touch')await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p.start]});
 else{await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.start.x,y:p.start.y,pointerType:kind});await send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.start.x,y:p.start.y,button:'left',buttons:1,clickCount:1,pointerType:kind});}
 await pause(hold);
}
async function move(p,kind='touch',direction=-1){
 for(let i=1;i<=12;i++){
  const x=i<=4?p.start.x+direction*18*i:p.start.x+direction*72+(p.end.x-p.start.x-direction*72)*(i-4)/8,y=i<=4?p.start.y-2*i:p.start.y-8+(p.end.y-p.start.y+8)*(i-4)/8;
  if(kind==='touch')await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});else await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1,pointerType:kind});
  await pause(16);await check(`${kind} drag frame ${i}: page stays fixed`,`currentScreen==='workbench'&&!previewScreens.workbench.style.transform&&!previewScreens.workbench.classList.contains('rail-page')&&!previewScreens.workbench.classList.contains('is-page-dragging')`);
 }
}
async function end(p,kind='touch',cancel=false){
 if(kind==='touch')await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
 else await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.end.x,y:p.end.y,button:'left',buttons:0,clickCount:1,pointerType:kind});
 await pause(380);
}
const pinned=`(()=>{const a=homeworkState.items.find(i=>i.id==='qa-inbox');return a.mountedOn===homeworkState.today&&a.deskPin&&document.querySelector('.workbench-note[data-item-id="qa-inbox"]')&&JSON.parse(localStorage.getItem(homeworkDemo.storageKey)).items.find(i=>i.id===a.id).mountedOn===a.mountedOn})()`;
const unchanged=`JSON.stringify(homeworkState.items.find(i=>i.id==='qa-inbox'))===__initial`;
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await send('Page.navigate',{url:'http://127.0.0.1:4215/qa/relationships-app.html?qa=inbox-drag'});await pause(1600);
 for(const mode of [false,true])for(const direction of [-1,1]){
  const p=await setup(mode);await begin(p,'touch',480);await move(p,'touch',direction);await end(p);
  await check(`touch mode=${mode} direction=${direction}: mounts even with today's quota filled`,pinned);
  await check('paper is placed at the release point',`(()=>{const r=document.querySelector('.workbench-note[data-item-id="qa-inbox"]').getBoundingClientRect();return Math.abs(r.x+r.width/2-${p.end.x})<12&&Math.abs(r.y+r.height/2-${p.end.y})<12})()`);
  await check('school title/deadline/body remain unchanged',`(()=>{const a=homeworkState.items.find(i=>i.id==='qa-inbox');return a.title==='测试待贴作业'&&a.deadline==='2026-11-01'&&a.description==='学校原文'})()`);
  await check('no ghost, target or reading dialog left behind',`!document.querySelector('.workbench-drag-note,.workbench-board.is-drop-target')&&document.querySelector('.workbench-reading').hidden`);
 }
 for(const kind of ['mouse','pen']){const p=await setup(true);await begin(p,kind);await move(p,kind);await end(p,kind);await check(`${kind} mounts on release`,pinned);}
 let p=await setup();await begin(p);await move(p);await end(p,'touch',true);
 await check('touch cancellation preserves the record and restores the bag',`${unchanged}&&!document.querySelector('.workbench-drag-note,.workbench-board.is-drop-target')&&document.querySelector('.workbench-incoming-note[data-item-id="qa-inbox"]')`);
 p=await setup();p.end={x:p.start.x-70,y:300};await begin(p);await move(p);await end(p);
 await check('drop outside desk returns the paper without changing the record',unchanged);
 p=await setup();await begin(p);await move(p);await run(`homeworkState.items=structuredClone(homeworkState.items);homeworkState.items.find(i=>i.id==='qa-inbox').description='刷新后的学校原文';commit()`);
 await check('data refresh preserves captured paper while dragging',`__source.isConnected&&document.querySelector('.workbench-board.is-drop-target')`);
 await end(p);await check('drop uses latest record after refresh',`${pinned}&&homeworkState.items.find(i=>i.id==='qa-inbox').description==='刷新后的学校原文'`);
 p=await setup();await begin(p);await move(p);await run(`homeworkState.items.find(i=>i.id==='qa-inbox').completed=true;commit()`);await end(p);
 await check('completed homework is not re-mounted during drop',`homeworkState.items.find(i=>i.id==='qa-inbox').completed&&!homeworkState.items.find(i=>i.id==='qa-inbox').mountedOn`);
 p=await setup();await begin(p);await move(p);await run(`window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===homeworkDemo.storageKey)throw new Error('QA磁盘写入失败');return __setItem.call(this,key,value)}`);await end(p);
 await check('write failure preserves the paper and shows retry feedback',`${unchanged}&&[...document.querySelectorAll('.demo-toast')].some(n=>n.textContent.includes('没有保存成功'))`);await run(`Storage.prototype.setItem=__setItem`);
 p=await setup();await begin(p);await move(p);await run(`homeworkState.items=homeworkState.items.filter(i=>i.id!=='qa-inbox');commit()`);await end(p);
 await check('removed homework is never resurrected and failure is visible',`!homeworkState.items.some(i=>i.id==='qa-inbox')&&[...document.querySelectorAll('.demo-toast')].some(n=>n.textContent.includes('不在袋子里'))`);
 p=await setup();await begin(p);await move(p);await run(`showPreviewScreen('home',{focus:false})`);await end(p);
 await check('navigation cancels drag without mounting or leaving stale state',`${unchanged}&&currentScreen==='home'&&!document.querySelector('.workbench-drag-note,.workbench-board.is-drop-target,.workbench-incoming.is-dragging-note')`);
 p=await setup();await begin(p);await move(p);await run(`window.dispatchEvent(new Event('blur'))`);await end(p);
 await check('window blur cancels the drag',unchanged);
 p=await setup();await begin(p);await move(p);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p.end,{x:p.end.x+55,y:p.end.y}]});await end(p);
 await check('second touch cancels instead of mounting',unchanged);
 p=await setup();await run(`__source.click()`);await pause(300);p.start=await run(`(()=>{const r=document.querySelector('.workbench-reading-grip').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await begin(p);await move(p);await end(p);
 await check('reader grip can pin to the same desk',pinned);
 p=await setup();await begin(p);await move(p);await end(p);
 await run(`document.querySelector('.workbench-plant-hit').click();document.querySelector('.workbench-plant-hit').click()`);await pause(200);
 await check('double-tap undo returns only pulled paper, keeps automatic paper',`homeworkState.items.find(i=>i.id==='qa-inbox').mountedOn===null&&homeworkState.items.find(i=>i.id==='qa-inbox').mountDate==='2026-10-25'&&homeworkState.items.find(i=>i.id==='qa-existing').mountedOn==='2026-10-23'`);
 await run(`commit()`);await check('undo is not immediately re-mounted',`homeworkState.items.find(i=>i.id==='qa-inbox').mountedOn===null`);
 p=await setup();await begin(p);await move(p);await end(p);await run(`window.__dropSaved=localStorage.getItem('folio-workbench-v1')`);
 await send('Page.reload',{ignoreCache:true});await pause(1400);await run(`showPreviewScreen('workbench',{focus:false})`);await pause(180);
 await check('mount and manual placement survive app reload',`!!document.querySelector('.workbench-note[data-item-id="qa-inbox"]')&&JSON.parse(localStorage.getItem('folio-workbench-v1')).noteShapes['qa-inbox'].manual===true`);
 // A normal page swipe must still work after the local drag boundary is released.
 await run(`document.querySelector('.workbench-inbox-hit').click();document.querySelector('.workbench-inbox-hit').click()`);await pause(260);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:70,y:225}]});
 for(let i=1;i<=9;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:70+i*27,y:225}]});await pause(20)}
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(500);
 await check('normal horizontal page swipe still works after dragging',`currentScreen==='home'&&!previewScreens.home.style.transform`);
 await check('no browser runtime errors',`true`);checks.at(-1).pass=errors.length===0;if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify({count:checks.length,passed:checks.filter(c=>c.pass).length,errors}));
}finally{fs.writeFileSync(new URL('inbox-drag-report.json',import.meta.url),JSON.stringify({checks,errors},null,2));c.ws.close();await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
