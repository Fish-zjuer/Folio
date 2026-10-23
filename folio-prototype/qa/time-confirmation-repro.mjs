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
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:4215/qa/relationships-app.html?v=time-repro'});await pause(1500);
 console.log(JSON.stringify(await run(`(()=>{showPreviewScreen('home',{focus:false});const state=FolioChatUI.state(),c=FolioChat.conversation(state);window.__timeProposal={id:'qa-time-repro',messageId:'qa-message',status:'pending',operation:'create_todo',fields:{title:'QA图书馆安排',kind:'event',timeMode:'range',startAt:'2026-10-24T09:00:00',endAt:'2026-10-24T21:15:00',location:'图书馆',reminderOffsets:[0],placements:['calendar','home'],queued:false},before:null};c.proposals.push(__timeProposal);FolioChatUI.openProposal(c,__timeProposal);const fields=[...document.querySelectorAll('.chat-field')],input=label=>fields.find(n=>n.firstChild.textContent===label)?.querySelector('input');const result={draftStart:__timeProposal.fields.startAt,inputStart:input('开始时间')?.value,draftEnd:__timeProposal.fields.endAt,inputEnd:input('结束时间')?.value};document.querySelector('.chat-proposal-form').requestSubmit();result.error=document.querySelector('.chat-form-error').textContent;result.status=__timeProposal.status;return result})()`),null,2));
}finally{c.ws.close();await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
