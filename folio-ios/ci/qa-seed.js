/* Explicit simulator fixture, injected before the unchanged production entry. */
(()=>{
  'use strict';
  window.__folioIOSQAInjected=true;
  const fixtureCall=FolioAndroid.call.bind(FolioAndroid);
  FolioAndroid.call=(id,operation,payload)=>operation==='app.chrome'?window.webkit.messageHandlers.folio.postMessage({id,operation,payload}):fixtureCall(id,operation,payload);
  localStorage.setItem('folio-workbench-v1',JSON.stringify({version:1,slots:['study/bento-today','study/bento-learning','study/bento-assignments','study/bento-grades']}));
  localStorage.setItem('folio-horizontal-mode','on');
  localStorage.setItem('folio-horizontal-pages-v1',JSON.stringify(['home','workbench','relationships','calendar','timetable','courses','exams','grades','settings']));
  localStorage.setItem('folio-color-mode','light');
})();
