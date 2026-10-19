const {test}=require('node:test');
const assert=require('node:assert/strict');
const Q=require('./homework-queue-core.js');
const make=(id,day,deadline='2026-10-30')=>({id,title:id,kind:'homework',queued:true,mountDate:day,mountedOn:null,deadline,completed:false});
test('一天指完整可用日：白天交提前一天着火，凌晨交再提前一天',()=>{
  const day={deadline:'2026-10-21',deadlineClock:'19:00'};
  assert.equal(Q.noticeStage(day,'2026-10-18'),'smoke');
  assert.equal(Q.noticeStage(day,'2026-10-19'),'smoke');
  assert.equal(Q.noticeStage(day,'2026-10-20'),'fire');
  const midnight={deadline:'2026-10-21',deadlineClock:'00:00'};
  assert.equal(Q.usableDays(midnight,'2026-10-19'),1);
  assert.equal(Q.noticeStage(midnight,'2026-10-19'),'fire');
  assert.equal(Q.noticeStage({...midnight,deadlineClock:'07:59'},'2026-10-19'),'fire');
  assert.equal(Q.noticeStage({...midnight,deadlineClock:'08:00'},'2026-10-19'),'smoke');
  assert.equal(Q.noticeStage({deadline:'2026-10-20',deadlineClock:'23:59'},'2026-10-19'),'fire');
  assert.equal(Q.noticeStage({deadline:'2026-10-21'},'2026-10-19'),'smoke');
  assert.equal(Q.noticeStage({...midnight,completed:true},'2026-10-30'),'normal');
});
test('提前不改变截止日，日满拒绝；完成过的当日安排仍计入负荷，积压不重复计',()=>{
  const a=make('a','2026-10-17'), b=make('b','2026-10-16');
  const snapshot=JSON.stringify([a,b]);
  assert.equal(Q.manualMove([a,b],a,'2026-10-16','2026-10-14',{dailyLimit:1}).code,'full');
  assert.equal(JSON.stringify([a,b]),snapshot);
  b.completed=true;
  assert.equal(Q.dayLoad([a,b],'2026-10-16'),1);
  b.mountedOn='2026-10-14';
  assert.equal(Q.dayLoad([a,b],'2026-10-14'),0);
  assert.equal(Q.manualMove([a,b],a,'2026-10-15','2026-10-14',{dailyLimit:1}).ok,true);
  assert.equal(a.deadline,'2026-10-30');assert.equal(a.mountDate,'2026-10-15');
});
test('推后必须交换，双方等量移动；无候选和临期均拒绝且不部分修改',()=>{
  const a=make('a','2026-10-16'),b=make('b','2026-10-18'); const items=[a,b];
  assert.equal(Q.manualCheck(items,a,'2026-10-18','2026-10-14').code,'swap');
  const snapshot=JSON.stringify(items);
  assert.equal(Q.manualMove(items,a,'2026-10-18','2026-10-14').ok,false);
  assert.equal(JSON.stringify(items),snapshot);
  assert.deepEqual(Q.swapCandidates(items,a,'2026-10-18','2026-10-14').map(x=>x.id),['b']);
  assert.equal(Q.manualMove(items,a,'2026-10-18','2026-10-14',{},'b').swapped,true);
  assert.equal(a.mountDate,'2026-10-18'); assert.equal(b.mountDate,'2026-10-16');
  assert.equal(a.deadline,'2026-10-30');assert.equal(b.deadline,'2026-10-30');
  assert.ok(a.manualDate&&b.manualDate);
});
test('冒烟／着火不能推后，也不能先移到未来的冒烟期；临期仍可提前',()=>{
  const a=make('a','2026-10-14','2026-10-17'),b=make('b','2026-10-15');
  assert.equal(Q.manualCheck([a,b],a,'2026-10-15','2026-10-14').code,'urgent');
  assert.equal(Q.manualMove([a,b],a,'2026-10-14','2026-10-14').ok,true);
  const c=make('c','2026-10-16','2026-10-25');
  assert.equal(Q.manualCheck([c],c,'2026-10-22','2026-10-14').code,'unsafe');
  assert.equal(Q.manualMove([c],c,'2026-10-15','2026-10-14').ok,true);
  const d=make('d','2026-10-17','2026-10-16');
  assert.deepEqual(Q.swapCandidates([b,d],b,'2026-10-17','2026-10-14'),[]);
});
test('交换不能移入已过载日期；不接受完成或不存在的事项',()=>{
  const items=[make('a','2026-10-16'),make('b','2026-10-18'),make('c','2026-10-18')];
  assert.equal(Q.manualMove(items,items[0],'2026-10-18','2026-10-14',{dailyLimit:1},'b').code,'full');
  assert.equal(Q.manualMove(items,make('fake','2026-10-16'),'2026-10-15','2026-10-14').ok,false);
  items[0].completed=true;
  assert.equal(Q.manualMove(items,items[0],'2026-10-15','2026-10-14').ok,false);
});
test('系统仍可调配超过手动上限；比例配额模式覆盖零配额日',()=>{
  const items=Array.from({length:8},(_,i)=>make(String(i),null,'2026-10-21'));
  Q.plan(items,[0,0,0,0,25,45,30]);
  assert.equal(Q.dayLoad(items,'2026-10-17'),4);
  const options={capacityMode:'quota',weights:[0,0,0,0,25,45,30]};
  assert.equal(Q.manualLimit(items,'2026-10-16',options),2);
  assert.equal(Q.manualLimit(items,'2026-10-17',options),4);
  assert.equal(Q.manualLimit(items,'2026-10-12',options),0);
});
test('手动默认工作日最多1项、周末每天3项，周末上限可调整',()=>{
  assert.equal(Q.manualLimit([],'2026-10-16'),1);
  assert.equal(Q.manualLimit([],'2026-10-17'),3);
  assert.equal(Q.manualLimit([],'2026-10-18',{weekdayLimit:1,weekendLimit:2}),2);
  const items=[make('a','2026-10-17'),make('b','2026-10-16')];
  assert.equal(Q.manualCheck(items,items[0],'2026-10-16','2026-10-14').code,'full');
});
test('袋内今日稍后自动挂载的便签，可主动提前到现在且不会算成新增占位',()=>{
  const item=make('a','2026-10-16');item.mountClock='14:00';
  assert.equal(Q.manualMove([item],item,'2026-10-16','2026-10-16').ok,true);
  assert.equal(item.mountedOn,'2026-10-16');assert.equal(item.mountClock,null);assert.equal(item.manualDate,true);
});
