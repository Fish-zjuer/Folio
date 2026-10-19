const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('./workbench-stats-core.js');
const ms=s=>Date.parse(s+'+08:00');
test('last week means Monday to Sunday in Shanghai; crossing midnight splits, pauses are excluded',()=>{
 const v=S.focus({version:1,sessions:[{segments:[{start:ms('2026-10-18T23:30:00'),end:ms('2026-10-19T00:30:00')},{start:ms('2026-10-19T01:00:00'),end:ms('2026-10-19T01:20:00')}]}]},ms('2026-10-19T08:00:00'));
 assert.equal(v.lastWeek,30*60000);assert.equal(v.thisWeek,50*60000);assert.equal(v.total,80*60000);assert.equal(v.days,2);assert.equal(v.lastWeekDays[6].date,'2026-10-18');
});
test('unfinished active timer is capped at 45 min, overlapping records deduplicated, preview creates no houses',()=>{
 const start=ms('2026-10-19T08:00:00'),v=S.focus({version:1,sessions:[{segments:[{start,end:start+10*60000}]}],active:{segments:[],runningFrom:start}},start+90*60000);
 assert.equal(v.total,45*60000);assert.equal(v.buildings.length,0);assert.equal(S.focus(null,start).total,0);assert.equal(S.duration(20000).value,'<1');
});
test('invalid and future segments excluded; unfinished draft still contributes actual segments',()=>{
 const start=ms('2026-10-19T08:00:00'),v=S.focus({version:1,sessions:[{buildingDraft:true,segments:[{start,end:start+60000},{start:-1e30,end:start},{start:start+400000,end:start+600000},{start:'bad',end:start}]}]},start+120000);
 assert.equal(v.total,60000);assert.equal(v.buildings.length,0);
});
test('task ledger counts retained records only and uses actual deadlines, not queue posting dates',()=>{
 const v=S.tasks([{kind:'homework',title:'late',deadline:'2026-10-18'},{kind:'todo',title:'today',deadline:'2026-10-19',deadlineClock:'10:00'},{kind:'todo',title:'free'},{completed:true,title:'done'},{repeatTemplate:true}], '2026-10-19','09:00');
 assert.equal(v.total,4);assert.equal(v.completed.length,1);assert.equal(v.overdue.length,1);assert.equal(v.next3.length,1);assert.equal(v.undated.length,1);
 assert.equal(S.tasks([{timeMode:'range',startAt:'2026-10-18T09:00',endAt:'2026-10-19T08:00'}],'2026-10-19','09:00').overdue.length,1);
});
test('semester totals use actual supplied occurrences, keep current class, split this/next week and reject stale calendar',()=>{
 const term={calendar:{periods:[{start:'2026-10-18',end:'2026-10-27'}]},courses:[{id:'a'}]},onDate=(t,d)=>['2026-10-18','2026-10-19','2026-10-26'].includes(d)?[{title:'a',start:'13:25',end:'15:50',periods:3}]:[];
 const v=S.semester(term,'2026-10-19','14:00',onDate);assert.equal(v.total,9);assert.equal(v.remaining,6);assert.equal(v.thisWeek,3);assert.equal(v.nextWeek,3);assert.equal(v.days,2);assert.equal(S.semester({...term,stale:true},'2026-10-19','14:00',onDate),null);
});
