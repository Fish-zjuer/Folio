/* 唯一原生消息入口；模型密钥只写入 Android Keystore 保护的 vault，不回传给网页。 */
(function(){
  "use strict";
  const native=typeof window.FolioAndroid?.call==="function",pending=new Map();
  window.FolioApp={native};
  if(native)document.documentElement.classList.add("native-app");
  if(native&&!localStorage.getItem("folio-native-data-migrated-v1")){
    try{
      const keys=["folio-homework-demo-v1","folio-custom-exams-v1","folio-academic-v1"],backup={};for(const key of keys)backup[key]=localStorage.getItem(key);
      if(!localStorage.getItem("folio-pre-native-backup-v1"))localStorage.setItem("folio-pre-native-backup-v1",JSON.stringify(backup));
      if(backup[keys[0]]){const data=JSON.parse(backup[keys[0]]);if(Array.isArray(data.items)){data.items=data.items.filter(r=>!(r.source==="school"&&/^h(?:0[1-9]|10)$/.test(r.id))&&!(r.id==="t01"&&r.title==="补充课堂上的手写作业")&&!(r.id==="t02"&&r.title==="整理本周笔记"));localStorage.setItem(keys[0],JSON.stringify(data));}}
      if(backup[keys[1]]){const records=JSON.parse(backup[keys[1]]);if(Array.isArray(records))localStorage.setItem(keys[1],JSON.stringify(records.filter(r=>r.id!=="custom-demo-quiz")));}
      if(backup[keys[2]]){const data=JSON.parse(backup[keys[2]]);data.cache={};delete data.demoVersion;delete data.practiceDemoVersion;delete data.demoGradeResults;localStorage.setItem(keys[2],JSON.stringify(data));}
      localStorage.setItem("folio-native-data-migrated-v1","1");
    }catch(error){window.FolioApp.migrationError="旧体验包数据尚未完成迁移，请保留应用数据后重试。";}
  }
  const storageKey="folio-live-school-v1";
  let cacheMigrated=false;
  function cache(){try{let data=JSON.parse(localStorage.getItem(storageKey))||{version:1,protocolVersion:3,modules:{},terms:[]};if(native&&!cacheMigrated&&window.FolioBackend?.migrateCache){const result=FolioBackend.migrateCache(data);if(result.backup&&!localStorage.getItem("folio-pre-0.3-school-backup-v1"))localStorage.setItem("folio-pre-0.3-school-backup-v1",JSON.stringify(result.backup));data=result.cache;localStorage.setItem(storageKey,JSON.stringify(data));cacheMigrated=true;}return data;}catch{return {version:1,protocolVersion:3,modules:{},terms:[]};}}
  function call(operation,data={},signal){
    if(!native)return Promise.reject(new Error("此功能需要 Android 测试应用"));
    const id=crypto.randomUUID();return new Promise((resolve,reject)=>{
      if(signal?.aborted){reject(new DOMException("已停止","AbortError"));return;}
      const timeout=setTimeout(()=>{pending.delete(id);window.FolioAndroid.call(id,"cancel","{}");reject(new Error("请求超时，请稍后重试；原来的数据仍保留"));},operation==="provider"||operation==="school"||operation==="school.authenticate"?120000:operation==="app.calendar.export"?300000:50000);
      const abort=()=>{clearTimeout(timeout);pending.delete(id);window.FolioAndroid.call(id,"cancel","{}");reject(new DOMException("已停止","AbortError"));};signal?.addEventListener("abort",abort,{once:true});
      pending.set(id,{resolve,reject,finish(){clearTimeout(timeout);signal?.removeEventListener("abort",abort);}});
      window.FolioAndroid.call(id,operation,JSON.stringify(data));
    });
  }
  function receive(id,result){const job=pending.get(id);if(!job)return;pending.delete(id);job.finish();if(result.ok)job.resolve(result.data);else job.reject(new Error(result.error||"请求失败"));}
  function back(){
    if(window.FolioSelect?.isOpen()){FolioSelect.close();return;}
    const visible=selector=>[...document.querySelectorAll(selector)].find(el=>!el.closest("[hidden]")&&el.getClientRects().length);
    const close=visible('.chat-panel-close,.workbench-reading-close,.workbench-picker-close,#homework-sheet-close,#sheet-close');
    if(close){close.click();return;}if(window.FolioHomeWeek?.visible){FolioHomeWeek.close();return;}if(typeof currentScreen!=="undefined"&&currentScreen==="home"){call("app.background").catch(()=>{});return;}document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  }
  window.FolioNative={call,receive,cache,storageKey,back};
  document.addEventListener("pointerdown",()=>document.documentElement.classList.add("pointer-input"),{passive:true});
  document.addEventListener("keydown",e=>{if(e.key==="Tab")document.documentElement.classList.remove("pointer-input");});
})();
