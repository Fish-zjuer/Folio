/* First production widget adapters. Same approved art, real app state, no embedded demo pages. */
(()=>{
 'use strict';const NS='http://www.w3.org/2000/svg',views=new Set(),colors=['#e3d5bb','#d9be90','#cf9f69','#c1835e','#a7654a'];
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
 const svg=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!=null)n.textContent=text;return n;};
 const focus=FolioFocusStore(FolioFocus,FolioBuilding,localStorage,Date.now,()=>document.dispatchEvent(new Event('folio-focus-change')));
 let panel=null,panelTime=null,panelSummary=null,panelToggle=null,panelRest=null;
 function action(text,run){const b=el('button','live-widget-action',text);b.type='button';b.onclick=()=>{try{run();refresh();updatePanel();}catch{announce('没有保存成功，原来的专注记录仍保留。');}};return b;}
 function updatePanel(){if(!panel?.isConnected||homeworkLayer.hidden)return;const s=focus.snapshot(),a=s.active,mins=Math.floor(focus.elapsed()/60000),count=FolioBuilding.collection(s).length;panelTime.textContent=mins+' / 45 分钟';panelSummary.textContent='已建好 '+count+' 间 · 暂停与休息不计时';panelToggle.textContent=a?.runningFrom!=null?'暂停':a||s.sessions.at(-1)?.buildingDraft?'继续搭建':'开始一间小屋';panelRest.disabled=!a;}
 function openFocus(origin){
   openHomeworkSheet('专注搭建',origin);panel=el('div','live-focus-panel');panelTime=el('p','live-focus-time');panelSummary=el('p','live-widget-description');const buttons=el('div','live-widget-actions');panelToggle=action('',()=>focus.toggle());panelRest=action('保存，休息',()=>focus.rest());buttons.append(panelToggle,panelRest);panel.append(panelTime,panelSummary,buttons,el('p','live-widget-description','查资料不会自动中断。收起后继续计时，45 分钟完成一间小屋；下一间由你开始。'));homeworkBody.append(panel);updatePanel();
 }
 function paper(x,y,w,seed){const n=i=>{const v=Math.sin(seed*19.27+i*8.3)*43758.54;return(v-Math.floor(v)-.5)*1.3},r=seed%4===0?2:.8;return `M${x+r} ${y+n(1)}Q${x+w*.48} ${y+n(2)} ${x+w-r} ${y+n(3)}Q${x+w} ${y} ${x+w+n(4)} ${y+r}L${x+w+n(5)} ${y+w-r}Q${x+w} ${y+w} ${x+w-r} ${y+w+n(6)}Q${x+w*.5} ${y+w+n(7)} ${x+r} ${y+w}Q${x} ${y+w} ${x+n(8)} ${y+w-r}L${x+n(9)} ${y+r}Q${x} ${y} ${x+r} ${y+n(1)}Z`;}
 function pressureData(dates){
   const term=FolioCourses.semesters[0],all=FolioQueue.calendarEntries(homeworkState.items).filter(i=>i.kind!=='mount');
   return dates.flatMap(d=>{
     const classes=term?.calendar&&!term.stale?FolioCourses.onDate(term,d.key):[];
     const minute=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
     const rows=classes.map(c=>({date:d.key,title:c.title,minutes:minute(c.end)-minute(c.start),kind:'course'}));
     for(const item of FolioCalendar.dayEntries(all,d.key)){
       rows.push({date:item.kind==='deadline'?null:d.key,due:item.kind==='deadline'?d.key:null,title:item.title,minutes:item.endMinute>item.startMinute?item.endMinute-item.startMinute:null,kind:item.kind,completed:item.completed,itemId:item.itemId});
     }return rows;
   });
 }
 function pressureDetail(date,rows,origin){
   openHomeworkSheet(date,origin);const data=FolioPressure.summary(rows,date),term=FolioCourses.semesters[0];
   homeworkBody.append(el('p','live-widget-description',`${data.minutes} 分钟已排时长。仅有截止日期的作业不会被猜成工作时长。`));
   if(!term?.calendar||term.stale)homeworkBody.append(el('p','live-widget-description','课表尚未同步或学期待校正，当前色块只含已有个人安排。'));
   for(const r of [...data.scheduled,...data.due]){const row=el(r.itemId?'button':'div','stats-detail-row');row.append(el('strong','',r.title),el('span','',r.due?'到期事项':r.minutes?r.minutes+' 分钟':'未安排时长'));if(r.itemId){row.type='button';row.onclick=()=>{const item=homeworkState.items.find(i=>i.id===r.itemId);if(item)openItem(item,row);};}homeworkBody.append(row);}
   if(!data.scheduled.length&&!data.due.length)homeworkBody.append(el('p','live-widget-description','这天暂无已保存的安排。'));
 }
 function renderPressure(root,preview){
   const today=homeworkState.today,[year,month]=today.split('-').map(Number),dates=FolioPressure.month(year,month-1),data=pressureData(dates),signature=JSON.stringify([today,data]);if(root._signature===signature)return;root._signature=signature;root.replaceChildren();
   const image=svg('svg',{viewBox:'0 0 260 260','aria-label':'本月已排时长热力图'}),rows=dates.length/7,size=26,step=30,x0=27,y0=128-(rows*size+(rows-1)*4)/2;
   image.append(svg('path',{d:'M199 33a10 10 0 0 1 20 0m-25 0h-5m35 0h5m-20-15v-5m-12 9-4-4m28 4 4-4M29 226l7-4m-4 11 7-4m-4 11 7-4',fill:'none',stroke:'#c5aa82','stroke-width':1.7,'stroke-linecap':'round'}));
   dates.forEach((d,i)=>{const x=x0+i%7*step,y=y0+Math.floor(i/7)*step,s=FolioPressure.summary(data,d.key),g=svg('g',{opacity:d.inMonth?1:.32}),fill=svg('path',{d:paper(x,y,size,i),fill:colors[s.level]});g.append(fill);if(!preview){g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',`${d.key}，已排 ${s.minutes} 分钟，${s.due.length} 件到期`);g.onclick=()=>pressureDetail(d.key,data,g);g.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();pressureDetail(d.key,data,g);}};}if(d.key===today)g.append(svg('path',{d:`M${x+13} ${y+7}v12m-4-4 4 4 4-4`,fill:'none',stroke:s.level>=2?'#f6ead5':'#9d7952','stroke-width':2,'stroke-linecap':'round'}));image.append(g);});
   let x=79;colors.forEach((color,i)=>{const s=8+i*3;image.append(svg('path',{d:paper(x,246-s,s,i+41),fill:color}));x+=s+8;});root.append(image);
 }
 function renderFocus(root,preview){
   const state=focus.snapshot(),minutes=Math.floor(focus.elapsed()/60000),count=FolioBuilding.collection(state).length,signature=JSON.stringify([minutes,count,!!state.active]);if(root._signature===signature)return;root._signature=signature;root.replaceChildren();
   const image=svg('svg',{viewBox:'0 0 240 240'}),scene=svg('g');FolioBuildingArt.draw(scene,minutes,count);image.append(scene,svg('text',{x:20,y:40,class:'live-focus-number'},String(minutes)),svg('text',{x:20+Math.max(1,String(minutes).length)*19+9,y:40,class:'live-focus-goal'},'/ 45'));root.append(image);
   root.setAttribute('aria-label',`专注搭建，${minutes} / 45 分钟，已建 ${count} 间`);if(!preview){root.dataset.widgetHold='';root.onclick=()=>openFocus(root);}
 }
 function mount(container,kind,preview=false){const root=el(kind==='focus'&&!preview?'button':'div','live-widget live-'+kind);if(root.tagName==='BUTTON')root.type='button';container.append(root);(kind==='focus'?renderFocus:renderPressure)(root,preview);const entry={root,kind};if(!preview)views.add(entry);return()=>{views.delete(entry);root.remove();};}
 function refresh(kind){for(const v of views){if(!v.root.isConnected){views.delete(v);continue;}if(!kind||v.kind===kind)(v.kind==='focus'?renderFocus:renderPressure)(v.root,false);}}
 for(const name of ['folio-data-change','folio-school-change'])document.addEventListener(name,()=>refresh());
 document.addEventListener('folio-focus-change',()=>refresh('focus'));
 document.addEventListener('folio-focus-open',event=>openFocus(event.detail?.origin||document.activeElement));
 window.addEventListener('storage',event=>{if(event.key==='folio-focus-study-v1'){focus.reload();refresh('focus');updatePanel();}});
 function resume(){if(window.FolioApp?.native&&homeworkState.today!==FolioBackend.today()){homeworkState.today=FolioBackend.today();commit();}try{focus.tick();}catch{}refresh();updatePanel();}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume();});document.addEventListener('preview-screen-change',e=>{if(e.detail.screen==='workbench')resume();});
 setInterval(()=>{try{focus.tick();}catch{}if(!document.hidden){refresh('focus');updatePanel();}},1000);setInterval(()=>{if(!document.hidden)resume();},60000);
 FolioWorkbench.registerMany([
   {id:'sample-pressure',label:'每日压力',description:'已接本地课表与个人安排 · 截止不猜工时',mount:c=>mount(c,'pressure'),preview:c=>mount(c,'pressure',true)},
   {id:'sample-focus',label:'专注搭建',description:'可开始 / 暂停 / 保存 · 与专注账本共用记录',mount:c=>mount(c,'focus'),preview:c=>mount(c,'focus',true)}
 ]);
})();
