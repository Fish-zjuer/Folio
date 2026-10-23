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
 await send('Page.navigate',{url:base});await pause(1600);await evaluate('localStorage.clear()');await send('Page.reload');await pause(1800);await evaluate('FolioLearning.ready');
 await evaluate(`homeworkState.items=[{id:'desk',title:'拖出测试',kind:'homework',queued:true,completed:false,source:'personal',deadline:'2026-11-01',mountDate:'2026-10-29',mountedOn:null},{id:'ai',title:'AI挂的',kind:'homework',queued:true,completed:false,source:'personal',deadline:'2026-11-01',manualDate:true,mountDate:'2026-10-20',mountedOn:'2026-10-20'},{id:'hw',title:'作业页挂的',kind:'homework',queued:true,completed:false,source:'personal',deadline:'2026-11-01',manualDate:true,mountDate:'2026-10-20',mountedOn:'2026-10-20'}];commit();FolioPageRail.set(false);showPreviewScreen('workbench');`);await pause(250);
 assert(await evaluate(`homeworkState.items.find(i=>i.id==='desk').mountedOn===null`),'bag item initially unmounted');
 await evaluate(`document.querySelector('.workbench-inbox-hit').click();document.querySelector('.workbench-incoming-note').click();document.querySelector('.workbench-reading-grip').click();`);await pause(220);
 assert(await evaluate(`!!homeworkState.items.find(i=>i.id==='desk').deskPin`),'inbox pin stores source and original plan');
 await send('Page.reload');await pause(1600);await evaluate(`showPreviewScreen('workbench')`);await pause(200);
 assert(await evaluate(`!!homeworkState.items.find(i=>i.id==='desk').deskPin`),'undo provenance survives reload');
 const point=await evaluate(`(()=>{const r=document.querySelector('.workbench-plant-hit').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 for(let i=0;i<2;i++){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(70);}await pause(220);
 assert(await evaluate(`homeworkState.items.find(i=>i.id==='desk').mountedOn===null&&homeworkState.items.find(i=>i.id==='desk').queued`),'double tap flower returns manual pin to bag');
 assert(await evaluate(`homeworkState.items.filter(i=>['ai','hw'].includes(i.id)).every(i=>i.mountedOn==='2026-10-20')`),'AI and homework page pins stay mounted');
 await evaluate(`commit();document.querySelector('.workbench-inbox-hit').click();document.querySelector('.workbench-incoming-note').click();document.querySelector('.workbench-reading-grip').click();`);await pause(200);
 await evaluate(`document.querySelector('.workbench-note[data-item-id="desk"]').click()`);await pause(100);
 assert(await evaluate(`!![...document.querySelectorAll('.workbench-reading button')].find(b=>b.textContent==='收回到待贴便签袋')`),'one-note reader has undo action');
 await evaluate(`[...document.querySelectorAll('.workbench-reading button')].find(b=>b.textContent==='收回到待贴便签袋').click()`);await pause(150);
 assert(await evaluate(`homeworkState.items.find(i=>i.id==='desk').mountedOn===null`),'single-note undo works');
 // Settings tools create a proposal, never change values without confirmation.
 assert(await evaluate(`(async()=>{const c={proposals:[]};await FolioAgentRuntime.execute('draft_preferences',{key:'colorMode',value:'dark'},c,'m','打开深色模式');if(FolioTheme.mode==='dark')return false;await FolioAgentRuntime.confirm(c.proposals[0]);await FolioAgentRuntime.confirm(c.proposals[0]);return FolioTheme.mode==='dark'&&c.proposals[0].status==='confirmed';})()`),'AI theme proposal applies only after confirmation and retries safely');
 assert(await evaluate(`(async()=>{const c={proposals:[]};await FolioAgentRuntime.execute('draft_preferences',{key:'horizontalPages',value:['home','workbench','learning']},c,'m','调整横向页面');await FolioAgentRuntime.confirm(c.proposals[0]);return FolioPageRail.pages.map(p=>p.id).join(',')==='home,workbench,learning';})()`),'AI can set chosen navigation subset');
 assert(await evaluate(`(async()=>{for(const [key,value] of [['retakeMode','first'],['hideGrades',true],['weekendLimit',5],['queueWeights',[10,10,10,10,20,20,20]]]){const c={proposals:[]};await FolioAgentRuntime.execute('draft_preferences',{key,value},c,'m','修改设置');await FolioAgentRuntime.confirm(c.proposals[0]);if(JSON.stringify(FolioPreferences.snapshot()[key])!==JSON.stringify(value))return false;}return true;})()`),'AI controls retake, grade privacy, quota and proportions through real APIs');
 assert(await evaluate(`(async()=>{const c={proposals:[]};await FolioAgentRuntime.execute('draft_preferences',{key:'colorMode',value:'light'},c,'m','修改颜色');FolioTheme.set('system');try{await FolioAgentRuntime.confirm(c.proposals[0]);return false;}catch{return c.proposals[0].status==='pending'&&FolioTheme.mode==='system';}})()`),'changed setting does not get overwritten by stale proposal');
 await evaluate(`const c={proposals:[]};FolioPreferences.draft({key:'horizontalPages',value:['home','workbench','learning']},c,'m');FolioPreferences.openProposal(c,c.proposals[0]);`);await pause(100);
 assert(await evaluate(`document.querySelector('.chat-panel').textContent.includes('横向浏览页面')`),'setting proposal has editable confirmation UI');
 await evaluate(`FolioChatUI.closePanel(true);showPreviewScreen('workbench');`);await pause(250);
 const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(new URL('./inbox-undo-390.png',import.meta.url),Buffer.from(shot.data,'base64'));
 assert(errors.length===0,`no runtime exceptions (${errors.join('; ')})`);
 console.log(JSON.stringify({passed:results.length,checks:results},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9223/json/close/'+target.id);}
