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
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:4215/qa/relationships-app.html?v=native-entry'});await pause(1600);
 await run(`showPreviewScreen('settings',{focus:false});FolioLiveUI.openSchool();window.__nativeCall=FolioNative.call;window.__payloads=[];FolioNative.call=(op,args,signal)=>{__payloads.push({op,args});return __nativeCall(op,args,signal)};window.__originalSync=FolioSchool.sync;window.__syncCount=0;FolioSchool.sync=async()=>{__syncCount++;return __originalSync()};FolioSchool.bindAccount=info=>{window.__bound=info;return false};`);await pause(150);
 await check('school connection no longer exposes HTML login inputs',`!document.querySelector('.school-credential-grid')&&!document.querySelector('.school-connect-panel input[type=password]')&&document.querySelector('.school-account-entry-note')!==null`);
 await run(`document.querySelector('.school-connect-submit').click()`);await pause(100);
 await check('empty account opens native editor without sending credentials',`__payloads.some(p=>p.op==='school.account.edit'&&Object.keys(p.args).length===0)&&!__payloads.some(p=>p.op==='school.account.save')`);
 await check('cancelling editor performs no login or local account replacement',`__syncCount===0&&!window.__bound&&!document.querySelector('.school-connect-submit').disabled`);
 await run(`FolioQA.accountEditResult={saved:true,account:{username:'fixture-student',hasPassword:true,accountId:'native-entry-fixture',changed:true}};document.querySelector('.school-connect-submit').click()`);await pause(500);
 await check('confirmed native save reconnects account profiles and triggers one sync',`__syncCount===1&&__bound.accountId==='native-entry-fixture'&&__bound.initialSync===true`);
 await check('saved state displays metadata only and keeps the existing one-click update',`document.querySelector('.school-account-entry-note').textContent.includes('fixture-student')&&document.querySelector('.school-connect-submit').textContent==='一键更新'&&![...document.querySelectorAll('.school-connect-panel input')].some(n=>n.type==='password')`);
 await run(`window.__entryCount=__payloads.filter(p=>p.op==='school.account.edit').length;document.querySelector('.school-connect-submit').click()`);await pause(650);
 await check('saved account refresh never reopens credential editor',`__syncCount===2&&__payloads.filter(p=>p.op==='school.account.edit').length===__entryCount`);
 await run(`FolioQA.accountEditResult={saved:true,account:{username:'fixture-student-2',hasPassword:true,accountId:'native-entry-fixture-2',changed:true}};document.querySelector('.school-connect-overview button').click()`);await pause(650);
 await check('change-account control explicitly opens the native editor again',`__syncCount===3&&__bound.accountId==='native-entry-fixture-2'&&__payloads.filter(p=>p.op==='school.account.edit').length===__entryCount+1`);
 await check('no username or password entry value is sent through JavaScript write calls',`__payloads.filter(p=>p.op==='school.account.edit').every(p=>JSON.stringify(p.args)==='{}')&&!__payloads.some(p=>p.op==='school.account.save')`);
 await run(`window.__androidCall=FolioAndroid.call;window.__cancelledEditor=false;FolioAndroid.call=(id,op,payload)=>{if(op==='school.account.edit'){window.__waitingEditor=id;return;}if(op==='cancel'&&id===__waitingEditor)__cancelledEditor=true;return __androidCall(id,op,payload)};document.querySelector('.school-connect-overview button').click();document.querySelector('.school-connect-overview button').click()`);await pause(100);

 await check('repeated edit clicks create only one pending editor',`document.querySelector('.school-connect-submit').disabled&&__payloads.filter(p=>p.op==='school.account.edit').length===__entryCount+2`);
 await run(`FolioChatUI.closePanel(true,false)`);await pause(60);
 await check('closing parent panel cancels the pending native editor bridge request',`__cancelledEditor&&__syncCount===3`);
 await run(`FolioNative.receive(__waitingEditor,{ok:true,data:{saved:true,account:{username:'late-fixture',hasPassword:true,accountId:'late-fixture'}}});FolioAndroid.call=__androidCall`);await pause(80);
 await check('late editor completion after cancellation cannot start a login',`__syncCount===3&&__bound.accountId==='native-entry-fixture-2'`);
 await run(`FolioQA.accountEditResult={saved:true,account:{username:'invalid-fixture',hasPassword:false}};FolioLiveUI.openSchool()`);await pause(120);await run(`document.querySelector('.school-connect-overview button').click()`);await pause(100);
 await check('malformed save response cannot silently enter a sync',`__syncCount===3&&document.querySelector('.school-connect-error').textContent.includes('尚未保存')`);
 await check('no browser runtime errors',`true`);checks.at(-1).pass=errors.length===0;if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify({checks,errors},null,2));
}finally{fs.writeFileSync(new URL('account-entry-report.json',import.meta.url),JSON.stringify({checks,errors},null,2));c.ws.close();await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
