/* Today's column beside home. Personal items form independent rows below it. */
(()=>{
  'use strict';
  const home=previewScreens.home,phone=home.closest('.phone'),L=FolioHomeWeekLayout;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
  const panel=el('section','home-week');panel.hidden=true;panel.setAttribute('aria-label','首页今日周历');
  const toolbar=el('div','home-week-toolbar'),range=el('button','home-week-range');range.type='button';range.setAttribute('aria-label','查看今天日程');
  const nav=(label,path,action)=>{const b=el('button','home-week-nav');b.type='button';b.setAttribute('aria-label',label);b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;b.onclick=action;return b;};
  let opened=false,settling=false,timer=null,visible=false,projectedItems=new Map();
  const table=el('div','home-week-table'),bottom=el('section','home-week-bottom'),strips=el('div','home-week-strips');bottom.setAttribute('aria-label','独立于时间表的事项');bottom.append(strips);
  toolbar.append(range,nav('收起周历','m14 6-6 6 6 6',()=>close()));panel.append(toolbar,table,bottom);
  const returnButton=el('button','home-week-return');returnButton.type='button';returnButton.hidden=true;returnButton.setAttribute('aria-label','收起周历，返回对话');returnButton.onclick=()=>close();phone.append(panel,returnButton);
  function sizeColumn(){panel.style.setProperty('--home-day-width',`${Math.max(32,(phone.clientWidth-62)/7)}px`);}
  sizeColumn();
  const width=()=>panel.offsetWidth+24,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function offset(){return visible?Math.max(0,new DOMMatrixReadOnly(getComputedStyle(home).transform).m41):0;}
  function position(x){home.style.transform=`translateX(${x}px)`;panel.style.transform=`translateX(${-18*(1-x/width())}px)`;returnButton.style.width=Math.max(0,phone.clientWidth-width())+'px';}
  function reveal(){if(visible)return;visible=true;panel.hidden=false;phone.classList.add('is-home-week-visible');render();}
  function drag(x){
    clearTimeout(timer);timer=null;settling=false;reveal();home.style.transition='none';panel.style.transition='none';home.inert=true;returnButton.hidden=true;
    position(Math.max(0,Math.min(width(),x)));
  }
  function finish(open){
    settling=false;timer=null;opened=open;returnButton.hidden=!open;home.inert=open;
    home.style.removeProperty('transition');panel.style.removeProperty('transition');
    if(!open){visible=false;panel.hidden=true;phone.classList.remove('is-home-week-visible');home.style.removeProperty('transform');panel.style.removeProperty('transform');}
  }
  function settle(open,immediate=false){
    clearTimeout(timer);timer=null;if(!visible&&!open)return;if(open)reveal();
    settling=true;home.inert=true;returnButton.hidden=true;
    const duration=immediate||reduced()?0:360;
    home.style.transition=`transform ${duration}ms cubic-bezier(.22,.8,.26,1)`;panel.style.transition=`transform ${duration}ms cubic-bezier(.22,.8,.26,1)`;
    position(open?width():0);
    if(!duration)finish(open);else timer=setTimeout(()=>finish(open),duration);
  }
  function close(immediate=false){settle(false,immediate);}
  range.onclick=()=>{selectCalendarDay(homeworkState.today);showCalendarView('month');showPreviewScreen('calendar');};
  function render(){
    projectedItems=new Map(homeworkState.items.map(i=>[i.id,i]));
    const data=L.collectDay(homeworkState.today,{
      coursesOn:date=>FolioCourses.semesters.flatMap(term=>FolioCourses.onDate(term,date,undefined,"home").map(e=>({...e,semesterId:term.id}))),
      examsOn:date=>FolioCourses.semesters.flatMap(term=>FolioExams.entries(currentExams(term.id).filter(e=>!e.unscheduled),date)),
      itemsFor:date=>{const items=FolioTodo.materialize(structuredClone(homeworkState.items),date);items.forEach(i=>projectedItems.set(i.id,i));return items;},items:homeworkState.items
    });
    range.replaceChildren(el('small','',['日','一','二','三','四','五','六'][new Date(data.date+'T00:00:00Z').getUTCDay()]),el('span','',Number(data.date.slice(8))));range.title=data.date;
    const grid=el('div','home-week-grid'),axis=el('div','home-week-axis'),columns=el('div','home-week-columns');
    for(const h of [0,6,8,10,12,14,16,18,20,22,24]){const label=el('span','',String(h).padStart(2,'0')+':00');label.style.top=L.at(h*60)*100+'%';axis.append(label);}
    for(const day of [{date:data.date,entries:data.entries}]){
      const column=el('div','home-week-column'+(day.date===homeworkState.today?' is-today':''));column.dataset.date=day.date;
      for(const h of [0,6,8,10,12,14,16,18,20,22,24]){const line=el('i','home-week-hour');line.style.top=L.at(h*60)*100+'%';column.append(line);}
      for(const [start,end] of [[0,360],[1320,1440]]){const night=el('i','home-week-night');night.style.top=L.at(start)*100+'%';night.style.height=(L.at(end)-L.at(start))*100+'%';column.append(night);}
      for(const {entry,lane,count} of L.lanes(day.entries)){
        const b=el('button','home-week-event'+(entry.kind==='deadline'?' is-deadline':'')+(entry.completed?' is-completed':''));b.type='button';b.dataset.eventId=entry.id;
        b.style.setProperty('--entry-color',entry.kind==='exam'?'#D5AB99':entry.color|| (entry.itemKind==='event'?'#B8CDC4':'#DBCCA8'));
        const clock=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
        const time=clock(entry.startMinute)+(entry.kind==='deadline'?' 截止':entry.endMinute>entry.startMinute?'–'+clock(entry.endMinute):'');
        b.setAttribute('aria-label',`${day.date} ${time} ${entry.title}`);b.title=`${entry.title} · ${time}${entry.room?' · '+entry.room:''}`;
        b.style.top=`min(${L.at(entry.startMinute)*100}%,calc(100% - 14px))`;
        b.style.height=`max(10px,${(L.at(entry.endMinute)-L.at(entry.startMinute))*100}%)`;
        b.style.left=`calc(${lane/count*100}% + 1px)`;b.style.width=`calc(${100/count}% - 2px)`;
        b.append(el('span','',entry.title));if(entry.room)b.append(el('small','home-week-room',entry.room));b.onclick=()=>openEntry(entry,b);column.append(b);
      }
      if(day.date===homeworkState.today){const now=calendarNowMinute(),line=el('i','home-week-now');line.style.top=L.at(now)*100+'%';column.append(line);}
      columns.append(column);
    }
    grid.append(axis,columns);table.replaceChildren(grid);strips.replaceChildren();bottom.hidden=!data.items.length;
    for(const [index,entry] of data.items.entries()){const b=el('button','home-week-strip'+(entry.completed?' is-completed':''));b.type='button';b.dataset.itemId=entry.itemId;b.setAttribute('aria-label',`打开事项 ${index+1}`);b.onclick=()=>openEntry(entry,b);strips.append(b);}
  }
  function openEntry(entry,origin){
    if(entry.itemId){const item=projectedItems.get(entry.itemId);if(item)openItem(item,origin);}
    else {const term=FolioCourses.semesters.find(t=>t.id===entry.semesterId)||calendarSemester;openCalendarEvent(entry,origin,term);}
  }
  document.addEventListener('preview-screen-change',()=>{if(visible)close(true);});
  for(const name of ['folio-data-change','folio-school-change','folio-exams-change','folio-schedule-overrides-change'])document.addEventListener(name,()=>{if(visible)render();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visible&&!document.querySelector('.sheet-layer:not([hidden]),.chat-layer:not([hidden])')){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  new ResizeObserver(()=>{sizeColumn();if(visible&&!settling)position(opened?width():Math.min(offset(),width()));}).observe(phone);
  setInterval(()=>{if(visible&&!document.hidden)render();},60000);
  window.FolioHomeWeek=Object.freeze({open(){if(currentScreen==='home')settle(true);},close,drag,settle,offset,width,get visible(){return visible;},get opened(){return opened;},contains:target=>panel.contains(target)||returnButton.contains(target)});
})();
