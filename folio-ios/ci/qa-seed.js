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
  localStorage.setItem('folio-weather-cache-v1',JSON.stringify({city:{name:'杭州',latitude:30.2741,longitude:120.1551},temperature:22,feelsLike:21,humidity:55,wind:8,low:17,high:24,code:0,isDay:true,observedAt:Date.now(),fetchedAt:Date.now(),label:'晴',icon:'sun'}));
  localStorage.setItem('folio-news-auto-v1','off');
  window.__folioQANetworkAttempts=[];
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,options)=>{
    const url=new URL(input instanceof Request?input.url:String(input),location.href);
    if(url.origin!==location.origin){__folioQANetworkAttempts.push(url.origin);return Promise.reject(Error('Simulator fixture blocks external network'));}
    return originalFetch(input,options);
  };
})();
