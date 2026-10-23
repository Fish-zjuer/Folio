import fs from 'node:fs';
const origin='http://127.0.0.1:4210',base=origin+'/qa/next-learning-mobile.html';
const target=await(await fetch('http://127.0.0.1:9223/json/new?'+encodeURIComponent('about:blank'),{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let next=0;const waits=new Map(),errors=[];
ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.id&&waits.has(m.id)){const [r,j]=waits.get(m.id);waits.delete(m.id);m.error?j(Error(JSON.stringify(m.error))):r(m.result);}};
const send=(method,params={})=>new Promise((r,j)=>{const id=++next;waits.set(id,[r,j]);ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result?.value;}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];function assert(value,label){if(!value)throw Error(label);results.push(label);}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:origin+'/qa/next-learning-mobile.html?prepare'});await pause(1800);
 await evaluate('localStorage.clear()');await send('Page.navigate',{url:base});await pause(2000);
 assert(await evaluate('!!window.FolioLearning && !!window.FolioPageRail'),'runtime loads');
 await evaluate('FolioLearning.ready');
 const records=await evaluate(`(async()=>{const c={proposals:[]};await FolioAgentRuntime.execute('draft_change',{operation:'create_learning',fields:{title:'控制理论反思',body:'今天理解了稳定性',kind:'journal',date:'2026-10-21'}},c,'m','写一篇日记');const p=c.proposals[0];if(FolioLearning.records().length)return false;await FolioAgentRuntime.confirm(p);await FolioAgentRuntime.confirm(p);window.qaLearningProposal=p;return FolioLearning.records().length===1&&p.status==='confirmed';})()`);
 assert(records,'AI draft does not persist until confirmation; confirmation is idempotent');
 assert(await evaluate(`(async()=>{try{await FolioAgentRuntime.execute('search_records',{module:'learning'}, {},'m','你好');return false;}catch{return true;}})()`),'unrelated prompt cannot read diary');
 assert(await evaluate(`(async()=>{const r=await FolioAgentRuntime.execute('search_records',{module:'learning',query:'稳定性'}, {},'m','回顾日记');return r.total===1&&!('body' in r.records[0]);})()`),'search returns bounded summaries');
 assert(await evaluate(`(async()=>{const before=FolioLearning.records().length;FolioQA.failRecordWrite=true;const p={id:'failed',operation:'create_learning',status:'pending',fields:{title:'不可丢失',body:'测试',kind:'note',date:'2026-10-21'}};try{await FolioAgentRuntime.confirm(p);return false;}catch{return FolioLearning.records().length===before&&p.status==='pending';}})()`),'failed native save keeps old state and pending proposal');
 await evaluate(`FolioPageRail.setPages(['home','workbench','learning','settings']);FolioPageRail.set(true);FolioLearning.open();`);await pause(350);
 assert(await evaluate(`FolioPageRail.pages.map(x=>x.id).join(',')==='home,workbench,learning,settings'`),'subset preserves canonical order and learning page');
 assert(await evaluate(`currentScreen==='learning'&&!previewScreens.learning.hidden&&document.querySelector('.learning-title').textContent==='控制理论反思'`),'record is visible in independent page');
 await evaluate(`FolioPageRail.openPages()`);await pause(300);
 assert(await evaluate(`!!document.querySelector('.chat-panel input[type=checkbox]:disabled')`),'page selector pins home');
 await evaluate(`FolioChatUI.closePanel(true);document.documentElement.dataset.theme='dark';FolioLearning.open();`);
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(new URL('./next-learning-dark-390.png',import.meta.url),Buffer.from(shot.data,'base64'));
 assert(await evaluate(`getComputedStyle(document.querySelector('.chat-camera')).backgroundColor==='rgb(213, 145, 115)'`),'dark camera is orange');
 assert(await evaluate(`document.querySelector('.learning-screen').scrollWidth<=390`),'390px record page fits');
 await evaluate(`FolioPageRail.setPages(['home','learning']);`);await send('Page.reload');await pause(1900);await evaluate('FolioLearning.ready');
 assert(await evaluate(`FolioLearning.records().length===1&&FolioPageRail.pages.length===2`),'native record and page selection restore on reload');
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await evaluate(`FolioLearning.open();FolioLearning.edit(null,'recording');`);await pause(200);
 assert(await evaluate(`document.querySelector('.learning-editor-screen').getBoundingClientRect().width<=320`),'320px recording editor fits');
 // Exercise real MediaRecorder event handling and IndexedDB using synthetic bytes, without accessing a microphone.
 await evaluate(`window.MediaRecorder=class {static isTypeSupported(){return true;}constructor(){this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['synthetic recording'],{type:this.mimeType})});this.onstop();}};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});`);
 await evaluate(`[...document.querySelectorAll('.learning-editor-screen button')].find(b=>b.textContent==='开始录音').click()`);await pause(200);
 await evaluate(`[...document.querySelectorAll('.learning-editor-screen button')].find(b=>b.textContent==='结束录音').click()`);await pause(100);
 await evaluate(`document.querySelector('.learning-editor-form').requestSubmit()`);await pause(400);
 assert(await evaluate(`FolioLearning.records().length===2&&FolioLearning.records().some(r=>r.audio?.size>0)`),'recording metadata persists after IndexedDB write');
 await evaluate(`FolioLearning.open()`);await pause(200);
 const shot2=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(new URL('./next-learning-320.png',import.meta.url),Buffer.from(shot2.data,'base64'));
 assert(errors.length===0,`no runtime exceptions (${errors.join('; ')})`);
 console.log(JSON.stringify({passed:results.length,checks:results},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9223/json/close/'+target.id);}



