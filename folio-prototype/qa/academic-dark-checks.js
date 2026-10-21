/* Isolated synthetic bridge, not an Android runtime asset. */
window.addEventListener('load',()=>{
 const bar=document.createElement('div'),out=document.createElement('pre');bar.style.cssText='position:fixed;bottom:8px;right:8px;z-index:100001;display:flex;gap:4px;flex-wrap:wrap;max-width:360px';out.id='academic-dark-results';out.hidden=true;document.body.append(bar,out);
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),lum=color=>{const c=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;bar.append(b);return b;};
 for(const [label,screen]of [['课程','courses'],['考试','exams'],['成绩','grades'],['学业','scholar'],['目标','goals'],['间距','pixel']])button(label,()=>{out.hidden=true;FolioChatUI.closePanel(true,false);showPreviewScreen(screen,{focus:false});});
 button('明/暗',()=>FolioTheme.set(document.documentElement.dataset.theme==='dark'?'light':'dark'));
 const run=button('验证深色',async()=>{run.disabled=true;out.hidden=true;const checks=[],ok=(name,value)=>{checks.push({name,ok:!!value});if(!value)throw Error(name);},dark=selector=>{const nodes=[...document.querySelectorAll(selector)];return nodes.length>0&&nodes.every(n=>lum(getComputedStyle(n).backgroundColor)<.2);};
 try{
  await FolioSchool.sync();FolioPageRail.set(false);FolioTheme.set('light');showPreviewScreen('courses',{focus:false});await wait(200);
  ok('真实课程列表已有虚构教务数据',courseList.querySelectorAll('.course-list-row').length>0);ok('浅色课程纸面仍保持亮色',lum(getComputedStyle(courseList).backgroundColor)>.7);
  FolioTheme.set('dark');await frames();ok('课程列表没有白色纸面',dark('.course-list:not([data-layout=grid])'));
  const title=courseList.querySelector('.course-list-name'),titleColor=lum(getComputedStyle(title).color),paper=lum(getComputedStyle(courseList).backgroundColor);ok('课程主标题与暗底对比度足够',(titleColor+.05)/(paper+.05)>=4.5);
  const before=courseList.getBoundingClientRect().width;courseLayout='grid';applyCourseLayout();await frames();ok('双列课程每张卡也有暗色底',dark('.course-list[data-layout=grid]>li'));ok('双列容器保留透明背景',getComputedStyle(courseList).backgroundColor==='rgba(0, 0, 0, 0)');courseLayout='list';applyCourseLayout();ok('切换颜色没有改课程区域宽度',Math.abs(courseList.getBoundingClientRect().width-before)<1);
  openCourseDetail(currentCourseSemester().courses[0].id);await frames();ok('课程详情信息卡使用暗色',dark('.course-info-card,.course-session-list'));
  showPreviewScreen('grades',{focus:false});await frames();ok('成绩列表没有纯白底板',dark('.academic-grade-list'));
  showPreviewScreen('scholar',{focus:false});await frames();ok('学业概览内部课时面板也为暗色',dark('.academic-hours div'));
  showPreviewScreen('exams',{focus:false});await frames();ok('考试卡片分组使用暗色纸面',dark('.exam-day-cards'));const seat=document.querySelector('.exam-card-seat');ok('座号不再用近黑色文字',seat&&lum(getComputedStyle(seat).color)>.35);
  showPreviewScreen('goals',{focus:false});await frames();ok('目标设置与实时预览使用暗色',dark('.goal-settings,.goal-live'));
  showPreviewScreen('pixel',{focus:false});await frames();const slider=document.getElementById('progress-lane-gap'),art=document.querySelector('.progress-spacing-art'),initial=slider.value;
  for(const gap of [18,23,28]){slider.value=String(gap);slider.dispatchEvent(new Event('input',{bubbles:true}));await frames();const head=art.querySelector('[data-pet-head]'),points=FolioSnakeProgress.route(art.clientWidth,art.clientHeight);ok('间距'+gap+'px：只改横距，24px图标与竖向高度不变',points[0].x-points[2].x===gap&&head.getAttribute('width')==='24'&&head.getAttribute('height')==='24'&&art.clientHeight===106);}
  slider.value=initial;slider.dispatchEvent(new Event('input',{bubbles:true}));await frames();ok('间距设置预览使用暗色底',dark('.progress-spacing-setting,.progress-spacing-sample'));
  ok('没有脚本异常',FolioQA.errors.length===0);out.textContent=JSON.stringify({passed:true,width:document.documentElement.clientWidth,checks},null,2);
 }catch(e){out.textContent=JSON.stringify({passed:false,error:e.message,errors:FolioQA.errors,checks},null,2);}finally{run.disabled=false;out.hidden=false;out.style.cssText='position:fixed;inset:80px 8px 90px;z-index:100000;background:#30332B;color:#D5CCBA;overflow:auto;font:12px monospace;padding:12px';}
 });
 FolioTheme.set('dark');showPreviewScreen('courses',{focus:false});
});
