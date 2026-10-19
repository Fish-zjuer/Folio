const test=require('node:test'),assert=require('node:assert/strict'),Courses=require('./course-data.js');
test('学分汇总保留小数，区分未知值和零学分，不修改课程数据',()=>{
  const input=[{credits:1.5},{credits:3},{credits:0},{credits:null},{},{credits:NaN},{credits:-1}];
  assert.deepEqual(Courses.summary(input),{count:7,credits:4.5,missingCredits:4});assert.equal(input[0].credits,1.5);
  assert.deepEqual(Courses.summary([]),{count:0,credits:0,missingCredits:0});
});
test('列表课程与周课表标识和安排对应，学期汇总互不混合',()=>{
  const current=Courses.semesters[0];assert.equal(new Set(current.courses.map(c=>c.id)).size,current.courses.length);
  for(const [day,ids] of Courses.week.entries())for(const id of ids){const c=current.courses.find(c=>c.id===id);assert.ok(c);assert.ok(c.sessions.some(s=>s.day===day&&s.start===Courses.calendarCourses[id].start&&s.end===Courses.calendarCourses[id].end));}
  assert.deepEqual(Courses.summary(current.courses),{count:8,credits:23,missingCredits:0});
  assert.deepEqual(Courses.summary(Courses.semesters[1].courses),{count:2,credits:6,missingCredits:0});
});
test('超过5学分仍保留差别；小数学分不截断、不影响汇总',()=>{
  const five=Courses.meter(5,5.5).reduce((a,b)=>a+b,0),fiveHalf=Courses.meter(5.5,5.5).reduce((a,b)=>a+b,0);
  assert.ok(five<fiveHalf);assert.equal(fiveHalf,5);
  assert.ok(Math.abs(Courses.meter(1.5,5.5).reduce((a,b)=>a+b,0)/5-1.5/5.5)<1e-10);
  assert.deepEqual(Courses.summary([{credits:5.5},{credits:1.5}]),{count:2,credits:7,missingCredits:0});
  assert.deepEqual(Courses.meter(0,5.5),[0,0,0,0,0]);assert.deepEqual(Courses.meter(null,5.5),[]);
});
test('按教学周起点计算单双周，首周部分日期和冬学期重启正确',()=>{
  const term=Courses.semesters[0];
  assert.equal(Courses.weekInfo(term,'2026-10-07'),null);
  assert.deepEqual(Courses.weekInfo(term,'2026-10-08'),{periodId:'autumn',label:'秋',half:'first',week:1,semesterWeek:1,parity:'单周'});
  assert.equal(Courses.weekInfo(term,'2026-10-14').week,2);
  assert.equal(Courses.weekInfo(term,'2026-10-14').parity,'双周');
  assert.equal(Courses.weekInfo(term,'2026-11-30').week,1);
  assert.equal(Courses.weekInfo(term,'2026-11-30').semesterWeek,9);
  assert.equal(Courses.weekInfo(term,'2027-01-25'),null);
  assert.equal(Courses.weekInfo(term,'2026-02-30'),null);
  const reset=structuredClone(term);reset.calendar.periods[0].end='2026-12-06';reset.calendar.periods[1].start='2026-12-07';reset.calendar.periods[1].weekOffset=9;
  assert.equal(Courses.weekInfo(reset,'2026-12-10').semesterWeek,10);assert.equal(Courses.weekInfo(reset,'2026-12-10').parity,'单周');
  assert.equal(Courses.sessionOccurs({day:3,oddWeek:true,evenWeek:false},reset,'2026-12-10'),true);
});
test('同一课程不同安排分别遵守单双周，地点和时刻不混用',()=>{
  const term=Courses.semesters[0],lab=date=>Courses.onDate(term,date).filter(course=>course.courseId==='lab');
  assert.equal(lab('2026-10-08').length,0);assert.equal(lab('2026-10-10').length,1);
  assert.equal(lab('2026-10-15').length,1);assert.equal(lab('2026-10-17').length,0);
  assert.equal(lab('2026-10-22').length,0);assert.equal(lab('2026-10-24').length,1);
  assert.equal(lab('2026-12-03').length,0);assert.equal(lab('2026-12-05').length,1);
  assert.equal(lab('2026-12-10').length,1);assert.equal(lab('2026-12-12').length,0);
  const custom=structuredClone(term),course=custom.courses.find(course=>course.id==='lab');
  course.sessions[0].room='双周教室';course.sessions[0].start='13:00';course.sessions[0].end='14:00';course.sessions[1].room='单周教室';
  const even=Courses.onDate(custom,'2026-10-15').find(course=>course.courseId==='lab'),odd=Courses.onDate(custom,'2026-10-24').find(course=>course.courseId==='lab');
  assert.equal(even.room,'双周教室');assert.equal(even.start,'13:00');assert.equal(odd.room,'单周教室');assert.notEqual(even.id,odd.id);
});
test('短学期、起止教学周和指定周次都参与实际日期筛选',()=>{
  const term=Courses.semesters[0],base={day:3,start:'09:00',end:'10:00',firstHalf:true,secondHalf:false,oddWeek:true,evenWeek:true};
  assert.equal(Courses.sessionOccurs(base,term,'2026-10-15'),true);
  assert.equal(Courses.sessionOccurs(base,term,'2026-12-10'),false);
  const winter={...base,firstHalf:false,secondHalf:true};assert.equal(Courses.sessionOccurs(winter,term,'2026-12-10'),true);
  const limited={...base,startWeek:2,endWeek:3};assert.equal(Courses.sessionOccurs(limited,term,'2026-10-08'),false);assert.equal(Courses.sessionOccurs(limited,term,'2026-10-15'),true);assert.equal(Courses.sessionOccurs(limited,term,'2026-10-29'),false);
  const custom={...base,firstHalf:false,secondHalf:false,oddWeek:false,evenWeek:false,customRepeat:true,customRepeatWeeks:[2,10]};
  assert.equal(Courses.sessionOccurs(custom,term,'2026-10-15'),true);assert.equal(Courses.sessionOccurs(custom,term,'2026-12-10'),true);assert.equal(Courses.sessionOccurs(custom,term,'2026-10-22'),false);
  assert.equal(Courses.ruleLabel(custom,term),'第2、10周');
  const extended=structuredClone(term);extended.calendar.periods[1].end='2027-02-07';
  assert.equal(Courses.sessionOccurs({...custom,customRepeatWeeks:[17]},extended,'2027-01-28'),true);
  assert.match(Courses.ruleLabel({...base,startWeek:3},term),/第3周起/);
  assert.equal(Courses.onDate(term,'2026-10-07').length,0);
  assert.equal(Courses.onDate(term,'2027-01-25').length,0);
});
test('单双周互补课程不会被当成同日重叠课，计算不修改原安排',()=>{
  const term=structuredClone(Courses.semesters[0]),Calendar=require('./calendar-core.js'),Timetable=require('./timetable-core.js');
  const session={day:3,start:'09:00',end:'10:00',room:'同一教室'};
  term.courses=[{id:'odd',title:'单周课',sessions:[{...session,oddWeek:true,evenWeek:false}]},{id:'even',title:'双周课',sessions:[{...session,oddWeek:false,evenWeek:true}]}];
  const original=JSON.stringify(term);
  for(const [date,id] of [['2026-10-08','odd'],['2026-10-15','even'],['2026-10-22','odd'],['2026-12-10','even']]){
    const entries=Courses.onDate(term,date);assert.deepEqual(entries.map(entry=>entry.courseId),[id]);
    const groups=Timetable.groups(Calendar.dayEntries(entries,date));assert.equal(groups.length,1);assert.equal(groups[0].entries.length,1);
  }
  assert.equal(JSON.stringify(term),original);
});

test('同课同地点同教学规则的相邻节次合并，6/7/8逆序输入也是一堂课',()=>{const s=(n,count=1,extra={})=>({id:String(n),day:0,room:'教室甲',firstHalf:true,secondHalf:true,oddWeek:true,evenWeek:true,startWeek:1,startPeriod:n,periods:count,start:n===6?'13:25':n===7?'14:15':'15:05',end:n+count===7?'14:10':n+count===8?'15:00':'15:50',...extra});const parts=[s(8),s(6),s(7)],original=JSON.stringify(parts),merged=Courses.mergeSessions(parts);assert.equal(merged.length,1);assert.equal(merged[0].periods,3);assert.equal(merged[0].start,'13:25');assert.equal(merged[0].end,'15:50');assert.equal(JSON.stringify(parts),original);assert.equal(Courses.mergeSessions([s(6,2),s(8,1,{room:'教室乙'})]).length,2);assert.equal(Courses.mergeSessions([s(6,2),s(8,1,{oddWeek:false})]).length,2);assert.equal(Courses.mergeSessions([s(6,2),s(7,2)]).length,2);assert.equal(Courses.mergeSessions([s(6,2)]).at(0).periods,2);assert.equal(Courses.mergeSessions([s(7,2)]).at(0).startPeriod,7);});

test('指定周不同的相邻课段不合并，相同周集合顺序不影响且不跨课程合并',()=>{
 const a={id:'a',day:0,room:'甲',startPeriod:6,periods:1,start:'13:25',end:'14:10',customRepeat:true,customRepeatWeeks:[1,3]};
 const b={...a,id:'b',startPeriod:7,start:'14:15',end:'15:00',customRepeatWeeks:[1,5]};
 assert.equal(Courses.mergeSessions([a,b]).length,2);
 assert.equal(Courses.mergeSessions([a,{...b,customRepeatWeeks:[3,1]}]).length,1);
 const term={calendar:{periods:[{id:'a',label:'秋',half:'first',start:'2026-10-12',end:'2026-11-29'}]},courses:[{id:'x',title:'甲课',sessions:[a]},{id:'y',title:'乙课',sessions:[b]}]};
 assert.equal(Courses.onDate(term,'2026-10-12').length,2);
});
