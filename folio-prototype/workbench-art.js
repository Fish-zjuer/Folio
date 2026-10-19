/* Approved design renderers, copied without demo data or page controls. */
(() => {
  'use strict';
  const time=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  function mount(container,{events=[],now=0,onSelect=()=>{}}={}){
    const data=events.filter(e=>typeof e.title==='string'&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.start>=0&&e.end>e.start&&e.end<=1440).map(e=>({...e})).sort((a,b)=>a.start-b.start);
    const root=document.createElement('div');root.className='day-square';root.setAttribute('role','group');root.setAttribute('aria-label','一日日程');container.replaceChildren(root);
    const paper=document.createElement('div');paper.className='day-focus-paper';paper.setAttribute('aria-hidden','true');root.append(paper);
    root.insertAdjacentHTML('beforeend','<svg class="day-focus-arrow" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2Q2 1 3 2L10 5Q12 6 10 7L3 10Q2 11 2 10Z"/></svg><svg class="day-ornament" viewBox="0 0 30 16" aria-hidden="true"><path d="m5 8 5-5m2 8 5-5m2 8 5-5"/></svg>');
    if(!data.length){root.replaceChildren();const empty=document.createElement('div');empty.className='day-empty';empty.textContent='—';empty.setAttribute('aria-label','暂无安排记录');root.append(empty);return {setNow(){},follow(){},destroy(){root.remove()}}}
    const scroller=document.createElement('div');scroller.className='day-scroll';scroller.setAttribute('aria-label','上下滚动查看日程');root.append(scroller);
    let currentNow=now,nearest=0,frame=0,gesture=null,ignoreClickUntil=0,disposed=false,pausedUntil=0,resumeTimer=0;
    const rows=data.map((event,index)=>{const row=document.createElement('button');row.type='button';row.className='day-row'+(event.kind==='gap'?' is-gap':'');row.setAttribute('aria-label',time(event.start)+'至'+time(event.end)+'，'+event.title+(event.place?'，'+event.place:''));const stamp=document.createElement('time');stamp.textContent=time(event.start);const body=document.createElement('span');body.className='day-row-body';const title=document.createElement('span');title.className='day-row-title';title.textContent=event.title;const place=document.createElement('span');place.className='day-row-place';place.textContent=event.place||'';body.append(title,place);row.append(stamp,body);scroller.append(row);row.addEventListener('click',e=>{if(performance.now()<ignoreClickUntil){e.preventDefault();return}onSelect({...event})});row.addEventListener('focus',()=>go(index,true));return row});
    // 事件之间的真实空档留出按比例的空间；不是 24 小时均匀刻度，但“现在”落在两件事之间时视窗也停在对应位置。
    rows.forEach((row,index)=>{if(index)row.style.marginTop=`${Math.min(46,Math.max(0,data[index].start-data[index-1].end)*.28)}px`;});
    const center=row=>row.offsetTop+row.offsetHeight/2-scroller.clientHeight/2;
    function pauseFollow(ms=6500){pausedUntil=Date.now()+ms;clearTimeout(resumeTimer);resumeTimer=setTimeout(()=>{if(!disposed&&Date.now()>=pausedUntil)follow(true)},ms+40)}
    function refresh(){frame=0;if(disposed)return;const middle=scroller.scrollTop+scroller.clientHeight/2;let best=Infinity;rows.forEach((row,i)=>{const distance=Math.abs(row.offsetTop+row.offsetHeight/2-middle),ratio=Math.min(1,distance/(scroller.clientHeight*.58));row.style.transform=`scale(${1-ratio*.15})`;row.style.opacity=String(1-ratio*.6);row.style.filter=`blur(${ratio*.45}px)`;if(distance<best){best=distance;nearest=i}row.classList.toggle('is-now',currentNow>=data[i].start&&currentNow<data[i].end)});if(data[nearest])root.classList.toggle('is-gap',data[nearest].kind==='gap')}
    function queueRefresh(){if(!frame)frame=requestAnimationFrame(refresh)}
    function targetOffset(){
      if(!data.length)return 0;
      if(currentNow<=data[0].start)return 0;
      const last=data.length-1;
      if(currentNow>=data[last].end)return scroller.scrollHeight;
      const inside=data.findIndex(e=>currentNow>=e.start&&currentNow<e.end);
      if(inside>=0)return center(rows[inside]);
      const next=data.findIndex(e=>e.start>currentNow);
      if(next<=0)return 0;
      const prev=next-1,span=Math.max(1,data[next].start-data[prev].end),t=Math.max(0,Math.min(1,(currentNow-data[prev].end)/span));
      return center(rows[prev])+(center(rows[next])-center(rows[prev]))*t;
    }
    function follow(smooth=true){if(disposed||Date.now()<pausedUntil)return;scroller.scrollTo({top:targetOffset(),behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});queueRefresh()}
    function go(index,smooth){if(disposed||!rows[index])return;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;scroller.scrollTo({top:center(rows[index]),behavior:smooth&&!reduce?'smooth':'instant'});queueRefresh()}
    scroller.addEventListener('scroll',queueRefresh,{passive:true});
    // Touch keeps native scrolling and inertia; mouse dragging follows the pointer.
    scroller.addEventListener('pointerdown',e=>{pauseFollow();if(e.pointerType!=='mouse'||e.button!==0)return;gesture={id:e.pointerId,y:e.clientY,top:scroller.scrollTop,moved:false}});
    scroller.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.id)return;const delta=e.clientY-gesture.y;if(!gesture.moved&&Math.abs(delta)>5){gesture.moved=true;scroller.classList.add('is-dragging');scroller.setPointerCapture(e.pointerId)}if(gesture.moved){e.preventDefault();scroller.scrollTop=gesture.top-delta}});
    function release(e){if(!gesture||e.pointerId!==gesture.id)return;const moved=gesture.moved;gesture=null;scroller.classList.remove('is-dragging');if(scroller.hasPointerCapture(e.pointerId))scroller.releasePointerCapture(e.pointerId);if(moved){ignoreClickUntil=performance.now()+200;pauseFollow();refresh()}}
    scroller.addEventListener('pointerup',release);scroller.addEventListener('pointercancel',release);scroller.addEventListener('pointerleave',e=>{if(gesture&&!gesture.moved)gesture=null});
    scroller.addEventListener('touchstart',()=>pauseFollow(),{passive:true});
    scroller.addEventListener('touchmove',()=>pauseFollow(),{passive:true});
    scroller.addEventListener('touchend',()=>pauseFollow(),{passive:true});
    scroller.addEventListener('wheel',()=>pauseFollow(),{passive:true});
    const autoTimer=setInterval(()=>{if(!disposed&&Date.now()>=pausedUntil&&!document.hidden&&!gesture)follow(true)},20000);
    const resize=new ResizeObserver(()=>requestAnimationFrame(()=>{if(disposed)return;if(Date.now()>=pausedUntil)follow(false);refresh()}));resize.observe(root);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!disposed){follow(false);refresh()}}));
    const onVisibility=()=>{if(!document.hidden&&!disposed&&Date.now()>=pausedUntil)follow(false)};
    document.addEventListener('visibilitychange',onVisibility);
    return {setNow(value){if(!Number.isFinite(value))return;currentNow=value;if(Date.now()>=pausedUntil)follow()},follow(){follow()},pause(){pauseFollow()},destroy(){disposed=true;document.removeEventListener('visibilitychange',onVisibility);resize.disconnect();clearInterval(autoTimer);clearTimeout(resumeTimer);cancelAnimationFrame(frame);root.remove()}};
  }
  window.FolioDaySchedule={mount,time};
})();

/* Minute intervals on an explicit calendar day; never infer occupation from a DDL. */
(function(root){
  'use strict';
  function calculate({date,entries=[],start=480,end=1320,minimum=120,today,nowMinute=0}={}){
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>1440||end<=start||!Number.isFinite(minimum)||minimum<=0)throw new Error('无效的工作区间或空档门槛');
    const from=date===today?Math.max(start,nowMinute):start;
    if(from>=end)return [];
    const busy=entries.filter(e=>e.date===date&&!(e.kind==='task'&&e.completed)&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.end>e.start&&e.end>from&&e.start<end).map(e=>({start:Math.max(from,e.start),end:Math.min(end,e.end)})).sort((a,b)=>a.start-b.start||a.end-b.end);
    const merged=[];for(const item of busy){const last=merged[merged.length-1];if(last&&item.start<=last.end)last.end=Math.max(last.end,item.end);else merged.push({...item})}
    const gaps=[];let cursor=from;
    for(const item of merged){if(item.start-cursor>=minimum)gaps.push({start:cursor,end:item.start});cursor=Math.max(cursor,item.end)}
    if(end-cursor>=minimum)gaps.push({start:cursor,end});
    return gaps;
  }
  const api={calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FolioFreeGaps=api;
})(typeof globalThis==='undefined'?this:globalThis);

(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  function el(p,tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));p.append(n);return n}
  function mount(container,{dates=[],entries=[],today,nowMinute=0,start=480,end=1320,minimum=120,onSelect=()=>{}}={}){
    let source=entries.map(e=>({...e})),settings={start,end,minimum};const root=document.createElement('div');root.className='gaps-square';container.replaceChildren(root);const svg=el(root,'svg',{viewBox:'0 0 240 240',role:'group','aria-label':'可用空档'});
    const decor=el(svg,'g',{'aria-hidden':'true',fill:'none',stroke:'#aac0b1','stroke-width':1.8,'stroke-linecap':'round'});el(decor,'path',{d:'M29 62Q35 40 54 28M36 47Q20 47 28 34Q38 34 36 47ZM42 38Q43 23 54 27Q58 37 42 38Z M184 39q13-8 29-1m-23 10q10-5 18-1'});
    const columns=dates.slice(0,7).map((date,i)=>{const x=21+i*29,g=el(svg,'g',{class:'gaps-day',role:'button',tabindex:0});el(g,'rect',{x:x-2,y:61,width:28,height:151,rx:2,class:'column-focus'});const stack=el(g,'g',{});const dateLabel=el(g,'text',{x:x+12,y:207,fill:date===today?'#5f8075':'#8da497','text-anchor':'middle','font-family':'Songti SC, SimSun, serif','font-weight':700,'font-size':16});dateLabel.textContent=String(Number(date.slice(8)));if(date===today)el(g,'path',{d:`M${x+12} 228v-11m-4 4 4-4 4 4`,fill:'none',stroke:'#63897c','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'});const gaps=()=>FolioFreeGaps.calculate({date,entries:source,today,nowMinute,...settings});const open=()=>onSelect(date,gaps());g.addEventListener('click',open);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});const empty=el(stack,'path',{d:`M${x+7} 183h10`,fill:'none',stroke:'#a8bdb0','stroke-width':2,'stroke-linecap':'round'});return {date,x,g,stack,gaps,empty,nodes:new Map()}});
    function render(){const all=columns.map(c=>c.gaps()),max=Math.max(4,...all.map(g=>g.length)),height=Math.min(25,(126-(max-1)*5)/max);columns.forEach((c,i)=>{const gaps=all[i],keys=new Set(gaps.map(g=>g.start+'-'+g.end));for(const [key,node] of c.nodes){if(!keys.has(key)){node.remove();c.nodes.delete(key)}}gaps.forEach((gap,j)=>{const y=184-height-j*(height+5),shade=c.date<today?'#b4c9bc':c.date===today?'#779f96':['#88aaa2','#9dbab0','#b1c8bb'][j%3];const key=gap.start+'-'+gap.end;let node=c.nodes.get(key);if(!node){node=el(c.stack,'path',{class:'gap-paper',style:`animation-delay:${j*35}ms`});c.nodes.set(key,node)}node.setAttribute('d',`M${c.x+.5} ${y+.4}Q${c.x+12} ${y-1} ${c.x+24} ${y+1}L${c.x+23.5} ${y+height} ${c.x} ${y+height-.8}Z`);node.setAttribute('fill',shade)});c.empty.style.opacity=gaps.length?'0':'1';c.g.setAttribute('aria-label',c.date+'，'+gaps.length+' 段符合标准的空档'+(c.date<today?'，历史安排回看':''))})}
    render();return {configure(values){settings={...settings,...values};render()},setEntries(values){source=values.map(e=>({...e}));render()},destroy(){root.remove()}};
  }
  window.FolioGapsCard={mount};
})();

(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  function el(parent,tag,attrs={}){const p=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))p.setAttribute(key,String(value));parent.append(p);return p}
  function mount(container,{items=[],today,span=7,onSelect=()=>{}}={}){
    FolioQueue.dateValue(today);
    let day=today,horizon=span>0?span:7;
    const root=document.createElement('div');root.className='deadline-square';container.replaceChildren(root);
    const svg=el(root,'svg',{viewBox:'0 0 240 240',role:'group','aria-label':'截止倒计时'});
    const decoration=el(svg,'g',{'aria-hidden':'true'});
    el(decoration,'path',{d:'M183 19l21 3-2 13-21-3Z',fill:'#dcbda6'});el(decoration,'path',{d:'M194 17l20 6-4 12-20-6Z',fill:'#e7cab2'});el(decoration,'path',{d:'M183 19l5 5 16-2Z',fill:'#efdbc7'});
    el(decoration,'path',{d:'M27 215l6-5m0 9 6-5m0 8 6-5',fill:'none',stroke:'#ccad95','stroke-width':1.6,'stroke-linecap':'round'});
    el(svg,'path',{d:'M45 44V199',fill:'none',stroke:'#c8a78e','stroke-width':1.8,'stroke-dasharray':'4 6','aria-hidden':'true'});
    const valid=items.filter(item=>{if(item.completed||item.repeatTemplate||!item.deadline)return false;try{FolioQueue.dateValue(item.deadline);return true}catch{return false}}).map(item=>({...item})).sort((a,b)=>(a.deadline+(a.deadlineClock||'23:59')).localeCompare(b.deadline+(b.deadlineClock||'23:59'))).slice(0,4);
    const rows=valid.map((item,i)=>{
      const y=51+i*43,g=el(svg,'g',{class:'deadline-row',role:'button',tabindex:0});
      el(g,'rect',{x:17,y:y-5,width:207,height:38,rx:3,class:'focus'});
      el(g,'path',{d:`M47 ${y+1}L214 ${y} 214 ${y+26} 46 ${y+27}Z`,fill:'#e3cbbb','aria-hidden':'true'});
      const ribbon=el(g,'rect',{x:47,y,width:8,height:27,rx:1.5,class:'deadline-ribbon'});
      const tip=el(g,'path',{d:'M-3-5Q-3-6-2-5L5-1Q7 0 5 1L-2 5Q-3 6-3 5Z',class:'deadline-tip'});
      const zero=el(g,'circle',{cx:45,cy:y+13.5,r:3,class:'deadline-zero'});
      const select=()=>onSelect({...item},FolioQueue.usableDays(item,day));g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();select()}});
      return {item,g,ribbon,tip,zero,y};
    });
    function render(){rows.forEach(({item,g,ribbon,tip,zero,y})=>{
      const days=FolioQueue.usableDays(item,day),past=days<0,color=past?'#ad6c58':days<=1?'#ba7959':days<=3?'#c19a67':'#929e80';
      const length=past?Math.min(25,Math.max(10,-days*8)):days===0?0:Math.max(8,Math.min(horizon,days)/horizon*157);
      ribbon.setAttribute('x',past?45-length:47);ribbon.setAttribute('width',length);ribbon.setAttribute('fill',color);
      tip.setAttribute('transform',`translate(${past?45-length:47+length} ${y+13.5})${past?' rotate(180)':''}`);tip.setAttribute('fill',color);zero.setAttribute('fill',color);zero.style.opacity=days===0?'1':'0';
      g.setAttribute('aria-label',(item.course?item.course+'，':'')+item.title+'，截止 '+item.deadline+(item.deadlineClock?' '+item.deadlineClock:'')+'，可用日余量 '+days+' 天');
    })}
    if(!valid.length)el(svg,'path',{d:'M87 119l22 3 42-6',fill:'none',stroke:'#d5bba7','stroke-width':3,'stroke-linecap':'round'});
    render();return {setToday(value){try{FolioQueue.dateValue(value)}catch{return}day=value;render()},setSpan(value){if(!Number.isFinite(value)||value<1)return;horizon=value;render()},destroy(){root.remove()}};
  }
  window.FolioDeadlines={mount};
})();

(() => {
  'use strict';const NS='http://www.w3.org/2000/svg';
  function el(p,tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));p.append(n);return n}
  function text(p,x,y,value,size=15,color='#897b61',anchor='start'){const n=el(p,'text',{x,y,fill:color,'font-size':size,'font-weight':700,'font-family':'Songti SC, SimSun, serif','text-anchor':anchor});n.textContent=value;return n}
  function mount(container,{exams=[],today,forecast=null,target=null,importantThreshold=4.5,onOpen=()=>{}}={}){
    FolioQueue.dateValue(today);let state={today,forecast,target};
    const valid=exams.filter(e=>{try{return Number.isFinite(FolioQueue.dateValue(e.date))}catch{return false}}).map(e=>({...e})).sort((a,b)=>a.date.localeCompare(b.date));
    const button=document.createElement('button');button.type='button';button.className='finals-square';container.replaceChildren(button);
    const svg=el(button,'svg',{viewBox:'0 0 240 240','aria-hidden':'true'});
    el(svg,'path',{d:'M14 20L65 19 67 63 15 64Z',fill:'#d9c7a8'});
    el(svg,'path',{d:'M16 15L67 16 66 60 16 60Z',fill:'#f7efde'});
    el(svg,'path',{d:'M16 15L67 16 67 25 16 24Z',fill:'#bd8c6b'});
    el(svg,'path',{d:'M27 12v9m28-9v9',fill:'none',stroke:'#9e8768','stroke-width':2.5,'stroke-linecap':'round'});
    const number=text(svg,41,53,'',32,'#ae7c58','middle');
    const forecastLabel=text(svg,85,31,'—',19,'#b17d5c'),targetLabel=text(svg,222,31,'—',19,'#8c9a79','end');
    el(svg,'path',{d:'M146 25h18m-5-4 5 4-5 4',fill:'none',stroke:'#b6a685','stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round'});
    el(svg,'path',{d:'M88 49H219',fill:'none',stroke:'#d1c3a6','stroke-width':3,'stroke-linecap':'round'});
    const link=el(svg,'line',{y1:49,y2:49,'stroke-width':3});
    const dot=el(svg,'circle',{cy:49,r:4,class:'final-marker'});
    const diamond=el(svg,'path',{d:'M0-5 5 0 0 5-5 0Z',fill:'#e9e0ce',stroke:'#8c9a79','stroke-width':2,class:'final-marker'});
    el(svg,'path',{d:'M16 72H223',fill:'none',stroke:'#d5c8ad','stroke-width':1});
    const rows=el(svg,'g',{});
    function info(){const upcoming=valid.filter(e=>e.date>=state.today),next=upcoming[0]||null;return {next,exams:upcoming,days:next?(FolioQueue.dateValue(next.date)-FolioQueue.dateValue(state.today))/86400000:null}}
    function render(){const data=info();number.textContent=data.days===null?'—':String(data.days);number.setAttribute('fill',data.days!==null&&data.days<=7?'#b77555':'#a88967');
      const hasGoal=Number.isFinite(state.forecast)&&Number.isFinite(state.target);
      forecastLabel.textContent=Number.isFinite(state.forecast)?state.forecast.toFixed(2):'—';targetLabel.textContent=Number.isFinite(state.target)?state.target.toFixed(2):'—';
      [link,dot,diamond].forEach(n=>n.style.opacity=hasGoal?'1':'0');
      if(hasGoal){const low=Math.max(0,Math.min(state.forecast,state.target)-.3),high=Math.max(5,state.forecast,state.target)+.3,position=v=>88+(v-low)/(high-low)*131,ax=position(state.forecast),gx=position(state.target),color=state.forecast<state.target?'#b17d5c':'#8a9a78';dot.setAttribute('cx',ax);dot.setAttribute('fill',color);diamond.setAttribute('transform',`translate(${gx} 49)`);link.setAttribute('x1',ax);link.setAttribute('x2',gx);link.setAttribute('stroke',color)}
      rows.replaceChildren();data.exams.slice(0,5).forEach((exam,i)=>{const y=94+i*29,hasTarget=Number.isFinite(exam.goal),important=typeof exam.important==='boolean'?exam.important:hasTarget&&exam.goal>=importantThreshold;
        if(i===0)el(rows,'path',{d:`M13 ${y-15}L224 ${y-16} 223 ${y+11} 14 ${y+12}Z`,fill:'#f2e9d6'});
        el(rows,'path',{d:`M15 ${y+14}H223`,fill:'none',stroke:'#d9cdb6','stroke-width':.7});
        el(rows,'path',{d:`M16 ${y-10}L19 ${y-11} 19 ${y+5} 16 ${y+6}Z`,fill:important?'#bf8965':'#a7b091'});
        const label=exam.shortTitle||exam.title||'—';const title=text(rows,25,y,label.length>5?label.slice(0,5)+'…':label,14,important?'#9a7758':'#8c9678');
        const full=el(title,'title',{});full.textContent=exam.title;
        text(rows,141,y,exam.date.slice(5).replace('-','/'),14,'#ac9473','middle');
        text(rows,220,y,hasTarget?exam.goal.toFixed(1):'—',17,important?'#ad7957':'#8b9c7c','end');
      });
      if(!data.exams.length)el(rows,'path',{d:'M87 144l22 3 42-6',fill:'none',stroke:'#c8baa0','stroke-width':3,'stroke-linecap':'round'});
      button.setAttribute('aria-label',(data.next?'距'+data.next.title+'考试 '+data.days+' 天':'尚无后续考试日期')+(hasGoal?'，方案预计均绩 '+state.forecast.toFixed(2)+'，目标 '+state.target.toFixed(2):'，尚无完整均绩目标')+'；'+data.exams.length+' 场待考；'+data.exams.slice(0,5).map(e=>e.title+' '+e.date+(Number.isFinite(e.goal)?'，课程目标 '+e.goal:'')).join('；')+'，打开详情');
    }
    button.onclick=()=>onOpen(info());render();return {update(values){if(values.today){try{FolioQueue.dateValue(values.today)}catch{return}}state={...state,...values};render()},destroy(){button.remove()}};
  }
  window.FolioFinalsCard={mount};
})();

/* Cut-paper companions, independent of any future evaluation algorithm. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const labels={lamp:'台灯',bird:'折纸小鸟',flower:'小花',whale:'小鲸鱼'};
  function el(parent,tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.append(n);return n}
  function paper(p,d,color,attrs={}){return el(p,'path',{d,fill:color,...attrs})}
  function lamp(p,mood){
    const active=mood==='happy',low=mood==='sad';
    const head=el(p,'g',{transform:`translate(29 ${low?31:active?20:25}) rotate(${low?38:active?-13:12})`});
    paper(head,active?'M-12 8L10 7 23 39Q-2 44-27 36Z':low?'M-12 8L10 8 14 23Q0 27-18 24Z':'M-12 8L10 8 19 30Q-1 35-22 30Z','#e6c57b',{opacity:active?.55:low?.2:.35});
    paper(p,`M42 59L50 41 34 ${low?32:active?21:26} 38 ${low?28:active?17:22} 57 40 48 60Z`,'#83907a');
    el(p,'circle',{cx:53,cy:40,r:3.5,fill:'#b7bea4'});
    // The broad, slightly uneven shade and the solid light patch read as cut paper.
    paper(head,'M-7-9L6-10 17 7Q1 10-18 7Z','#c47f5e');
    paper(head,'M-18 7Q0 3 17 7L16 10Q0 12-17 10Z','#d7a17b');
    paper(head,'M-6-8L-10 4-2 4 1-9Z','#d99d76');
    paper(p,'M32 59Q46 56 60 59L63 64 28 64Z','#a4aa8d');
    paper(p,'M30 64H62L61 66 31 66Z','#8c947a');
  }
  function bird(p,mood){
    const active=mood==='happy',low=mood==='sad';
    paper(p,'M18 48L4 36 27 39Z','#c8b484');
    paper(p,'M16 44L37 31 53 44 35 57Z','#d3a873');
    paper(p,active?'M33 43L7 8 47 29Z':low?'M34 48L15 31 47 43Z':'M33 46L12 23 47 37Z','#c98564');
    paper(p,active?'M33 43L20 16 47 29Z':low?'M34 48L27 35 47 43Z':'M33 46L26 28 47 37Z','#dda583');
    paper(p,low?'M43 45L44 32 58 36 50 45Z':active?'M42 45L47 20 59 23 52 43Z':'M42 45L47 28 60 31 52 43Z','#dcc39a');
    paper(p,low?'M44 32L58 36 61 43 51 40Z':active?'M47 20L59 23 66 30 52 27Z':'M47 28L60 31 65 38 52 35Z','#b78660');
    el(p,'circle',{cx:low?55:56,cy:low?37:active?25:33,r:1.05,fill:'#776748'});
    paper(p,'M31 55L29 63 32 63 35 56Z M42 53L43 62 46 62 45 52Z','#a58c63');
    paper(p,'M26 63H36V65H25Z M40 62H49V64H40Z','#b8a27d');
  }
  function flower(p,mood){
    const active=mood==='happy',low=mood==='sad',x=low?27:active?35:32,y=low?37:active?26:31;
    paper(p,`M36 64Q40 46 ${x-1} ${y+4}L${x+2} ${y+3}Q43 47 40 64Z`,'#879673');
    paper(p,'M38 52Q19 55 19 43Q32 41 38 52Z','#a6b393');
    paper(p,'M39 46Q50 33 59 39Q57 51 39 49Z','#95a783');
    const head=el(p,'g',{transform:`translate(${x} ${y}) rotate(${low?55:active?-7:18}) scale(${active?.86:low?.61:.72} ${active?.86:low?.73:.84})`});
    for(let i=0;i<5;i++)paper(head,'M-3-2Q-16-10-9-21L0-24Q14-20 9-8L3-1Z',i%2?'#d49b73':'#c78060',{transform:`rotate(${i*72})`});
    paper(head,'M-8-5L-2-9 7-6 10 1 4 8-5 8-10 1Z','#e6bd70');
    paper(head,'M-2-3L3-4 5 1 0 4-4 1Z','#cba35e');
  }
  function whale(p,mood){
    if(mood==='happy'){
      paper(p,'M28 30Q29 16 25 9L28 7Q34 18 31 30Z','#8aaeb3');
      paper(p,'M27 14Q20 7 14 12L12 10Q19 1 29 10Z','#a3c1c1');
      paper(p,'M29 12Q35 1 43 6L44 9Q37 6 31 16Z','#8aaeb3');
      paper(p,'M12 14Q7 18 11 21Q16 20 12 14Z M43 11Q39 15 43 18Q48 16 43 11Z M31 2Q28 5 31 7Q34 6 31 2Z','#aac7c7');
    }else if(mood==='waiting'){
      paper(p,'M28 30Q29 23 26 21L28 19Q33 24 31 30Z','#8aaeb3');
      paper(p,'M29 25Q34 19 38 23L38 25Q34 24 31 28Z','#aac7c7');
    }
    paper(p,'M50 44Q57 43 62 35L65 36 63 45 69 48Q64 54 56 50Z','#739799');
    paper(p,'M12 45Q10 33 23 30Q42 26 52 38L58 47Q53 58 36 61Q16 63 12 45Z','#8faeb0');
    paper(p,'M14 49Q32 61 56 48Q50 59 35 61Q20 63 14 49Z','#c4d5cd');
    paper(p,'M32 46Q38 46 43 52L36 56Q32 52 32 46Z','#789a9b');
    el(p,'circle',{cx:20,cy:41,r:1.5,fill:'#536f6c'});
    paper(p,'M12 47Q18 50 23 47','none',{stroke:'#73918b','stroke-width':1.5,'stroke-linecap':'round'});
  }
  function render(parent,style='lamp',mood='happy'){
    const kind=Object.hasOwn(labels,style)?style:'lamp';parent.replaceChildren();
    ({lamp,bird,flower,whale})[kind](parent,['happy','waiting','sad'].includes(mood)?mood:'happy');
    parent.setAttribute('role','img');parent.setAttribute('aria-label',labels[kind]+'：'+({happy:'舒展',waiting:'停滞',sad:'低落'}[mood]||'舒展'));
  }
  window.FolioCompanion={render,labels};
})();

/* Independent design study. The renderer accepts records; it never invents missing usage. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  function el(parent,tag,attrs={}){const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));parent.append(node);return node}
  function path(parent,d,fill,attrs={}){return el(parent,'path',{d,fill,...attrs})}
  function duration(minutes){const total=Math.round(minutes);return Math.floor(total/60)+' 小时 '+total%60+' 分钟'}
  function paper(x,y,w,h,seed){const r=Math.sin(seed*12.7)*.9;return `M${x+1} ${y+.5}Q${x+w*.5} ${y+r} ${x+w} ${y+1}L${x+w-.5} ${y+h}Q${x+w*.5} ${y+h+r} ${x} ${y+h-1}Z`}
  function mount(container,{days=[],today,mood='happy',companionStyle='lamp',onSelect=()=>{}}={}){
    const root=document.createElement('div');root.className='usage-square';container.replaceChildren(root);const svg=el(root,'svg',{viewBox:'0 0 240 240',role:'group','aria-label':'一周手机使用时间'});
    const deco=el(svg,'g',{'aria-hidden':'true'});path(deco,'M27 36l17 3-2 13-18-3Z','#c6cfb9');path(deco,'M28 36l3 5 13-2Z','#d6ddc9');path(deco,'M47 51l12-8-2 17Z','#b9c7af');path(deco,'M25 225l7-4m-3 9 7-4','none',{stroke:'#b4bea7','stroke-width':1.5,'stroke-linecap':'round'});
    let currentMood=['happy','waiting','sad'].includes(mood)?mood:'happy';
    let currentStyle=Object.hasOwn(FolioCompanion.labels,companionStyle)?companionStyle:'lamp';
    const companion=el(svg,'g',{transform:'translate(153 7) scale(.82)'});
    const drawCompanion=()=>FolioCompanion.render(companion,currentStyle,currentMood);drawCompanion();
    const records=days.slice(-7).filter(d=>typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&(d.minutes===null||Number.isFinite(d.minutes)&&d.minutes>=0));
    const peak=Math.max(240,...records.map(d=>d.minutes||0));const scale=124/peak;let chosen=null;
    const hourY=190-60*scale;
    path(svg,`M8 ${hourY-3}Q8 ${hourY-4.1} 9 ${hourY-3.5}L15.7 ${hourY-.8}Q17 ${hourY} 15.7 ${hourY+.8}L9 ${hourY+3.5}Q8 ${hourY+4.1} 8 ${hourY+3}Z`,'#b49b72',{role:'img','aria-label':'1 小时参考位置',class:'usage-hour-marker'});
    records.forEach((day,i)=>{const x=23+i*28;const g=el(svg,'g',{class:'usage-day',role:'button',tabindex:0,'aria-label':day.date+'，'+(day.minutes===null?'无记录':duration(day.minutes))});el(g,'rect',{x:x-2,y:70,width:28,height:147,rx:2,class:'focus-ring'});
      // null stays visibly unknown; a genuine zero is a small baseline tick.
      if(day.minutes===null)path(g,`M${x+8} 181h9`,'none',{stroke:'#a7b39c','stroke-width':2});
      else {const height=Math.max(2,day.minutes*scale);path(g,paper(x,190-height,24,height,i+5),day.date===today?'#7b957e':'#9bab8a',{class:'bar'});}
      const text=el(g,'text',{x:x+12,y:211,'text-anchor':'middle',class:'date'});text.textContent=String(Number(day.date.slice(8)));
      if(day.date===today)path(g,`M${x+12} 229v-10m-4 4 4-4 4 4`,'none',{stroke:'#6f896f','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'});
      const select=()=>{chosen?.classList.remove('is-selected');g.classList.add('is-selected');chosen=g;g.focus({preventScroll:true});onSelect({...day})};g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}});
    });
    if(!records.length){path(svg,'M24 190h192','none',{stroke:'#c3ccb8','stroke-width':2});root.setAttribute('aria-label','还没有手机使用记录')}
    return {setMood(value){if(!['happy','waiting','sad'].includes(value))return;currentMood=value;drawCompanion()},setCompanion(value){if(!Object.hasOwn(FolioCompanion.labels,value))return;currentStyle=value;drawCompanion()},clearSelection(){chosen?.classList.remove('is-selected');chosen=null},destroy(){container.replaceChildren()}};
  }
  window.FolioUsageCard={mount,duration};
})();

(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioMountain=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function valid(data){return !!data&&typeof data.scope==='string'&&data.scope.length>0&&finite(data.total)&&data.total>0&&finite(data.remaining)&&data.remaining>=0&&data.remaining<=data.total}
 function count(data,size){if(!valid(data))throw new Error('Invalid lesson totals');return Math.round(size*data.remaining/data.total)}
 function terrain(){
  const heights=[3,5,7,9,10,12,15,16,15,14,13,14,17,20,22,21,19,17,15,14,15,16,15,13,12,13,11,10,8,7,5,4,2];
  const live=new Map(),removed=[];for(let col=0;col<heights.length;col++)for(let row=25-heights[col];row<25;row++)live.set(col+','+row,{x:29+col*6,y:65+row*6,col,row});
  let shell=0;while(live.size){const edge=[...live.values()].filter(c=>!live.has(c.col+','+(c.row-1))||!live.has((c.col-1)+','+c.row)||!live.has((c.col+1)+','+c.row));
   // Follow each exposed contour from right to left before going one layer deeper.
   edge.sort((a,b)=>b.col-a.col||a.row-b.row);for(const c of edge){removed.push({...c,shell});live.delete(c.col+','+c.row)}shell++;
  }return removed.reverse().map((c,id)=>({...c,id}));
 }
 function cached(raw,current){if(!valid(current))throw new Error('Invalid lesson totals');try{const previous=JSON.parse(raw);return previous?.version===2&&valid(previous)&&previous.scope===current.scope&&previous.total===current.total?previous:null}catch{return null}}
 function plan(previous,current,size){const end=count(current,size),start=previous?count(previous,size):end;return{start:end>start?end:start,end,removing:Math.max(0,start-end)}}
 function snapshot(data){if(!valid(data))throw new Error('Invalid lesson totals');return{version:2,scope:data.scope,total:data.total,remaining:data.remaining}}
 return{valid,count,terrain,cached,plan,snapshot};
});

(() => {
  const NS='http://www.w3.org/2000/svg';
  function el(p,t,a={}){const n=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,String(v)));p.append(n);return n}
  function text(p,x,y,v,size,color){const n=el(p,'text',{x,y,'font-size':size,'font-weight':700,'font-family':'Songti SC, SimSun, serif',fill:color});n.textContent=v;return n}
  function mount(container,{courses=[],today,interval=7,onOpen=()=>{}}={}){
    let records=courses.map(c=>({...c})),date=today,threshold=interval;const button=document.createElement('button');button.className='recall-square';button.type='button';container.replaceChildren(button);const svg=el(button,'svg',{viewBox:'0 0 240 240','aria-hidden':'true'});
    const yFor=(base,x)=>base+26*(1-Math.exp(-(x-94)/24));
    const guide=el(svg,'g',{class:'recall-threshold'});el(guide,'path',{d:'M0 22V219',fill:'none',stroke:'#bcab8d','stroke-width':1.8,'stroke-dasharray':'4 5'});
    const rows=records.slice(0,4).map((course,i)=>{const base=26+i*51;const name=text(svg,17,base+9,course.title,14,'#7f8774'),days=text(svg,17,base+32,'—',22,'#8c967c');let d='';for(let x=94;x<=210;x+=4)d+=(x===94?'M':'L')+x+' '+yFor(base,x);el(svg,'path',{d,fill:'none',stroke:'#c1c7b8','stroke-width':2.5,'stroke-linecap':'round'});if(i<3)el(svg,'path',{d:`M17 ${base+42}H219`,fill:'none',stroke:'#d6d3c7','stroke-width':.7});const dot=el(svg,'g',{class:'recall-dot'});const circle=el(dot,'circle',{r:5,fill:'#8d9c7b'});const beyond=el(dot,'path',{d:'M5-3L10 0 5 3Z',fill:'#b38362'});return {name,days,dot,circle,beyond,base}});
    function info(){return records.map(c=>{let elapsed=null;if(c.lastContact){try{elapsed=Math.max(0,(FolioQueue.dateValue(date)-FolioQueue.dateValue(c.lastContact))/86400000)}catch{}}return {...c,elapsed,needsAttention:elapsed!==null&&elapsed>=threshold}})}
    function render(){const data=info(),span=Math.max(14,threshold+7);guide.setAttribute('transform',`translate(${94+threshold/span*116} 0)`);rows.forEach((row,i)=>{const c=data[i],known=c.elapsed!==null,x=94+Math.min(span,c.elapsed||0)/span*116;row.days.textContent=known?String(c.elapsed):'—';row.days.setAttribute('fill',c.needsAttention?'#b18061':'#8c967c');row.name.setAttribute('fill',c.needsAttention?'#9d7e65':'#7f8774');row.dot.style.opacity=known?'1':'0';row.dot.setAttribute('transform',`translate(${x} ${yFor(row.base,x)})`);row.circle.setAttribute('fill',c.needsAttention?'#b38362':'#8d9c7b');row.beyond.style.opacity=known&&c.elapsed>span?'1':'0'});button.setAttribute('aria-label',data.map(c=>c.title+'：'+(c.elapsed===null?'没有可靠接触记录':c.elapsed+'天前接触'+(c.needsAttention?'，建议再看一看':''))).join('；')+'，打开详情')}
    button.onclick=()=>onOpen(info());render();return {update({today:nextDate,interval:nextInterval,courses:nextCourses}={}){if(nextDate)date=nextDate;if(nextInterval>0)threshold=nextInterval;if(nextCourses)records=nextCourses.map(c=>({...c}));render()},destroy(){button.remove()}};
  }
  window.FolioRecallCard={mount};
})();
(()=>{'use strict';window.FolioBooksCard={mount(card,{data=null,onOpen=()=>{}}={}){const NS='http://www.w3.org/2000/svg',el=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;};
const svg=el('svg',{viewBox:'0 0 260 260','aria-hidden':'true'});card.append(svg);
// Decorations stay still as the book shapes settle onto the same desk line.
svg.append(el('path',{d:'M19 216L231 214L235 222L21 224Z',fill:'#c8b99a'}));
svg.append(el('path',{d:'M21 214L231 212L231 216L21 219Z',fill:'#f2e9d6'}));
svg.append(el('path',{d:'M216 34l5-8 3 7 8 1-6 5 1 8-7-4-7 3 2-8-5-5Z',fill:'#d5bd8e'}));
svg.append(el('path',{d:'M215 62q8-10 17-1q-10 8-17 1m4 7q8-4 13 4q-10 5-13-4',fill:'#b6bc9f'}));
const palette=[['#9eae92','#849778'],['#9eb7ba','#819e9f'],['#c98f73','#af785f'],['#d2b16f','#b69657'],['#b4a7b8','#988b9d']];const volumes=Array.from({length:14},(_,i)=>({color:palette[i%5][0],dark:palette[i%5][1],width:145+i%3*10,offset:i%4*3,tilt:i%2?1.4:-1.6}));const groups=volumes.map(c=>{const g=el('g',{class:'book-shape'}),shadow=el('path',{fill:'#ab9673',opacity:'.32'}),cover=el('path',{fill:c.color}),pages=el('path',{fill:'#f4eddb'}),edge=el('path',{fill:c.dark}),line=el('path',{stroke:'#cbbd9e','stroke-width':'.7',fill:'none',class:'book-pages'}),label=el('path',{fill:'#eee3c8',opacity:'.85'}),stitch=el('path',{stroke:c.dark,'stroke-width':'1.6',fill:'none'});g.append(shadow,cover,pages,line,edge,label,stitch);svg.append(g);return{g,shadow,cover,pages,edge,line,label,stitch}});

const number=el('text',{x:29,y:39,class:'book-number'}),unit=el('text',{x:29,y:55,class:'book-unit'},'TO GO'),total=el('text',{x:92,y:38,class:'book-total'});svg.append(number,unit,total);
function render(){let bottom=210;const sum=data?.remaining??null,count=data&&data.total>0?Math.min(14,Math.ceil(sum/data.total*14)):0;volumes.forEach((c,i)=>{const left=43+c.offset,w=c.width,h=9;const a=groups[i];a.g.style.opacity=i<count?'1':'0';a.g.style.transform=`translate(${left}px,${bottom-h}px) rotate(${c.tilt}deg)`;a.shadow.setAttribute('d',`M4 5h${w}v${h}H4Z`);a.cover.setAttribute('d',`M4 0L${w-2} 1Q${w+3} 2 ${w} 5L${w-1} ${h-1}L4 ${h}Q-2 ${h} 0 ${h-5}V5Q0 0 4 0Z`);a.pages.setAttribute('d',`M9 4L${w-4} 5L${w-5} ${Math.max(5,h-3)}L9 ${Math.max(5,h-2)}Z`);a.edge.setAttribute('d',`M4 0L${w-2} 1V4L9 3V${Math.max(4,h-3)}L${w} ${Math.max(4,h-3)}V${h}H4Q0 ${h} 0 ${h-5}V5Q0 0 4 0Z`);a.line.setAttribute('d',`M19 7L${w-11} 8M17 ${h-6}L${w-14} ${h-5}`);a.label.setAttribute('d',`M${w*.3} 1h${w*.3}v3h-${w*.3}Z`);a.stitch.setAttribute('d',`M6 5v${Math.max(0,h-10)}`);if(i<count)bottom-=h+2});number.textContent=sum??'—';total.textContent=data?'/ '+data.total:'';card.setAttribute('aria-label',data?'本学期剩余 '+sum+' 节，查看课程':'尚无可靠学期课时，打开课程');}
render();card.onclick=onOpen;return {destroy(){card.replaceChildren();card.onclick=null;}};}};})();
(()=>{'use strict';window.FolioMountainCard={mount(root,{data,onOpen=()=>{},preview=false}={}){const core=FolioMountain,NS='http://www.w3.org/2000/svg',CACHE='folio-mountain-live-v1:'+data.scope,read=k=>{try{return localStorage.getItem(k)}catch{return null}},write=(k,v)=>{if(preview)return false;try{localStorage.setItem(k,v);return true}catch{return false}};
 const el=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n};
 const svg=el('svg',{viewBox:'0 0 260 260','aria-hidden':'true'});root.append(svg);
 const backdrop=el('g',{'shape-rendering':'crispEdges'});svg.append(backdrop);
 // Pixel scenery shares the quarry palette: a timber-hung lamp and an ore cart, rather than unrelated icons.
 backdrop.append(
  el('path',{d:'M34 73h10v-4h16v4h11v4H34Z M78 76h13v3H78Z',fill:'#eee7d8'}),
  el('path',{d:'M191 23h43v4h-43Z M231 27h4v37h-4Z',fill:'#b19a77'}),
  el('path',{d:'M191 23h43v2h-43Z M231 27h2v37h-2Z',fill:'#cbb695'}),
  el('path',{d:'M209 27h2v5h-2Zm-1 6h4v2h-4Zm1 3h2v6h-2Z',fill:'#9a9f8a'}),
  el('path',{d:'M200 44h20v-4h-20Zm-4 4h28v17h-4v4h-20v-4h-4Z',fill:'#e9d7ad'}),
  el('path',{d:'M206 42h8v3h-8Zm-4 3h16v3h-16Zm0 3h3v13h-3Zm13 0h3v13h-3Zm-13 13h18v4h-18Z',fill:'#8f967f'}),
  el('path',{d:'M205 48h10v13h-10Z',fill:'#d5b46e'}),
  el('path',{d:'M208 49h4v10h-4Z',fill:'#f0dfac'}),
  el('path',{d:'M42 231h151v3H42Z',fill:'#c4bba5'}),
  el('path',{d:'M28 223h204v5h-11v4H44v-3H28Z',fill:'#d6c9b1'}),
  el('path',{d:'M19 220h17v-3h189v3h15v4H19Z',fill:'#c7bba1'}),
  el('path',{d:'M39 215h173v3H39Z',fill:'#b6b299'}),
  el('path',{d:'M52 225h24v2H52Zm39 3h39v2H91Zm67-3h31v2h-31Z',fill:'#e8deca'}),
  el('path',{d:'M23 212h6v5h-6Zm207 1h5v4h-5Zm-15 21h4v3h-4Z',fill:'#b0b19c'}),
  el('path',{d:'M23 212h6v2h-6Zm207 1h5v1h-5Z',fill:'#c9c9b2'})
 );
 const mountain=el('g',{'shape-rendering':'crispEdges'}),dust=el('g',{'shape-rendering':'crispEdges'});svg.append(mountain,dust);
 const cells=core.terrain(),palette=['#939c8e','#a8ae99','#89958a','#b1b49d','#9ca493'];
 const nodes=cells.map(c=>{const noise=((c.col*73856093)^(c.row*19349663))>>>0;let fill=palette[noise%palette.length];if(noise%47===0)fill='#d3b27b';else if(noise%61===0)fill='#86a9a0';const n=el('rect',{x:c.x,y:c.y,width:6,height:6,fill});mountain.append(n);return n});
 const pick=el('g',{'shape-rendering':'crispEdges'});pick.append(el('path',{d:'M-3 0h6v32h-6Z',fill:'#b68a5e'}),el('path',{d:'M-3 0h3v32h-3Z',fill:'#cfab79'}),el('path',{d:'M-18-7h30v5h6v5h-6v-3H-6v5h-6v6h-5V2h-5v-5h4Z',fill:'#657f7b'}),el('path',{d:'M-18-7h30v3h-30Z',fill:'#98aaa0'}));svg.append(pick);
 const foreground=el('g',{'shape-rendering':'crispEdges','aria-hidden':'true'});
 foreground.append(
  el('path',{d:'M21 244h77v2H21Z M30 241h5v7h-5Zm22 0h5v7h-5Zm23 0h5v7h-5Z',fill:'#c3b89e'}),
  el('path',{d:'M31 222h6v-6h8v3h9v-6h8v9h7v7H31Z',fill:'#99a68c'}),
  el('path',{d:'M43 217h6v7h-6Zm14 1h6v6h-6Z',fill:'#c7ae77'}),
  el('path',{d:'M28 225h47v4h-4v9H34v-9h-6Z',fill:'#9caa98'}),
  el('path',{d:'M28 225h47v3H28Z M34 228h3v10h-3Z',fill:'#bec5ac'}),
  el('path',{d:'M68 228h3v10H37v-3h31Z M44 229h2v4h-2Zm15 0h2v4h-2Z',fill:'#839684'}),
  el('path',{d:'M35 238h9v7h-9Zm24 0h9v7h-9Z',fill:'#7e8b7a'}),
  el('path',{d:'M38 240h3v3h-3Zm24 0h3v3h-3Z',fill:'#d2c8ac'})
 );svg.append(foreground);
 const number=el('text',{x:23,y:36,class:'mountain-number'}),unit=el('text',{x:24,y:52,class:'mountain-unit'},'TO GO'),total=el('text',{x:84,y:35,class:'mountain-total'},'/ '+data.total);svg.append(number,unit,total);

 let currentCount=0,frame=0,generation=0,visible=false,activeData={...data};
 function draw(count){currentCount=count;nodes.forEach((n,i)=>n.style.display=i<count?'':'none')}
 function point(count){const edge=cells[Math.max(0,count-1)];return count>0&&edge?{x:edge.x+19,y:edge.y+5}:{x:205,y:197}}
 // A fixed tool angle: the stroke is a lift, a downward blow and a short recoil, never a spin.
 function pose(p,lift=0){pick.setAttribute('transform',`translate(${p.x+lift*.4} ${p.y-lift}) rotate(-25)`)}
 function commit(target){write(CACHE,JSON.stringify(core.snapshot(target)));}

 function start(target){
  generation++;const run=generation;cancelAnimationFrame(frame);dust.replaceChildren();activeData={...target};
  const previous=core.cached(read(CACHE),target),plan=core.plan(previous,target,cells.length);
  draw(plan.start);number.textContent=previous&&previous.remaining>=target.remaining?previous.remaining:target.remaining;root.setAttribute('aria-label',`本学期剩余 ${target.remaining} / ${target.total} 课时`);
  const rest=point(plan.start);pose(rest);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||plan.start===0){draw(plan.end);number.textContent=target.remaining;pose(point(plan.end));commit(target);return}

  const particles=[],strikes=[false,false],firstEnd=plan.start-Math.ceil(plan.removing/2);let began,anchored=false;
  function chip(cell,birth,seed,small=false){
   const size=small?3:6,n=el('rect',{x:-size/2,y:-size/2,width:size,height:size,fill:nodes[cell.id].getAttribute('fill')});dust.append(n);
   particles.push({n,x:cell.x+3,y:cell.y+3,size,vx:30+(seed*47)%100,vy:-95-(seed*29)%110,spin:((seed%2)?1:-1)*(180+(seed*53)%240),birth});
  }
  function hit(which){strikes[which]=true;if(!plan.removing){const surface=cells[currentCount-1];for(let i=0;i<4;i++)chip(surface,which?1100:480,i+which*7,true)}}
  function peel(to,birth){
   // The next block always belongs to the current exposed outline. Its exact cell becomes a rigid fragment.
   while(currentCount>to){const c=cells[currentCount-1];nodes[c.id].style.display='none';chip(c,birth,c.id);currentCount--}
  }
  function liftAt(t,impact){const q=t-impact;if(q<-300||q>230)return 0;if(q<-110)return 30*(q+300)/190;if(q<0)return 30*(1-Math.pow((q+110)/110,2));return 8*Math.sin(q/230*Math.PI)*Math.exp(-q/200)}
  function animate(now){
   if(run!==generation)return;if(began===undefined)began=now;const t=now-began;
   if(t>=480&&!strikes[0])hit(0);if(t>=1100&&!strikes[1])hit(1);
   if(plan.removing&&t>=480){const phase=t<1100?Math.min(1,(t-480)/170):Math.min(1,(t-1100)/170);const from=t<1100?plan.start:firstEnd,to=t<1100?firstEnd:plan.end;peel(from-Math.ceil((from-to)*phase),t)}
   pose(rest,liftAt(t,480)+liftAt(t,1100));
   for(let i=particles.length-1;i>=0;i--){const part=particles[i],age=Math.max(0,(t-part.birth)/1000),x=part.x+part.vx*age,y=part.y+part.vy*age+360*age*age;
    part.n.setAttribute('transform',`translate(${x} ${y}) rotate(${part.spin*age})`);
    // No fade: remove a fragment only after its complete rigid body has crossed the viewport.
    if(y-part.size>260||x-part.size>260){part.n.remove();particles.splice(i,1)}
   }
   if(t>=1320&&!anchored){anchored=true;draw(plan.end);number.textContent=target.remaining;commit(target)}
   if(t<1400||particles.length)frame=requestAnimationFrame(animate);else pose(rest);
  }
  frame=requestAnimationFrame(animate);
 }

 function stop(){generation++;cancelAnimationFrame(frame);dust.replaceChildren();}const observer=preview?null:new IntersectionObserver(entries=>{const next=entries[0].isIntersecting;if(next&&!visible&&!document.hidden){visible=true;start(data)}else if(!next){visible=false;stop()}},{threshold:.35});observer?.observe(root);const visibility=()=>{if(document.hidden)stop();else if(visible)start(activeData)};if(!preview)document.addEventListener('visibilitychange',visibility);draw(core.count(data,cells.length));pose(point(currentCount));number.textContent=data.remaining;root.onclick=onOpen;return {destroy(){stop();observer?.disconnect();document.removeEventListener('visibilitychange',visibility);root.replaceChildren();root.onclick=null;}};}};})();
window.FolioNewsArt=function(svg,kind){const NS='http://www.w3.org/2000/svg';const add=(d,fill,stroke)=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',d);if(fill)p.setAttribute('fill',fill);else p.setAttribute('fill','none');if(stroke){p.setAttribute('stroke',stroke);p.setAttribute('stroke-width','2')}svg.append(p)};if(kind==='wood'){add('M4 16l40-4 3 45-40 4Z','#c8a272');add('M9 22l29-3 1 29-28 3Z','#eaddbb');add('M9 32l30-3 1 5-30 3Z','#b89568');add('M11 47l29-3 1 4-29 3Z','#b89568');add('M13 20l6-1 1 12-6 1Z','#92a28a');add('M23 19l7-1 1 12-7 1Z','#c58a6d');add('M14 38l6-1 1 10-6 1Z','#9ab4af')}else if(kind==='robot'){add('M9 25l31-2 3 25-32 2Z','#91aba5');add('M16 15l18-1 1 12-18 1Z','#b4c2af');add('M15 49l7-1v12l-8 1Z M33 48l7-1 2 11-8 1Z','#819a94');add('M12 32l-7 3 1 12 5-1M41 32l6 2-1 12-5-1Z','#a0b4a8');add('M22 26l1-6m7 6v-6',null,'#dce1cd')}else{add('M5 18l19 3 2 38-20-5Z','#b9c49f');add('M24 21l20-7 2 38-20 7Z','#d0d7b5');add('M24 21l2 38',null,'#8f9e7e');add('M10 28l10 1m-10 7 10 1m11-10 9-3m-9 11 10-3',null,'#9bac89')}};
