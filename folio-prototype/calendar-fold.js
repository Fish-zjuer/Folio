/* 月历上下滑收放：保留选中日期所在周，不改变日程/课表的左右手势。 */
const calendarMonthSurface=document.querySelector(".schedule-month"),calendarMonthWindow=document.getElementById("schedule-month-window"),calendarMonthGrid=document.getElementById("schedule-month-grid"),calendarMonthToggle=document.getElementById("schedule-month-toggle");
let calendarFoldMetrics=null,calendarFoldSwipe=null,calendarFoldSuppressClick=0;
function measureCalendarFold(){
  const weeks=[...calendarMonthGrid.children],selected=calendarMonthGrid.querySelector(`[data-date="${calendarSelectedDay}"]`)?.closest(".schedule-month-week");
  if(!selected)return null;
  const height=selected.getBoundingClientRect().height;
  if(!height)return null;
  weeks.forEach(week=>week.classList.toggle("is-fold-week",week===selected));
  return {height,full:calendarMonthGrid.scrollHeight,offset:selected.getBoundingClientRect().top-calendarMonthGrid.getBoundingClientRect().top,selected};
}
function applyCalendarFoldProgress(progress){
  if(!calendarFoldMetrics)return;
  const {height,full,offset}=calendarFoldMetrics;
  calendarMonthSurface.style.setProperty("--calendar-window-height",`${full-(full-height)*progress}px`);
  calendarMonthSurface.style.setProperty("--calendar-week-shift",`${-offset*progress}px`);
  calendarMonthSurface.style.setProperty("--calendar-fold-progress",String(progress));
}
function syncCalendarFold(animate=false){
  calendarFoldMetrics=measureCalendarFold();if(!calendarFoldMetrics)return;
  calendarMonthSurface.classList.toggle("is-fold-static",!animate);
  calendarMonthSurface.dataset.collapsed=String(calendarCollapsed);
  calendarMonthSurface.setAttribute("aria-label",calendarCollapsed?"周历":"月历");
  calendarMonthToggle.setAttribute("aria-expanded",String(!calendarCollapsed));
  calendarMonthToggle.setAttribute("aria-label",calendarCollapsed?"展开完整月历":"收起月历，只看选中的这一周");
  calendarMonthToggle.closest("h2").setAttribute("aria-label",document.getElementById("schedule-month-title").textContent);
  document.getElementById("schedule-prev").setAttribute("aria-label",calendarCollapsed?"上一周":"上个月");
  document.getElementById("schedule-next").setAttribute("aria-label",calendarCollapsed?"下一周":"下个月");
  const active=document.activeElement;
  calendarMonthGrid.querySelectorAll(".schedule-month-week").forEach(week=>{
    const clipped=calendarCollapsed&&week!==calendarFoldMetrics.selected;
    week.inert=clipped;week.setAttribute("aria-hidden",String(clipped));
  });
  if(calendarMonthGrid.contains(active)&&active.closest("[inert]"))calendarMonthToggle.focus({preventScroll:true});
  applyCalendarFoldProgress(calendarCollapsed?1:0);
  if(!animate){void calendarMonthWindow.offsetHeight;calendarMonthSurface.classList.remove("is-fold-static");}
}
function setCalendarCollapsed(collapsed){
  calendarCollapsed=collapsed;syncCalendarFold(true);
}
calendarMonthToggle.addEventListener("click",()=>setCalendarCollapsed(!calendarCollapsed));
let monthNeighbors=[],monthFinish=null,monthTimer=null;
function monthDay(delta){const date=new Date(FolioQueue.dateValue(`${calendarMonth}-01`));date.setUTCMonth(date.getUTCMonth()+delta);const last=new Date(date);last.setUTCMonth(last.getUTCMonth()+1,0);return `${date.toISOString().slice(0,7)}-${String(Math.min(Number(calendarSelectedDay.slice(8)),last.getUTCDate())).padStart(2,"0")}`;}
function prepareMonthNeighbors(){
  for(const delta of [-1,1]){const grid=document.createElement("div"),day=monthDay(delta);grid.className="calendar-neighbor";grid.inert=true;grid.setAttribute("aria-hidden","true");renderCalendarMonth(day.slice(0,7),grid);calendarMonthWindow.append(grid);let shift=0;if(calendarCollapsed){const week=grid.querySelector(`[data-date="${day}"]`)?.closest(".schedule-month-week");if(week){shift=week.offsetTop-grid.offsetTop;[...grid.children].forEach(w=>w.style.opacity=w===week?"1":"0");}}monthNeighbors.push({grid,delta,shift});}
}
function positionMonths(dx,animate=false){const width=calendarMonthWindow.clientWidth,duration=animate&&!matchMedia("(prefers-reduced-motion: reduce)").matches?300:0;calendarMonthGrid.style.transition=`transform ${duration}ms cubic-bezier(.22,.82,.28,1.025)`;calendarMonthGrid.style.transform=`translate(${dx}px,${-calendarFoldMetrics.offset*(calendarCollapsed?1:0)}px)`;for(const n of monthNeighbors){n.grid.style.transition=calendarMonthGrid.style.transition;n.grid.style.transform=`translate(${n.delta*width+dx}px,${-n.shift}px)`;}}
function finishMonthSlide(){clearTimeout(monthTimer);monthTimer=null;const finish=monthFinish;monthFinish=null;monthNeighbors.forEach(n=>n.grid.remove());monthNeighbors=[];calendarMonthGrid.style.removeProperty("transition");calendarMonthGrid.style.removeProperty("transform");if(finish)finish();}
// 月历独占两个轴：上下收放，左右换月份。TouchEvent 不与外层 pager 抢 pointer capture。
FolioGesture.bind(calendarMonthSurface,{
  axis:"both",
  allowAxis:axis=>axis!=="x"||!window.FolioPageRail?.enabled,
  enabled:()=>currentScreen==="calendar"&&homeworkLayer.hidden,
  ignore:target=>Boolean(target.closest(".schedule-month-tools,input,textarea,select")),
  start(){
    if(monthTimer)finishMonthSlide();calendarFoldMetrics=measureCalendarFold();if(!calendarFoldMetrics)return false;
    return {collapsed:calendarCollapsed};
  },
  move(swipe){
    calendarFoldSwipe=swipe;
    if(swipe.axis==="x"){
      calendarMonthSurface.classList.add("is-month-dragging");
      if(!monthNeighbors.length)prepareMonthNeighbors();positionMonths(Math.max(-calendarMonthWindow.clientWidth,Math.min(calendarMonthWindow.clientWidth,swipe.dx)));
      return;
    }
    calendarMonthSurface.classList.add("is-fold-dragging");
    const distance=calendarFoldMetrics.full-calendarFoldMetrics.height;
    const progress=(swipe.extra.collapsed?1:0)-swipe.dy/Math.max(1,distance);
    applyCalendarFoldProgress(Math.max(0,Math.min(1,progress)));
  },
  end(swipe,event,cancelled){
    calendarFoldSwipe=null;calendarFoldSuppressClick=performance.now()+350;
    calendarMonthSurface.classList.remove("is-month-dragging","is-fold-dragging");
    if(swipe.axis==="x"){
      const advance=!cancelled&&(Math.abs(swipe.dx)>=calendarMonthWindow.clientWidth*.22||Math.abs(swipe.dx)>28&&Math.abs(swipe.velocityX)>.45),delta=swipe.dx<0?1:-1;
      const target=advance?monthDay(delta):null;monthFinish=()=>{if(target)selectCalendarDay(target);};positionMonths(advance?-delta*calendarMonthWindow.clientWidth:0,true);monthTimer=setTimeout(finishMonthSlide,matchMedia("(prefers-reduced-motion: reduce)").matches?0:310);
    }else{
      void calendarMonthWindow.offsetHeight;
      setCalendarCollapsed(!cancelled&&Math.abs(swipe.dy)>=36?swipe.dy<0:swipe.extra.collapsed);
    }
  }
});
calendarMonthSurface.addEventListener("click",event=>{if(performance.now()<calendarFoldSuppressClick){event.preventDefault();event.stopPropagation();}},true);
let calendarFoldWheelTotal=0,calendarFoldWheelTime=0,calendarFoldWheelLock=0,calendarFoldWheelDirection=0;
calendarMonthSurface.addEventListener("wheel",event=>{
  if(Math.abs(event.deltaY)<=Math.abs(event.deltaX)||event.ctrlKey)return;
  event.preventDefault();const now=performance.now();if(now<calendarFoldWheelLock&&Math.sign(event.deltaY)===calendarFoldWheelDirection)return;
  if(now-calendarFoldWheelTime>220||Math.sign(event.deltaY)!==Math.sign(calendarFoldWheelTotal))calendarFoldWheelTotal=0;
  calendarFoldWheelTime=now;calendarFoldWheelTotal+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?calendarMonthWindow.clientHeight:1);
  if(Math.abs(calendarFoldWheelTotal)<40)return;
  calendarFoldWheelDirection=Math.sign(calendarFoldWheelTotal);setCalendarCollapsed(calendarFoldWheelTotal>0);calendarFoldWheelTotal=0;calendarFoldWheelLock=now+400;
},{passive:false});
// 响应手机宽度和短屏行高变化；保持当前折叠状态。
let calendarFoldWidth=0;
let calendarFoldResizeFrame=0;
new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width&&width!==calendarFoldWidth){calendarFoldWidth=width;if(!calendarFoldResizeFrame)calendarFoldResizeFrame=requestAnimationFrame(()=>{calendarFoldResizeFrame=0;if(calendarMonthGrid.getClientRects().length)syncCalendarFold(false);});}}).observe(calendarMonthGrid);
window.addEventListener("resize",()=>{if(currentScreen==="calendar"&&!calendarFoldSwipe)syncCalendarFold(false);});
syncCalendarFold(false);
