const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./exams-core.js'),C=require('./calendar-core.js');
const sample={id:'a',title:'小测',semesterId:'now',date:'2026-10-15',start:'09:00',end:'10:00',type:'小测'};
const at=value=>Date.parse(value+'+08:00');
test('考试校验拒绝无效日期、同刻或倒置时间，允许待定教室和座号',()=>{
  assert.equal(E.validate(sample),'');
  for(const patch of [{title:' '},{date:'2026-02-30'},{start:'25:00'},{start:'9:00'},{end:'09:00'},{end:'08:59'}])assert.notEqual(E.validate({...sample,...patch}),'');
  assert.equal(E.validate({...sample,date:'2028-02-29'}),'');
});
test('仅取本学期并按考试时间排序，不更改原列表',()=>{
  const rows=[{...sample,id:'later',start:'11:00',end:'12:00'},{...sample,semesterId:'old'},sample,{...sample,id:'invalid',date:'bad'}];
  assert.deepEqual(E.current(rows,'now').map(x=>x.id),['a','later']);assert.equal(rows[0].id,'later');
});
test('倒计时在一天边界切换单位，考试开始和结束边界正确',()=>{
  assert.deepEqual(E.countdown([sample],at('2026-10-14T09:00:00')),{state:'upcoming',exam:sample,value:1,unit:'天'});
  const hours=E.countdown([sample],at('2026-10-14T09:01:00'));assert.equal(hours.unit,'小时');assert.ok(hours.value>23);
  assert.equal(E.countdown([sample],at('2026-10-15T09:00:00')).state,'active');
  assert.equal(E.countdown([sample],at('2026-10-15T09:59:00')).state,'active');
  assert.equal(E.countdown([sample],at('2026-10-15T10:00:00')).state,'empty');
  const ending={...sample,id:'ending',start:'08:00',end:'08:59'};
  assert.equal(E.countdown([sample,ending],at('2026-10-15T09:00:00')).exam.id,'a');
});
test('教务与自定义考试同样投影进时间轴，保留教室与座号且没有课程进度',()=>{
  const exam={...sample,source:'custom',room:'东1-302',seat:'A-12'};
  const entries=E.entries([exam],'2026-10-15');assert.equal(E.entries([exam],'2026-10-16').length,0);
  const day=C.dayEntries(entries,'2026-10-15');assert.equal(day.length,1);assert.equal(day[0].kind,'exam');
  assert.equal(day[0].startMinute,540);assert.equal(day[0].endMinute,600);assert.equal(day[0].room,'东1-302');assert.equal(day[0].seat,'A-12');
  assert.equal(C.remainingFraction(day[0],'2026-10-15',550),null);
});
test('同日多场按开始、结束时刻稳定排列，跨年日期分别分组，输入不被修改',()=>{
  const afternoon={...sample,id:'afternoon',start:'14:00',end:'16:00'},
    longer={...sample,id:'longer',start:'09:00',end:'11:00'},
    nextYear={...sample,id:'next-year',date:'2027-01-12'};
  const rows=[nextYear,afternoon,longer,sample],snapshot=JSON.stringify(rows),groups=E.dayGroups(rows);
  assert.deepEqual(groups.map(group=>group.date),['2026-10-15','2027-01-12']);
  assert.deepEqual(groups[0].exams.map(exam=>exam.id),['a','longer','afternoon']);
  assert.equal(groups[0].exams.length,3);assert.equal(JSON.stringify(rows),snapshot);
});
test('识别所有实际重叠，首尾相接、其他日期和本场不误判',()=>{
  const long={...sample,id:'long',start:'08:00',end:'12:00'},
    middle={...sample,id:'middle',start:'10:30',end:'11:30'},
    touching={...sample,id:'touching',start:'10:00',end:'10:30'},
    anotherDay={...sample,id:'another',date:'2026-10-16'};
  const rows=[long,sample,middle,touching,anotherDay];
  assert.deepEqual(E.overlaps(sample,rows).map(exam=>exam.id),['long']);
  assert.deepEqual(E.overlaps(long,rows).map(exam=>exam.id),['a','middle','touching']);
  assert.deepEqual(E.overlaps(middle,rows).map(exam=>exam.id),['long']);
});
