/* iOS adapter only. Android's existing protocol name remains a compatibility alias. */
(()=>{
  'use strict';
  const diagnostics={errors:[],csp:[]};
  window.__folioIOSDiagnostics=diagnostics;
  addEventListener('error',e=>{if(diagnostics.errors.length<30)diagnostics.errors.push(String(e.message));});
  addEventListener('unhandledrejection',e=>{if(diagnostics.errors.length<30)diagnostics.errors.push(String(e.reason));});
  addEventListener('securitypolicyviolation',e=>diagnostics.csp.push({directive:e.violatedDirective,blocked:e.blockedURI}));
  const handler=window.webkit.messageHandlers.folio;
  window.FolioAndroid={
    call(id,operation,payload){handler.postMessage({id,operation,payload});},
    systemDark(){return matchMedia('(prefers-color-scheme: dark)').matches;}
  };
  document.addEventListener('DOMContentLoaded',()=>{
    document.documentElement.dataset.platform='ios';
    // WebKit resolves the max-height/aspect-ratio flex item to a narrower width.
    // Keep the original art square and full width; short phones scroll the desk.
    const style=document.createElement('style');style.dataset.folioIOSLayout='';
    style.textContent='.native-app[data-platform="ios"] .workbench-grid{width:calc(100% - 32px);max-height:none;flex:0 0 auto;align-self:center}';
    document.head.append(style);
    // Keep the web UI; only the platform-specific reminder explanation differs.
    new MutationObserver(()=>{
      const panel=document.querySelector('.reminder-settings-panel');
      if(!panel)return;
      const note=panel.querySelector('.reminder-help .chat-panel-note');
      const text='iOS 每次安排最近60条提醒，打开应用时续排。时间待定不触发；改期、完成或删除后更新。通知时间可能受系统专注模式等设置影响。';
      if(note&&note.textContent!==text)note.textContent=text;
      const exact=panel.querySelectorAll('.reminder-action')[1];if(exact&&!exact.hidden)exact.hidden=true;
      const status=panel.querySelector('.reminder-status');
      if(status&&status.textContent.includes('准时提醒已允许'))status.textContent=status.textContent.replace('准时提醒已允许','由 iOS 系统投递');
    }).observe(document.body,{childList:true,subtree:true});
  });
})();
