/* Run on an isolated localhost origin. All school responses are synthetic. */
document.addEventListener('DOMContentLoaded',()=>{
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),panel=document.createElement('aside'),run=document.createElement('button'),out=document.createElement('pre');panel.style='position:fixed;left:6px;top:6px;z-index:1000;max-width:290px;max-height:90vh;overflow:auto;background:#f6f0e3;color:#796a50;border:1px solid #cdbb99;padding:10px;font:11px/1.7 monospace';run.textContent='运行 App 组件与 SDK 检查';panel.append(run,out);document.body.append(panel);
 const failures=[];window.addEventListener('error',e=>failures.push(e.message));
 run.onclick=async()=>{run.disabled=true;out.textContent='';const check=(name,ok)=>{out.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';if(!ok)throw Error(name);};let ctx,updates=0,destroyed=0,extraDisposed=0,previewDisposed=0;
 try{
  await FolioSchool.sync();showPreviewScreen('workbench',{focus:false});await wait(350);
  const grid=document.querySelector('.workbench-grid');
  async function add(index,id){const slot=grid.children[index];FolioWorkbench.openPicker(index);const name=FolioWorkbench.listComponents().find(c=>c.id===id).label;if(id==='qa/lifecycle')check('预览无法读取用户数据',document.querySelector('.workbench-choice-preview[data-widget-id="qa/lifecycle"]').dataset.denied==='true');document.querySelector(`.workbench-choice-add[aria-label="添加${name}到${['左上','右上','左下','右下'][index]}"]`).click();await wait(210);}
  async function empty(index){const slot=grid.children[index];if(!FolioWorkbench.getLayout()[index])return;FolioWorkbench.openPicker(index);document.querySelector('.workbench-leave-empty').click();await wait(210);}
  for(let i=0;i<4;i++)await empty(i);
  check('Widget API v1 可用',FolioWidgetSDK.apiVersion===1&&FolioWorkbench.apiVersion===1);
  check('全部十一张已设计图形可添加，缺数据不隐藏',FolioWorkbench.listComponents().filter(c=>c.id.startsWith('sample-')).length===11);
  await add(0,'sample-pressure');check('压力为本地 SVG，无样稿 iframe',!!grid.children[0].querySelector('svg')&&!grid.querySelector('iframe'));
  const cell=grid.children[0].querySelector('g[role=button]');cell.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));check('压力日期能打开实际安排',!homeworkLayer.hidden&&document.querySelector('#homework-sheet-title').textContent.includes('-'));closeHomeworkSheet();await wait(230);
  await add(1,'sample-focus');grid.children[1].querySelector('.live-focus').click();check('搭建可打开宿主计时操作',!!document.querySelector('.live-focus-panel'));
  document.querySelector('.live-widget-action').click();await wait(80);let saved=JSON.parse(localStorage.getItem('folio-focus-study-v1'));check('开始专注落盘',Number.isFinite(saved.active?.runningFrom));document.querySelector('.live-widget-action').click();saved=JSON.parse(localStorage.getItem('folio-focus-study-v1'));check('暂停保存实际时间段',saved.active?.runningFrom===null&&saved.active.segments.length>0);closeHomeworkSheet();await wait(230);
  if(!FolioWidgetSDK.list().some(w=>w.id==='qa/lifecycle'))FolioWidgetSDK.register({apiVersion:1,id:'qa/lifecycle',version:'1.0.0',name:'SDK 生命周期检查',permissions:['focus','courses'],preview(root,c){let denied=false;try{c.read('focus');}catch{denied=true;}root.dataset.denied=String(denied);return()=>previewDisposed++;},mount(root,c){ctx=c;root.textContent='SDK';c.subscribe('focus',()=>updates++);c.onDispose(()=>extraDisposed++);return()=>destroyed++;}});
  await add(2,'qa/lifecycle');check('目录预览已销毁',previewDisposed>0);check('只读深冻结快照',Object.isFrozen(ctx.read('focus').byDay));const term=FolioCourses.semesters[0];let selectedDate,selectedCourse;for(let i=0;i<35&&!selectedCourse;i++){const day=FolioTodo.addDays(term.calendar.periods[0].start,i),entry=ctx.coursesOn(day)[0];if(entry){selectedDate=day;selectedCourse=entry;}}check('开发者当天课程投影只读',!!selectedCourse&&Object.isFrozen(ctx.coursesOn(selectedDate)[0]));const exclusion=FolioScheduleOverrides.add({termId:term.id,courseId:selectedCourse.courseId,date:selectedDate});check('外部组件投影也遵守本地课表排除',!ctx.coursesOn(selectedDate).some(c=>c.courseId===selectedCourse.courseId));FolioScheduleOverrides.remove(exclusion);let denied=false;try{ctx.read('tasks');}catch{denied=true;}check('未声明数据被拒绝',denied);ctx.preferences.set('theme','sage');check('偏好限定组件命名空间',localStorage.getItem('folio-widget-pref-v1:qa/lifecycle:theme')==='"sage"');
  const before=updates;document.dispatchEvent(new Event('folio-focus-change'));check('数据订阅收到更新',updates>before);
  const node=grid.children[2].firstElementChild;grid.children[2].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',altKey:true,bubbles:true,cancelable:true}));check('换位不销毁也不重建实例',destroyed===0&&grid.children[3].firstElementChild===node);
  await empty(3);const count=updates;document.dispatchEvent(new Event('folio-focus-change'));check('移除清理订阅与自定义资源',destroyed===1&&extraDisposed===1&&updates===count);let disposed=false;try{ctx.read('focus');}catch{disposed=true;}check('旧 context 已失效',disposed);
  await add(2,'example/weekly-focus');grid.children[2].querySelector('[data-widget-hold]').click();check('外部示例可使用允许的专注入口',!!document.querySelector('.live-focus-panel'));closeHomeworkSheet();await wait(230);
  await add(3,'stats-focus');check('专注账本读取同一实际计时记录',grid.children[3].textContent.includes('<1'));
  check('无运行异常',failures.length===0);out.textContent+='DONE\n';
 }catch(error){out.textContent+='ERROR '+error.message+'\n';}finally{run.disabled=false;}
 };
 showPreviewScreen('workbench',{focus:false});
});
