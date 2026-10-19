/* Only use on the isolated 4190 QA origin. Native bridge records are synthetic. */
document.addEventListener('DOMContentLoaded',()=>{
 const panel=document.createElement('aside'),button=document.createElement('button'),out=document.createElement('pre');panel.style='position:fixed;top:5px;left:5px;z-index:10000;background:#f5efdf;color:#887453;max-width:290px;max-height:80vh;overflow:auto;font:11px/1.6 monospace;padding:8px';button.textContent='运行0.6反馈检查';panel.append(button,out);document.body.append(panel);
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),errors=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 button.onclick=async()=>{button.disabled=true;out.textContent='';const check=(label,ok)=>{out.textContent+=(ok?'PASS ':'FAIL ')+label+'\n';if(!ok)throw Error(label);};
 try{
  await FolioSchool.sync();showPreviewScreen('workbench',{focus:false});await wait(350);const grid=document.querySelector('.workbench-grid');
  check('十一张设计卡片全部保留',FolioWorkbench.listComponents().filter(c=>c.id.startsWith('sample-')).length===11);
  check('卡片内部没有省略号按钮',!grid.querySelector('.workbench-change'));
  const names=FolioWorkbench.listComponents().filter(c=>c.id.startsWith('sample-'));
  for(const card of names){FolioWorkbench.openPicker(0);const preview=[...document.querySelectorAll('.workbench-choice-item')].find(n=>n.querySelector('h3')?.textContent===card.label)?.querySelector('.workbench-choice-preview');check(card.label+'缩略图不抢触摸',!!preview&&getComputedStyle(preview).pointerEvents==='none');document.querySelector(`.workbench-choice-add[aria-label="添加${card.label}到左上"]`).click();await wait(70);check(card.label+'可挂载且无iframe',!!grid.children[0].firstElementChild&&!grid.children[0].querySelector('iframe')&&!/暂时无法/.test(grid.children[0].textContent));}
  FolioWorkbench.edit(0);check('编辑工具放在卡片外',!!document.querySelector('.workbench-edit-tools')&&!grid.querySelector('.workbench-edit-tools'));
  const id='qa06-event',eventTitle='夜间实验安排 '+crypto.randomUUID().slice(0,6);const c={proposals:[]};await FolioAgentRuntime.execute('draft_change',{operation:'create_todo',fields:{title:eventTitle,kind:'event',timeMode:'range',startAt:'2026-10-20T22:00',endAt:'2026-10-20T23:30'}},c,id,'添加夜间实验安排');check('AI生成事项草稿但尚未写入',c.proposals[0]?.fields.kind==='event'&&!homeworkState.items.some(i=>i.title===eventTitle));FolioAgentRuntime.confirm(c.proposals[0]);const item=homeworkState.items.find(i=>i.title===eventTitle);check('确认后仍为事项且时间可超过21:15',item?.kind==='event'&&item.endAt==='2026-10-20T23:30');check('事项可单独检索且不算作业',FolioAgentRuntime.records('events').some(i=>i.id===item.id)&&!FolioAgentRuntime.records('homework').some(i=>i.id===item.id));
  const projected=FolioCalendar.dayEntries(FolioQueue.calendarEntries(homeworkState.items),'2026-10-20').find(i=>i.itemId===item.id||i.id===item.id);check('晚间事项投影保留至23:30',projected?.endMinute===1410);
  await runSchedule06Checks(check);
  function touch(target,type,x,y){const point=new Touch({identifier:61,target,clientX:x,clientY:y,pageX:x,pageY:y});target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[point],targetTouches:type==='touchend'?[]:[point],changedTouches:[point]}));}
  function swipe(target,dx){const r=target.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;touch(target,'touchstart',x,y);touch(target,'touchmove',x+dx,y);return()=>touch(target,'touchend',x+dx,y);}
  showPreviewScreen('home',{focus:false});await wait(360);const phone=document.querySelector('.phone'),home=previewScreens.home,interactive=home.querySelector('.chat-add');
  let finish=swipe(interactive||home.querySelector('button'),-phone.clientWidth*.4);check('首页可交互按钮起点仍跟随横滑',home.getBoundingClientRect().left<phone.getBoundingClientRect().left-30);finish();await wait(380);check('按钮起滑可到工作台',currentScreen==='workbench');
  showPreviewScreen('menu',{focus:false});await wait(80);const nav=previewScreens.menu.querySelector('.menu-entry')||previewScreens.menu.querySelector('button');finish=swipe(nav,phone.clientWidth*.4);check('菜单从导航按钮起滑也跟手',new DOMMatrixReadOnly(getComputedStyle(previewScreens.menu).transform).m41>30);finish();await wait(370);check('菜单右滑返回首页',currentScreen==='home');
  check('没有运行异常',errors.length===0);out.textContent+='DONE\n';
 }catch(e){out.textContent+='ERROR '+e.stack+'\n'+errors.join('\n');}finally{button.disabled=false;}
 };
});
