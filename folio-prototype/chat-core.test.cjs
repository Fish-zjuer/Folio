const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('./chat-core.js');
const Todo=require('./todo-core.js');
test('未发送内容、附件、模型设置与对话历史可往返序列化',()=>{
  const s=C.defaults(),a=C.create(s);a.text='图片上的作业';a.attachments=[{id:'blob-1',name:'作业.png',type:'image/png',size:32}];s.settings.reasoning='high';
  const m=C.send(s);assert.equal(m.attachments[0].id,'blob-1');assert.equal(a.text,'');assert.deepEqual(a.attachments,[]);assert.equal(m.settings.reasoning,'high');
  const b=C.create(s);b.text='未发送的文字';const saved=JSON.parse(JSON.stringify(s));
  assert.equal(C.conversation(saved).text,'未发送的文字');assert.equal(saved.conversations.find(c=>c.id===a.id).messages[0].text,'图片上的作业');
});
test('空消息不发送，本地回复不伪造模型用量或识图结果',()=>{
  const s=C.defaults(),c=C.create(s);c.text='  ';assert.equal(C.send(s),null);assert.equal(c.messages.length,0);
  c.text='测试';C.send(s);assert.equal(c.messages[1].prototype,true);assert.equal(c.messages[1].usage,null);
});
test('草稿暂存不写入待办，收起和刷新不丢字段；同消息重复打开复用提案',()=>{
  const s=C.defaults(),c=C.create(s);const p=C.propose(c,'message-1');p.fields.title='微积分作业';p.fields.deadline='2026-10-21';
  assert.equal(C.propose(c,'message-1').id,p.id);const copy=JSON.parse(JSON.stringify(s));assert.equal(C.pending(copy).length,1);
  assert.equal(C.pending(copy)[0].proposal.fields.title,'微积分作业');assert.equal(C.pending(copy)[0].proposal.status,'pending');
  p.status='discarded';assert.equal(C.pending(s).length,0);
});
test('待办转换保持固定 ID，默认不入队、自定义作业归自定义课程',()=>{
  const s=C.defaults(),c=C.create(s),p=C.propose(c,'m');
  assert.throws(()=>Todo.validate(C.toTodo(p)),/标题/);p.fields.title='练习';assert.throws(()=>Todo.validate(C.toTodo(p)),/日期/);
  p.fields.deadline='2026-10-21';p.fields.clock='20:00';let item=C.toTodo(p);Todo.validate(item);assert.equal(item.queued,false);assert.equal(item.deadlineClock,'20:00');
  p.fields.kind='homework';p.fields.queued=true;const second=C.toTodo(p);assert.equal(second.id,item.id);assert.equal(second.course,'自定义');assert.equal(second.queued,true);
});
test('跨对话待确认修改独立保留，确认不会改变其他草稿',()=>{
  const s=C.defaults(),a=C.create(s),pa=C.propose(a,'a'),b=C.create(s),pb=C.propose(b,'b');
  pa.fields.title='a';pb.fields.title='b';assert.equal(C.pending(s).length,2);pa.status='confirmed';assert.equal(C.pending(s).length,1);assert.equal(C.pending(s)[0].proposal.id,pb.id);
});
test('旧演示对话归档但不删除，未发送内容带入空白首页',()=>{
  const s=C.defaults(),c=C.create(s);c.text='你好';C.send(s);C.propose(c,c.messages[0].id);c.text='还没发送';c.attachments=[{id:'keep'}];
  assert.equal(C.archivePreview(s),true);const fresh=C.conversation(s);
  assert.notEqual(fresh.id,c.id);assert.equal(fresh.text,'还没发送');assert.equal(fresh.attachments[0].id,'keep');assert.equal(c.messages.length,2);assert.equal(C.pending(s).length,0);
});
test('真实待确认操作和真实对话不被首页迁移抹掉',()=>{
  const s=C.defaults(),c=C.create(s);c.messages.push({role:'assistant',prototype:true},{role:'assistant',text:'真实答复'});c.proposals.push({operation:'create_todo',status:'pending'});
  C.archivePreview(s);assert.equal(C.conversation(s).id,c.id);assert.equal(C.pending(s).length,1);
});
