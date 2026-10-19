const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('./workbench-overview-core.js'),Q=require('./homework-queue-core.js');
test('privacy masks all derived grades and goal projection; missing credits are partial, not zero',()=>{
 const v=C.academic({summary:{gpa:[4.4],majorGpa:[4.3],weightedMajorGpa:4.7,earned:30},hidden:true,courses:[{credits:3},{credits:null}],goal:{target:4.45,projected:4.46},practice:[{points:3},{points:null}]});
 assert.equal(v.gpa,null);assert.equal(v.weighted,null);assert.equal(v.goal.projected,null);assert.equal(v.goal.gap,null);assert.equal(v.studying,3);assert.equal(v.unknownCredits,1);assert.equal(v.practiceTotal,null);
});
test('major and weighted remain independent, goal gap retains sign and practice uses platform totals',()=>{
 const v=C.academic({summary:{gpa:[4.4],majorGpa:[4.2],weightedMajorGpa:4.8},goal:{target:4.45,projected:4.42},practice:[{points:6},{points:2},{points:1}]});
 assert.equal(v.major,4.2);assert.equal(v.weighted,4.8);assert.ok(v.goal.gap<0);assert.equal(v.practiceTotal,9);assert.equal(C.number(null,2),'—');
});
test('early morning deadline protects preceding full working day; old backlog does not consume new-note quota',()=>{
 const items=[{id:'a',title:'report',kind:'homework',course:'math',deadline:'2026-10-21',deadlineClock:'00:30',queued:true,mountDate:'2026-10-16',mountedOn:'2026-10-16'},
 {id:'b',title:'new',kind:'todo',queued:true,mountDate:'2026-10-19',mountedOn:'2026-10-19'},
 {id:'c',kind:'homework',completed:true},{id:'d',kind:'homework',repeatTemplate:true}];
 const v=C.affairs({items,today:'2026-10-19',queue:Q,options:{importantCourses:[{title:'math',allowTitle:true}]}});
 assert.equal(v.homework,1);assert.equal(v.urgent,1);assert.equal(Q.noticeStage(items[0],'2026-10-19'),'fire');assert.equal(v.dayLoad,1);assert.equal(v.capacity,1);
});
test('current class retained, finished classes and expired exams excluded, 14-day window is bounded',()=>{
 const v=C.affairs({items:[],today:'2026-10-19',clock:'14:00',queue:Q,courses:[{start:'08:00',end:'09:30'},{start:'13:25',end:'15:50'}],exams:[{date:'2026-10-19',end:'13:00'},{date:'2026-10-20'},{date:'2026-11-02'}]});
 assert.equal(v.remaining,1);assert.equal(v.next.start,'13:25');assert.equal(v.examDays,1);assert.equal(v.fortnight,1);
 const unknown=C.affairs({today:'2026-10-19',queue:Q,known:{courses:false,homework:false,exams:false}});assert.equal(unknown.remaining,null);assert.equal(unknown.homework,null);assert.equal(unknown.fortnight,null);
});
