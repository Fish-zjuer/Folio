import fs from 'node:fs';
const origin='http://127.0.0.1:4210',base=origin+'/qa/next-learning-mobile.html';
const target=await(await fetch('http://127.0.0.1:9223/json/new?'+encodeURIComponent('about:blank'),{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let next=0;const waits=new Map(),errors=[];
ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(m.params.exceptionDetails));if(m.id&&waits.has(m.id)){const [r,j]=waits.get(m.id);waits.delete(m.id);m.error?j(Error(JSON.stringify(m.error))):r(m.result);}};
const send=(method,params={})=>new Promise((r,j)=>{const id=++next;waits.set(id,[r,j]);ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result?.value;}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];function assert(value,label){if(!value)throw Error(label);results.push(label);}

try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:base});await pause(1700);await evaluate('localStorage.clear()');await send('Page.reload');await pause(1700);await evaluate('FolioLearning.ready');
 await evaluate(`homeworkState.items=[{id:'school-homework-fixture',title:'模拟实验报告',course:'模拟课程',kind:'homework',source:'school',queued:true,completed:false,timeMode:'deadline',deadline:'2027-01-02',deadlineClock:'22:20',mountDate:'2026-10-21',mountedOn:'2026-10-21',repeat:{kind:'none',interval:1,weekdays:[],until:null}}];commit();window.qaConversation={proposals:[]};`);
 await evaluate(`(async()=>{await FolioAgentRuntime.execute('read_record',{module:'homework',id:'school-homework-fixture'},qaConversation,'m','卸下这条便签');await FolioAgentRuntime.execute('draft_change',{operation:'update_todo',targetId:'school-homework-fixture',fields:{pinAction:'return_to_inbox'}},qaConversation,'m','卸下这条便签');FolioChatUI.openProposal(qaConversation,qaConversation.proposals[0]);})()`);await pause(200);
 assert(await evaluate(`homeworkState.items[0].mountedOn==='2026-10-21'`),'school unmount remains pending before user confirmation');
 assert(await evaluate(`document.querySelector('.chat-panel').textContent.includes('卸下并收回待贴便签袋')`),'human-readable unmount control appears in confirmation');
 assert(await evaluate(`![...document.querySelectorAll('.chat-proposal-form label')].some(n=>/^(标题|截止日期)/.test(n.textContent))`),'school title and deadline are read-only in the editor');
 await evaluate(`document.querySelector('.chat-proposal-form').requestSubmit()`);await pause(300);
 assert(await evaluate(`homeworkState.items.length===1&&homeworkState.items[0].mountedOn===null&&homeworkState.items[0].queued===true&&qaConversation.proposals[0].status==='confirmed'`),'actual confirmation removes only mount and retains original school record');
 await send('Page.reload');await pause(1700);
 assert(await evaluate(`(()=>{FolioQueue.plan(homeworkState.items,homeworkState.weights);FolioQueue.advance(homeworkState.items,homeworkState.today);const r=homeworkState.items[0];return r.mountedOn===null&&r.mountDate===null&&r.deadline==='2027-01-02'&&r.deadlineClock==='22:20';})()`),'saved unmount survives reload, queue replan and timer');
 await evaluate(`FolioQueue.move(homeworkState.items[0],homeworkState.today,homeworkState.today);commit();openItem(homeworkState.items[0]);`);await pause(120);
 assert(await evaluate(`!![...document.querySelectorAll('.homework-sheet button')].find(b=>b.textContent==='卸下并收回待贴袋')||document.body.textContent.includes('卸下并收回待贴袋')`),'school detail offers direct unmount without AI');
 await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='卸下并收回待贴袋').click()`);await pause(150);
 assert(await evaluate(`homeworkState.items[0].mountedOn===null&&homeworkState.items[0].queued===true`),'direct detail unmount works');
 assert(errors.length===0,`no runtime exceptions: ${errors.join(';')}`);
 console.log(JSON.stringify({passed:results.length,checks:results},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9223/json/close/'+target.id);}
