/* 手势只认一次输入流：触屏走 TouchEvent，鼠标和笔走 PointerEvent。 */
(function(root){
  "use strict";
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function axis(dx,dy,threshold=8){
    const x=Math.abs(dx),y=Math.abs(dy);
    if(Math.max(x,y)<threshold)return null;
    if(x>y*1.15)return "x";
    if(y>x*1.15)return "y";
    return Math.max(x,y)>=24?(x>y?"x":"y"):null;
  }
  function pageOffset(dx,index,width){return clamp(dx,-width*(1-index),width*index);}
  function destination(index,dx,velocity,width,cancelled=false,options={}){
    if(cancelled||width<=0)return index;
    const direction=index===0?-1:1;
    if(dx*direction<=0)return index;
    const minDistance=options.minDistance??42,ratio=options.distanceRatio??.22;
    const flickDistance=options.flickDistance??28,flickVelocity=options.flickVelocity??.45;
    const dragged=Math.abs(dx)>=Math.max(minDistance,width*ratio);
    const flick=Math.abs(dx)>=flickDistance&&velocity*direction>=flickVelocity;
    return dragged||flick?1-index:index;
  }
  function bind(surface,options){
    let active=null;
    const now=()=>performance.now();
    function start(event,point,source){
      if(active||options.enabled?.()===false||options.ignore?.(event.target,event))return;
      const extra=options.start?.(event,point);if(extra===false)return;
      active={id:point.identifier??point.pointerId,source,x:point.clientX,y:point.clientY,dx:0,dy:0,axis:null,startTime:now(),samples:[],extra};
    }
    function move(event,point){
      const item=active;if(!item)return;
      item.dx=point.clientX-item.x;item.dy=point.clientY-item.y;
      if(!item.axis){
        const locked=axis(item.dx,item.dy);if(!locked)return;
        if(options.axis&&options.axis!=="both"&&options.axis!==locked||options.allowAxis?.(locked)===false){active=null;return;}
        item.axis=locked;
      }
      if(event.cancelable)event.preventDefault();
      const time=now();item.samples.push({x:point.clientX,y:point.clientY,time});
      item.samples=item.samples.filter(sample=>time-sample.time<=100);
      options.move?.(item,event);
    }
    function end(event,point,cancelled=false){
      const item=active;if(!item)return;active=null;
      if(point){item.dx=point.clientX-item.x;item.dy=point.clientY-item.y;}
      if(!item.axis)return;
      const first=item.samples[0],last=item.samples.at(-1),elapsed=first&&last?last.time-first.time:0;
      item.velocityX=elapsed>=10?(last.x-first.x)/elapsed:0;
      item.velocityY=elapsed>=10?(last.y-first.y)/elapsed:0;
      options.end?.(item,event,cancelled);
    }
    surface.addEventListener("touchstart",event=>{if(event.touches.length===1)start(event,event.touches[0],"touch");else if(active?.source==="touch")end(event,null,true);},{passive:true});
    surface.addEventListener("touchmove",event=>{if(active?.source!=="touch")return;const point=[...event.touches].find(p=>p.identifier===active.id);if(point)move(event,point);else end(event,null,true);},{passive:false});
    surface.addEventListener("touchend",event=>{if(active?.source!=="touch")return;const point=[...event.changedTouches].find(p=>p.identifier===active.id);if(point)end(event,point);},{passive:true});
    surface.addEventListener("touchcancel",event=>{if(active?.source==="touch")end(event,null,true);},{passive:true});
    surface.addEventListener("pointerdown",event=>{if(event.pointerType!=="touch"&&event.isPrimary&&event.button===0)start(event,event,"pointer");});
    root.addEventListener("pointermove",event=>{if(active?.source==="pointer"&&active.id===event.pointerId)move(event,event);},{passive:false});
    root.addEventListener("pointerup",event=>{if(active?.source==="pointer"&&active.id===event.pointerId)end(event,event);});
    root.addEventListener("pointercancel",event=>{if(active?.source==="pointer"&&active.id===event.pointerId)end(event,event,true);});
    return {cancel(){if(active)end({},null,true);},get active(){return active;}};
  }
  const api={axis,pageOffset,destination,bind};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.FolioGesture=api;
})(typeof globalThis==="undefined"?this:globalThis);
