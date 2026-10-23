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
 await send('Page.navigate',{url:'http://127.0.0.1:4215/qa/relationships-app.html?v=homework-default101r2'});await pause(1500);
 await run(`showPreviewScreen('tasks',{focus:false});window.__queue=()=>[...document.querySelectorAll('.item-display-options label')].find(n=>n.getClientRects().length&&n.textContent.trim()==='加入工作台队列')?.querySelector('input');window.__kind=()=>[...document.querySelectorAll('.todo-editor .queue-field')].find(n=>n.querySelector('span')?.textContent==='类型').querySelector('select');openTodoEditor(null,document.getElementById('add-todo'),{kind:'homework'});`);
 await check('manual new homework defaults to queued',`__queue().checked`);
 await run(`document.querySelector('.todo-editor input[type=text]').value='QA默认入队作业';document.querySelector('.todo-editor').requestSubmit()`);await pause(280);
 await check('manual default is persisted on the actual homework record',`homeworkState.items.some(i=>i.title==='QA默认入队作业'&&i.kind==='homework'&&i.queued===true)`);
 await run(`openTodoEditor(null,document.getElementById('add-todo'));`);
 await check('ordinary todo default is unchanged',`!__queue().checked`);
 await run(`__kind().value='homework';__kind().dispatchEvent(new Event('change',{bubbles:true}));`);
 await check('choosing custom homework applies its queue default',`__queue().checked`);
 await run(`__kind().value='event';__kind().dispatchEvent(new Event('change',{bubbles:true}));`);
 await check('changing a fresh record to an event resets the untouched default',`!__queue().checked`);
 await run(`__kind().value='homework';__kind().dispatchEvent(new Event('change',{bubbles:true}));__queue().click();__kind().value='todo';__kind().dispatchEvent(new Event('change',{bubbles:true}));__kind().value='homework';__kind().dispatchEvent(new Event('change',{bubbles:true}));`);
 await check('manual opt-out survives further type changes',`!__queue().checked`);
 await run(`document.querySelector('.todo-editor input[type=text]').value='QA仅列表作业';document.querySelector('.todo-editor').requestSubmit()`);await pause(250);
 await check('manual opt-out is persisted',`homeworkState.items.some(i=>i.title==='QA仅列表作业'&&i.queued===false)`);
 await run(`openTodoEditor(homeworkState.items.find(i=>i.title==='QA仅列表作业'),document.getElementById('add-todo'));`);
 await check('editing an existing unqueued homework never re-enqueues it',`!__queue().checked`);
 await run(`closeHomeworkSheet();showPreviewScreen('home',{focus:false});window.__conversation=FolioChat.conversation(FolioChatUI.state());`);await pause(250);
 await run(`(async()=>{await FolioAgentRuntime.execute('draft_change',{operation:'create_homework',fields:{title:'QA AI默认入队',deadline:'2026-11-02'}},__conversation,'qa-queue','添加作业');window.__p=__conversation.proposals.at(-1);FolioChatUI.openProposal(__conversation,__p)})()`);
 await check('AI omitted queue becomes an explicit checked pending draft',`__p.fields.queued===true&&__queue().checked&&!homeworkState.items.some(i=>i.id==='chat-'+__p.id)`);
 await run(`document.querySelector('.chat-proposal-form').requestSubmit()`);await pause(350);
 await check('AI confirmation saves queued homework without forcing a mount',`__p.status==='confirmed'&&homeworkState.items.some(i=>i.id==='chat-'+__p.id&&i.queued&&!i.mountedOn)`);
 await run(`showPreviewScreen('workbench',{focus:false});document.querySelector('.workbench-inbox-hit').click()`);await pause(200);
 await check('new AI homework is reachable in the existing incoming note bag',`!!document.querySelector('.workbench-incoming-note[data-item-id="chat-'+__p.id+'"]')`);
 await run(`document.querySelector('.workbench-inbox-hit').click();showPreviewScreen('home',{focus:false})`);await pause(250);
 await run(`(async()=>{await FolioAgentRuntime.execute('draft_change',{operation:'create_homework',fields:{title:'QA AI明确不入队',queued:false}},__conversation,'qa-no-queue','只放作业列表');__p=__conversation.proposals.at(-1);FolioChatUI.openProposal(__conversation,__p)})()`);
 await check('AI explicit opt-out stays unchecked',`__p.fields.queued===false&&!__queue().checked`);
 await run(`document.querySelector('.chat-proposal-form').requestSubmit()`);await pause(350);
 await check('AI explicit opt-out is saved unchanged',`__p.status==='confirmed'&&homeworkState.items.some(i=>i.id==='chat-'+__p.id&&!i.queued)`);
 await check('no browser runtime errors',`true`);checks.at(-1).pass=errors.length===0;if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify({checks,errors},null,2));
}finally{fs.writeFileSync(new URL('homework-default-report.json',import.meta.url),JSON.stringify({checks,errors},null,2));c.ws.close();await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
