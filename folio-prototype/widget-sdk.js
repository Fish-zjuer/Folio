/* V1 SDK for reviewed, bundled developer code. It is an integration contract, not a JS security sandbox. */
(()=>{
 'use strict';const C=FolioWidgetContract,registered=new Map();
 const changes=['folio-data-change','folio-school-change','folio-exams-change','folio-focus-change','folio-study-change','folio-pomodoro-change','folio-goals-change','folio-grade-visibility-change','folio-academic-calculation-change','preview-screen-change','visibilitychange','folio-schedule-overrides-change','folio-pack-active'];
 function snapshot(type){
  if(type==='courses')return FolioCourses.semesters.map(t=>({id:t.id,label:t.label,stale:!!t.stale,calendar:t.calendar||null,scheduleExclusions:window.FolioScheduleOverrides?.list(t.id)||[],personalSchedule:homeworkState.items.filter(i=>i.kind==="lesson"&&(!i.termId||i.termId===t.id)).map(i=>Object.fromEntries(["id","courseId","course","title","termId","timeMode","startAt","endAt","scheduledDay","placements","repeat","color","location"].filter(k=>i[k]!==undefined).map(k=>[k,i[k]]))),courses:t.courses.map(c=>({id:c.id,title:c.title,color:c.color||null,credits:c.credits??null,teacher:c.teacher||null,sessions:c.sessions||[]}))}));
  if(type==='tasks')return homeworkState.items.filter(i=>!i.repeatTemplate).map(i=>Object.fromEntries(['id','title','kind','source','course','courseId','termId','placements','scheduledDay','timeMode','reminderOffsets','location','repeat','completed','completionKnown','schoolCompleted','deadline','deadlineClock','startAt','endAt','queued','mountDate','mountedOn','important','urgent','estimatedMinutes'].filter(k=>i[k]!==undefined).map(k=>[k,i[k]])));
  if(type==='study')return {...FolioStudyStore.read(),pomodoro:window.FolioPomodoro?.read()||null};
  if(type==='exams')return FolioCourses.semesters.flatMap(t=>currentExams(t.id).map(e=>({id:e.id,title:e.title,semesterId:e.semesterId,courseId:e.courseId,date:e.date,start:e.start,end:e.end,room:e.room||null})));
  if(type==='academic')return FolioAcademicUI.overview();
  if(type==='focus'){let raw=null;try{raw=JSON.parse(localStorage.getItem('folio-focus-study-v1'));}catch{}raw=window.FolioPomodoro?.focusSnapshot(raw)||raw;const v=FolioStats.focus(raw,Date.now());return {total:v.total,lastWeek:v.lastWeek,thisWeek:v.thisWeek,today:v.today,days:v.days,byDay:v.byDay,buildings:v.buildings,activeMinutes:raw?.active?Math.min(45,FolioFocus.elapsed(FolioFocus.restore(raw),Date.now())/60000):0};}
  throw Error('Unknown dataset');
 }
 function context(manifest,root,preview){
  let disposed=false;const subscriptions=new Set(),cleanups=new Set(),themeSubscriptions=new Set();
  const palettes=C.themes(manifest.themes);
  const theme=()=>{const mode=document.documentElement.dataset.theme==='dark'?'dark':'light';return C.readonly({mode,preference:document.documentElement.dataset.colorMode||'system',colors:palettes?.[mode]||{}});};
  function applyTheme(){const value=theme();for(const [key,color]of Object.entries(value.colors))root.style.setProperty('--widget-'+key,color);for(const fn of themeSubscriptions)try{fn(value);}catch{console.warn('Widget theme subscriber failed',manifest.id);}}
  document.addEventListener('folio-theme-change',applyTheme);applyTheme();
  const visible=()=>!document.hidden&&typeof currentScreen!=='undefined'&&currentScreen==='workbench'&&root.isConnected&&!root.closest('[data-pack-page][inert]');
  function access(type){if(disposed)throw Error('Widget was disposed');if(preview)throw Error('Preview has no access to user data');if(!manifest.permissions.includes(type))throw Error('Dataset not declared: '+type);}
  function read(type){access(type);return C.readonly(snapshot(type));}
  const api=Object.freeze({apiVersion:1,id:manifest.id,preview,dataMode:window.FolioApp?.native?'local':'demo',timezone:'Asia/Shanghai',
   get today(){return homeworkState.today;},get theme(){return theme();},read,
   subscribeTheme(callback){if(disposed||typeof callback!=='function')throw Error('Invalid theme subscription');themeSubscriptions.add(callback);callback(theme());return()=>themeSubscriptions.delete(callback);},
   coursesOn(date,termId){access('courses');FolioQueue.dateValue(date);const term=FolioCourses.semesters.find(t=>t.id===termId)||(termId?null:FolioCourses.semesters[0]);if(!term)return C.readonly([]);return C.readonly(FolioCourses.onDate(term,date,undefined,"all").map(c=>Object.fromEntries(['id','courseId','title','teacher','credits','date','start','end','room','periods','personal','itemId'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]]))));},
   subscribe(type,callback){if(!manifest.permissions.includes(type)||typeof callback!=='function')throw Error('Invalid widget subscription');if(preview)return()=>{};const s={type,callback};subscriptions.add(s);callback(read(type));return()=>subscriptions.delete(s);},
   onDispose(fn){if(typeof fn!=='function')throw Error('Cleanup must be a function');cleanups.add(fn);return()=>cleanups.delete(fn);},
   preferences:Object.freeze({get(key,fallback=null){try{const value=localStorage.getItem(C.storageKey(manifest.id,key));return value===null?fallback:JSON.parse(value);}catch{return fallback;}},set(key,value){if(preview||disposed)throw Error('Preference writes unavailable');const text=JSON.stringify(value);if(text===undefined||text.length>65536)throw Error('Preference exceeds 64 KB');localStorage.setItem(C.storageKey(manifest.id,key),text);}}),
   open(target){if(preview||disposed||!visible())return false;if(target==='focus'){document.dispatchEvent(new CustomEvent('folio-focus-open',{detail:{origin:root}}));return true;}const allowed=['home','workbench','calendar','courses','homework','todos','goals','grades','scholar'];if(target==='todos')target='tasks';if(![...allowed,'tasks'].includes(target)||!previewScreens[target])throw Error('Unsupported widget destination');showPreviewScreen(target);return true;}
  });
  function notify(){if(disposed||!visible())return;for(const s of subscriptions){try{s.callback(read(s.type));}catch{console.warn('Widget subscriber failed',manifest.id);}}}
  if(!preview)changes.forEach(name=>document.addEventListener(name,notify));
  return {api,notify,destroy(){if(disposed)return;disposed=true;document.removeEventListener('folio-theme-change',applyTheme);themeSubscriptions.clear();changes.forEach(name=>document.removeEventListener(name,notify));subscriptions.clear();for(const fn of cleanups){try{fn();}catch{console.warn('Widget cleanup failed',manifest.id);}}cleanups.clear();}};
 }
 function wrap(m,root,preview){root.dataset.widgetId=m.id;const c=context(m,root,preview);let result;
  try{result=preview?m.preview?.(root,c.api):m.mount(root,c.api);}catch(e){c.destroy();throw e;}
  return {destroy(){try{if(typeof result==='function')result();else result?.destroy?.();}finally{c.destroy();}}};
 }
 window.FolioWidgetSDK=Object.freeze({apiVersion:1,datasets:C.datasets,
  register(input){const m=C.validate(input);C.themes(m.themes);if(registered.has(m.id)||FolioWorkbench.listComponents().some(c=>c.id===m.id))throw Error('Widget id already registered');registered.set(m.id,m);const names={courses:'课表',tasks:'任务',exams:'考试',academic:'学业记录',focus:'专注记录',study:'本地学习记录'};FolioWorkbench.register({id:m.id,label:m.name,description:(m.description||'')+(m.permissions.length?' · 读取 '+m.permissions.map(p=>names[p]).join('、'):''),mount:root=>wrap(m,root,false),preview:root=>wrap(m,root,true)});},
  list(){return [...registered.values()].map(m=>({apiVersion:1,id:m.id,name:m.name,version:m.version,permissions:m.permissions.slice()}));},
  async loadBundled(entries){for(const entry of entries){const u=new URL(entry.script,document.baseURI),base=new URL('widgets/',document.baseURI);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||!u.pathname.endsWith('.js')||u.search||u.hash)throw Error('Only bundled widgets/*.js may load');await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=u.href;s.onload=resolve;s.onerror=()=>reject(Error('Widget script failed: '+entry.id));document.head.append(s);});if(!registered.has(entry.id))throw Error('Widget did not register expected id: '+entry.id);}}
 });
})();
