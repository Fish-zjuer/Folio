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
const seed=`window.__chat=FolioChatUI.state();window.__conversation=FolioChat.conversation(__chat);window.__draft=n=>({id:'qa-review-'+n,messageId:'qa-message',status:'pending',operation:'create_lesson',fields:{title:n?'分组实训 '+n:'电路实验 · 分组实训',kind:'lesson',timeMode:'range',startAt:'2026-12-11T13:30',endAt:'2026-12-11T16:00',body:'分组：第2组（据实训安排表）',important:false,urgent:false,placements:['calendar','timetable'],queued:false,completed:false},before:null,createdAt:new Date().toISOString()});__conversation.proposals=[__draft(0)];FolioChatUI.render();`;
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:4215/qa/relationships-app.html?v=confirmation14'});await pause(1500);
 await run(`showPreviewScreen('home',{focus:false});document.getElementById('qa-native-status')?.parentElement?.setAttribute('hidden','');${seed}`);
 await check('pending drafts remain reachable before opening',`!document.querySelector('.chat-pending').hidden`);
 await run(`FolioChatUI.openProposalDeck(FolioChat.pending(__chat))`);await pause(300);
 await check('only the card has a paper surface',`(()=>{const p=document.querySelector('.chat-deck'),s=getComputedStyle(p);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.boxShadow==='none'&&s.borderTopWidth==='0px'&&!p.querySelector(':scope > .chat-panel-header')})()`);
 await check('review title and close control live inside the card',`document.querySelector('.chat-deck-card .chat-deck-status').textContent==='待确认修改'&&!!document.querySelector('.chat-deck-card .chat-panel-close')`);
 await check('pending banner is hidden during review',`document.querySelector('.chat-pending').hidden&&getComputedStyle(document.querySelector('.notice-stack')).visibility==='hidden'`);
 await run(`FolioChatUI.render();announce('测试通知')`);await pause(60);
 await check('rerender and toast cannot overlap the confirmation card',`document.querySelector('.chat-pending').hidden&&[...document.querySelectorAll('.notice-stack > *')].every(n=>n.hidden||getComputedStyle(n).visibility==='hidden')`);
 await check('placement values are human readable',`document.querySelector('.chat-deck-details').textContent.includes('日程、课表')&&!document.querySelector('.chat-deck-details').textContent.includes('calendar')`);
 await check('card and actions stay inside viewport',`(()=>{const r=document.querySelector('.chat-deck-card').getBoundingClientRect(),a=document.querySelector('.chat-deck-actions').getBoundingClientRect();return r.left>=18&&r.right<=372&&r.top>=100&&r.bottom<=824&&a.bottom<=r.bottom&&a.left>=r.left})()`);
 await shot('confirmation-card-light.png');
 await run(`document.querySelector('.chat-deck-card .chat-panel-close').click()`);await pause(240);
 await check('minimizing preserves draft and restores its entry point',`document.querySelector('.chat-layer').hidden&&__conversation.proposals[0].status==='pending'&&!document.querySelector('.chat-pending').hidden`);
 await run(`FolioChatUI.openProposalDeck(FolioChat.pending(__chat));document.querySelector('.chat-deck-actions .chat-secondary:not(.danger)').click()`);await pause(100);
 await check('editing continues to suppress duplicate notices',`!!document.querySelector('.chat-proposal-form')&&document.querySelector('.chat-pending').hidden&&document.querySelector('.phone').classList.contains('is-reviewing-proposal')`);
 await run(`FolioChatUI.closePanel(true,false);__conversation.proposals=[__draft(0),__draft(1),__draft(2)];FolioChatUI.render();FolioChatUI.openProposalDeck(FolioChat.pending(__chat))`);await pause(280);
 await check('multiple cards each own their status and close button',`document.querySelectorAll('.chat-deck-card').length===3&&document.querySelectorAll('.chat-deck-card .chat-deck-status').length===3&&document.querySelectorAll('.chat-deck-card .chat-panel-close').length===3`);
 await run(`document.querySelector('.chat-deck-track').scrollLeft=400`);await pause(350);
 await check('deck still scrolls to the next card',`document.querySelector('.chat-deck-track').scrollLeft>250`);
 await run(`document.querySelector('.chat-deck-track').scrollLeft=0;FolioTheme.set('dark')`);await pause(200);await shot('confirmation-card-dark.png');
 await check('dark mode keeps the outer panel transparent',`getComputedStyle(document.querySelector('.chat-deck')).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(document.querySelector('.chat-deck-card')).backgroundColor==='rgb(47, 48, 42)'`);
 await run(`document.querySelector('.chat-deck-actions .danger').click()`);await pause(400);
 await check('discard removes one card and keeps other drafts without banner',`__conversation.proposals[0].status==='discarded'&&document.querySelectorAll('.chat-deck-card').length===2&&document.querySelector('.chat-pending').hidden`);
 await run(`document.querySelector('.chat-deck-actions .chat-primary').click()`);await pause(500);
 await check('confirm saves the real local lesson and keeps remaining review clean',`__conversation.proposals[1].status==='confirmed'&&homeworkState.items.some(n=>n.id==='chat-qa-review-1'&&n.kind==='lesson')&&document.querySelectorAll('.chat-deck-card').length===1&&getComputedStyle(document.querySelector('.notice-stack')).visibility==='hidden'`);
 await run(`document.querySelector('.chat-deck-actions .danger').click()`);await pause(450);
 await check('resolving last draft closes review without a stale pending entry',`document.querySelector('.chat-layer').hidden&&document.querySelector('.chat-pending').hidden&&!document.querySelector('.phone').classList.contains('is-reviewing-proposal')`);
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
 await run(`${seed}FolioChatUI.openProposalDeck(FolioChat.pending(__chat));`);await pause(300);
 await check('small phone keeps footer accessible and details independently scrollable',`(()=>{const r=document.querySelector('.chat-deck-card').getBoundingClientRect(),a=document.querySelector('.chat-deck-actions').getBoundingClientRect(),d=document.querySelector('.chat-deck-details');return r.left>=16&&r.right<=304&&a.bottom<=r.bottom&&a.bottom<568&&d.scrollHeight>d.clientHeight})()`);
 await shot('confirmation-card-small-dark.png');
 await run(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await pause(250);
 await check('Escape minimizes and restores access to the unresolved draft',`document.querySelector('.chat-layer').hidden&&!document.querySelector('.chat-pending').hidden`);
 await check('no browser runtime errors',`true`);checks.at(-1).pass=errors.length===0;if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify({checks,errors},null,2));
}finally{fs.writeFileSync(new URL('confirmation-card-report.json',import.meta.url),JSON.stringify({checks,errors},null,2));c.ws.close();await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close()}
