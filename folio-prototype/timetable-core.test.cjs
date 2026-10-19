const test=require('node:test'),assert=require('node:assert/strict');
const T=require('./timetable-core.js');
test('原生课表支持校历全部十五节，晚课不挤到末端；拒绝非法时间轴',()=>{const pairs=require('./backend-core.js').defaultTimes,s=T.scale(pairs);assert.equal(s.periods.length,15);assert.ok(s.at(1330)>s.at(1275));assert.equal(s.at(1375),s.height);assert.throws(()=>T.scale([['09:00','08:00']]));});
test('默认十五节时间轴连续单调，课间压缩但起止时间保持对应',()=>{
  const s=T.scale();assert.equal(s.periods.length,15);
  assert.equal(s.at(480),0);assert.equal(s.at(1375),s.height);
  for(const p of s.periods) {const m=Number(p.clock.slice(0,2))*60+Number(p.clock.slice(3));assert.equal(s.at(m),p.top);assert.equal(s.at(m+45),p.top+44);}
  assert.equal(s.at(-1),0);assert.equal(s.at(1500),s.height);
  for(let minute=481;minute<=1375;minute++) assert.ok(s.at(minute)>=s.at(minute-1));
  assert.ok(s.at(745)-s.at(600)>s.at(575)-s.at(480));
});
test('重叠课程合并，首尾相接不算冲突，输入数据不被改变',()=>{
  const entries=[{id:'c',startMinute:650,endMinute:745},{id:'b',startMinute:530,endMinute:575},
    {id:'a',startMinute:480,endMinute:540},{id:'d',startMinute:745,endMinute:790}];
  const copy=JSON.stringify(entries),groups=T.groups(entries);
  assert.deepEqual(groups.map(g=>g.entries.map(e=>e.id)),[['a','b'],['c'],['d']]);
  assert.deepEqual([groups[0].start,groups[0].end],[480,575]);assert.equal(JSON.stringify(entries),copy);
  assert.throws(()=>T.groups([{startMinute:600,endMinute:590}]),/无效/);
});
test('十五节按页面可用高度缩放，真实时刻仍单调且最后一节不越出页面',()=>{
  const pairs=require('./backend-core.js').defaultTimes;
  for(const height of [300,420,580,720]){
    const s=T.scale(pairs,{fitHeight:height});assert.equal(s.height,height);
    assert.equal(s.at(480),0);assert.equal(s.at(1375),height);
    for(let minute=481;minute<=1375;minute++)assert.ok(s.at(minute)>=s.at(minute-1));
    for(const p of s.periods){assert.ok(p.top>=0);assert.ok(p.top+p.height<=height+.00001);}
    assert.ok(s.at(1330)<height);assert.ok(s.at(1375)>s.at(1330));
  }
  assert.throws(()=>T.scale(pairs,{fitHeight:0}),/高度/);
});


test('默认课表含第14/15节，晚间及跨日事项动态延伸至午夜且均匀缩放',()=>{
 const scale=T.scale();assert.equal(scale.periods.at(-1).clock,'22:10');
 const late=T.scale(undefined,{fitHeight:600,bounds:{start:0,end:1440}});assert.equal(late.at(0),0);assert.equal(late.at(1440),600);assert.ok(late.at(1430)>late.at(1380));assert.ok(late.at(30)<late.at(480));
 assert.throws(()=>T.scale(undefined,{bounds:{start:0,end:1441}}),/范围/);
});
