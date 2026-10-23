const {test}=require('node:test'),assert=require('node:assert/strict'),Q=require('./homework-queue-core.js');
const today='2026-10-22';
const item=id=>({id,title:id,kind:'homework',queued:true,completed:false,deadline:'2026-11-01',manualDate:false,mountDate:'2026-10-25',mountClock:'14:00',mountedOn:null});
test('学校刷新保留手动来源及撤回后的当天暂停，重复实例重建也不丢来源',()=>{
 const B=require('./backend-core.js'),T=require('./todo-core.js'),a={...item('school'),source:'school'};Q.pinFromDesk([a],a,today);
 let rows=B.mergeHomework([a],[{...item('school'),source:'school',title:'学校更新'}]);assert.equal(Q.undoDeskPins(rows,today),1);
 rows=B.mergeHomework(rows,[{...item('school'),source:'school'}]);Q.advance(rows,today);assert.equal(rows[0].mountedOn,null);assert.equal(rows[0].deskHoldDay,today);
 const parent={...item('parent'),source:'personal',deadline:today,timeMode:'deadline',repeat:{kind:'daily',interval:1,until:null}},generated=T.materialize([parent],today),child=generated.find(i=>i.parentId==='parent'&&i.occurrenceDay===today);Q.pinFromDesk(generated,child,today);const next=T.materialize(generated,today);assert.equal(Q.undoDeskPins(next,today,child.id),1);
});
test('从袋子手动贴出后可以撤回，原事项/截止时间/队列保留；提交不会立即重新挂出',()=>{
 const a=item('a'),before=structuredClone(a);assert.equal(Q.pinFromDesk([a],a,today).ok,true);assert.equal(a.mountedOn,today);assert.equal(a.deskPin.version,1);
 const restored=JSON.parse(JSON.stringify([a]));assert.equal(Q.undoDeskPins(restored,today),1);assert.equal(restored[0].deadline,before.deadline);assert.equal(restored[0].mountClock,before.mountClock);assert.equal(restored[0].queued,true);assert.equal(restored[0].mountedOn,null);
 Q.plan(restored,[10,20,20,15,10,10,15]);Q.advance(restored,today);assert.equal(restored[0].mountedOn,null);assert.equal(Q.undoDeskPins(restored,today),0);
});
test('AI、作业页和自动挂载的便签不清空，也不猜旧版记录来源',()=>{
 const desk=item('desk'),ai=item('ai'),homework=item('hw'),old=item('old');Q.move(ai,'2026-10-20',today);Q.move(homework,'2026-10-20',today);old.mountedOn='2026-10-20';old.manualDate=true;
 const protectedBefore=JSON.stringify([ai,homework,old]);Q.pinFromDesk([desk,ai,homework,old],desk,today);
 assert.equal(Q.undoDeskPins([desk,ai,homework,old],today),1);assert.equal(JSON.stringify([ai,homework,old]),protectedBefore);
});
test('后来在作业页或AI重新设置挂载，则清除撤回权限',()=>{
 const a=item('a');Q.pinFromDesk([a],a,today);Q.manualMove([a],a,today,today);assert.equal(Q.undoDeskPins([a],today),0);
 const b=item('b');Q.pinFromDesk([b],b,today);Q.setQueued(b,true);assert.equal(Q.undoDeskPins([b],today),0);
});
test('撤回只作用于选中的便签，完成状态及已变动的挂载不被覆盖',()=>{
 const a=item('a'),b=item('b');Q.pinFromDesk([a],a,today);Q.pinFromDesk([b],b,today);assert.equal(Q.undoDeskPins([a,b],today,'a'),1);assert.equal(b.mountedOn,today);b.mountDate='2026-10-23';assert.equal(Q.undoDeskPins([b],today),0);
 const c=item('c');Q.pinFromDesk([c],c,today);Q.complete(c);assert.equal(Q.undoDeskPins([c],today),0);assert.equal(c.completed,true);
});
test('同日自动挂载计划在撤回后暂停当天；次日恢复原计划，重新手动挂上也可立即生效',()=>{
 const a=item('a');a.mountDate=today;Q.pinFromDesk([a],a,today);Q.undoDeskPins([a],today);Q.advance([a],today,'23:59');assert.equal(a.mountedOn,null);Q.advance([a],'2026-10-23');assert.equal(a.mountedOn,'2026-10-23');
 const b=item('b');Q.pinFromDesk([b],b,today);Q.undoDeskPins([b],today);assert.equal(Q.pinFromDesk([b],b,today).ok,true);assert.equal(b.mountedOn,today);assert.equal(b.deskHoldDay,undefined);
});
