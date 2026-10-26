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
  document.addEventListener('DOMContentLoaded',()=>{document.documentElement.dataset.platform='ios';});
})();
