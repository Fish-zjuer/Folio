const test=require('node:test'),assert=require('node:assert/strict');
const G=require('./gesture-core.js');
test('轴锁有死区，斜向小抖动不抢占滚动，大位移才确定主轴',()=>{
  assert.equal(G.axis(5,6),null);assert.equal(G.axis(12,11),null);
  assert.equal(G.axis(18,4),'x');assert.equal(G.axis(3,-18),'y');
  assert.equal(G.axis(25,24),'x');
});
test('两页拖动实时停在手指位置，边缘不越界；释放不足回弹，明显拖动或快划才换页',()=>{
  assert.equal(G.pageOffset(-90,0,390),-90);assert.equal(G.pageOffset(90,1,390),90);
  assert.equal(G.pageOffset(90,0,390),0);assert.equal(G.pageOffset(-600,0,390),-390);
  assert.equal(G.destination(0,-60,0,390),0);assert.equal(G.destination(0,-120,0,390),1);
  assert.equal(G.destination(0,-32,-.6,390),1);assert.equal(G.destination(1,32,.6,390),0);
  assert.equal(G.destination(0,120,1,390),0);assert.equal(G.destination(1,-120,-1,390),1);
  assert.equal(G.destination(0,-200,-2,390,true),0);
});
test('主界面可配置更轻的翻页门槛，短距离快划也能过去；月历默认手感不变',()=>{
  const easy={minDistance:26,distanceRatio:.13,flickDistance:16,flickVelocity:.24};
  assert.equal(G.destination(0,-34,-.3,390,false,easy),1);
  assert.equal(G.destination(1,34,.3,390,false,easy),0);
  assert.equal(G.destination(0,-20,.1,390,false,easy),0);
  assert.equal(G.destination(0,-34,-.3,390),0);
});
function harness(t,options={}){
  const windowListeners=new Map(),surfaceListeners=new Map(),old=global.addEventListener,oldRemove=global.removeEventListener;
  global.addEventListener=(name,fn)=>windowListeners.set(name,fn);global.removeEventListener=name=>windowListeners.delete(name);t.after(()=>{global.addEventListener=old;global.removeEventListener=oldRemove;});
  const surface={addEventListener:(name,fn)=>surfaceListeners.set(name,fn),removeEventListener:name=>surfaceListeners.delete(name)},moves=[],ends=[];
  const binding=G.bind(surface,{axis:'x',move:s=>moves.push({dx:s.dx,axis:s.axis}),end:(s,e,cancelled)=>ends.push({dx:s.dx,axis:s.axis,cancelled}),...options});
  const point=(x,y)=>({identifier:7,clientX:x,clientY:y});
  let prevented=0;
  function touch(name,x,y,count=1){const p=point(x,y);surfaceListeners.get(name)({target:surface,touches:name==='touchend'?[]:Array.from({length:count},()=>p),changedTouches:[p],cancelable:true,preventDefault(){prevented++;}});}
  return {surfaceListeners,windowListeners,moves,ends,binding,touch,get prevented(){return prevented;}};
}
test('触屏只走一条输入流，PointerEvent 不会先取消或重复提交 TouchEvent',t=>{
  const h=harness(t);
  h.surfaceListeners.get('pointerdown')({pointerType:'touch',isPrimary:true,button:0,pointerId:7,clientX:200,clientY:100});
  assert.equal(h.binding.active,null);
  h.touch('touchstart',200,100);h.touch('touchmove',120,104);
  assert.deepEqual(h.moves,[{dx:-80,axis:'x'}]);assert.equal(h.prevented,1);
  h.windowListeners.get('pointercancel')({pointerType:'touch',pointerId:7});
  assert.ok(h.binding.active);h.touch('touchend',120,104);
  assert.deepEqual(h.ends,[{dx:-80,axis:'x',cancelled:false}]);assert.equal(h.binding.active,null);
});
test('日程外侧纵向拖动交还原生滚动，横向才由 pager 接管',t=>{
  const h=harness(t);h.touch('touchstart',200,100);h.touch('touchmove',204,135);h.touch('touchend',204,180);
  assert.equal(h.prevented,0);assert.equal(h.moves.length,0);assert.equal(h.ends.length,0);
});
test('月历选择双轴时上下触摸不丢失，取消和多指均只回弹一次',t=>{
  const h=harness(t,{axis:'both'});h.touch('touchstart',200,200);h.touch('touchmove',204,140);h.touch('touchmove',100,120);
  assert.equal(h.moves[0].axis,'y');assert.equal(h.moves[1].axis,'y');
  h.touch('touchcancel',100,120);h.touch('touchend',100,120);
  assert.equal(h.ends.length,1);assert.equal(h.ends[0].cancelled,true);
  h.touch('touchstart',200,200);h.touch('touchmove',150,200);h.touch('touchstart',150,200,2);
  assert.equal(h.ends.length,2);assert.equal(h.ends[1].cancelled,true);
});

test('移除卡片包后销毁手势绑定，清掉窗口和表面的监听并回弹一次',t=>{const h=harness(t);h.touch('touchstart',200,100);h.touch('touchmove',100,100);h.binding.destroy();assert.equal(h.binding.active,null);assert.equal(h.surfaceListeners.size,0);assert.equal(h.windowListeners.size,0);assert.equal(h.ends.length,1);assert.equal(h.ends[0].cancelled,true);});
