const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const B=require('./backend-core.js'),A=require('./academic-core.js'),T=require('./todo-core.js'),E=require('./exams-core.js');
function harness(){
  const storage=new Map(),events=[];let cache={modules:{},terms:[]},custom=[],commits=0;
  const ctx={structuredClone,crypto:{randomUUID:crypto.randomUUID},console,Date,Map,WeakMap,Set,JSON,Promise,FolioBackend:B,FolioAcademic:A,FolioTodo:T,FolioExams:E,FolioAgent:require('./agent-core.js'),FolioQueue:require('./homework-queue-core.js'),FolioApp:{native:true},FolioCourses:{semesters:[B.emptyTerm('2026-2027-1')],onDate:()=>[]},FolioAcademicDemo:{grades:[],practice:[]},homeworkState:{today:'2026-10-18',items:[]},homeworkDemo:{storageKey:'hw'},examSemester:{id:'2026-2027-1'},officialExamRecords:[],customExamRecords:custom,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{storage.set(k,v);if(k==='school')cache=JSON.parse(v);}},document:{dispatchEvent:e=>events.push(e.type),addEventListener(){}},Event:class{constructor(type){this.type=type;}},commit(){commits++;ctx.homeworkState.items=T.materialize(ctx.homeworkState.items,'2026-10-18');},persistCustomExams(next){ctx.customExamRecords=next;storage.set('exams',JSON.stringify(next));return true;},currentExams:()=>[]};
  ctx.window=ctx;ctx.addEventListener=()=>{};ctx.FolioSchoolConnection=require('./school-connection-core.js');ctx.FolioNative={cache:()=>structuredClone(cache),storageKey:'school',call:async()=>{throw new Error('offline');}};
  vm.createContext(ctx);for(const file of ['live-school.js','agent-runtime.js'])vm.runInContext(fs.readFileSync(`${__dirname}/${file}`,'utf8'),ctx);return {ctx,storage,events,commits:()=>commits};
}
test('草稿只在确认后保存，收起/序列化可恢复；重复确认不重复创建',async()=>{
  const {ctx,storage,commits}=harness(),conversation={proposals:[]};
  await ctx.FolioAgentRuntime.execute('draft_change',{operation:'create_todo',fields:{title:'复习',timeMode:'deadline',deadline:'2026-10-20',repeatKind:'weekly'}},conversation,'m1','设个复习待办');
  assert.equal(ctx.homeworkState.items.length,0);assert.equal(commits(),0);const p=JSON.parse(JSON.stringify(conversation.proposals[0]));assert.equal(p.status,'pending');ctx.FolioAgentRuntime.confirm(p);assert.equal(p.status,'confirmed');assert.ok(storage.has('hw'));assert.equal(ctx.homeworkState.items.filter(r=>!r.parentId).length,1);assert.ok(ctx.homeworkState.items.some(r=>r.parentId));ctx.FolioAgentRuntime.confirm({...p,status:'pending'});assert.equal(ctx.homeworkState.items.filter(r=>!r.parentId).length,1);
});
test('更新必须先读取，期间发生变化则拒绝确认；取消草稿不产生副作用',async()=>{
  const {ctx}=harness(),c={proposals:[]};ctx.homeworkState.items.push({id:'t1',title:'旧标题',kind:'todo',source:'personal',timeMode:'none'});
  const args={operation:'update_todo',targetId:'t1',fields:{title:'新标题'}};
  await assert.rejects(()=>ctx.FolioAgentRuntime.execute('draft_change',args,c,'m','修改待办'),/必须先/);
  await ctx.FolioAgentRuntime.execute('read_record',{module:'todos',id:'t1'},c,'m','修改待办');await ctx.FolioAgentRuntime.execute('draft_change',args,c,'m','修改待办');ctx.homeworkState.items[0].title='手动修改';assert.throws(()=>ctx.FolioAgentRuntime.confirm(c.proposals[0]),/已有变化/);assert.equal(c.proposals[0].status,'pending');c.proposals[0].status='discarded';ctx.FolioAgentRuntime.confirm(c.proposals[0]);assert.equal(ctx.homeworkState.items[0].title,'手动修改');
});
test('学校考试只读；不相关请求不能调用成绩工具；删除必须显式确认',async()=>{
  const {ctx}=harness(),c={proposals:[]};ctx.officialExamRecords.push({id:'e1',title:'考试',source:'school'});
  await ctx.FolioAgentRuntime.execute('read_record',{module:'exams',id:'e1'},c,'m','改考试');await assert.rejects(()=>ctx.FolioAgentRuntime.execute('draft_change',{operation:'delete_exam',targetId:'e1',fields:{}},c,'m','改考试'),/只读/);
  await assert.rejects(()=>ctx.FolioAgentRuntime.execute('search_records',{module:'grades'},c,'m','你好'),/未明确/);
  ctx.homeworkState.items.push({id:'t1',title:'待办',kind:'todo'});await ctx.FolioAgentRuntime.execute('read_record',{module:'todos',id:'t1'},c,'m2','删掉');await ctx.FolioAgentRuntime.execute('draft_change',{operation:'delete_todo',targetId:'t1',fields:{}},c,'m2','删掉');assert.equal(ctx.homeworkState.items.length,1);ctx.FolioAgentRuntime.confirm(c.proposals[0]);assert.equal(ctx.homeworkState.items.length,0);
});
test('成绩同步及失败互不清缓存，非法成绩不进入持久缓存；校历失败不抹课表',async()=>{
  const {ctx,storage}=harness();let bad=false,offline=false;
  ctx.FolioNative.call=async(op,{module})=>{if(offline)throw new Error('offline');const body=module==='grades'?{items:[{xkkh:'2026-2027-1-001',kcmc:'数学',xf:'5.5',cj:bad?'看不懂':'95',jd:bad?'':'5'}]}:module==='major'?{items:[{xkkh:'2026-2027-1-001'}]}:null;if(!body)throw new Error('calendar offline');return {status:200,body:JSON.stringify(body)};};
  const data=await ctx.FolioSchool.refresh('grades');assert.equal(data[0].five,5);assert.equal(data[0].major,true);const stamp=ctx.FolioSchool.cache().modules.grades.updatedAt;
  bad=true;await assert.rejects(()=>ctx.FolioSchool.refresh('grades'),/无法识别/);assert.equal(ctx.FolioSchool.cache().modules.grades.data[0].original,'95');assert.equal(ctx.FolioSchool.cache().modules.grades.updatedAt,stamp);
  offline=true;await assert.rejects(()=>ctx.FolioSchool.refresh('grades'),/offline/);assert.equal(JSON.parse(storage.get('school')).modules.grades.data[0].five,5);
  ctx.FolioCourses.semesters[0].courses=[{id:'existing',title:'旧课表',sessions:[],credits:null}];await assert.rejects(()=>ctx.FolioSchool.refresh('courses'));assert.equal(ctx.FolioCourses.semesters[0].courses[0].id,'existing');
});
test('实践汇总与明细独立读取，失败时保留正式总分及已成功的部分',async()=>{
  const {ctx}=harness();let detailsFail=true;
  ctx.FolioNative.call=async(op,{module})=>{
    if(module==='practice'&&detailsFail||module==='practiceSummary'&&!detailsFail)throw new Error('temporary offline');
    return {status:200,body:JSON.stringify(module==='practiceSummary'?{code:0,extend:{myInfo:{dektJf:6,dsktJf:2,dsiktJf:1,myTg:1}}}:{success:true,code:0,data:[{id:1,xm:{mc:'活动',xmfl:{id:1}},jd:0.5,cyrshzt:{value:5,label:'审核通过'}}]})};
  };
  let groups=await ctx.FolioSchool.refresh('practice');assert.equal(groups[0].points,6);assert.equal(groups[0].detailsAvailable,false);assert.ok(ctx.FolioSchool.cache().modules.practice.warning);
  detailsFail=false;groups=await ctx.FolioSchool.refresh('practice');assert.equal(groups[0].points,6);assert.equal(groups[0].items[0].points,.5);assert.equal(groups[0].detailsAvailable,true);assert.ok(ctx.FolioSchool.cache().modules.practiceSummary.warning);
});
test('课表使用完整学年，学分只按同学期匹配；错误学期返回不覆盖旧课程',async()=>{
  const {ctx}=harness(),calls=[];let wrong=false;
  ctx.FolioNative.call=async(op,input)=>{calls.push(input);const body=input.module==='calendar'?{startEnd:['20260914','20261108','20261109','20270110'],sessionTime:[]}:input.module==='exams'?{items:[{xkkh:'2026-2027-1-a',kcmc:'数学',xf:'5.5'},{xkkh:'2025-2026-2-b',kcmc:'物理',xf:4}]}:{xnm:wrong?'2025-2026':'2026-2027',kbList:[{kcb:'数学<br>001<br>教师<br>东1zwf',djj:1,skcd:2,xqj:1},{kcb:'物理<br>002<br>教师<br>东2zwf',djj:3,skcd:2,xqj:2}]};return {status:200,body:JSON.stringify(body)};};
  const courses=await ctx.FolioSchool.refresh('courses');assert.equal(calls.filter(c=>c.module==='courses').length,2);assert.ok(calls.filter(c=>c.module==='courses').every(c=>c.year==='2026-2027'));assert.equal(courses.find(c=>c.title==='数学').credits,5.5);assert.equal(courses.find(c=>c.title==='物理').credits,null);
  wrong=true;await assert.rejects(()=>ctx.FolioSchool.refresh('courses'),/学年/);assert.equal(ctx.FolioCourses.semesters[0].courses.find(c=>c.title==='数学').credits,5.5);
});
test('切换学校账号先隔离旧学业快照，保留个人事项和隐私且不混入旧学校作业',()=>{
  const {ctx,storage}=harness();ctx.homeworkState.items=[{id:'mine',source:'personal'},{id:'old-school',source:'school'}];storage.set('folio-academic-v1',JSON.stringify({...A.fresh(),hideGrades:true,overrides:{old:{core:true}}}));
  assert.equal(ctx.FolioSchool.bindAccount({accountId:'another-student',authenticated:true}),true);assert.equal(ctx.homeworkState.items.map(i=>i.id).join(','),'mine');assert.equal(JSON.parse(storage.get('folio-academic-v1')).hideGrades,true);assert.ok(JSON.parse(storage.get('folio-school-profiles-v1'))['unverified-0.2'].academic.includes('old'));assert.equal(ctx.FolioSchool.cache().needsInitialSync,true);assert.equal(ctx.FolioSchool.bindAccount({accountId:'another-student'}),false);
});

test('保存主修课号目录、课表从同学期权威记录补课号，不以课程标题猜归属',async()=>{
 const {ctx}=harness();ctx.FolioNative.call=async(op,{module})=>({status:200,body:JSON.stringify(module==='grades'?{items:[{xkkh:'(2026-2027-1)-ABC001-01',kcmc:'课程甲',xf:'3',cj:'95',jd:'5'}]}:module==='major'?{items:[{xkkh:'(2025-2026-1)-ABC002-01'}]}:module==='courses'?{kbList:[{kcb:'课程甲<br>班级<br>教师<br>教室zwf',djj:1,skcd:2,xqj:1,xxq:'秋冬'}]}:module==='exams'?{items:[{xkkh:'(2026-2027-1)-ABC001-01',kcmc:'课程甲',xf:'3'}]}:{})});
 await ctx.FolioSchool.refresh('grades');assert.equal(ctx.FolioSchool.cache().modules.majorCourses.data[0].code,'ABC002');await ctx.FolioSchool.refresh('courses','2026-2027-1');assert.equal(ctx.FolioCourses.semesters[0].courses[0].code,'ABC001');assert.equal(ctx.FolioCourses.semesters[0].courses[0].credits,3);
});
