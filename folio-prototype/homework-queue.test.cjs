const assert = require('node:assert/strict');
const test = require('node:test');
const Q = require('./homework-queue-core.js');
const goalOptions={importantCourses:[{id:'math',title:'微积分',termId:'2026-autumn',start:'2026-10-08',end:'2027-01-24'}]};
test('重要课程作业前 3 天紧急；普通仍为 2 天，其他学期与非作业不受影响',()=>{
  const a={id:'a',kind:'homework',course:'微积分',deadline:'2026-10-22'};
  assert.equal(Q.urgency(a,'2026-10-19',goalOptions),'urgent');assert.equal(Q.urgency(a,'2026-10-19'),'normal');
  assert.equal(Q.urgency({...a,course:'物理'},'2026-10-19',goalOptions),'normal');
  assert.equal(Q.important({...a,termId:'2026-spring'},goalOptions),false);
  assert.equal(Q.important({...a,kind:'todo'},goalOptions),false);
  assert.equal(Q.important({...a,deadline:'2026-05-12'},goalOptions),false);
  const strict={importantCourses:[{id:'math',title:'微积分',termId:'2026-autumn',requireTerm:true,allowTitle:false}]};
  assert.equal(Q.important(a,strict),false);assert.equal(Q.important({...a,courseId:'math',termId:'2026-autumn'},strict),true);
  assert.equal(Q.urgency({...a,completed:true},'2026-10-21',goalOptions),'normal');
});
test('重要作业提前到周五下午或周六，不覆盖手动日期与已挂出；退出重要策略恢复普通分配',()=>{
  const items=Array.from({length:8},(_,i)=>({id:String(i),kind:'homework',course:'微积分',queued:true,deadline:'2026-10-22'}));
  Q.plan(items,[25,45,30],goalOptions);assert.ok(items.every(i=>i.mountDate<='2026-10-17'));assert.equal(items[0].mountClock,'14:00');
  Q.advance(items,'2026-10-16','13:59');assert.equal(Q.rail(items).length,0);
  Q.advance(items,'2026-10-16','14:00');assert.equal(Q.rail(items).length,2);
  Q.move(items[2],'2026-10-20','2026-10-16');const pinned=items[2].mountDate;
  Q.plan(items,[0,0,100],goalOptions);assert.equal(items[0].mountDate,'2026-10-16');assert.equal(items[2].mountDate,pinned);
  Q.plan(items,[0,0,100]);assert.equal(items[3].mountDate,'2026-10-18');assert.equal(items[3].mountClock,null);
});
function batch() {
  return Array.from({length:8}, (_,index) => ({id:`h${index}`, queued:true, deadline:`2026-10-${19 + index % 7}`, completed:false}));
}
test('整数分配保持总数；8 份按 2 / 4 / 2，极端比例也不丢份数', () => {
  assert.deepEqual(Q.quotas(8,[25,45,30]),[2,4,2]);
  for (let count=0;count<40;count++) for (const weights of [[25,45,30],[34,33,33],[0,100,0],[100,0,0]]) {
    assert.equal(Q.quotas(count,weights).reduce((a,b)=>a+b,0),count);
  }
  assert.deepEqual(Q.quotas(8,[25,45,40]),[2,3,3]);
  assert.throws(()=>Q.quotas(8,[0,0,0]));
});
test('一周以周一开始：整周 DDL 都分配到前一周五六日，跨年也正确', () => {
  for(let day=19;day<=25;day++) assert.deepEqual(Q.weekendFor(`2026-10-${day}`),['2026-10-16','2026-10-17','2026-10-18']);
  assert.deepEqual(Q.weekendFor('2027-01-01'),['2026-12-25','2026-12-26','2026-12-27']);
  assert.throws(()=>Q.weekendFor('2026-02-30'));
});
test('周五挂 2、周六累计 6、周日累计 8；逾期及跨日不会自动取下', () => {
  const items=Q.plan(batch(),[25,45,30]);
  Q.advance(items,'2026-10-15'); assert.equal(Q.rail(items).length,0);
  Q.advance(items,'2026-10-16'); assert.equal(Q.rail(items).length,2);
  Q.advance(items,'2026-10-17'); assert.equal(Q.rail(items).length,6);
  Q.advance(items,'2026-10-18'); assert.equal(Q.rail(items).length,8);
  Q.advance(items,'2026-11-01'); assert.equal(Q.rail(items).length,8);
  Q.advance(items,'2026-10-14'); assert.equal(Q.rail(items).length,8);
});
test('完成不改变其他挂载日；教务刷新/DDL 调整及比例改变不能移动已挂载条目', () => {
  const items=Q.plan(batch(),[25,45,30]); Q.advance(items,'2026-10-16');
  const mounted=Q.rail(items)[0]; const original=mounted.mountDate;
  const unmounted=items.find(item=>!item.mountedOn); const date=unmounted.mountDate;
  Q.complete(Q.rail(items)[1]); Q.plan(items,[25,45,30]); assert.equal(unmounted.mountDate,date);
  mounted.deadline='2026-11-09'; Q.plan(items,[100,0,0]); assert.equal(mounted.mountDate,original);
  assert.equal(Q.rail(items).length,1);
});
test('手动改到未来日期先取下且计划不会覆盖；到日重新挂上，DDL 保持不变', () => {
  const items=Q.plan(batch(),[25,45,30]); Q.advance(items,'2026-10-18'); const item=items[0], ddl=item.deadline;
  Q.move(item,'2026-10-23','2026-10-18'); assert.equal(Q.rail(items).length,7);
  Q.plan(items,[100,0,0]); assert.equal(item.mountDate,'2026-10-23'); assert.equal(item.deadline,ddl);
  Q.advance(items,'2026-10-22'); assert.equal(item.mountedOn,null);
  Q.advance(items,'2026-10-23'); assert.equal(item.mountedOn,'2026-10-23');
  Q.complete(item); Q.advance(items,'2026-10-24'); assert.equal(item.mountedOn,null);
});
test('普通待办默认不入队，明确选择入队才参与；退出保留待办，无 DDL 可指定日', () => {
  const item={id:'t',kind:'todo',queued:false,deadline:'2026-10-21'};
  Q.plan([item],[25,45,30]); Q.advance([item],'2026-10-18'); assert.equal(Q.rail([item]).length,0);
  Q.setQueued(item,true); Q.plan([item],[25,45,30]); Q.advance([item],'2026-10-18'); assert.equal(Q.rail([item]).length,1);
  Q.setQueued(item,false); assert.equal(Q.rail([item]).length,0); assert.equal(item.id,'t');
  const undated={id:'u',queued:true}; Q.plan([undated],[25,45,30]); assert.equal(undated.mountDate,undefined);
  Q.move(undated,'2026-10-20','2026-10-18'); Q.advance([undated],'2026-10-20'); assert.equal(Q.rail([undated]).length,1);
});
test('DDL 前两天进入临期；逾期保持，完成停止临期提示', () => {
  const item={deadline:'2026-10-21'};
  assert.equal(Q.urgency(item,'2026-10-18'),'normal'); assert.equal(Q.urgency(item,'2026-10-19'),'urgent');
  assert.equal(Q.urgency(item,'2026-10-22'),'overdue'); Q.complete(item); assert.equal(Q.urgency(item,'2026-10-22'),'normal');
});
test('日历数据区分挂载日与 DDL；改挂载日不挪截止事件，完成只移除挂载事件', () => {
  const item={id:'h',title:'作业',queued:true,deadline:'2026-10-21',mountDate:'2026-10-17'};
  assert.deepEqual(Q.calendarEntries([item]).map(event=>[event.kind,event.date]),[['deadline','2026-10-21'],['mount','2026-10-17']]);
  Q.move(item,'2026-10-20','2026-10-14'); assert.equal(Q.calendarEntries([item])[0].date,'2026-10-21');
  Q.complete(item); assert.equal(Q.calendarEntries([item]).length,1); assert.equal(Q.calendarEntries([item])[0].completed,true);
});
test('七天比例归一化，默认仍是周五六日；总份数与显示百分比不丢失', () => {
  assert.deepEqual(Q.quotas(8,[0,0,0,0,25,45,30]),[0,0,0,0,2,4,2]);
  const weights=[10,20,30,40,50,60,70];
  assert.ok(Math.abs(Q.normalize(weights).reduce((a,b)=>a+b,0)-100)<1e-10);
  assert.deepEqual(Q.quotas(8,weights),Q.quotas(8,weights.map(n=>n*2)));
  for(let count=0;count<50;count++) assert.equal(Q.quotas(count,weights).reduce((a,b)=>a+b,0),count);
  assert.equal(Q.quotas(1000,weights).reduce((a,b)=>a+b,0),1000);
  assert.throws(()=>Q.normalize([0,0,0,0,0,0,0]));
  assert.throws(()=>Q.normalize([-1,0,0,0,0,0,100]));
  assert.throws(()=>Q.normalize([NaN,0,0,0,0,0,100]));
});
test('扩展日实际参与挂载，不局限周末；手动日和已挂载仍不受重分配影响', () => {
  assert.deepEqual(Q.weekFor('2026-10-21'),['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18']);
  const items=batch(); Q.plan(items,[100,0,0,0,0,0,0]);
  assert.ok(items.every(item=>item.mountDate==='2026-10-12'));
  Q.advance(items,'2026-10-12'); Q.move(items[0],'2026-10-20','2026-10-12');
  Q.plan(items,[0,0,0,100,0,0,0]);
  assert.equal(items[0].mountDate,'2026-10-20'); assert.equal(items[1].mountDate,'2026-10-12');
  assert.equal(Q.rail(items).length,7);
});
test('热力图只计未完成份数：2 → 1 → 0；完成不改变 DDL 或作业记录', () => {
  const items=[{id:'a',source:'school',deadline:'2026-10-21'},{id:'b',source:'school',deadline:'2026-10-21'}];
  assert.equal(Q.pendingOn(items,'2026-10-21').length,2);
  Q.complete(items[0]); assert.equal(Q.pendingOn(items,'2026-10-21').length,1);
  Q.complete(items[1]); assert.equal(Q.pendingOn(items,'2026-10-21').length,0);
  assert.equal(items.length,2); assert.ok(items.every(item=>item.deadline==='2026-10-21'));
});
test('自定义作业不依赖入队开关展示；主动入队的普通待办也归入自定义', () => {
  const items=[{id:'s',source:'school',course:'这是一个超过四个字的课程全名'},
    {id:'h',source:'personal',kind:'homework',course:'微积分',queued:false},
    {id:'q',source:'personal',kind:'todo',queued:true}, {id:'t',source:'personal',kind:'todo',queued:false}];
  assert.deepEqual(Q.homeworkItems(items).map(item=>item.id),['s','h','q']);
  assert.equal(Q.homeworkSubject(items[0]),'这是一个超过四个字的课程全名');
  assert.equal(Q.homeworkSubject(items[1]),'自定义'); assert.equal(Q.homeworkSubject(items[2]),'自定义');
});
