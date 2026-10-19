const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('./todo-core.js');
const Q=require('./homework-queue-core.js');
const base=()=>({id:'t',source:'personal',kind:'todo',title:'复习',body:'整理提纲\n列出问题',createdDay:'2026-10-14',timeMode:'range',startAt:'2026-10-14T09:00',endAt:'2026-10-14T10:00',repeat:{kind:'none',interval:1},queued:false});
test('指定时段支持跨日，严格校验结束时间；内容与标题独立',()=>{
  const item=base();T.validate(item);assert.equal(item.deadline,undefined);assert.ok(item.body.includes('\n'));
  item.endAt='2026-10-15T00:30';T.validate(item);
  item.endAt='2026-10-14T08:59';assert.throws(()=>T.validate(item),/晚于/);
  item.endAt='2026-10-14T25:00';assert.throws(()=>T.validate(item),/格式/);
});
test('每天按间隔生成，每次完成独立且跨刷新保留',()=>{
  const parent=base();parent.repeat={kind:'daily',interval:2};
  let items=T.materialize([parent],'2026-10-14');
  assert.equal(parent.repeatTemplate,true);
  const first=items.find(item=>item.occurrenceDay==='2026-10-14');assert.equal(first.startAt,'2026-10-14T09:00');
  Q.complete(first);items=T.materialize(items,'2026-10-14');
  assert.equal(items.find(item=>item.id===first.id).completed,true);
  assert.equal(T.listItems(items)[0].occurrenceDay,'2026-10-16');
  assert.equal(items.filter(item=>item.id===first.id).length,1);
});
test('每周可选择多个星期并指定结束日期',()=>{
  const parent=base();parent.repeat={kind:'weekly',interval:1,weekdays:[1,3,5],until:'2026-10-21'};
  T.validate(parent);const items=T.materialize([parent],'2026-10-14');
  assert.deepEqual(items.filter(item=>item.parentId).map(item=>item.occurrenceDay),['2026-10-14','2026-10-16','2026-10-19','2026-10-21']);
  parent.repeat.weekdays=[];assert.throws(()=>T.validate(parent),/至少/);
});
test('每月 31 日在短月使用月末，首次很远仍提供下一次安排',()=>{
  const parent=base();parent.startAt='2027-01-31T09:00';parent.endAt='2027-01-31T10:00';parent.repeat={kind:'monthly',interval:1};
  assert.equal(T.matches(parent,'2027-02-28'),true);assert.equal(T.matches(parent,'2027-03-31'),true);assert.equal(T.matches(parent,'2027-03-28'),false);
  const items=T.materialize([parent],'2026-10-14');assert.equal(T.listItems(items)[0].occurrenceDay,'2027-01-31');
});
test('提前提醒锚定开始时刻或截止时刻，跨日减分钟；无时间不允许提醒',()=>{
  const item=base();item.startAt='2026-10-14T00:15';item.reminderMinutes=30;
  assert.equal(T.reminderAt(item),'2026-10-13T23:45');
  item.timeMode='deadline';item.deadline='2026-10-15';item.deadlineClock='12:00';item.reminderMinutes=60;
  assert.equal(T.reminderAt(item),'2026-10-15T11:00');Q.complete(item);assert.equal(T.reminderAt(item),null);
  item.timeMode='none';assert.throws(()=>T.validate(item),/设定|设置时间/);
});
test('重要和紧急独立；重复时间段入队按开始日，日历保存真实时段',()=>{
  const parent=base();parent.important=true;parent.urgent=false;parent.queued=true;parent.repeat={kind:'daily',interval:1};
  const items=T.materialize([parent],'2026-10-14');Q.plan(items,[0,0,0,0,25,45,30]);Q.advance(items,'2026-10-14');
  assert.equal(Q.rail(items).some(item=>item.repeatTemplate),false);
  const first=items.find(item=>item.occurrenceDay==='2026-10-14');assert.equal(first.important,true);assert.equal(first.urgent,false);assert.equal(first.deadline,undefined);
  assert.equal(Q.dateFor(first),'2026-10-14');
  const event=Q.calendarEntries(items).find(event=>event.itemId===first.id && event.kind==='range');assert.equal(event.endAt,'2026-10-14T10:00');
});
test('改变重复规则不会自动丢掉已经挂出的或已完成的旧实例',()=>{
  const parent=base();parent.repeat={kind:'daily',interval:1};let items=T.materialize([parent],'2026-10-14');
  const future=items.find(item=>item.occurrenceDay==='2026-10-16');Q.move(future,'2026-10-14','2026-10-14');
  const done=items.find(item=>item.occurrenceDay==='2026-10-17');Q.complete(done);
  parent.repeat={kind:'none',interval:1};items=T.materialize(items,'2026-10-14');
  assert.ok(items.includes(future));assert.ok(items.includes(done));assert.equal(items.some(item=>item.occurrenceDay==='2026-10-18'),false);
});


test('事项是真实独立类型：支持晚间、跨午夜、重复及地点，不混入作业统计',()=>{
 const item={...base(),kind:'event',title:'实验补课',location:'实验楼 203',startAt:'2026-10-14T23:00',endAt:'2026-10-15T00:30',queued:true,repeat:{kind:'weekly',interval:1,weekdays:[3]}};
 T.validate(item);const items=T.materialize([item],'2026-10-14'),next=items.find(i=>i.occurrenceDay==='2026-10-21');assert.equal(next.kind,'event');assert.equal(next.location,'实验楼 203');assert.equal(next.endAt,'2026-10-22T00:30');
 const entries=Q.calendarEntries(items),entry=entries.find(e=>e.itemId===next.id);assert.equal(entry.itemKind,'event');assert.equal(entry.location,'实验楼 203');assert.equal(Q.homeworkItems(items).length,0);
 assert.throws(()=>T.validate({...item,kind:'course'}),/类型/);
});
