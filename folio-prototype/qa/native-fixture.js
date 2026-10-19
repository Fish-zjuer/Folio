/* 独立端口的功能夹具。全是虚构数据，不向外联网，不随 APK 打包。 */
(()=>{
  let config={baseUrl:'https://fixture.invalid/v1',models:['fixture-model'],model:'fixture-model',hasKey:true,reasoning:'auto'},turn=0;
  const failures=[],chromeCalls=[],notifications=[];let account=JSON.parse(localStorage.getItem('qa-account')||'{}');window.addEventListener('error',e=>failures.push(e.message));window.addEventListener('unhandledrejection',e=>failures.push(String(e.reason)));
  const data={grades:{items:[{xkkh:'2026-2027-1-fixture1',kcmc:'夹具数学',xf:'5.5',cj:'95',jd:'5'},{xkkh:'2025-2026-2-fixture2',kcmc:'夹具实验',xf:'1.5',cj:'优秀',jd:'4.5'}]},major:{items:[{xkkh:'2026-2027-1-fixture1'}]},courses:{kbList:[{kcb:'夹具数学<br>001<br>夹具教师<br>东1-302zwf',djj:1,skcd:2,xqj:1,dsz:'0',xxq:'秋',xf:'5.5'},{kcb:'夹具待分配课程<br>002<br>夹具教师<br>东1-303zwf',djj:3,skcd:2,xqj:2,dsz:'0',xxq:'秋冬',xf:'3'}]},homework:{todo_list:[{id:'fixture1',is_student:true,course_name:'夹具数学',title:'夹具习题',end_time:'2026-10-22T20:00:00+08:00'}]},exams:{items:[{xkkh:'2026-2027-1-fixture1',kcmc:'夹具数学',kssj:'2026-11-20(09:00-11:00)',jsmc:'东1-302',zwxh:'12'},{xkkh:'2026-2027-1-fixture3',kcmc:'夹具物理',kssj:'2026-11-20(14:00-16:00)'},{xkkh:'2025-2026-2-fixture2',kcmc:'夹具实验',kssj:'2026-06-20(09:00-10:00)'}]},practice:{success:true,code:0,data:[]},practiceSummary:{code:0,extend:{myInfo:{dektJf:1,dsktJf:2,dsiktJf:0,myTg:true,lyTg:false}}},calendar:{startEnd:['20260914','20261108','20261109','20270110'],sessionTime:[]}};
  window.FolioQA={calls:[],errors:failures,failOnce:null};
  window.FolioAndroid={call(id,op,payload){setTimeout(()=>{try{const input=JSON.parse(payload);window.FolioQA.calls.push({op,module:input.module,site:input.site});if(op==='school'&&window.FolioQA.failOnce===input.module){window.FolioQA.failOnce=null;throw Error('登录状态失效（虚构测试）');}let result={};
    if(op==='config.get')result=config;
    else if(op==='school.account.get')result=account;
    else if(op==='school.account.save'){account={username:input.username,hasPassword:true,accountId:'fixture-account',authenticated:true};localStorage.setItem('qa-account',JSON.stringify(account));result=account;}
    else if(op==='school.account.forget'){account={};localStorage.removeItem('qa-account');}
    else if(op==='school.authenticate')result={authenticated:true};
    else if(op==='app.chrome')chromeCalls.push(input);
    else if(op==='app.notify'){notifications.push(input);result={foreground:!document.hidden};}
    else if(op==='config.save'){config={...input,hasKey:true};delete config.apiKey;result=config;}
    else if(op==='school')result={status:200,body:JSON.stringify(data[input.module])};
    else if(op==='provider'){
      if(input.path==='models')result={status:200,body:JSON.stringify({data:[{id:'fixture-model'},{id:'fixture-vision'}]})};
      else{const message=turn++%2===0?{tool_calls:[{id:'draft1',type:'function',function:{name:'draft_change',arguments:JSON.stringify({operation:'create_todo',fields:{title:'夹具确认事项',body:'确认前不写入',timeMode:'deadline',deadline:'2026-10-23',clock:'18:00',queued:false}})}}]}:{content:'**已准备草稿**，请检查并确认。\n\n- 科目与任务已整理\n- 等你确认\n\n`本地草稿`'};result={status:200,body:JSON.stringify({choices:[{message}],usage:{prompt_tokens:100,prompt_tokens_details:{cached_tokens:40},completion_tokens:10}})};}
    }else if(op==='school.login'){document.getElementById('qa-native-status').textContent='官方登录窗口调用：'+input.site;}
    else if(op==='app.background')document.getElementById('qa-native-status').textContent='已调用后台';
    window.FolioNative.receive(id,{ok:true,data:result});
  }catch(e){window.FolioNative.receive(id,{ok:false,error:e.message});}},80);}};
  document.addEventListener('DOMContentLoaded',()=>{
    const tray=document.createElement('aside');tray.style='position:fixed;left:4px;bottom:4px;z-index:100;font:12px sans-serif;background:white;max-width:150px;overflow-wrap:anywhere;pointer-events:none';
    const status=document.createElement('output');status.id='qa-native-status';status.textContent='虚构桥接功能夹具';
    const report=document.createElement('button');report.style.pointerEvents='auto';report.textContent='夹具报告';report.onclick=()=>{status.textContent=JSON.stringify({errors:failures,chrome:chromeCalls.at(-1),notifications:notifications.length,homework:homeworkState.items.length,pending:FolioChat.pending(FolioChatUI.state()).length,confirmed:FolioChatUI.state().conversations.flatMap(c=>c.proposals).filter(p=>p.status==='confirmed').length});};
    const back=document.createElement('button');back.style.pointerEvents='auto';back.textContent='模拟系统返回';back.onclick=()=>FolioNative.back();tray.append(status,report,back);document.body.append(tray);
  });
})();
