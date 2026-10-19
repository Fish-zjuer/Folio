const test=require('node:test'),assert=require('node:assert/strict'),A=require('./academic-core.js');
const g=(id,extra={})=>({id,title:id,credits:3,original:'88',five:4.2,four43:4,four:4,score:88,major:false,core:false,gpaIncluded:true,earned:true,...extra});
const reply=data=>({ok:true,complete:true,data});
test('核心倍率只进入独立加权主修体系，不改变任何普通均绩',()=>{
  const records=[g('core'),g('ordinary',{five:3.5,four43:3.5,four:3.5,score:80})],before=JSON.stringify(records);
  const state=A.setOverride(A.fresh(),records[0],{core:true,major:true}),raw=A.summary(records,state.overrides,false),plan=A.summary(records,state.overrides,true);
  assert.equal(raw.gpa[0],3.85);assert.deepEqual(plan.gpa,raw.gpa);assert.equal(plan.earned,6);assert.equal(plan.majorEarned,3);assert.equal(plan.majorGpa[0],4.2);assert.ok(Math.abs(plan.weightedMajorGpa-5.04)<1e-9);assert.equal(raw.weightedMajorGpa,null);assert.equal(JSON.stringify(records),before);
});
test('主修手动计入/排除与原始归属隔离，支持单门/全部恢复和撤销',()=>{
  const a=g('a'),b=g('b',{major:true});let state=A.setOverride(A.fresh(),a,{core:true,major:true});state=A.setOverride(state,b,{core:false,major:false});
  assert.equal(A.effective(a,state.overrides).major,true);assert.equal(A.effective(b,state.overrides).major,false);
  const one=A.restore(state,'a');assert.equal(A.effective(a,one.overrides).major,false);assert.equal(A.effective(b,one.overrides).major,false);
  const restored=A.restore(state);assert.deepEqual(restored.overrides,{});assert.deepEqual(A.undo(restored).overrides,state.overrides);assert.equal(a.major,false);assert.equal(b.major,true);
});
test('失败、空响应、未完成抓取和非法记录保留旧快照及成功时间',()=>{
  const s=A.accept(A.fresh(),'grades','grades',reply([g('a')]),'2026-10-15T10:00:00Z').state,original=JSON.stringify(s.cache.grades.data);
  for(const result of [{ok:false},reply([]),{...reply([g('b')]),complete:false},reply([{id:'bad'}]),reply([g('a'),g('a')])]){
    const next=A.accept(s,'grades','grades',result,'later');assert.equal(next.success,false);assert.equal(JSON.stringify(next.state.cache.grades.data),original);assert.equal(next.state.cache.grades.lastSuccess,'2026-10-15T10:00:00Z');assert.equal(next.state.cache.grades.dismissed,false);
  }
});
test('分模块成功互不覆盖，后续刷新不能清除本地规则，成绩片段按稳定 ID 合并',()=>{
  let s=A.setOverride(A.fresh(),g('a'),{core:true,major:true});s=A.accept(s,'grades','grades',reply([g('a'),g('b')]),'first').state;
  s=A.accept(s,'practice','practice',reply([{id:'p',title:'第二课堂',points:6}]),'second').state;
  s=A.accept(s,'grades','grades',reply([g('a',{original:'90',score:90,five:4.5})]),'third').state;
  assert.equal(s.cache.grades.data.length,2);assert.equal(s.cache.grades.data[0].original,'90');assert.equal(s.cache.practice.lastSuccess,'second');assert.equal(s.overrides.a.core,true);assert.equal(s.overrides.a.major,true);
});
test('清除提醒不修改数据、不伪装成功；新失败可再次提醒，真实成功清除错误',()=>{
  let s=A.accept(A.fresh(),'grades','grades',reply([g('a')]),'ok').state;s=A.accept(s,'grades','grades',{ok:false},'bad').state;
  const dismissed=A.dismiss(s,['grades']);assert.equal(dismissed.cache.grades.dismissed,true);assert.equal(dismissed.cache.grades.warning,'refresh-failed');assert.equal(dismissed.cache.grades.lastSuccess,'ok');
  s=A.accept(dismissed,'grades','grades',{ok:false},'bad-again').state;assert.equal(s.cache.grades.dismissed,false);
  s=A.accept(s,'grades','grades',reply([g('a')]),'new-ok').state;assert.equal(s.cache.grades.warning,null);assert.equal(s.cache.grades.lastSuccess,'new-ok');
});
test('无成绩显示未知，未出分不计已获学分，失败课保留 GPA 分母',()=>{
  const missing=g('pending',{gpaIncluded:false,earned:false,five:null,four43:null,four:null,score:null,original:'待录'});assert.equal(A.summary([missing]).gpa[0],null);assert.equal(A.summary([missing]).earned,0);
  const failed=g('failed',{five:0,four43:0,four:0,score:40,earned:false});const result=A.summary([g('pass'),failed,missing]);assert.equal(result.earned,3);assert.equal(result.credit,6);assert.equal(result.gpa[0],2.1);
});
test('只有明确有效的空作业列表才清空，成绩空响应不能抹去已有记录',()=>{
  let s=A.accept(A.fresh(),'homework','homework',reply([{id:'a',title:'作业',completed:false}]),'one').state;
  assert.equal(A.accept(s,'homework','homework',reply([]),'two').success,false);
  const next=A.accept(s,'homework','homework',{...reply([]),allowEmpty:true},'two');assert.equal(next.success,true);assert.equal(next.state.cache.homework.data.length,0);
});
test('跨刷新序列化保留修改、缓存与已消除的失败提示',()=>{
  let s=A.setOverride(A.fresh(),g('a'),{major:true,core:true});s=A.accept(s,'grades','grades',reply([g('a')]),'one').state;s=A.accept(s,'grades','grades',{ok:false},'two').state;s=A.dismiss(s,['grades']);
  const loaded=JSON.parse(JSON.stringify(s));assert.equal(loaded.overrides.a.core,true);assert.equal(loaded.cache.grades.data[0].original,'88');assert.equal(loaded.cache.grades.dismissed,true);
});
test('百分制和五级制进入绩点；合格/不合格都不进入分子或分母',()=>{
  const percent=g('percent',{grading:'percent'}),fiveLevel=g('five-level',{grading:'fiveLevel',original:'不及格',five:0,four43:0,four:0,score:0,earned:false});
  const pass=g('swim-pass',{grading:'passFail',original:'合格',credits:2,gpaIncluded:false,earned:true,five:null,four43:null,four:null,score:null}),fail=g('swim-fail',{...pass,id:'swim-fail',original:'不合格',earned:false});
  const result=A.summary([percent,fiveLevel,pass,fail],{[pass.id]:{core:true,major:true}},true);assert.equal(result.credit,6);assert.equal(result.gpa[0],2.1);assert.equal(result.earned,5);
  assert.equal(A.summary([g('level',{grading:'fiveLevel',original:'优秀',five:4.5})]).gpa[0],4.5);
  assert.equal(A.validRecord('grades',{...pass,gpaIncluded:true}),false);
});
test('二级制的未知学分不当成零或已获学分，也不会参与均绩',()=>{
  const water=g('water',{grading:'passFail',original:'合格',credits:null,gpaIncluded:false,earned:null,five:null,four43:null,four:null,score:null});
  assert.equal(A.validRecord('grades',water),true);const result=A.summary([g('normal'),water]);assert.equal(result.gpa[0],4.2);assert.equal(result.earned,3);assert.equal(result.unknownEarned,1);
});
test('五级制百分值沿用原版明确映射，不把未知等级或二级制变成零分',()=>{
  for(const [level,value]of Object.entries({优秀:90,良好:80,中等:70,及格:60,不及格:0}))assert.equal(A.percentScore(level,'fiveLevel'),value);
  assert.equal(A.percentScore('未知等级','fiveLevel'),null);assert.equal(A.percentScore('合格','passFail'),null);assert.equal(A.percentScore('不合格','passFail'),null);
  assert.equal(A.percentScore('88.5','percent'),88.5);assert.equal(A.percentScore('0','percent'),0);assert.equal(A.percentScore('','percent'),null);assert.equal(A.percentScore('101','percent'),null);
});
test('按用户清单直接将五级制映射为绩点，不经过百分制中转',()=>{
  for(const [label,letter,point]of [['优秀','A',4.5],['良好','B',3.5],['中等','C',2.5],['及格','D',1.5],['不及格','F',0]]){
    for(const original of [label,letter,`${label}（${letter}）`]){const result=A.gradePoints(original,'fiveLevel');assert.equal(result.five,point);assert.equal(result.gpaIncluded,true);}
  }
  assert.equal(A.fivePointScore('良好','fiveLevel'),3.5);assert.equal(A.fivePointScore('80','percent'),3.6);
  assert.equal(A.fivePointScore('中等','fiveLevel'),2.5);assert.equal(A.fivePointScore('70','percent'),2.4);
  assert.equal(A.gradePoints('F','passFail').gpaIncluded,false);assert.equal(A.gradePoints('P','passFail').five,null);
});
test('百分制各分档上下界准确，未知等级和小数分不擅自取整',()=>{
  for(const [lo,hi,point]of [[95,100,5],[92,94,4.8],[89,91,4.5],[86,88,4.2],[83,85,3.9],[80,82,3.6],[77,79,3.3],[74,76,3],[71,73,2.7],[68,70,2.4],[65,67,2.1],[62,64,1.8],[60,61,1.5],[0,59,0]]){
    assert.equal(A.fivePointScore(String(lo),'percent'),point);assert.equal(A.fivePointScore(String(hi),'percent'),point);
  }
  assert.equal(A.fivePointScore('94.5','percent'),null);assert.equal(A.fivePointScore('95.0','percent'),5);assert.equal(A.fivePointScore('101','percent'),null);assert.equal(A.fivePointScore('-1','percent'),null);assert.equal(A.fivePointScore('优秀(B)','fiveLevel'),null);
});
test('首次导入已有成绩直接显示；首次空缓存不把下一次完整导入误判为新出分',()=>{
  const grade=g('new',{grading:'percent'});let state=A.fresh();assert.equal(A.isSealed(state,grade),false);
  state=A.accept(state,'grades','grades',{...reply([]),allowEmpty:true},'empty').state;const before=state;
  state=A.accept(state,'grades','grades',reply([grade]),'first-import').state;assert.equal(A.isSealed(state,grade),false);assert.deepEqual(A.gradeUpdates(before,state),[]);
  state=A.revealGrade(state,grade);assert.equal(A.isSealed(state,grade),false);
  state=JSON.parse(JSON.stringify(state));state=A.accept(state,'grades','grades',reply([grade]),'now').state;assert.equal(A.isSealed(state,grade),false);
  const pending=g('pending',{grading:'pending',original:'待录',gpaIncluded:false,earned:false});assert.equal(A.isSealed(state,pending),false);
});
test('出分或更正会再次待揭晓，课程名称和本地核心/主修修改不会触发',()=>{
  const grade=g('a',{grading:'fiveLevel',original:'良好',five:3.5});let state=A.accept(A.fresh(),'grades','grades',reply([grade]),'initial').state;
  assert.equal(A.isSealed(state,{...grade,title:'新课名'}),false);
  state=A.setOverride(state,grade,{core:true,major:true});assert.equal(A.isSealed(state,grade),false);
  const changed={...grade,original:'优秀',five:4.5},before=state;state=A.accept(state,'grades','grades',reply([changed]),'updated').state;
  assert.equal(A.isSealed(state,changed),true);assert.equal(A.gradeUpdates(before,state)[0].id,'a');
  const same=A.accept(state,'grades','grades',reply([changed]),'same').state;assert.deepEqual(A.gradeUpdates(state,same),[]);assert.equal(A.isSealed(same,changed),true);
});
test('0.2 旧缓存升级不封住已出成绩，保留全局隐私及本地规则',()=>{
  const water=g('water',{grading:'passFail',original:'不合格',gpaIncluded:false,earned:false});
  const old={...A.fresh(),hideGrades:true,overrides:{water:{major:true}},reveal:{enabled:true,seen:{}},cache:{grades:{data:[water]}}},next=A.migrateReveal(old);
  assert.equal(A.isSealed(next,water),false);assert.equal(next.hideGrades,true);assert.deepEqual(next.overrides,old.overrides);assert.deepEqual(next.reveal.notices,{});
});
test('明确关闭揭晓后直接显示，重新开启不遮住已公开结果，未来更正仍会遮住',()=>{
  const grade=g('a',{grading:'percent'}),updated={...grade,original:'95',five:5};let state=A.accept(A.fresh(),'grades','grades',reply([grade]),'first').state;state=A.setRevealEnabled(state,false,[grade]);assert.equal(A.isSealed(state,grade),false);
  state=A.accept(state,'grades','grades',reply([updated]),'now').state;state=A.setRevealEnabled(state,true,[updated]);assert.equal(A.isSealed(state,updated),false);
  const corrected={...updated,original:'92',five:4.8};state=A.accept(state,'grades','grades',reply([corrected]),'corrected').state;assert.equal(A.isSealed(state,corrected),true);
});
test('此前待录与后续新增科目的出分会封住；失败刷新不改变揭晓基线',()=>{
  const pending=g('pending',{grading:'pending',original:'待录',five:null,four43:null,four:null,score:null,gpaIncluded:false,earned:false}),published={...pending,original:'95',grading:'percent',five:5,four43:4.3,four:4,score:95,gpaIncluded:true,earned:true};
  let s=A.accept(A.fresh(),'grades','grades',reply([pending]),'initial').state;s=A.accept(s,'grades','grades',{ok:false},'failed').state;const before=s;
  s=A.accept(s,'grades','grades',reply([published,g('new',{grading:'percent'})]),'later').state;assert.equal(A.isSealed(s,published),true);assert.equal(A.isSealed(s,s.cache.grades.data.find(g=>g.id==='new')),true);assert.equal(A.gradeUpdates(before,s).length,2);
  const restored=JSON.parse(JSON.stringify(s)),revealed=A.revealGrade(restored,published);assert.equal(A.isSealed(revealed,published),false);assert.equal(A.isSealed(revealed,revealed.cache.grades.data.find(g=>g.id==='new')),true);
});
test('学期始终新到旧，独立于手动选择和后台插入顺序',()=>{
  const ids=['2026-2027-1','2024-2025-2','2025-2026-2','2025-2026-1','2024-2025-1'],terms=ids.map(id=>({id,label:id}));
  const records=[...ids].reverse().map((termId,i)=>g(String(i),{termId}));assert.deepEqual(A.groupByTerm(records,[terms[2],terms[4],terms[0],terms[3],terms[1]]).map(t=>t.id),['2026-2027-1','2025-2026-2','2025-2026-1','2024-2025-2','2024-2025-1']);
  assert.ok(A.termOrder('2026-autumn')>A.termOrder('2026-spring'));
});
test('成绩按学期稳定分组，同名/同课程不混学期，保留未知学期',()=>{
  const records=[g('past',{termId:'old',title:'同名课'}),g('current',{termId:'now',title:'同名课'}),g('unknown',{termId:'custom'})];const before=JSON.stringify(records);
  const groups=A.groupByTerm(records,[{id:'now',label:'本学期'},{id:'old',label:'上学期'}]);assert.deepEqual(groups.map(t=>t.id),['now','old','custom']);assert.equal(groups[0].records[0].id,'current');assert.equal(groups[1].records[0].id,'past');assert.equal(JSON.stringify(records),before);
});

test('重修按学校课号选择首次或最高，同名异课及跨学期体育保留',()=>{
 const a=g('school-grade-(2024-2025-1)-ABC001-1',{termId:'2024-2025-1',courseId:'shared',score:60,five:1.5}),b=g('school-grade-(2025-2026-1)-ABC001-2',{termId:'2025-2026-1',courseId:'shared',score:95,five:5}),other=g('school-grade-(2025-2026-1)-ABC002-1',{termId:'2025-2026-1',courseId:'shared',score:85});
 assert.equal(A.selectAttempts([b,a,other],'first').find(r=>A.courseCode(r)==='ABC001').id,a.id);assert.equal(A.selectAttempts([a,b,other],'highest').find(r=>A.courseCode(r)==='ABC001').id,b.id);assert.equal(A.selectAttempts([a,b,other]).length,2);assert.equal(A.summary([a,b],{},false,'first').gpa[0],1.5);assert.equal(A.summary([a,b],{},false,'highest').gpa[0],5);
 const sports=[{...a,id:'school-grade-(2024-2025-1)-401001-1'},{...b,id:'school-grade-(2025-2026-1)-401001-2'}];assert.equal(A.selectAttempts(sports).length,2);
});

test('取首次仅改变均绩，重修已通过的学分仍获得且不重复',()=>{const first=g('first',{courseCode:'ABC',termId:'2024-2025-1',score:40,five:0,earned:false}),later=g('later',{courseCode:'ABC',termId:'2025-2026-1',score:95,five:5,earned:true});const result=A.summary([first,later],{},false,'first');assert.equal(result.gpa[0],0);assert.equal(result.earned,3);assert.equal(A.summary([first,later]).earned,3);});
