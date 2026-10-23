const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('./backend-core.js'),C=require('./course-data.js'),A=require('./academic-core.js');

test('考试地点兼容旧接口字段，空占位回退，数字座位号和期中期末不串',()=>{const exams=B.exams({items:[{xkkh:'2026-2027-1-x',kcmc:'电路',qzkssj:'2026-11-01(09:00-11:00)',qzjsmc:'--',qzksdd:'<b>东1-302</b>',qzzwxh:0,kssj:'2027-01-05(14：00-16：00)',jsmc:'null',qmksdd:'玉泉教4-301',zwxh:' 23 '}]});assert.equal(exams[0].room,'东1-302');assert.equal(exams[0].seat,'0');assert.equal(exams[0].venueField,'qzksdd');assert.equal(exams[1].room,'玉泉教4-301');assert.equal(exams[1].seat,'23');assert.equal(exams[1].start,'14:00');assert.equal(exams[0].type,'期中');assert.equal(exams[1].type,'期末');});
test('旧版期末时间及通用地点字段可读，未返回字段不虚构',()=>{const [exam]=B.exams({items:[{xkkh:'2026-2027-1-x',kcmc:'电路',qmkssj:'2027-01-05(14:00-16:00)',ksdd:'紫金港东2-101',zwh:12}]});assert.equal(exam.room,'紫金港东2-101');assert.equal(exam.seat,'12');const [missing]=B.exams({items:[{xkkh:'2026-2027-1-x',kcmc:'电路',kssj:'2027-01-05(14:00-16:00)',jsmc:'待公布',zwxh:'--'}]});assert.equal(missing.room,'');assert.equal(missing.seat,'');});
test('考试分页完整读取后才交给缓存，漏页或重复页明确失败',async()=>{const rows=[{id:1},{id:2},{id:3}],seen=[];const result=await B.examPages(async page=>{seen.push(page);return{items:rows.slice((page-1)*2,page*2),records:3,page,total:2};});assert.deepEqual(seen,[1,2]);assert.deepEqual(result.items,rows);await assert.rejects(B.examPages(async()=>({items:[rows[0]],records:3,page:1,total:3})),/分页/);await assert.rejects(B.examPages(async page=>({items:page===1?[rows[0]]:[],records:3,page,total:3})),/分页/);});
test('HTML服务错误不能误报为登录失效，真正登录页仍被识别',()=>{assert.throws(()=>B.decode({status:200,body:'<html>Service unavailable</html>'}),/网页而非数据/);assert.throws(()=>B.decode({status:200,body:'<html><input type="password" name="password"></html>'}),/登录已过期/);});
test('学校错误、登录 HTML、验证码和缺失列表不会当作有效空数据',()=>{
  for(const response of [{status:500,body:'{}'},{status:200,body:'<html>login</html>'},{status:200,body:'captcha_error'},{status:200,body:'{"success":false}'},{status:200,body:'not-json'}])assert.throws(()=>B.decode(response));
  assert.throws(()=>B.grades({}));assert.throws(()=>B.timetable({kbList:[{}]},'2026-2027-1','1|秋'));
  assert.deepEqual(B.grades({items:[]}),[]);
});
test('百分制、五级制和水测保留学期与原始值；小数学分不截断',()=>{
  const records=B.grades({items:[{xkkh:'(2026-2027-1)-001',kcmc:'分析',xf:'5.5',cj:'92',jd:'4.8'},{xkkh:'2025-2026-2-002',kcmc:'实验',xf:'1.5',cj:'优秀',jd:'4.5'},{xkkh:'2026-2027-1-003',kcmc:'水测',cj:'合格',jd:'0'}]});
  assert.equal(records[0].termId,'2026-2027-1');assert.equal(records[0].credits,5.5);assert.equal(records[1].grading,'fiveLevel');assert.equal(records[2].grading,'passFail');assert.equal(records[2].reportedFive,null);
  assert.equal(A.gradePoints(records[1].original,records[1].grading).five,4.5);
});
test('作业 UTC 时间换算为上海日期；刷新不丢本地事项及已挂便签',()=>{
  const fresh=B.homework({todo_list:[{id:3,is_student:true,title:'<b>作业</b>',course_name:'物理',end_time:'2026-10-20T17:00:00Z'},{id:4,is_student:false}]});
  assert.equal(fresh.length,1);assert.equal(fresh[0].deadline,'2026-10-21');assert.equal(fresh[0].deadlineClock,'01:00');
  const old=[{...fresh[0],completed:true,mountedOn:'2026-10-17',queued:false},{id:'mine',source:'personal',title:'自己加的'},{id:'old-school',source:'school',title:'历史作业'}];
  const merged=B.mergeHomework(old,fresh);assert.equal(merged.length,3);assert.equal(merged.find(r=>r.id===fresh[0].id).mountedOn,'2026-10-17');assert.equal(merged.find(r=>r.id===fresh[0].id).completed,true);assert.equal(merged.find(r=>r.id===fresh[0].id).queued,false);assert.equal(merged.find(r=>r.id==='old-school').completed,undefined);
});
test('作业完成字段兼容 is_completed/completed/status，且不把未完成误判为完成',()=>{
  const records=B.homework({todo_list:[
    {id:1,is_student:true,title:'A',is_completed:true},
    {id:2,is_student:true,title:'B',completed:1},
    {id:3,is_student:true,title:'C',status:'已完成'},
    {id:4,is_student:true,title:'D',status:'未完成'},
    {id:5,is_student:true,title:'E',is_finished:'true'},
  ]});
  assert.deepEqual(records.map(r=>r.completed),[true,true,true,false,true]);
  const submitted=B.homework({todo_list:[
    {id:6,is_student:true,title:'F',status:'已提交（可修改）'},
    {id:7,is_student:true,title:'G',is_completed:false,submitted:true},
  ]});
  assert.deepEqual(submitted.map(r=>r.completed),[true,true]);
  assert.deepEqual(submitted.map(r=>r.schoolCompleted),[true,true]);
  const reopen=B.mergeHomework([{...submitted[0],schoolCompleted:true}],B.homework({todo_list:[{id:6,is_student:true,title:'F',status:'未提交'}]}));
  assert.equal(reopen[0].completed,true);assert.equal(reopen[0].schoolCompleted,true);
});
test('刷新漏页或空结果保留未完成作业，重复刷新不复制记录',()=>{
  const original=B.homework({todo_list:[{id:10,is_student:true,title:'A'},{id:11,is_student:true,title:'B'}]});
  original[0].mountedOn='2026-10-19';
  const partial=B.mergeHomework(original,[original[1]]);
  assert.equal(partial.length,2);assert.equal(partial[0].completed,false);assert.equal(partial[0].mountedOn,'2026-10-19');
  assert.deepEqual(B.mergeHomework(partial,[]),partial);
  assert.equal(B.mergeHomework(partial,[original[1],original[1]]).length,2);
});
test('刷新不会重新打开本地已完成作业，未知字段不推断；迁移外部 agent 的误判标记',()=>{
  const parse=fields=>B.homework({todo_list:[{id:1,is_student:true,title:'A',...fields}]});
  const old=parse({is_completed:true});
  assert.equal(B.mergeHomework(old,parse({is_completed:'0'}))[0].completed,true);
  assert.equal(B.mergeHomework(old,parse({}))[0].completed,true);
  assert.equal(B.mergeHomework([{...old[0],remoteMissing:true}],[])[0].completed,true);
  for(const status of ['unsubmitted','incomplete','not_submitted','not completed'])assert.equal(parse({status})[0].completed,false);
  assert.equal(parse({status:'almost completed'})[0].completed,false);
  assert.equal(parse({is_completed:'false'})[0].completed,false);
  assert.equal(parse({is_completed:'1'})[0].completed,true);
});
const rawCalendar={startEnd:['20260914','20261108','20261109','20270110'],sessionTime:[],holiday:{20261001:'国庆'},exchange:{2026092120260927:'调课'}};
test('校历严格日期与单双周、秋冬分段及补课按同一规则处理',()=>{
  assert.equal(B.date('20260230'),'');assert.equal(B.date('2026年2月3日'),'2026-02-03');
  const calendar=B.calendar(rawCalendar,'2026-2027-1'),course=B.timetable({kbList:[{kcb:'物理<br>课号<br>张老师<br>东2-201zwf',xqj:1,djj:1,skcd:3,dsz:'0',xxq:'秋'}]},'2026-2027-1','1|秋')[0];
  assert.equal(course.sessions[0].end,'10:45');assert.equal(course.teacher,'张老师');assert.equal(course.sessions[0].evenWeek,false);assert.equal(course.sessions[0].secondHalf,false);
  const term={calendar,courses:[course]};assert.equal(C.onDate(term,'2026-09-14').length,1);assert.equal(C.onDate(term,'2026-09-21').length,0);assert.equal(C.onDate(term,'2026-11-09').length,0);
  course.sessions[0].evenWeek=true;assert.equal(C.onDate(term,'2026-09-27')[0].date,'2026-09-27');assert.equal(C.onDate(term,'2026-09-21').length,0);
  assert.equal(B.mergeCourses([[course],[course]])[0].sessions.length,1);
});
test('同天多场考试独立保留，不公布时间不伪造成有效日期',()=>{
  const records=B.exams({items:[{xkkh:'2026-2027-1-1',kcmc:'数学',kssj:'2026-12-20(09:00-11:00)',jsmc:'东1',zwxh:'12'},{xkkh:'2026-2027-1-2',kcmc:'物理',kssj:'2026-12-20(14:00-16:00)'},{xkkh:'2026-2027-1-3',kcmc:'实验',kssj:'另行通知'}]});
  assert.equal(records.length,3);assert.equal(records[0].seat,'12');assert.equal(records[1].start,'14:00');assert.equal(records[2].unscheduled,true);assert.equal(records[2].date,'');assert.notEqual(records[0].id,records[1].id);
});
test('课程名称中英文括号统一，课表、成绩和考试可正确关联',()=>{
  const grade=B.grades({items:[{xkkh:'2026-2027-1-a',kcmc:'体育（中级）',xf:1,cj:95,jd:5}]})[0],course=B.timetable({kbList:[{kcmc:'体育(中级)',xqj:1,djj:1,skcd:2}]},'2026-2027-1','1|秋')[0],exam=B.exams({items:[{xkkh:'2026-2027-1-a',kcmc:'体育(中级)',kssj:'2026-12-20(09:00-10:00)'}]})[0];assert.equal(grade.courseId,course.id);assert.equal(exam.courseId,course.id);assert.throws(()=>B.exams({items:[{}]}));
});
test('实践使用实际 jd，删除和待审核不计入累计',()=>{
  const project={xm:{mc:'活动',xmfl:{id:1}},jd:'0.5',cyrshzt:{value:5,label:'审核通过'}};
  const groups=B.practice({success:true,code:0,data:[{...project,id:1},{...project,id:2,sfsc:'true'},{...project,id:3,cyrshzt:{value:1,label:'审核中'}}]});
  assert.equal(groups[0].points,.5);assert.equal(groups[0].items.length,2);assert.equal(groups[0].items[1].approved,false);assert.throws(()=>B.practice({success:true}));
});
test('实践正式汇总读取 extend.myInfo，状态及小数保持；错误不以零覆盖',()=>{
  const summary=B.practiceSummary({code:0,extend:{myInfo:{dektJf:'1.5',dsktJf:2,dsiktJf:0,myTg:'已通过',lyTg:'false'}}});assert.deepEqual(summary,{points:[1.5,2,0],myPassed:true,lyPassed:false});assert.throws(()=>B.practiceSummary({code:0,data:{}}));assert.throws(()=>B.practice({success:false,code:401,data:[]}));
});
test('旧版课表和校历隔离备份，保留成绩、实践与活动学期且迁移可重复',()=>{
  const old={version:1,activeTerm:'2026-2027-1',modules:{grades:{data:[{id:'g'}]},practice:{data:[1]},'courses:2026-2027-1':{data:[2]},'calendar:2026-2027-1':{data:[3]}},terms:[{id:'2026-2027-1',courses:[{id:'old'}],calendar:{}}]};
  const result=B.migrateCache(old);assert.equal(old.terms[0].courses.length,1);assert.equal(result.backup.terms[0].courses[0].id,'old');assert.equal(result.cache.terms[0].courses.length,0);assert.equal(result.cache.terms[0].calendar,null);assert.equal(result.cache.terms[0].stale,true);assert.equal(result.cache.modules.grades.data[0].id,'g');assert.equal(result.cache.activeTerm,old.activeTerm);assert.equal(B.migrateCache(result.cache).backup,null);
});
test('校历与课表拒绝跨学年或半学期，不能把错误回包套到选中的学期',()=>{
  assert.throws(()=>B.calendar(rawCalendar,'2025-2026-1'),/年份|学期/);assert.throws(()=>B.checkTimetableTerm({xnm:'2025-2026',kbList:[]},'2026-2027-1'),/学年/);assert.throws(()=>B.checkTimetableTerm({xqm:'2|春',kbList:[]},'2026-2027-1'),/学期/);assert.throws(()=>B.checkTimetableTerm({kbList:[{xkkh:'(2025-2026-2)-a'}]},'2026-2027-1'),/其他学期/);
});
