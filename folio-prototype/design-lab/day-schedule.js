(() => {
  'use strict';
  const time=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  function mount(container,{events=[],now=0,onSelect=()=>{}}={}){
    const data=events.filter(e=>typeof e.title==='string'&&Number.isFinite(e.start)&&Number.isFinite(e.end)&&e.start>=0&&e.end>e.start&&e.end<=1440).map(e=>({...e})).sort((a,b)=>a.start-b.start);
    const root=document.createElement('div');root.className='day-square';root.setAttribute('role','group');root.setAttribute('aria-label','一日日程');container.replaceChildren(root);
    const paper=document.createElement('div');paper.className='day-focus-paper';paper.setAttribute('aria-hidden','true');root.append(paper);
    root.insertAdjacentHTML('beforeend','<svg class="day-focus-arrow" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2Q2 1 3 2L10 5Q12 6 10 7L3 10Q2 11 2 10Z"/></svg><svg class="day-ornament" viewBox="0 0 30 16" aria-hidden="true"><path d="m5 8 5-5m2 8 5-5m2 8 5-5"/></svg>');
    if(!data.length){root.replaceChildren();const empty=document.createElement('div');empty.className='day-empty';empty.textContent='今天留白';root.append(empty);return {setNow(){},follow(){},destroy(){root.remove()}}}
    const scroller=document.createElement('div');scroller.className='day-scroll';scroller.setAttribute('aria-label','上下滚动查看日程');root.append(scroller);
    let currentNow=now,nearest=0,frame=0,gesture=null,ignoreClickUntil=0,disposed=false;
    const rows=data.map((event,index)=>{const row=document.createElement('button');row.type='button';row.className='day-row'+(event.kind==='gap'?' is-gap':'');row.setAttribute('aria-label',time(event.start)+'至'+time(event.end)+'，'+event.title+(event.place?'，'+event.place:''));const stamp=document.createElement('time');stamp.textContent=time(event.start);const body=document.createElement('span');body.className='day-row-body';const title=document.createElement('span');title.className='day-row-title';title.textContent=event.title;const place=document.createElement('span');place.className='day-row-place';place.textContent=event.place||'';body.append(title,place);row.append(stamp,body);scroller.append(row);row.addEventListener('click',e=>{if(performance.now()<ignoreClickUntil){e.preventDefault();return}onSelect({...event})});row.addEventListener('focus',()=>go(index,true));return row});
    const center=row=>row.offsetTop+row.offsetHeight/2-scroller.clientHeight/2;
    function refresh(){frame=0;if(disposed)return;const middle=scroller.scrollTop+scroller.clientHeight/2;let best=Infinity;rows.forEach((row,i)=>{const distance=Math.abs(row.offsetTop+row.offsetHeight/2-middle),ratio=Math.min(1,distance/(scroller.clientHeight*.58));row.style.transform=`scale(${1-ratio*.15})`;row.style.opacity=String(1-ratio*.6);row.style.filter=`blur(${ratio*.45}px)`;if(distance<best){best=distance;nearest=i}row.classList.toggle('is-now',currentNow>=data[i].start&&currentNow<data[i].end)});root.classList.toggle('is-gap',data[nearest].kind==='gap')}
    function queueRefresh(){if(!frame)frame=requestAnimationFrame(refresh)}
    function go(index,smooth){if(disposed)return;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;scroller.scrollTo({top:center(rows[index]),behavior:smooth&&!reduce?'smooth':'instant'});queueRefresh()}
    function follow(smooth=true){let index=data.findIndex(e=>currentNow>=e.start&&currentNow<e.end);if(index<0)index=data.findIndex(e=>e.start>currentNow);go(index<0?data.length-1:index,smooth)}
    scroller.addEventListener('scroll',queueRefresh,{passive:true});
    // Touch keeps native scrolling and inertia; mouse dragging follows the pointer.
    scroller.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;gesture={id:e.pointerId,y:e.clientY,top:scroller.scrollTop,moved:false}});
    scroller.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.id)return;const delta=e.clientY-gesture.y;if(!gesture.moved&&Math.abs(delta)>5){gesture.moved=true;scroller.classList.add('is-dragging');scroller.setPointerCapture(e.pointerId)}if(gesture.moved){e.preventDefault();scroller.scrollTop=gesture.top-delta}});
    function release(e){if(!gesture||e.pointerId!==gesture.id)return;const moved=gesture.moved;gesture=null;scroller.classList.remove('is-dragging');if(scroller.hasPointerCapture(e.pointerId))scroller.releasePointerCapture(e.pointerId);if(moved){ignoreClickUntil=performance.now()+200;refresh();go(nearest,true)}}
    scroller.addEventListener('pointerup',release);scroller.addEventListener('pointercancel',release);scroller.addEventListener('pointerleave',e=>{if(gesture&&!gesture.moved)gesture=null});
    const resize=new ResizeObserver(()=>go(nearest,false));resize.observe(root);requestAnimationFrame(()=>{if(!disposed){follow(false);refresh()}});
    return {setNow(value){if(!Number.isFinite(value))return;currentNow=value;follow()},follow(){follow()},destroy(){disposed=true;resize.disconnect();cancelAnimationFrame(frame);root.remove()}};
  }
  window.FolioDaySchedule={mount,time};
})();
