/* Host-owned, context-first secondary menus. All edits still use confirmation flows. */
(()=>{'use strict';const C=FolioStudyCore,Core=FolioStudyMenuCore;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
 const btn=(text,fn,cls='sm-button')=>{const n=el('button',cls,text);n.type='button';n.onclick=fn;return n;};
 const date=d=>C.validDay(d)?`${Number(d.slice(5,7))}月${Number(d.slice(8))}日`:d||'日期待定',num=v=>Number.isFinite(v)?v.toFixed(2):'—',duration=ms=>{const n=Math.round((ms||0)/60000);return n>=60?`${Math.floor(n/60)}h ${n%60}m`:`${n} min`;};
 function section(p,title,meta){const s=el('section','sm-section'),h=el('div','sm-section-heading');h.append(el('h3','',title));if(meta)h.append(el('small','',meta));s.append(h);p.append(s);return s;}
 function empty(p,text){p.append(el('p','sm-empty',text));}
 function metric(p,value,label,tone='teal'){const n=el('div','sm-metric '+tone);n.append(el('strong','',value),el('span','',label));p.append(n);return n;}
 function info(p,text){const d=el('details','sm-info');d.append(el('summary','','计算与说明'),el('p','',text));p.append(d);}
 function row(p,title,meta,fn,{color,mark,value,active}={}){const n=el(fn?'button':'div','sm-row'+(active?' is-selected':''));if(fn){n.type='button';n.onclick=fn;}const flag=el('span','sm-row-mark',mark||'');if(color)flag.style.setProperty('--sm-color',color);const copy=el('span','sm-row-copy');copy.append(el('strong','',title||'未命名'),el('small','',meta||''));n.append(flag,copy);if(value)n.append(el('span','sm-row-value',value));if(fn)n.append(el('span','sm-chevron','›'));p.append(n);return n;}
 function progress(p,value){const n=el('div','sm-progress'),fill=el('i');fill.style.width=100*C.clamp(value||0)+'%';n.append(fill);p.append(n);}
 function chips(p,values,current,change){const n=el('div','sm-chips');for(const [id,label]of values){const b=btn(label,()=>change(id),'sm-chip'+(current===id?' is-active':''));b.setAttribute('aria-pressed',String(current===id));n.append(b);}p.append(n);}
 function finish(p){
  for(const s of p.querySelectorAll('.sm-section')){
   const rows=[...s.children].filter(n=>n.classList.contains('sm-row'));if(rows.length<=6)continue;
   let expanded=false;const search=el('input','sm-search');search.type='search';search.placeholder='查找这组记录';search.setAttribute('aria-label','查找'+s.querySelector('h3').textContent);
   const more=btn(`展开其余 ${rows.length-6} 项`,()=>{expanded=!expanded;update();},'sm-more'),no=el('p','sm-empty','没有匹配的记录');
   const update=()=>{const q=search.value.trim().toLocaleLowerCase();let matches=0;rows.forEach((r,i)=>{const match=!q||r.textContent.toLocaleLowerCase().includes(q);if(match)matches++;r.hidden=!match||(!q&&!expanded&&i>=6);});more.hidden=!!q;more.textContent=expanded?'收起这组记录':`展开其余 ${rows.length-6} 项`;more.setAttribute('aria-expanded',String(expanded));no.hidden=matches>0;};
   search.oninput=update;s.querySelector('.sm-section-heading').after(search);s.append(more,no);update();
  }return p;
 }
 function open(kind,ctx,origin,selection={},actions={}){
  const m=FolioStudyWidgets.read(ctx),v=Core.select(kind,m,selection),p=FolioChatUI.openPanel(v.title);p.classList.add('study-menu');p.dataset.motif=v.motif;
  const reroute=(next={})=>open(kind,ctx,origin,{...selection,motif:v.motif,...next},actions),navigate=(screen)=>{FolioChatUI.closePanel(true,false);ctx.open(screen);};
  if(selection.id||selection.courseId||selection.date||selection.group)p.append(btn('‹ 返回'+v.title,()=>reroute({id:null,date:null,courseId:null,group:''}),'sm-back'));
  const top=el('div','sm-context');top.append(el('span','',m.term?.title||m.term?.label||'本机学习记录'),el('span','',date(v.date)));p.append(top);
  const hero=(title,sub,value,label,tone='teal')=>{const h=el('div','sm-hero '+tone),copy=el('div','sm-hero-copy');copy.append(el('h3','',title),el('p','',sub||''));h.append(copy);if(value!=null)metric(h,value,label,tone);p.append(h);return h;};
  const primary=(text,fn)=>p.append(btn(text,fn,'sm-primary'));
  const item=t=>{const actual=homeworkState.items.find(x=>x.id===t.id);if(actual){FolioChatUI.closePanel(true,false);openItem(actual,origin);}else announce('这条记录已更新，请重新打开卡片');};
  const taskMeta=t=>[t.course,t.deadline?date(t.deadline)+(t.deadlineClock?' '+t.deadlineClock:''):t.endAt?.replace('T',' ')||'未设截止',t.estimatedMinutes?`${t.estimatedMinutes} min`:''].filter(Boolean).join(' · ');
  const taskRows=(box,rows)=>rows.forEach(t=>row(box,t.title,taskMeta(t),()=>reroute({id:t.id}),{color:v.urgent(t)?'#A56A4D':'#7E9E9A',value:t.completed?'完成':t.important?'重点':'',active:t===v.selected}));
  const scheduleRows=(box,rows,compact=false)=>rows.forEach(c=>row(box,compact?date(c.date):c.title,compact?`${c.start}–${c.end}`:`${date(c.date)} · ${c.start}–${c.end}`,()=>open('calendar',ctx,origin,{motif:'agenda',id:c.id,date:c.date},actions),{color:m.courseProgress.find(x=>x.id===c.courseId)?.color,value:c.room||'地点待定'}));

  if(['plant','deadline','quadrant','submitted','puzzle'].includes(v.motif)){
   if(v.selected){const t=v.selected,plan=m.projects.find(x=>x.taskId===t.id);hero(t.title,taskMeta(t),t.completed?'✓':t.estimatedMinutes||'—',t.completed?'已完成':'预计分钟',v.urgent(t)?'clay':'teal');if(plan){progress(p,plan.progress);p.append(btn(`步骤计划 · ${Math.round(plan.progress*100)}%`,()=>FolioStudyTools.projectById(plan.id,ctx)));}primary(t.kind==='homework'?'查看作业详情':'查看并处理',()=>item(t));if(t.kind==='homework'&&!plan)p.append(btn('AI拆解这份作业',()=>FolioStudyTools.project(t,ctx)));}
   else{const due=v.items[0],hint=v.motif==='submitted'?'来自学校的提交状态':v.motif==='plant'?'按重要程度与截止时间排列':v.motif==='quadrant'?'点象限查看其中的任务':due?taskMeta(due):'这里仅展示对应的记录';hero(v.motif==='submitted'?'已经交好的作业':v.title,hint,String(v.items.length),v.motif==='submitted'?'学校已交':'项',v.motif==='deadline'?'clay':'teal');}
   if(v.motif==='quadrant')chips(p,[['','全部'],['11','重要 · 紧急'],['10','重要 · 不急'],['01','紧急 · 次要'],['00','暂缓']],v.group,g=>reroute({group:g,id:null}));
   const s=section(p,v.selected?'同一区域的记录':v.motif==='puzzle'?'选择要推进的作业':'对应记录',`${v.items.length} 项`);taskRows(s,v.items.filter(t=>t!==v.selected));if(!s.querySelector('.sm-row'))empty(s,v.selected?'已展示这一区域的全部记录':'这里暂时没有记录');
   if(v.motif==='submitted')info(p,'只显示学校接口明确返回已提交的作业。本地勾选完成不会替代学校提交状态。');
   if(v.motif==='puzzle')info(p,'步骤进度按预计时长加权。AI先生成草稿，确认才保存；完成步骤不会向学校提交。');
   if(v.motif==='quadrant')info(p,'右侧为紧急，上方为重要；显式紧急标记或三天内截止视为紧急。点的大小来自预计耗时。');
   return finish(p);
  }
  if(['agenda','week','nextRing'].includes(v.motif)){
   const c=v.selected;
   if(c){const ms=C.at(c.date)+(Number(c.start.slice(0,2))*60+Number(c.start.slice(3)))*60000-m.now;hero(c.title,`${date(c.date)} · ${c.start}–${c.end}`,c.start,'开始时间','lavender');const details=section(p,c.entryType==='personal'?'事项信息':'上课信息');row(details,'地点',c.room||'暂未提供');if(c.teacher)row(details,'教师',c.teacher);if(ms>0)row(details,'距离开始',duration(ms));if(c.personal)primary('编辑这次安排',()=>{if(c.entryType==='personal')item({id:c.itemId||c.id});else{FolioChatUI.closePanel(true,false);openCalendarEvent(c,origin,m.term);}});else primary('打开课程与排课',()=>navigate('courses'));}
   else{hero(date(v.date),v.motif==='week'?'你点中的这一天':'当天已排好的时间段',String(v.items.length),'段安排','lavender');if(v.motif==='week')chips(p,m.focusDays.map(d=>[d.date,date(d.date)]),v.date,d=>reroute({date:d,id:null}));}
   const s=section(p,c?'同日其他安排':'当天时间线');scheduleRows(s,v.items.filter(x=>x!==c));if(!s.querySelector('.sm-row'))empty(s,'这一天没有其他课程');
   const focusDay=c?.date||v.date,personal=v.motif==='nextRing'?[]:m.allTasks.filter(t=>t.kind!=='lesson'&&!v.items.some(x=>x.itemId===t.id)&&(t.startAt?.startsWith(focusDay)||t.scheduledDay===focusDay||t.deadline===focusDay));if(personal.length){const t=section(p,'个人安排与截止');for(const x of personal)row(t,x.title,x.startAt?.slice(11,16)||x.deadlineClock||'时间待定',()=>item(x),{color:'#C9A26E'});}
   p.append(btn('完整日程',()=>navigate('calendar')));return finish(p);
  }
  if(['books','courseSquares'].includes(v.motif)){
   const c=v.selected;if(c){const rows=m.schedule.filter(r=>r.courseId===c.id),future=rows.filter(r=>C.at(r.date)+((Number(r.end.slice(0,2))*60)+Number(r.end.slice(3)))*60000>m.now);hero(c.title,c.teacher||'本学期课程',c.progress===null?'—':`${Math.round(c.progress*100)}%`,'课次已结束');progress(p,c.progress);const stats=el('div','sm-metrics');metric(stats,String(rows.length),'总课段');metric(stats,String(future.length),'剩余课段');p.append(stats);const cards=m.cards.filter(r=>r.courseId===c.id);if(cards.length)primary(`复习这门课 · ${cards.length} 个知识点`,()=>open('review',ctx,origin,{motif:'mosaic',courseId:c.id},actions));const s=section(p,'接下来的课',`${future.length} 个课段`);scheduleRows(s,future.slice(0,3),true);if(!future.length)empty(s,'没有更多已取得的排课');}
   else hero('本学期的课程','点书脊或色块，查看对应课程',String(v.items.length),'门');
   const s=section(p,c?'其他课程':'课程进度');for(const x of v.items.filter(x=>x!==c)){const r=row(s,x.title,x.teacher||'课表进度',()=>reroute({id:x.id}),{color:x.color,value:x.progress===null?'—':`${Math.round(x.progress*100)}%`});progress(r,x.progress);}if(!v.items.length)empty(s,'还没有本学期课程');info(p,'进度只表示已结束课段 / 全部已取得课段，不代表实际理解或学分。');p.append(btn('完整课程列表',()=>navigate('courses')));return finish(p);
  }
  if(['curve','reviewBlocks','mosaic','fan'].includes(v.motif)){
   const card=v.selected||(v.motif==='curve'?v.items.slice().sort((a,b)=>b.reviews.length-a.reviews.length)[0]:null);
   if(card){hero(card.title||'知识点',m.courses.find(c=>c.id===card.courseId)?.title||'问答闪卡',card.reviews.length?`${Math.round(card.memory*100)}%`:'—','估算记忆','sage');const q=el('p','sm-question',card.question);p.append(q);primary('回忆这张卡',()=>actions.reviewCard(card,ctx));const s=section(p,'最近复习');for(const r of card.reviews.slice(-4).reverse())row(s,date(r.date),['忘记','生疏','部分掌握','熟悉','熟练'][r.level],null,{value:`${r.level} / 4`});if(!card.reviews.length)empty(s,'还没有复习记录');}
   else{hero(v.motif==='reviewBlocks'?'现在该回忆的知识':'先回忆，再看答案',selection.courseId?m.courses.find(c=>c.id===selection.courseId)?.title:'重点课程、记忆较弱、即将上课优先',String(v.items.filter(c=>c.due).length),'待复习','sage');if(v.items.length)primary('开始学习',()=>actions.reviewCard(v.items.find(c=>c.due)||v.items[0],ctx));}
   if(v.motif!=='reviewBlocks')chips(p,[['','全部'],['due','待复习'],['learned','未到期']],v.group,g=>reroute({group:g,id:null}));
   const s=section(p,card?'其他知识点':'知识点');for(const x of v.items.filter(x=>x!==card))row(s,x.title||x.question,m.courses.find(c=>c.id===x.courseId)?.title||'未指定课程',()=>reroute({id:x.id}),{color:x.due?'#A56A4D':'#7E9E9A',value:x.due?'待复习':'未到期'});if(!v.items.length)empty(s,'先添加知识点，才会形成复习提醒');
   const manage=el('details','sm-info');manage.append(el('summary','','添加与管理'),btn('添加问答闪卡',()=>actions.newCard(ctx,card?.courseId||selection.courseId)),btn('AI从材料生成',()=>FolioStudyTools.generate(ctx,{courseId:card?.courseId||selection.courseId})));FolioStudyTools.pending(manage,ctx);p.append(manage);info(p,'颜色和百分比是依据明确自评与复习间隔估算的提醒，不是实际掌握度测量。AI建议也需要确认后才应用。');return finish(p);
  }
  if(['hourglass','mountain','domino'].includes(v.motif)){
   const e=v.selected;if(e){const days=Math.ceil((C.at(e.date)-C.at(m.today))/C.DAY);hero(e.title||'考试',`${date(e.date)} · ${e.start||'时间待定'}${e.end?'–'+e.end:''}`,C.examTime(e)<=m.now?'✓':String(Math.max(0,days)),C.examTime(e)<=m.now?'已结束':'天后','clay');const s=section(p,'考试信息');row(s,'考场',e.room||e.location||'暂未提供');if(e.seat)row(s,'座位',e.seat);}
   else hero('逐场准备，逐场结束','点多米诺可定位到那场考试',String(m.exams.filter(e=>C.examTime(e)>m.now).length),'场待考','clay');
   chips(p,[['','全部'],['upcoming','待考'],['finished','已结束']],v.group,g=>reroute({group:g,id:null}));const s=section(p,e?'其他考试':'考试安排');for(const x of v.items.filter(x=>x!==e))row(s,x.title||'考试',`${date(x.date)} · ${x.start||'时间待定'}`,()=>reroute({id:x.id}),{color:C.examTime(x)<=m.now?'#9DA98F':'#A56A4D',value:C.examTime(x)<=m.now?'已结束':'待考'});if(!v.items.length)empty(s,'没有这一类考试记录');p.append(btn('完整考试安排',()=>{FolioChatUI.closePanel(true,false);showPreviewScreen('exams');}));info(p,'结束状态来自考试结束时间，不会因点击图形而修改官方记录。倒计时图形表示考前21天。');return finish(p);
  }
  if(['focus','focusBars','streak','tomatoes','focusBands'].includes(v.motif)){
   const d=v.selected?.date||v.date,ms=m.focus.byDay?.[d]||0;hero(v.motif==='streak'?'把学习连起来':date(d),v.motif==='tomatoes'?'实际完成的25分钟会话':v.motif==='focusBands'?'本机保存的番茄专注时段':'本机保存的专注记录',v.motif==='streak'?String(m.streak):v.motif==='tomatoes'?String(m.tomatoCount):duration(ms),v.motif==='streak'?'连续天数':v.motif==='tomatoes'?'个番茄':'专注时长');
   if(d===m.today){progress(p,m.focus.today/(m.study.focusGoal*60000));primary(m.pomodoro?.active?'继续这一轮专注':'开始25分钟专注',()=>FolioPomodoroUI.open());}
   if(['focusBars','streak'].includes(v.motif)){const s=section(p,'最近七天','点一天查看');const bars=el('div','sm-week-bars');const max=Math.max(60000,...m.focusDays.map(x=>x.ms));for(const x of m.focusDays){const b=btn('',()=>reroute({date:x.date}),'sm-day-bar'+(x.date===d?' is-active':''));b.setAttribute('aria-label',date(x.date)+' '+duration(x.ms));const track=el('span'),fill=el('i');fill.style.height=Math.max(3,x.ms/max*100)+'%';track.append(fill);b.append(el('small','',Math.round(x.ms/60000)),track,el('small','',x.date.slice(8)));bars.append(b);}s.append(bars);}
   const sessions=(m.pomodoro?.sessions||[]).filter(x=>Number.isFinite(x.endedAt)&&C.day(x.endedAt)===d),s=section(p,'已保存的番茄会话',`${sessions.length} 次`);for(const x of sessions.slice().reverse()){const start=x.segments?.[0]?.start,clock=t=>new Date(t+8*3600000).toISOString().slice(11,16);row(s,start?`${clock(start)}–${clock(x.endedAt)}`:'专注会话',x.completed?'已完成25分钟':'提前结束',null,{value:duration((x.segments||[]).reduce((n,v)=>n+v.end-v.start,0))});}if(!sessions.length)empty(s,'这一天没有保存的番茄会话；其他专注计时仍计入上方总时长');p.append(btn('专注账本',()=>navigate('focus')),btn('调整每日目标',()=>actions.goals()));return finish(p);
  }
  if(['moons','coffee','dayArc'].includes(v.motif)){
   if(v.motif==='coffee'){hero('今天喝了几杯？','手动记录，不推断健康状态',m.coffee===null?'—':String(m.coffee),'杯','clay');primary(m.coffee===null?'记录今日杯数':'修改今日杯数',()=>actions.routine('coffee',m.today));}
   else if(v.motif==='moons'){const n=v.selected||m.nights.at(-1);hero(date(n.date)+'醒来',n.hours===null?'尚未记录这一夜':`睡眠目标 ${m.study.sleepGoal} 小时`,n.hours===null?'—':String(n.hours),'小时','lavender');primary(n.hours===null?'记录这一夜':'修改这一夜',()=>actions.routine('sleep',n.date));const s=section(p,'最近七夜','点月亮对应日期');for(const x of m.nights.slice().reverse())row(s,date(x.date),x.hours===null?'未记录':x.hours>=m.study.sleepGoal?'达到个人目标':'未到个人目标',()=>reroute({date:x.date}),{active:x===n,color:'#8886B0',value:x.hours===null?'—':`${x.hours}h`});}
   else{hero('此刻的作息',date(m.today),new Date(m.now+8*3600000).toISOString().slice(11,16),'现在','lavender');const s=section(p,'今天的记录');row(s,'昨夜睡眠',m.nights.at(-1)?.hours==null?'未记录':`${m.nights.at(-1).hours} 小时`,()=>actions.routine('sleep',m.today),{color:'#8886B0'});row(s,'咖啡',m.coffee===null?'未记录':`${m.coffee} 杯`,()=>actions.routine('coffee',m.today),{color:'#A56A4D'});row(s,'今日安排',`${m.daySchedule.length} 个课段`,()=>open('calendar',ctx,origin,{motif:'agenda'},actions),{color:'#7E9E9A'});}
   info(p,'日期表示醒来的那一天。未记录的睡眠和咖啡保持空白，不从手机使用或时钟推断。');return finish(p);
  }
  if(v.motif==='rings'){
   const values=[['focus','专注',duration(m.focus.today),`${m.study.focusGoal} min 目标`,m.focus.today/(m.study.focusGoal*60000),'#A56A4D'],['tasks','任务',`${m.tasks.length-m.pending.length} / ${m.tasks.length}`,'现存任务已完成',m.tasks.length?(m.tasks.length-m.pending.length)/m.tasks.length:0,'#7E9E9A'],['review','复习',String(m.reviewed),`${m.reviewDue.length} 个待复习`,m.reviewed/(m.reviewed+m.reviewDue.length||1),'#C9A26E']];
   hero('今天的三个方向','每个环都有自己的记录和下一步',null,null);for(const [id,title,value,meta,f,color]of values){const r=row(p,title,meta,()=>open(id,ctx,origin,{motif:{focus:'focusBars',tasks:'plant',review:'reviewBlocks'}[id]},actions),{color,value,active:selection.ring===id});progress(r,f);}p.append(btn('调整每日目标',()=>actions.goals()));return finish(p);
  }
  if(['stairs','gradeRings','trend'].includes(v.motif)){
   if(m.academic.hidden){hero('成绩与绩点已隐藏','沿用全局隐私设置','—','均绩','lavender');return finish(p);}
   const a=m.academic,summary=a.termSummary||a.summary,selected=v.selected;
   if(v.motif==='gradeRings'&&selected){hero(selected.title||selected.name||'课程成绩','本学期已出分记录',num(selected.five),'绩点','lavender');if(Number.isFinite(selected.score))row(p,'分数',String(selected.score));}
   else if(v.motif==='trend'&&selected)hero(selected.title||selected.label||selected.termId||'所选学期','已出分课程的均绩',num(selected.gpa),'均绩','lavender');
   else{hero('本学期已出分均绩',m.term?.title||m.term?.label||'',num(summary?.gpa?.[0]),'均绩','lavender');if(Number.isFinite(a.goal?.target)){const s=el('div','sm-metrics');metric(s,num(a.goal.target),'设置的目标','clay');metric(s,num(a.goal.target-summary?.gpa?.[0]),'距目标','lavender');p.append(s);}}
   const s=section(p,v.motif==='trend'?'按学期查看':'本学期课程');for(const x of v.motif==='trend'?(a.series||[]):(a.termCourseGrades||[]))row(s,x.title||x.name||x.label||x.termId||'课程',v.motif==='trend'?'学期均绩':'已出分',()=>open('grades',ctx,origin,{motif:v.motif==='trend'?'trend':'gradeRings',id:String(x.id??x.courseId??x.termId)},actions),{value:num(v.motif==='trend'?x.gpa:x.five),color:'#8886B0',active:x===selected});if(!s.querySelector('.sm-row'))empty(s,'暂无可展示的已出分记录');p.append(btn('完整成绩',()=>navigate('grades')));info(p,'这里只描述已出分课程；设置的目标不是未来成绩的保证。遵从全局成绩隐藏与揭晓规则。');return finish(p);
  }
  empty(p,'暂时没有对应记录');return finish(p);
 }
 function records({title,caption='',metrics=[],groups=[],explanation='',primary}){
  const p=FolioChatUI.openPanel(title);p.classList.add('study-menu');const h=el('div','sm-hero'),copy=el('div','sm-hero-copy');copy.append(el('h3','',title),el('p','',caption));h.append(copy);if(metrics[0])metric(h,metrics[0].value,metrics[0].label);p.append(h);
  if(metrics.length>1){const grid=el('div','sm-metrics');for(const x of metrics.slice(1))metric(grid,x.value,x.label,x.tone);p.append(grid);}
  for(const g of groups){const s=section(p,g.title,`${g.rows.length} 项`);for(const r of g.rows)row(s,r.title,r.meta,r.action?()=>{FolioChatUI.closePanel(true,false);r.action();}:null,{value:r.value,color:r.color});if(!g.rows.length)empty(s,g.empty||'暂无对应记录');}
  if(primary)p.append(btn(primary.label,()=>{FolioChatUI.closePanel(true,false);primary.action();},'sm-primary'));if(explanation)info(p,explanation);return finish(p);
 }
 window.FolioStudyMenuUI=Object.freeze({open,records});
})();
