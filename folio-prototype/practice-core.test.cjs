const test=require('node:test'),assert=require('node:assert/strict'),P=require('./practice-core.js');
test('只有已审核、未删除且记点有效的记录计入，零分与未知分不同',()=>{
  assert.equal(P.counted({approved:true,points:0}),true);
  for(const item of [{approved:false,points:2},{approved:true,deleted:true,points:2},{approved:true,points:null},{approved:true,points:-1},{approved:true,points:Infinity}])assert.equal(P.counted(item),false);
});
test('正式汇总不被项目合计覆盖，按更新日期排序，排除删除记录且不修改输入',()=>{
  const record={points:8,detailsAvailable:true,items:[{id:'a',approved:true,points:1.5,start:'2026-09-02'},{id:'b',approved:false,points:2,updatedAt:'2026-10-01'},{id:'c',approved:true,points:1,start:'2026-09-03'},{id:'d',approved:true,points:9,deleted:true}]},before=JSON.stringify(record),view=P.project(record);
  assert.equal(view.total,8);assert.equal(view.itemTotal,2.5);assert.deepEqual(view.included.map(i=>i.id),['c','a']);assert.deepEqual(view.excluded.map(i=>i.id),['b']);assert.equal(JSON.stringify(record),before);
});
test('明细缺失与确实没有项目分开，不把缺失记点转成0',()=>{
  assert.equal(P.project({points:6,detailsAvailable:false}).available,false);
  assert.equal(P.project({points:6,detailsAvailable:false}).itemTotal,null);
  assert.equal(P.project({points:0,detailsAvailable:true,items:[]}).itemTotal,0);
  assert.equal(P.project({points:null}).total,null);assert.equal(P.format(null),'—');assert.equal(P.format(1.5),'1.5');
});
