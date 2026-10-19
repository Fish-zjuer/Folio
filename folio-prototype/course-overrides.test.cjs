const test=require('node:test');const assert=require('node:assert/strict');
const O=require('./course-overrides.js'),C=require('./course-data.js');
const term={id:'term-a',calendar:{periods:[{id:'a',label:'秋',half:'first',start:'2026-10-01',end:'2026-11-30'}]},courses:[{id:'lab',title:'实验',sessions:[{id:'a',day:0,start:'13:25',end:'14:10',startPeriod:6,periods:1},{id:'b',day:0,start:'14:15',end:'15:50',startPeriod:7,periods:2}]}]};
function memory(){let saved=null;return {getItem:()=>saved,setItem:(k,value)=>saved=value};}
test('排除单次在合并前生效，只释放目标节次，学校原数据不变，跨刷新保留且可恢复',()=>{
 const storage=memory(),store=O.createStore({storage}),before=JSON.stringify(term);
 assert.equal(C.onDate(term,'2026-10-19').length,1);assert.equal(C.onDate(term,'2026-10-19')[0].periods,3);
 const id=store.add({termId:'term-a',courseId:'lab',sessionIds:['a'],date:'2026-10-19'});
 const next=O.createStore({storage});assert.equal(C.onDate(term,'2026-10-19',next.excluded)[0].periods,2);
 assert.equal(C.onDate(term,'2026-10-26',next.excluded)[0].periods,3);assert.equal(JSON.stringify(term),before);
 next.remove(id);assert.equal(C.onDate(term,'2026-10-19',next.excluded)[0].periods,3);
});
test('批量排除多组及整课程，只作用本学期/课程/指定范围，逐条恢复不影响其它记录',()=>{
 const store=O.createStore({storage:memory()});store.add({termId:'term-a',courseId:'lab',sessionIds:['a','b'],from:'2026-10-19',until:'2026-10-26'});
 store.add({termId:'term-a',courseId:'lab',from:'2026-11-02'});store.add({termId:'term-b',courseId:'lab',from:'2026-10-19'});
 assert.equal(C.onDate(term,'2026-10-12',store.excluded).length,1);assert.equal(C.onDate(term,'2026-10-19',store.excluded).length,0);assert.equal(C.onDate(term,'2026-10-26',store.excluded).length,0);assert.equal(C.onDate(term,'2026-11-09',store.excluded).length,0);
 assert.equal(store.excluded('term-b','other',{id:'a'},'2026-10-19'),false);store.restoreCourse('term-a','lab');assert.equal(store.list().length,1);assert.equal(C.onDate(term,'2026-10-19',store.excluded).length,1);
});
test('无效范围被拒绝，保存失败不改变排课，清单不暴露可变数组',()=>{
 const store=O.createStore({storage:memory()});assert.throws(()=>store.add({termId:'a',courseId:'b',from:'2026-02-30'}));assert.throws(()=>store.add({termId:'a',courseId:'b',from:'2026-10-20',until:'2026-10-19'}));
 store.add({termId:'a',courseId:'b',sessionIds:['s'],from:'2026-10-19'});store.list()[0].sessionIds.push('x');assert.equal(store.excluded('a','b',{id:'x'},'2026-10-19'),false);
 const bad=O.createStore({storage:{getItem:()=>null,setItem:()=>{throw Error('full');}}});assert.throws(()=>bad.add({termId:'a',courseId:'b',from:'2026-10-19'}),/未保存/);assert.equal(bad.list().length,0);
});
