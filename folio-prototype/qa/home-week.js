/* Isolated, synthetic data only. */
document.addEventListener('DOMContentLoaded',async()=>{
 if(location.port!=='4194')return;
 const panel=document.createElement('aside'),run=document.createElement('button'),out=document.createElement('pre');
 panel.style='position:fixed;right:3px;top:3px;z-index:10000;max-width:230px;max-height:30vh;overflow:auto;background:#f4eedf;color:#75664e;font:10px/1.5 monospace';run.textContent='检查当天侧栏';panel.append(run,out);document.body.append(panel);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function gesture(target,dx){
  const rect=target.getBoundingClientRect(),x=rect.left+Math.min(70,rect.width/2),y=Math.min(rect.bottom-50,rect.top+160),id=98;
  const fire=(type,px)=>{const touch=new Touch({identifier:id,target,clientX:px,clientY:y});target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[touch],changedTouches:[touch]}));};
  fire('touchstart',x);fire('touchmove',x+dx/2);fire('touchmove',x+dx);return ()=>fire('touchend',x+dx);
 }
 async function seed(){
  await FolioSchool.sync();showPreviewScreen('home',{focus:false});
  const date=homeworkState.today,day=(new Date(date+'T00:00:00Z').getUTCDay()+6)%7,next=FolioTodo.addDays(date,1);
  FolioCourses.semesters.splice(0,FolioCourses.semesters.length,...FolioCourses.semesters.filter(t=>t.id!=='qa-home-week'));
  FolioCourses.semesters.push({id:'qa-home-week',label:'示例日',calendar:{periods:[{id:'qa-day',label:'秋',half:'first',start:date,end:next}]},courses:[
   {id:'qa-math',title:'微积分',color:'#B8C7A5',sessions:[{id:'math',day,start:'08:00',end:'09:35',periods:2,room:'示例教室 A'}]},
   {id:'qa-lab',title:'设计实验',color:'#B9CBD5',sessions:[{id:'lab',day,start:'13:25',end:'16:00',periods:3,room:'示例实验室'}]},
   {id:'qa-control',title:'控制理论',color:'#D9C2B1',sessions:[{id:'control',day,start:'18:50',end:'20:25',periods:2,room:'示例教室 B'}]}
  ]});
  homeworkState.items=homeworkState.items.filter(i=>!i.id.startsWith('homeweek-'));
  homeworkState.items.push(
   {id:'homeweek-night',title:'夜间实验',source:'personal',kind:'event',timeMode:'range',startAt:date+'T23:30',endAt:next+'T00:30',completed:false},
   {id:'homeweek-free',title:'整理实验资料',source:'personal',kind:'event',timeMode:'none',completed:false},
   {id:'homeweek-day',title:'阅读论文',source:'personal',kind:'todo',timeMode:'day',scheduledDay:date,completed:false},
   {id:'homeweek-future',title:'明天事项',source:'personal',kind:'event',timeMode:'day',scheduledDay:next,completed:false},
   {id:'homeweek-due',title:'交习题',source:'personal',kind:'homework',timeMode:'deadline',deadline:date,deadlineClock:'20:00',completed:false});commit();
 }
 run.onclick=async()=>{
  run.disabled=true;out.textContent='';const check=(name,ok)=>{out.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';if(!ok)throw Error(name);};
  try{
   await seed();FolioHomeWeek.close(true);
   showPreviewScreen('menu',{focus:false});const entries=[...document.querySelectorAll('#primary-menu .menu-entry')];
   check('首页仍位于历史上方',entries[0].textContent==='首页'&&entries[1].textContent==='对话历史');entries[0].click();
   const before=JSON.stringify(homeworkState.items),header=document.querySelector('.app-topbar'),left=header.getBoundingClientRect().left;
   const end=gesture(document.getElementById('home-screen'),140);
   check('面板随手指移动',Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.getElementById('home-screen')).transform).m41-Math.min(140,FolioHomeWeek.width()))<2);
   check('顶部固定',Math.abs(header.getBoundingClientRect().left-left)<1);end();await wait(420);
   check('右滑展开仍属于首页',currentScreen==='home'&&FolioHomeWeek.opened);
   const columns=[...document.querySelectorAll('.home-week-column')];check('只有当天一列',columns.length===1&&columns[0].dataset.date===homeworkState.today);
   const pane=document.querySelector('.home-week'),pw=pane.getBoundingClientRect().width,fw=document.querySelector('.phone').clientWidth;
   check('课表一列宽，首页只向右让一点',Math.abs(pw-(30+(fw-62)/7))<2&&FolioHomeWeek.offset()<fw*.3);
   const six=[...document.querySelectorAll('.home-week-axis span')].find(n=>n.textContent==='06:00');check('凌晨六小时压缩为5%',Math.abs(parseFloat(six.style.top)-5)<.01);
   check('全天时刻仍完整',document.querySelector('.home-week-axis').textContent.includes('00:00')&&document.querySelector('.home-week-axis').textContent.includes('24:00'));
   check('课程进入时间表',document.querySelectorAll('.home-week-event[aria-label*="微积分"]').length===1);
   check('个人事项完全脱离时间表',!document.querySelector('.home-week-event[data-event-id^="homeweek-"]'));
   for(const id of ['night','free','day','due'])check('一事一行 '+id,document.querySelectorAll('.home-week-strip[data-item-id="homeweek-'+id+'"]').length===1);
   check('事项没有可见文字和标题',document.querySelector('.home-week-bottom').textContent.trim()===''&&[...document.querySelectorAll('.home-week-strip')].every(b=>!b.title));
   check('明天的事项不混入今天',!document.querySelector('.home-week-strip[data-item-id="homeweek-future"]'));
   check('事项列表在时间表下方',document.querySelector('.home-week-bottom').getBoundingClientRect().top>=document.querySelector('.home-week-table').getBoundingClientRect().bottom);
   check('事项细线与课程列等宽且对齐',Math.abs(document.querySelector('.home-week-strip').getBoundingClientRect().width-document.querySelector('.home-week-column').getBoundingClientRect().width)<1&&Math.abs(document.querySelector('.home-week-strip').getBoundingClientRect().left-document.querySelector('.home-week-column').getBoundingClientRect().left)<1);
   check('无字事项保留9px厚度',Math.abs(parseFloat(getComputedStyle(document.querySelector('.home-week-strip'),'::before').height)-9)<.5);
   check('事项压紧后时间表获得更多高度',document.querySelector('.home-week-table').getBoundingClientRect().height>document.querySelector('.home-week').getBoundingClientRect().height*.75&&document.querySelector('.home-week-strip').getBoundingClientRect().height<13);
   document.querySelector('.home-week-strip[data-item-id="homeweek-free"]').click();await wait(60);check('事项仍能打开详情',!homeworkLayer.hidden);document.getElementById('homework-sheet-close').click();await wait(230);
   FolioNative.back();await wait(420);check('返回优先收起面板',!FolioHomeWeek.visible&&currentScreen==='home');
   let finish=gesture(document.getElementById('home-screen'),40);finish();await wait(420);check('短划回弹',!FolioHomeWeek.visible);
   FolioHomeWeek.open();await wait(420);finish=gesture(document.querySelector('.home-week-table'),-160);finish();await wait(420);check('左划收起',!FolioHomeWeek.visible&&!document.getElementById('home-screen').inert);
   finish=gesture(document.getElementById('home-screen'),-200);finish();await wait(400);check('左滑工作台保留',currentScreen==='workbench');
   check('查看不修改原始数据',JSON.stringify(homeworkState.items)===before);
   showPreviewScreen('home',{focus:false});FolioHomeWeek.open();await wait(420);out.textContent+='DONE\n';
  }catch(e){out.textContent+='ERROR '+e.stack;}finally{run.disabled=false;}
 };
 await seed();FolioHomeWeek.open();
});
