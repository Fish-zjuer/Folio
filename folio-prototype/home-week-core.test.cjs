const test=require('node:test'),assert=require('node:assert/strict'),W=require('./home-week-core'),Todo=require('./todo-core');
test('daytime receives the height while midnight-to-midnight remains monotonic',()=>{
 assert.equal(W.at(0),0);assert.equal(W.at(360),.05);assert.ok(Math.abs(W.at(1320)-.95)<1e-10);assert.equal(W.at(1440),1);
 for(let m=1;m<=1440;m++)assert.ok(W.at(m)>W.at(m-1));
 assert.ok(W.at(480)-W.at(360)>W.at(360)-W.at(0));
});
test('only today is requested: courses and exams on the timeline, personal items below',()=>{
 const calls=[],date='2026-10-21',items=[{id:'lab',title:'个人实验',startAt:date+'T13:00',endAt:date+'T15:00'}];
 const data=W.collectDay(date,{items,coursesOn:d=>{calls.push(d);return [{id:'course',title:'课',kind:'course',startAt:d+'T08:00',endAt:d+'T09:35'}];},examsOn:d=>{calls.push(d);return [{id:'exam',title:'考试',kind:'exam',startAt:d+'T18:00',endAt:d+'T20:00'}];}});
 assert.deepEqual(calls,[date,date]);assert.deepEqual(data.entries.map(e=>e.id),['course','exam']);assert.deepEqual(data.items.map(e=>e.itemId),['lab']);
});
test('overnight items appear once on each affected day; midnight end does not spill over',()=>{
 const items=[{id:'late',title:'夜间实验',startAt:'2026-10-20T23:30',endAt:'2026-10-21T00:30'},{id:'midnight',title:'到午夜',startAt:'2026-10-20T22:00',endAt:'2026-10-21T00:00'}];
 assert.deepEqual(W.collectDay('2026-10-20',{items}).items.map(e=>e.itemId),['late','midnight']);assert.deepEqual(W.collectDay('2026-10-21',{items}).items.map(e=>e.itemId),['late']);
});
test('work period and deadline on the same day yield one row, without a time block',()=>{
 const date='2026-10-20',items=[{id:'essay',title:'论文',startAt:date+'T18:00',endAt:date+'T20:00',deadline:date,deadlineClock:'23:59'}];
 const data=W.collectDay(date,{items});assert.equal(data.entries.length,0);assert.equal(data.items.length,1);assert.equal(data.items[0].itemId,'essay');
});
test('rows include today and pending undated records; other days and mount duplicates are excluded',()=>{
 const items=[{id:'a',title:'未定时间'},{id:'b',title:'当天',scheduledDay:'2026-10-21',queued:true,mountDate:'2026-10-20'},{id:'c',title:'旧任务',completed:true},{id:'d',title:'其他天',scheduledDay:'2026-10-22'},{id:'template',title:'重复模板',repeatTemplate:true}];
 const before=JSON.stringify(items),data=W.collectDay('2026-10-21',{items});assert.deepEqual(data.items.map(e=>e.itemId),['a','b']);assert.equal(JSON.stringify(items),before);
});
test('recurring rows use the current occurrence without persisting generated records',()=>{
 const date='2026-10-21',items=[{id:'daily',source:'personal',kind:'event',title:'阅读',timeMode:'range',startAt:'2026-10-19T18:00',endAt:'2026-10-19T19:00',repeat:{kind:'daily',interval:1,weekdays:[],until:null}}];
 const before=JSON.stringify(items),data=W.collectDay(date,{items,itemsFor:d=>Todo.materialize(structuredClone(items),d)});
 assert.deepEqual(data.items.map(e=>e.itemId),['daily@2026-10-21']);assert.equal(JSON.stringify(items),before);
});
test('overlapping classes have separate lanes which are released afterwards',()=>{
 const entries=[{id:'a',startMinute:480,endMinute:600},{id:'b',startMinute:540,endMinute:620},{id:'c',startMinute:600,endMinute:650},{id:'d',startMinute:700,endMinute:800}];
 assert.deepEqual(W.lanes(entries).map(({entry,lane,count})=>[entry.id,lane,count]),[['a',0,2],['b',1,2],['c',0,2],['d',0,1]]);
});
