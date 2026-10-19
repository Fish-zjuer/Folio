const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./calendar-core.js');
const Q = require('./homework-queue-core.js');
const T = require('./todo-core.js');

test('截止与挂载是独立日程；移动便签不改变截止日，完成后只保留截止记录', () => {
  const item={id:'h',title:'报告',deadline:'2026-10-21',deadlineClock:'12:00',queued:true,mountDate:'2026-10-16'};
  assert.equal(C.dayEntries(Q.calendarEntries([item]),'2026-10-16')[0].kind,'mount');
  Q.move(item,'2026-10-18','2026-10-14');
  assert.equal(C.dayEntries(Q.calendarEntries([item]),'2026-10-16').length,0);
  assert.equal(C.dayEntries(Q.calendarEntries([item]),'2026-10-21')[0].startMinute,720);
  Q.complete(item);
  assert.equal(C.dayEntries(Q.calendarEntries([item]),'2026-10-18').length,0);
  assert.equal(C.dayEntries(Q.calendarEntries([item]),'2026-10-21')[0].completed,true);
});
test('跨日时段逐日裁切；午夜结束不会多占一天，不修改原始数据', () => {
  const entries=[{id:'r',startAt:'2026-10-14T23:00',endAt:'2026-10-16T00:00',kind:'range'}];
  const copy=JSON.stringify(entries);
  const first=C.dayEntries(entries,'2026-10-14')[0], second=C.dayEntries(entries,'2026-10-15')[0];
  assert.deepEqual([first.startMinute,first.endMinute,first.continuesAfter],[1380,1440,true]);
  assert.deepEqual([second.startMinute,second.endMinute,second.continuesBefore,second.continuesAfter],[0,1440,true,false]);
  assert.equal(C.dayEntries(entries,'2026-10-16').length,0);
  assert.equal(JSON.stringify(entries),copy);
});
test('重复待办按具体次数进入日程，模板不重复显示；不设时间的普通事项不占日历', () => {
  const parent={id:'t',source:'personal',title:'整理',createdDay:'2026-10-14',timeMode:'range',startAt:'2026-10-14T09:00',endAt:'2026-10-14T10:00',repeat:{kind:'weekly',interval:1,weekdays:[3,5]},queued:false};
  const items=T.materialize([parent,{id:'free',title:'想法',timeMode:'none'}],'2026-10-14');
  const events=C.dayEntries(Q.calendarEntries(items),'2026-10-16');
  assert.equal(events.length,1); assert.equal(events[0].itemId,'t@2026-10-16');
  assert.deepEqual([events[0].startMinute,events[0].endMinute],[540,600]);
});
test('全天事件与有时刻的事件独立，后者按时刻排列；拒绝非法日期及时段', () => {
  const events=[{id:'late',date:'2026-10-14',at:'2026-10-14T12:00'},
    {id:'all',date:'2026-10-14'}, {id:'early',date:'2026-10-14',at:'2026-10-14T09:00'}];
  assert.deepEqual(C.dayEntries(events,'2026-10-14').map(e=>e.id),['all','early','late']);
  assert.throws(()=>C.dayEntries(events,'2026-02-30'),/无效日期/);
  assert.throws(()=>C.dayEntries([{id:'bad',startAt:'2026-10-14T25:00',endAt:'2026-10-15T01:00'}],'2026-10-14'),/无效时刻/);
});
test('定位正在进行或接下来的安排；全部结束后回到最后一项，空日程安全返回',()=>{
  const entries=[{id:'ddl',allDay:true},{id:'first',kind:'course',startMinute:480,endMinute:575},
    {id:'second',kind:'course',startMinute:600,endMinute:745},
    {id:'last',kind:'course',startMinute:1130,endMinute:1225}];
  assert.equal(C.focusEvent(entries,540).id,'first');
  assert.equal(C.focusEvent(entries,575).id,'second');
  assert.equal(C.focusEvent(entries,1150).id,'last');
  assert.equal(C.focusEvent(entries,1300).id,'last');
  assert.equal(C.focusEvent([],540),null);
});

test('有时刻的作业和待办与课程一样参与排序定位，没有具体时间的事项不占时间位置',()=>{
  const entries=C.dayEntries([
    {id:'note',date:'2026-10-14',kind:'deadline'},
    {id:'course',kind:'course',startAt:'2026-10-14T08:00',endAt:'2026-10-14T09:35'},
    {id:'due',kind:'deadline',date:'2026-10-14',at:'2026-10-14T07:30'},
    {id:'task',kind:'range',startAt:'2026-10-14T10:00',endAt:'2026-10-14T10:30'},
    {id:'midnight',kind:'deadline',date:'2026-10-14',at:'2026-10-14T00:00'},
  ],'2026-10-14');
  assert.equal(entries.find(e=>e.id==='note').allDay,true);
  assert.equal(entries.find(e=>e.id==='midnight').allDay,false);
  assert.deepEqual(entries.filter(e=>!e.allDay).map(e=>e.id),['midnight','due','course','task']);
  const copy=JSON.stringify(entries);
  assert.equal(C.focusEvent(entries,420).id,'due');
  assert.equal(C.focusEvent(entries,450).id,'due');
  assert.equal(C.focusEvent(entries,590).id,'task');
  assert.equal(C.focusEvent(entries,610).id,'task');
  assert.equal(C.focusEvent([entries.find(e=>e.id==='note')],610).id,'note');
  assert.equal(JSON.stringify(entries),copy);
});
test('课程剩余进度按时间向零减少，未开始/结束和跨日期均正确',()=>{
  const entry={kind:'course',displayDate:'2026-10-14',startMinute:600,endMinute:720};
  assert.equal(C.remainingFraction(entry,'2026-10-14',540),1);
  assert.equal(C.remainingFraction(entry,'2026-10-14',600),1);
  assert.equal(C.remainingFraction(entry,'2026-10-14',660),.5);
  assert.equal(C.remainingFraction(entry,'2026-10-14',690),.25);
  assert.equal(C.remainingFraction(entry,'2026-10-14',720),0);
  assert.equal(C.remainingFraction(entry,'2026-10-13',800),1);
  assert.equal(C.remainingFraction(entry,'2026-10-15',0),0);
  assert.equal(C.remainingFraction({...entry,kind:'range'},'2026-10-14',660),null);
});
test('当前事件给出下一项倒计时，结束后保持等待状态；第一项之前和最后一项之后无倒计时',()=>{
  const entries=[{id:'a',displayDate:'2026-10-14',startMinute:480,endMinute:575},
    {id:'done',displayDate:'2026-10-14',startMinute:650,endMinute:720,completed:true},
    {id:'b',displayDate:'2026-10-14',startMinute:600,endMinute:745},
    {id:'c',displayDate:'2026-10-14',startMinute:1130,endMinute:1225}];
  assert.deepEqual(C.timelineState(entries,'2026-10-14',660),{currentId:'b',anchorId:'b',nextId:'c',minutesUntilNext:470,waiting:false});
  assert.deepEqual(C.timelineState(entries,'2026-10-14',1175),{currentId:'c',anchorId:'c',nextId:null,minutesUntilNext:null,waiting:false});
  assert.deepEqual(C.timelineState(entries,'2026-10-14',745),{currentId:null,anchorId:'b',nextId:'c',minutesUntilNext:385,waiting:true});
  assert.equal(C.timelineState(entries,'2026-10-14',800).minutesUntilNext,330);
  assert.equal(C.timelineState(entries,'2026-10-14',470).minutesUntilNext,null);
  assert.equal(C.timelineState(entries,'2026-10-14',1225).minutesUntilNext,null);
  assert.equal(C.timelineState(entries,'2026-10-13',660).currentId,null);
});
test('经历的连接段为实线，未来连接段为虚线；跨日期正确区分',()=>{
  const next={displayDate:'2026-10-14',startMinute:1130};
  assert.equal(C.connectionExperienced(next,'2026-10-14',660),false);
  assert.equal(C.connectionExperienced(next,'2026-10-14',1130),true);
  assert.equal(C.connectionExperienced(next,'2026-10-15',0),true);
  assert.equal(C.connectionExperienced(next,'2026-10-13',1400),false);
});

test('仅进行中的有时段事项提供形象进度，跨日按原始完整时段计算',()=>{
  const course={displayDate:'2026-10-14',kind:'course',startMinute:600,endMinute:720};
  assert.equal(C.activeRemainingFraction(course,'2026-10-14',660),.5);
  assert.equal(C.activeRemainingFraction(course,'2026-10-14',599),null);
  assert.equal(C.activeRemainingFraction(course,'2026-10-14',720),null);
  assert.equal(C.activeRemainingFraction(course,'2026-10-15',660),null);
  assert.equal(C.activeRemainingFraction({...course,completed:true},'2026-10-14',660),null);
  const range=C.dayEntries([{id:'r',kind:'range',startAt:'2026-10-13T23:00',endAt:'2026-10-14T03:00'}],'2026-10-14')[0];
  assert.equal(C.activeRemainingFraction(range,'2026-10-14',60),.5);
  assert.equal(C.activeRemainingFraction({...course,allDay:true},'2026-10-14',660),null);
});
