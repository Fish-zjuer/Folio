(()=>{
 'use strict';
 function bind(grid,{enabled=()=>true,swap,hold=()=>{},announce=()=>{},trash=null,remove=()=>{}}){
  let drag=null,settleTimer=null,blockedUntil=0;
  const all=()=>[...grid.children],reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trashNode=()=>typeof trash==='function'?trash():trash;
  function overTrash(x,y){const node=trashNode();if(!node||node.hidden)return false;const r=node.getBoundingClientRect();return x>=r.left-8&&x<=r.right+8&&y>=r.top-8&&y<=r.bottom+8;}
  function clean(){clearTimeout(settleTimer);settleTimer=null;for(const n of all()){n.classList.remove('is-widget-held','is-widget-drop','is-widget-pressed');n.style.removeProperty('transform');n.style.removeProperty('transition');n.style.removeProperty('opacity')}trashNode()?.classList.remove('is-target');grid.classList.remove('is-widget-reordering')}
  function cancel(){if(drag){const d=drag;drag=null;clearTimeout(d.timer);if(grid.hasPointerCapture?.(d.id))grid.releasePointerCapture(d.id)}clean()}
  function activate(item){if(drag!==item||!enabled())return;item.held=true;item.rects=all().map(n=>n.getBoundingClientRect());item.source.classList.add('is-widget-held');item.source.style.transform='scale(.95)';grid.classList.add('is-widget-reordering');try{grid.setPointerCapture?.(item.id)}catch{};hold(item.from);announce('已进入编辑，拖动换位，拖到纸篓移除。');grid.dispatchEvent(new CustomEvent('folio-widget-drag-start',{bubbles:true}))}
  grid.addEventListener('pointerdown',event=>{if(drag||settleTimer||!enabled()||event.button!==0||event.isPrimary===false||event.target.closest('input,select,textarea,[contenteditable=true]'))return;const source=event.target.closest('.workbench-slot.has-widget');if(!source||!grid.contains(source))return;source.classList.add('is-widget-pressed');const item={id:event.pointerId,source,from:Number(source.dataset.index),x:event.clientX,y:event.clientY,held:false,to:-1};drag=item;item.timer=setTimeout(()=>activate(item),420)});
  function move(event){const d=drag;if(!d||event.pointerId!==d.id)return;const dx=event.clientX-d.x,dy=event.clientY-d.y;if(!d.held){if(Math.hypot(dx,dy)>9){clearTimeout(d.timer);d.source.classList.remove('is-widget-pressed');drag=null}return}event.preventDefault();d.source.style.transform=`translate(${dx}px,${dy}px) scale(.95)`;const over=overTrash(event.clientX,event.clientY);trashNode()?.classList.toggle('is-target',over);d.to=over?-2:FolioWorkbenchSlots.hit(d.rects,event.clientX,event.clientY);all().forEach((n,i)=>n.classList.toggle('is-widget-drop',!over&&i===d.to&&i!==d.from))}
  window.addEventListener('pointermove',event=>{if(!drag?.touch)move(event)},{passive:false});
  function finish(event,cancelled=false){const d=drag;if(!d||event.pointerId!==d.id)return;clearTimeout(d.timer);drag=null;if(grid.hasPointerCapture?.(d.id))grid.releasePointerCapture(d.id);d.source.classList.remove('is-widget-pressed');if(!d.held)return;blockedUntil=performance.now()+350;if(event.cancelable)event.preventDefault();const dropTrash=!cancelled&&overTrash(event.clientX,event.clientY),to=cancelled?-1:FolioWorkbenchSlots.hit(d.rects,event.clientX,event.clientY),changed=!dropTrash&&to>=0&&to!==d.from;const duration=reduced()?0:240;d.source.style.transition=`transform ${duration}ms cubic-bezier(.22,1,.36,1),opacity ${duration}ms ease`;
   if(dropTrash){const r=trashNode().getBoundingClientRect(),s=d.rects[d.from];d.source.style.transform=`translate(${r.left+r.width/2-s.left-s.width/2}px,${r.top+r.height/2-s.top-s.height/2}px) scale(.12)`;d.source.style.opacity='0';settleTimer=setTimeout(()=>{clean();remove(d.from)},duration);return;}
   if(changed){const a=d.rects[d.from],b=d.rects[to],target=all()[to];d.source.style.transform=`translate(${b.left-a.left}px,${b.top-a.top}px)`;target.style.transition=d.source.style.transition;target.style.transform=`translate(${a.left-b.left}px,${a.top-b.top}px)`}else d.source.style.transform='translate(0,0)';
   settleTimer=setTimeout(()=>{clean();if(changed)swap(d.from,to)},duration);
  }
  // Touch owns its lifetime once present: UA pointercancel on native pan must not kill a held drag.
  grid.addEventListener('touchstart',e=>{if(e.touches.length!==1){cancel();return;}if(drag){drag.touch=true;drag.touchId=e.touches[0].identifier;}},{passive:true});
  grid.addEventListener('touchmove',e=>{if(!drag?.touch)return;const p=[...e.touches].find(p=>p.identifier===drag.touchId);if(p)move({pointerId:drag.id,clientX:p.clientX,clientY:p.clientY,preventDefault(){if(e.cancelable)e.preventDefault();}});},{passive:false});
  function endTouch(e,cancelled){if(!drag?.touch)return;const p=[...e.changedTouches].find(p=>p.identifier===drag.touchId);if(p)finish({pointerId:drag.id,clientX:p.clientX,clientY:p.clientY,cancelable:e.cancelable,preventDefault(){e.preventDefault();}},cancelled);}
  grid.addEventListener('touchend',e=>endTouch(e,false),{passive:false});grid.addEventListener('touchcancel',e=>endTouch(e,true),{passive:false});
  window.addEventListener('pointerup',e=>{if(!drag?.touch)finish(e)});window.addEventListener('pointercancel',e=>{if(!drag?.touch)finish(e,true)});grid.addEventListener('lostpointercapture',e=>{if(drag?.held&&!drag?.touch)finish(e,true)});
  grid.addEventListener('click',e=>{if(performance.now()<blockedUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  grid.addEventListener('contextmenu',e=>{if(e.target.closest('.workbench-slot.has-widget'))e.preventDefault()});
  grid.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();cancel();return}if(!e.altKey||!enabled())return;const source=e.target.closest('.workbench-slot.has-widget');if(!source)return;const from=Number(source.dataset.index),to=FolioWorkbenchSlots.neighbor(from,e.key);if(to<0)return;e.preventDefault();cancel();swap(from,to);all()[to]?.focus({preventScroll:true})});
  window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});
  return{cancel,get active(){return !!drag?.held||!!settleTimer}};
 }
 window.FolioWorkbenchReorder={bind};
})();


