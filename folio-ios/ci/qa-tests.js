/* Uses original app APIs and DOM; does not draw replacement screens. All data is fake. */
(()=>{
  'use strict';
  const checks=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(fn,label){for(let i=0;i<160;i++){if(fn())return;await sleep(50);}throw Error(label);}
  function check(name,pass){checks.push({name,pass:!!pass});if(!pass)throw Error(name);}
  // Exercise the actual WK message -> Swift services -> JS reply path as well
  // as fixtures. The host gives QA its own Keychain namespace, records and cookies.
  const nativeReplies=new Map(),receiveNative=(id,result)=>{
    const callback=nativeReplies.get(id);if(callback){nativeReplies.delete(id);callback(result);return;}
    originalReceive(id,result);
  },originalReceive=FolioNative.receive;
  FolioNative.receive=receiveNative;
  function realNative(operation,data={}){return new Promise((resolve,reject)=>{
    const id=crypto.randomUUID(),timer=setTimeout(()=>{nativeReplies.delete(id);reject(Error('native bridge timeout'));},10000);
    nativeReplies.set(id,result=>{clearTimeout(timer);result.ok?resolve(result.data):reject(Error(result.error));});
    window.webkit.messageHandlers.folio.postMessage({id,operation,payload:JSON.stringify(data)});
  });}
  async function stable(){await document.fonts.ready;await sleep(250);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
  window.FolioIOSQA={
    async prepare(){
      await until(()=>window.FolioPageRail&&window.FolioRelationships&&window.FolioStudyWidgets,'app initialization timeout');
      document.getElementById('qa-native-status')?.parentElement?.setAttribute('hidden','');
      check('fixture requires explicit simulator launch',window.__folioIOSQAInjected===true);
      check('same production web entry loaded',location.pathname==='/index.html');
      check('loopback enables secure web APIs',isSecureContext&&typeof crypto.randomUUID==='function');
      check('IndexedDB available',typeof indexedDB.open==='function');
      check('existing native layout used',document.documentElement.classList.contains('native-app'));
      const config=await realNative('config.get'),account=await realNative('school.account.get');
      check('real bridge reads isolated keychain metadata',!config.hasKey&&!('apiKey' in config)&&!account.hasPassword&&!('password' in account));
      const empty=await realNative('records.get',{name:'focus'});
      check('real bridge starts with isolated empty records',empty.revision===0);
      const saved=await realNative('records.save',{name:'focus',expectedRevision:0,data:{version:1,sessions:[],fixture:'bridge'}});
      const restored=await realNative('records.get',{name:'focus'});
      check('real bridge persists encrypted versioned records',saved.revision===1&&restored.revision===1&&restored.data.fixture==='bridge');
      let conflict=false;try{await realNative('records.save',{name:'focus',expectedRevision:0,data:{version:1}});}catch(e){conflict=e.message.includes('版本冲突');}
      check('real bridge propagates write conflicts',conflict);
      await FolioSchool.refresh('courses');await FolioAcademicUI.refresh('grades');await FolioSchool.refresh('exams');
      await FolioRelationships.ready;
      homeworkState.items=[{id:'ios-qa-future',title:'实验报告 · 模拟电路',course:'夹具数学',source:'personal',kind:'homework',queued:true,completed:false,deadline:'2026-11-20',manualDate:true,mountDate:'2026-11-18',mountedOn:null},{id:'ios-qa-mounted',title:'复习实验原理',course:'夹具数学',source:'personal',kind:'homework',queued:true,manualDate:true,mountDate:homeworkState.today,mountedOn:homeworkState.today}];commit();
      check('original art components occupy four slots',FolioWorkbench.getLayout().length===4&&document.querySelectorAll('.workbench-slot svg').length>=4);
      check('school fixture populates courses',FolioCourses.semesters.some(t=>t.courses.length>0));
      check('original menu and all validation pages exist',['home','workbench','calendar','timetable','courses','exams','grades','relationships','settings'].every(p=>previewScreens[p]));
      await stable();return true;
    },
    async page(name,theme){
      FolioChatUI.closePanel();FolioTheme.set(theme);showPreviewScreen(name,{focus:false});
      if(name==='relationships')await until(()=>FolioRelationshipUI.frame.contentWindow?.FolioRelationshipView,'relationship iframe initialization');
      await stable();
      const view=previewScreens[name],r=view.getBoundingClientRect(),p=document.querySelector('.phone').getBoundingClientRect();
      check(`${theme}/${name} visible at full width`,!view.hidden&&Math.abs(r.left-p.left)<2&&Math.abs(r.width-p.width)<2);
      check(`${theme}/${name} palette applied`,document.documentElement.dataset.theme===theme);
      check(`${theme}/${name} no horizontal document overflow`,document.documentElement.scrollWidth<=innerWidth+1);
      if(name==='workbench'){
        const grid=view.querySelector('.workbench-grid').getBoundingClientRect(),board=view.querySelector('.workbench-board').getBoundingClientRect();
        check(`${theme} workbench art fills the available width`,Math.abs(grid.left-board.left)<2&&Math.abs(grid.right-board.right)<2&&Math.abs(grid.width-grid.height)<2);
      }
      if(name==='relationships')check(`${theme} relationship frame uses same origin`,FolioRelationshipUI.frame.contentDocument.documentElement.dataset.theme===theme);
      return true;
    },
    async interactions(){
      await this.page('workbench','light');FolioWorkbench.openInbox();await stable();
      const paper=document.querySelector('.workbench-incoming-note[data-item-id="ios-qa-future"]');
      check('incoming paper can be read',!!paper);paper.click();await stable();
      document.querySelector('.workbench-reading-grip').click();await stable();
      check('explicit desk pin persists at full automatic quota',homeworkState.items.find(i=>i.id==='ios-qa-future').mountedOn===homeworkState.today&&!!document.querySelector('.workbench-note[data-item-id="ios-qa-future"]'));
      document.querySelector('.workbench-plant-hit').click();document.querySelector('.workbench-plant-hit').click();await stable();
      check('desk undo restores incoming paper',!homeworkState.items.find(i=>i.id==='ios-qa-future').mountedOn);
      showPreviewScreen('home',{focus:false});
      const conversation=FolioChat.conversation(FolioChatUI.state());
      await FolioAgentRuntime.execute('draft_change',{operation:'create_homework',fields:{title:'iOS验证 · 习题整理',deadline:'2026-11-20'}},conversation,'ios-qa-draft','添加测试作业');
      const proposal=conversation.proposals.at(-1);FolioChatUI.openProposal(conversation,proposal);await stable();
      check('original AI confirmation is visible',document.querySelector('.chat-proposal-form')?.getClientRects().length>0);
      check('draft remains uncommitted',!homeworkState.items.some(i=>i.id==='chat-'+proposal.id));
      check('new homework keeps default queue choice',proposal.fields.queued===true);
      check('no runtime errors',__folioIOSDiagnostics.errors.length===0&&FolioQA.errors.length===0);
      check('no CSP violations',__folioIOSDiagnostics.csp.length===0);
      check('simulator fixtures make no external network requests',__folioQANetworkAttempts.length===0);
      return true;
    },
    result(){return {checks,errors:__folioIOSDiagnostics.errors,fixtureErrors:FolioQA.errors,csp:__folioIOSDiagnostics.csp,resources:performance.getEntriesByType('resource').map(r=>r.name)};},
    enableNavigationStatus(){document.addEventListener('preview-screen-change',()=>window.webkit.messageHandlers.qa.postMessage({status:'passed|'+currentScreen}));}
  };
})();
