/* Numerical ledger widgets read existing local records. Never seed demonstration history. */
(()=>{
  'use strict';const S=FolioStats,installed=new Set(),FKEY='folio-focus-study-v1';
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
  function focus(){let raw=null;try{raw=JSON.parse(localStorage.getItem(FKEY));}catch{}return S.focus(window.FolioPomodoro?.focusSnapshot(raw)||raw,Date.now());}
  function now(){return {date:homeworkState.today,clock:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())};}
  function model(kind){const n=now();return kind==='focus'?focus():kind==='tasks'?S.tasks(homeworkState.items,n.date,n.clock):S.semester(FolioCourses.semesters[0],n.date,n.clock,FolioCourses.onDate);}
  function metric(parent,label,value,unit=''){const m=el('span','overview-metric'),n=el('strong','overview-number',String(value??'—'));if(String(value??'—').length>=4)n.style.fontSize=Math.max(7,14-(String(value).length-3)*1.8)+'cqw';if(unit)n.append(el('small','overview-unit',unit));m.append(el('span','overview-label',label),n);parent.append(m);return m;}
  function time(parent,label,ms){const d=S.duration(ms);return metric(parent,label,d.value,d.unit);}
  function sub(parent,text){parent.append(el('span','overview-sub',text));}
  function sheet(kind,part,origin){
    const value=model(kind);let rows=[],description='';
    if(kind==='focus'){
      const label={last:'上周专注',total:'累计专注',week:'本周专注',houses:'专注成果'}[part];openHomeworkSheet(label,origin);
      if(part==='houses'){description='只统计本机已保存的成果；演示预览不算记录。';rows=value.buildings.slice().reverse().map(b=>({title:S.day(b.completedAt)+' · 小屋',meta:(b.minutes||45)+' 分钟'}));}
      else{description='按北京时间、周一至周日统计；暂停不计时，跨日按实际时段拆分。当前搭建最多计45分钟。';rows=Object.entries(value.byDay).filter(([date])=>part==='total'||part==='week'&&date>=value.weekStart||part==='last'&&date<value.weekStart&&date>=value.lastWeekDays[0].date).sort((a,b)=>b[0].localeCompare(a[0])).map(([date,ms])=>{const t=S.duration(ms);return {title:date,meta:t.value+' '+t.unit};});}
    }else if(kind==='tasks'){
      const label={completed:'已完成记录',homework:'未交作业',todos:'未完待办',deadlines:'截止分布'}[part];openHomeworkSheet(label,origin);
      description=part==='completed'?'仅当前保存记录中的完成数量；旧记录没有完成时间，不能据此推算本周完成量。':part==='deadlines'?'按实际截止日期统计逾期、今天起三天内到期和无期限事项；与便签预留完整工作日的火烟提醒分开。':'';
      rows=(part==='deadlines'?[...value.overdue,...value.next3,...value.undated]:value[part]).map(i=>({title:i.title,meta:[i.course,i.completed?'已完成':i.deadline||i.endAt?.slice(0,10)||'无期限'].filter(Boolean).join(' · '),item:i}));
    }else{
      openHomeworkSheet({remaining:'剩余课程',this:'本周课程',next:'下周课程',days:'剩余上课日'}[part],origin);description='节次来自本学期课表和校历，包含正在进行的整节课程；休假与调课沿用日程规则。';
      rows=(value?{remaining:value.remainingRows,this:value.thisWeekRows,next:value.nextWeekRows,days:value.remainingRows}[part]:[]).map(c=>({title:c.title,meta:`${c.date} · ${c.start} · ${c.periods} 节`}));
    }
    if(description)homeworkBody.append(el('p','stats-detail-note',description));
    if(!rows.length)homeworkBody.append(el('p','stats-detail-note','暂无记录'));
    for(const row of rows){const n=el(row.item?'button':'div','stats-detail-row');n.append(el('strong','',row.title),el('span','',row.meta));if(row.item){n.type='button';n.onclick=()=>openItem(row.item,n);}homeworkBody.append(n);}
  }
  function region(root,kind,part,label,preview){const n=el(preview?'div':'button','overview-region stats-'+part);if(!preview){n.type='button';n.dataset.widgetHold='';n.setAttribute('aria-label',label);n.onclick=()=>sheet(kind,part,n);}root.append(n);return n;}
  function draw(root,kind,preview){const v=model(kind),sig=JSON.stringify(v);if(sig===root._signature)return;root._signature=sig;root.replaceChildren();
    if(kind==='focus'){
      const last=region(root,kind,'last','查看上周专注记录',preview);time(last,'上周专注',v.lastWeek);const bars=el('span','stats-mini-bars');const max=Math.max(1,...v.lastWeekDays.map(d=>d.ms));for(const d of v.lastWeekDays){const b=el('i','');b.style.height=Math.max(5,d.ms/max*100)+'%';b.classList.toggle('is-empty',!d.ms);bars.append(b);}last.append(bars);
      const total=region(root,kind,'total','查看累计专注记录',preview);time(total,'累计',v.total);sub(total,'活跃 '+v.days+' 天');
      const week=region(root,kind,'week','查看本周专注记录',preview);time(week,'本周',v.thisWeek);const td=S.duration(v.today);sub(week,'今日 '+td.value+' '+td.unit);
      const houses=region(root,kind,'houses','查看专注搭建成果',preview);metric(houses,'已建小屋',v.buildings.length,'间');const drawing=el('span','stats-house');drawing.innerHTML='<svg viewBox="0 0 70 40" aria-hidden="true"><path d="M8 19h27v20H8z" fill="#ceaf86"/><path d="m4 20 17-16 18 16" fill="#b78578"/><path d="M18 28h8v11h-8" fill="#f4eadb"/><path d="M45 22h17v17H45z" fill="#b6bd9c"/><path d="m42 23 11-11 12 11" fill="#8fa28e"/></svg>';houses.append(drawing);
    }else if(kind==='tasks'){
      const done=region(root,kind,'completed','查看已完成任务记录',preview);metric(done,'记录内已完成',v.completed.length);sub(done,'/ '+v.total);const track=el('span','stats-completion-track'),fill=el('i','');fill.style.width=(v.total?v.completed.length/v.total*100:0)+'%';track.append(fill);done.append(track);
      const h=region(root,kind,'homework','查看未交作业记录',preview);metric(h,'作业',v.homework.length,'份');sub(h,'待完成');const t=region(root,kind,'todos','查看未完成待办记录',preview);metric(t,'待办',v.todos.length,'项');sub(t,'待完成');
      const due=region(root,kind,'deadlines','查看任务截止分布',preview);[['逾期',v.overdue.length],['三日内',v.next3.length],['无期限',v.undated.length]].forEach(([label,n])=>metric(due,label,n));
    }else{
      const left=region(root,kind,'remaining','查看学期剩余课时',preview);metric(left,'剩余课时',v?.remaining,'节');sub(left,'/ '+(v?.total??'—'));
      const a=region(root,kind,'this','查看本周课时',preview);metric(a,'本周',v?.thisWeek,'节');const b=region(root,kind,'next','查看下周课时',preview);metric(b,'下周',v?.nextWeek,'节');
      const days=region(root,kind,'days','查看剩余上课日期',preview);metric(days,'还要上课',v?.days,'天');sub(days,(v?.courses??'—')+' 门课程');
    }
  }
  function mount(container,kind,preview=false){const root=el('div','overview-widget stats-widget stats-'+kind);draw(root,kind,preview);container.append(root);if(!preview)installed.add({root,kind});}
  function update(){for(const n of installed){if(!n.root.isConnected){installed.delete(n);continue;}draw(n.root,n.kind,false);}}
  for(const event of ['folio-data-change','folio-school-change','folio-focus-change'])document.addEventListener(event,update);
  document.addEventListener('storage',e=>{if(e.key===FKEY)update();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  document.addEventListener('preview-screen-change',e=>{if(e.detail.screen==='workbench')update();});setInterval(()=>{if(!document.hidden&&currentScreen==='workbench')update();},60000);
  FolioWorkbench.registerMany([
    {id:'stats-focus',label:'专注账本',description:'上周 / 累计 / 本周 / 搭建成果',mount:c=>mount(c,'focus'),preview:c=>mount(c,'focus',true)},
    {id:'stats-tasks',label:'任务账本',description:'完成记录 / 作业 / 待办 / 截止分布',mount:c=>mount(c,'tasks'),preview:c=>mount(c,'tasks',true)},
    {id:'stats-semester',label:'课程统计',description:'剩余课时 / 本周 / 下周 / 上课天数',mount:c=>mount(c,'semester'),preview:c=>mount(c,'semester',true)}
  ]);
})();
