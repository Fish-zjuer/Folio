/* Synthetic fixture: count actual DOM mutations, not claimed device FPS. */
window.addEventListener('load',()=>{
 const run=document.createElement('button'),out=document.createElement('pre');run.id='run-rail-performance';run.textContent='运行横滑帧合并检查';run.style.cssText='position:fixed;bottom:8px;right:8px;z-index:100001;padding:12px';out.id='rail-performance-results';out.hidden=true;document.body.append(run,out);
 const preview=document.createElement('button'),theme=document.createElement('button');preview.textContent='查看卡片排序';theme.textContent='切换颜色';preview.style.cssText='position:fixed;bottom:60px;right:8px;z-index:100001;padding:10px';theme.style.cssText='position:fixed;bottom:108px;right:8px;z-index:100001;padding:10px';preview.onclick=()=>{out.hidden=true;FolioChatUI.closePanel(true,false);FolioPageRail.set(false);showPreviewScreen('workbench',{focus:false});FolioWorkbench.openPicker(2);};theme.onclick=()=>FolioTheme.set(document.documentElement.dataset.colorMode==='dark'?'light':'dark');document.body.append(preview,theme);
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const touch=(target,type,x,y=280)=>{const t=new Touch({identifier:61,target,clientX:x,clientY:y});target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:['touchend','touchcancel'].includes(type)?[]:[t],changedTouches:[t]}));};
 run.onclick=async()=>{run.disabled=true;out.hidden=true;const checks=[],metrics={startupErrors:FolioQA.errors.slice()},ok=(name,value)=>{checks.push({name,ok:!!value});if(!value)throw Error(name);};let observer;
  try{
   FolioChatUI.closePanel(true,false);FolioPageRail.set(true);showPreviewScreen('workbench',{focus:false});await frames();await wait(80);
   const phone=document.querySelector('.phone'),width=phone.clientWidth,screen=previewScreens.workbench,track=document.querySelector('.rail-scrubber');const records=[];
   observer=new MutationObserver(changes=>records.push(...changes));observer.observe(phone,{subtree:true,attributes:true,attributeFilter:['style','hidden','inert','class','aria-valuenow','aria-valuetext']});
   touch(screen,'touchstart',width*.8);for(let i=1;i<=120;i++)touch(screen,'touchmove',width*(.8-.35*i/120));
   ok('突发120次移动在下一帧前不做页面绘制',!phone.querySelector('.rail-page'));
   await frames();const pageRecords=records.filter(r=>Object.values(previewScreens).includes(r.target));metrics.burst={inputs:120,pageStyleWrites:pageRecords.filter(r=>r.attributeName==='style').length,pageVisibilityWrites:pageRecords.filter(r=>r.attributeName==='hidden').length,trackWrites:records.filter(r=>r.target===track).length};
   ok('每帧页样式写入限制在可见两页初始化范围',metrics.burst.pageStyleWrites<=8&&metrics.burst.pageStyleWrites>=2);
   ok('轨道隐藏时没有进度和ARIA写入',metrics.burst.trackWrites===0);
   const a=screen.getBoundingClientRect(),p=phone.getBoundingClientRect();ok('实际页面跟随最新手指位置',Math.abs(a.left-p.left+width*.35)<1.5);
   ok('只显示工作台和日程，不露出第三站课表',phone.querySelectorAll('.rail-page:not([hidden])').length===2&&previewScreens.timetable.hidden);
   touch(screen,'touchend',width*.45);let flashed=false;const until=performance.now()+380;while(performance.now()<until){await new Promise(requestAnimationFrame);const r=previewScreens.timetable.getBoundingClientRect(),b=phone.getBoundingClientRect();if(!previewScreens.timetable.hidden&&r.left<b.right-2&&r.right>b.left+2)flashed=true;}
   ok('松手提交日程，整个动画未闪过课表',currentScreen==='calendar'&&!flashed&&!previewScreens.calendar.inert);
   showPreviewScreen('workbench',{focus:false});await frames();records.length=0;
   touch(screen,'touchstart',width*.8);touch(screen,'touchmove',width*.7);await frames();records.length=0;
   for(let i=1;i<=60;i++)touch(screen,'touchmove',width*(.7-.05*i/60));await frames();
   const steady=records.filter(r=>Object.values(previewScreens).includes(r.target));metrics.steady={inputs:60,pageStyleWrites:steady.filter(r=>r.attributeName==='style').length,pageStateWrites:steady.filter(r=>r.attributeName!=='style').length};
   ok('可见范围未变化时仅更新两页transform',metrics.steady.pageStyleWrites===2&&metrics.steady.pageStateWrites===0);
   touch(screen,'touchcancel',width*.65);await wait(380);ok('取消手势恢复原页并解除inert',currentScreen==='workbench'&&!screen.inert&&!phone.querySelector('.rail-page'));
   touch(screen,'touchstart',width*.8);touch(screen,'touchmove',width*.45);touch(screen,'touchend',width*.45);await wait(30);
   touch(screen,'touchstart',width*.6);touch(screen,'touchend',width*.6);await wait(380);ok('收尾动画中轻触不会取消提交并留下禁用页面',currentScreen==='calendar'&&!previewScreens.calendar.inert);
   showPreviewScreen('workbench',{focus:false});await frames();touch(screen,'touchstart',width*.8);touch(screen,'touchmove',width*.45);showPreviewScreen('settings',{focus:false});touch(screen,'touchcancel',width*.45);await frames();await wait(380);
   ok('外部导航后待绘制的旧手势不会覆盖新页',currentScreen==='settings'&&!phone.querySelector('.rail-page')&&!previewScreens.settings.inert);
   const title=document.querySelector('.rail-title');title.click();await frames();const line=document.querySelector('.rail-line').getBoundingClientRect();
   title.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:91,button:0,clientX:line.right,clientY:25}));for(let i=1;i<=120;i++)title.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:91,clientX:line.right-line.width*i/120,clientY:25}));title.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:91,clientX:line.left,clientY:25}));await wait(380);
   ok('标题跨页突发滑动松手读取最新位置',currentScreen==='home'&&track.getAttribute('aria-valuenow')==='1');
   showPreviewScreen('workbench',{focus:false});await frames();touch(screen,'touchstart',width*.8);touch(screen,'touchmove',width*.45);FolioPageRail.set(false);touch(screen,'touchcancel',width*.45);await frames();ok('关闭横向模式取消待绘制帧且恢复默认课表位置',!FolioPageRail.enabled&&!phone.querySelector('.rail-page')&&!phone.classList.contains('rail-split-calendar'));
   showPreviewScreen('menu',{focus:false});await wait(320);const menu=previewScreens.menu;let entranceCount=0;const entrance=e=>{if(e.animationName==='sidebar-enter')entranceCount++;};menu.addEventListener('animationstart',entrance);
   for(let i=0;i<3;i++){touch(menu,'touchstart',width*.7);touch(menu,'touchmove',width*.7-12);await frames();touch(menu,'touchend',width*.7-12);await wait(330);}
   ok('菜单连续轻推回弹不重播入场动画或闪出屏幕',currentScreen==='menu'&&entranceCount===0&&getComputedStyle(menu).animationName==='none'&&!menu.inert&&menu.style.transform==='');
   showPreviewScreen('home',{focus:false});showPreviewScreen('menu',{focus:false});await wait(50);ok('真正重新打开菜单仍保留正常入场动画',entranceCount===1);
   const entranceX=new DOMMatrixReadOnly(getComputedStyle(menu).transform).m41;touch(menu,'touchstart',width*.7);touch(menu,'touchmove',width*.7-12);const takeoverX=new DOMMatrixReadOnly(getComputedStyle(menu).transform).m41;
   ok('入场未结束时轻推从当前画面接管，不跳到终点',Math.abs(takeoverX-Math.max(-width,entranceX-12))<1.5);touch(menu,'touchend',width*.7-12);await wait(330);ok('接管后回弹不再次播放入场动画',currentScreen==='menu'&&entranceCount===1&&!menu.inert);menu.removeEventListener('animationstart',entrance);
   showPreviewScreen('workbench',{focus:false});const beforeLayout=JSON.stringify(FolioWorkbench.getLayout());FolioWorkbench.openPicker(2);await frames();
   const catalog=FolioWorkbench.listComponents(),labels=[...document.querySelectorAll('.workbench-choice-label')].map(n=>n.textContent),dataIds=new Set(['stats-focus','stats-tasks','stats-semester','overview-academic','overview-affairs','sample-news']);const firstData=catalog.findIndex(c=>dataIds.has(c.id));
   ok('图形卡片全部位于文本和数据卡片之前',firstData>0&&catalog.slice(firstData).every(c=>dataIds.has(c.id))&&labels.join('|')===catalog.map(c=>c.label).join('|'));
   document.querySelector('.workbench-picker-close').click();await wait(250);ok('排序不修改用户已放置的四格布局',beforeLayout===JSON.stringify(FolioWorkbench.getLayout()));
   ok('无夹具脚本异常',FolioQA.errors.length===0);window.railPerformanceResult={passed:true,metrics,checks};
  }catch(e){window.railPerformanceResult={passed:false,error:e.message,scriptErrors:FolioQA.errors.slice(),stacks:window.QAPackErrorStacks?.slice(),resizeWarning:window.qaResizeWarning,metrics,checks};}finally{observer?.disconnect();run.disabled=false;out.textContent=JSON.stringify(window.railPerformanceResult,null,2);out.hidden=false;out.style.cssText='position:fixed;inset:75px 10px 70px;z-index:100000;background:#eee9dd;color:#4b5149;overflow:auto;font:12px monospace;padding:12px';run.textContent='检查完成 '+checks.filter(c=>c.ok).length+' 项';}
 };
 FolioPageRail.set(false);showPreviewScreen('workbench',{focus:false});
});
