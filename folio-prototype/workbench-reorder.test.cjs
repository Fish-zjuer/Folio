const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function harness(options={}){
 const listeners=new Map(),timers=new Map();let serial=0;
 const list=()=>{const values=new Set();return{add(...s){s.forEach(x=>values.add(x));},remove(...s){s.forEach(x=>values.delete(x));},toggle(s,on){if(on)values.add(s);else values.delete(s);},contains:s=>values.has(s)}};
 const surface={children:[],classList:list(),addEventListener(name,fn){listeners.set('grid:'+name,fn);},contains:n=>surface.children.includes(n),hasPointerCapture:()=>false,dispatchEvent(){}},swaps=[],holds=[];
 for(let i=0;i<4;i++)surface.children.push({dataset:{index:String(i)},classList:list(),style:{removeProperty(k){delete this[k]}},getBoundingClientRect:()=>({left:(i%2)*100,top:Math.floor(i/2)*100,right:(i%2)*100+90,bottom:Math.floor(i/2)*100+90,width:90,height:90})});
 const source=surface.children[0],target={closest(selector){return selector.includes('.workbench-slot')?source:null;}};
 const context={window:{addEventListener:(n,f)=>listeners.set('window:'+n,f)},document:{addEventListener(){}},matchMedia:()=>({matches:false}),performance:{now:()=>100},setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),CustomEvent:class{},FolioWorkbenchSlots:{hit(rects,x,y){return rects.findIndex(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)},neighbor:()=>1}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./workbench-reorder.js'),'utf8'),context);
 const removals=[],trash={hidden:false,classList:list(),getBoundingClientRect:()=>({left:40,top:240,right:116,bottom:318,width:76,height:78})};
 const binding=context.window.FolioWorkbenchReorder.bind(surface,{swap:(a,b)=>swaps.push([a,b]),hold:i=>holds.push(i),trash:options.trash?()=>trash:null,remove:i=>removals.push(i)});
 function fire(scope,type,event={}){listeners.get(scope+':'+type)?.({target,button:0,isPrimary:true,pointerId:7,clientX:20,clientY:20,cancelable:true,preventDefault(){},...event});}
 function flush(){const pending=[...timers];timers.clear();pending.forEach(([,fn])=>fn());}
 return{surface,source,binding,swaps,holds,fire,flush,removals,trash};
}
test('An interactive card allows the page to begin a swipe while long press is pending',()=>{
 const h=harness();h.fire('grid','pointerdown');assert.equal(h.binding.active,false);assert.equal(h.source.classList.contains('is-widget-pressed'),true);h.fire('window','pointermove',{clientX:50});h.flush();assert.equal(h.binding.active,false);assert.deepEqual(h.holds,[]);assert.equal(h.source.classList.contains('is-widget-pressed'),false);
});
test('A held touch survives native pointer cancellation, follows touch and swaps on touchend',()=>{
 const h=harness();h.fire('grid','pointerdown');h.fire('grid','touchstart',{touches:[{identifier:8}]});h.flush();assert.equal(h.binding.active,true);assert.deepEqual(h.holds,[0]);
 h.fire('window','pointercancel');assert.equal(h.binding.active,true);
 assert.match(h.source.style.transform,/scale\(\.95\)/);
 h.fire('grid','touchmove',{touches:[{identifier:8,clientX:120,clientY:20}]});assert.match(h.source.style.transform,/translate\(100px,0px\)/);
 h.fire('grid','touchend',{changedTouches:[{identifier:8,clientX:120,clientY:20}]});h.flush();assert.deepEqual(h.swaps,[[0,1]]);assert.equal(h.binding.active,false);
});
test('Dropping over the basket removes one widget after its arrival, without swapping',()=>{
 const h=harness({trash:true});h.fire('grid','pointerdown');h.flush();
 h.fire('window','pointermove',{clientX:75,clientY:270});assert.equal(h.trash.classList.contains('is-target'),true);
 h.fire('window','pointerup',{clientX:75,clientY:270});assert.equal(h.removals.length,0);assert.equal(h.source.style.opacity,'0');assert.ok(!h.source.style.transform.includes('NaN'));
 h.flush();assert.deepEqual(h.removals,[0]);assert.deepEqual(h.swaps,[]);assert.equal(h.trash.classList.contains('is-target'),false);
});
test('Cancelled and hidden basket targets never remove a widget',()=>{
 const h=harness({trash:true});h.fire('grid','pointerdown');h.flush();h.fire('window','pointermove',{clientX:75,clientY:270});h.fire('window','pointercancel',{clientX:75,clientY:270});h.flush();assert.deepEqual(h.removals,[]);
 h.trash.hidden=true;h.fire('grid','pointerdown');h.flush();h.fire('window','pointerup',{clientX:75,clientY:270});h.flush();assert.deepEqual(h.removals,[]);
});
