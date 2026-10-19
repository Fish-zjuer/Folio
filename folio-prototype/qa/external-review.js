/* Synthetic data only. Run on isolated QA port, never on the user's app origin. */
document.addEventListener('DOMContentLoaded',()=>{
 if(!['4192','4194'].includes(location.port))return;
 const panel=document.createElement('aside'),run=document.createElement('button'),out=document.createElement('pre');
 panel.style='position:fixed;right:4px;top:4px;z-index:10000;max-width:240px;max-height:40vh;overflow:auto;padding:6px;background:#f4eedf;color:#75664e;font:10px/1.5 monospace';
 run.textContent='运行接收审查';panel.append(run,out);document.body.append(panel);
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 run.onclick=async()=>{
  run.disabled=true;out.textContent='';out.dataset.viewport=innerWidth+'x'+innerHeight;
  const check=(name,ok)=>{out.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';if(!ok)throw Error(name);};
  try{
   await FolioSchool.sync();
   homeworkState.items=homeworkState.items.filter(i=>i.id!=='audit-late'&&!i.title.startsWith('审查事项'));commit();
   showPreviewScreen('home',{focus:false});showPreviewScreen('menu',{focus:false});showPreviewScreen('scholar',{focus:false});showPreviewScreen('courses',{focus:false});
   goBack();check('返回课程→学业',currentScreen==='scholar');goBack();check('再返回学业→菜单',currentScreen==='menu');goBack();check('菜单→首页',currentScreen==='home');
   showPreviewScreen('scholar',{focus:false});showPreviewScreen('courses',{focus:false});showPreviewScreen('course-detail',{focus:false});showPreviewScreen('courses',{focus:false});goBack();check('重复进入父页不产生返回循环',currentScreen==='scholar');
   showPreviewScreen('menu',{focus:false});
   const entries=[...document.querySelectorAll('#primary-menu .menu-entry')];check('菜单首页位于对话历史上方',entries[0]?.textContent==='首页'&&entries[1]?.textContent==='对话历史');
   entries[0].click();check('点击首页返回主界面',currentScreen==='home');
   const date=homeworkState.today;
   homeworkState.items.push({id:'audit-late',title:'虚构夜间事项',source:'personal',kind:'event',timeMode:'range',startAt:date+'T23:30',endAt:FolioTodo.addDays(date,1)+'T00:30',completed:false,queued:false,repeat:{kind:'none',interval:1,weekdays:[],until:null}});
   commit();
   check('已移除周历入口',!document.querySelector('[data-screen=weekcalendar]')&&!document.getElementById('function-menu').textContent.includes('周历'));
   check('已移除周历页面',!document.getElementById('weekcalendar-screen'));
   check('已移除周历运行模块',typeof window.FolioWeekCalendar==='undefined');
   showPreviewScreen('calendar',{focus:false});showCalendarView('week');await wait(60);
   check('学校课表固定13节',timetableScale.periods.length===13&&timetableScale.periods.at(-1).clock==='20:30');
   check('个人夜间事项没有挤入教务课表',!document.getElementById('timetable-grid').textContent.includes('虚构夜间事项'));
   showPreviewScreen('home',{focus:false});
   const conversation=FolioChat.conversation(FolioChatUI.state());conversation.proposals=[];
   for(let i=0;i<3;i++)await FolioAgentRuntime.execute('draft_change',{operation:'create_todo',fields:{title:'审查事项'+i,kind:'event',timeMode:'none',location:'虚构教室'+i}},conversation,'audit-message','创建几个事项');
   FolioChatUI.openProposalDeck(FolioChat.pending(FolioChatUI.state()));await wait(50);
   check('三项提案同时可横向查看',document.querySelectorAll('.chat-deck-card').length===3);
   check('地点和事项类型可供确认',document.querySelector('.chat-deck-card').textContent.includes('虚构教室0')&&document.querySelector('.chat-deck-card').textContent.includes('事项'));
   document.querySelector('.chat-deck-card .chat-deck-actions button:nth-child(2)').click();await wait(260);
   const editor=document.querySelector('.chat-layer');check('从卡片进入编辑没有被旧弹层锁住',!editor.inert&&!editor.hidden&&!!editor.querySelector('form'));
   editor.querySelector('.chat-panel-close').click();await wait(220);
   check('关闭编辑后首页恢复交互',!document.getElementById('home-screen').inert);
   FolioChatUI.openProposalDeck(FolioChat.pending(FolioChatUI.state()));document.querySelector('.chat-deck-card .chat-primary').click();await wait(240);
   check('确认仅保存被选中的一项',homeworkState.items.filter(i=>i.title.startsWith('审查事项')).length===1&&document.querySelectorAll('.chat-deck-card').length===2);
   FolioNative.back();await wait(220);check('系统返回可关闭确认卡片',document.querySelector('.chat-layer').hidden);
   showPreviewScreen('workbench',{focus:false});await wait(100);
   check('纸篓只在编辑时显示',document.querySelector('.workbench-trash').hidden);
   FolioWorkbench.openPicker(0);await wait(70);
   const buttons=[...document.querySelectorAll('.workbench-choice-add')],first=buttons.slice(0,2).map(b=>b.getBoundingClientRect().top);
   check('组件添加按钮同一行底对齐',first.length===2&&Math.abs(first[0]-first[1])<2);
   document.querySelector('.workbench-picker-close').click();await wait(220);
   FolioWorkbench.openPicker(0);await wait(40);
   [...document.querySelectorAll('.workbench-choice-item')].find(n=>n.querySelector('h3')?.textContent==='每日压力').querySelector('.workbench-choice-add').click();await wait(220);
   const chosen=document.querySelector('.workbench-slot.has-widget');chosen.dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}));await wait(40);
   check('选中套边和纸篓同时出现',chosen.classList.contains('is-widget-selected')&&!document.querySelector('.workbench-trash').hidden);
   check('套边不缩小原组件图形',getComputedStyle(chosen.querySelector('.workbench-slot-content')).transform==='none');
   const widgetId=JSON.parse(localStorage.getItem('folio-workbench-v1')).slots[0];
   document.querySelector('.workbench-trash').click();await wait(50);
   check('纸篓点击移除且退出编辑态',!document.querySelector('.workbench-slot').classList.contains('has-widget')&&document.querySelector('.workbench-trash').hidden);
   document.querySelector('.notice-stack .workbench-undo').click();await wait(50);
   check('撤销恢复原组件',JSON.parse(localStorage.getItem('folio-workbench-v1')).slots[0]===widgetId);
   announce('第一条检查');announce('第二条检查');await wait(30);
   check('新通知先显示，旧通知下移',document.querySelector('.notice-stack').firstElementChild.textContent==='第二条检查');
   showPreviewScreen('home',{focus:false});await wait(30);
   const pending=document.querySelector('.notice-stack .chat-pending'),toast=document.querySelector('.notice-stack .demo-toast');
   check('待确认和通知共享容器及尺寸',pending?.parentElement===toast.parentElement&&Math.abs(pending.getBoundingClientRect().width-toast.getBoundingClientRect().width)<1&&Math.abs(pending.getBoundingClientRect().height-toast.getBoundingClientRect().height)<1);
   out.textContent+='DONE\n';
  }catch(error){out.textContent+='ERROR '+error.stack;}
  finally{run.disabled=false;}
 };
});
