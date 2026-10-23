const {test}=require('node:test');const assert=require('node:assert/strict');const A=require('./agent-core.js');
const tool=(name,args,id='tool-1')=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
const result=(message,usage)=>({choices:[{message}],usage});

test('Agent 可提高请求预算完成超过8轮的任务，耗尽时保留用量并说明设置入口',async()=>{
 let count=0;const out=await A.run({model:'m',messages:[],options:{maxRounds:10},request:async()=>result(++count<10?{tool_calls:[tool('search_records',{module:'courses'})]}:{content:'完成较长任务'},{prompt_tokens:2,completion_tokens:1}),execute:async()=>({records:[]})});
 assert.equal(count,10);assert.equal(out.text,'完成较长任务');assert.equal(out.usage.inputTokens,20);
 await assert.rejects(()=>A.run({model:'m',messages:[],options:{maxRounds:1},request:async()=>result({tool_calls:[tool('search_records',{})]},{prompt_tokens:3}),execute:async()=>({records:[]})}),e=>e.code==='AGENT_ROUND_LIMIT'&&e.message.includes('1轮')&&e.message.includes('Agent 对话')&&e.usage.inputTokens===3);
 assert.deepEqual(A.limits({maxRounds:100,maxDrafts:0,textChars:'64000',historyTurns:NaN}),{maxRounds:32,maxDrafts:1,textChars:16000,historyTurns:8});
});
test('历史按用户轮次裁切，保留最新请求及附件，长度变更不修改原文',()=>{
 const rows=[{role:'user',content:'old'},{role:'assistant',content:'old answer'},{role:'user',content:'a'.repeat(3000)},{role:'assistant',content:'answer'},{role:'user',content:[{type:'text',text:'b'.repeat(3000)},{type:'image_url',image_url:{url:'data:image/png;base64,AAAA'}}]}];
 const cut=A.history(rows,{historyTurns:2,textChars:2000});assert.equal(cut.length,3);assert.equal(cut[0].role,'user');assert.equal(cut[0].content.length,2000);assert.equal(cut[2].content[0].text.length,2000);assert.deepEqual(cut[2].content[1],rows[4].content[1]);assert.equal(rows[2].content.length,3000);
});
test('公开摘要与工具结果有独立事件，原始推理不进入可见过程',async()=>{
 const steps=[];let n=0;await A.run({model:'m',messages:[],request:async()=>++n===1?result({reasoning_content:'PRIVATE INTERNAL TEXT',reasoning_summary:'先核对当前记录。',content:'读取这条记录后再拟修改。',tool_calls:[tool('read_record',{module:'homework',id:'x'})]}):result({content:'本次没有修改。'}),execute:async()=>{throw Error('学校原始字段只读');},onStep:s=>steps.push(s)});
 assert.equal(steps.find(s=>s.phase==='summary').text,'先核对当前记录。');assert.equal(steps.find(s=>s.phase==='plan').text,'读取这条记录后再拟修改。');assert.equal(steps.find(s=>s.phase==='tool_result').ok,false);assert.equal(steps.find(s=>s.phase==='tool_result').error,'学校原始字段只读');assert.ok(!JSON.stringify(steps).includes('PRIVATE INTERNAL TEXT'));
 assert.equal(A.publicSummary({reasoning_content:'PRIVATE INTERNAL TEXT'}),'');
});
test('工具阶段的用户停止不被吞成工具拒绝后继续请求模型',async()=>{
 let n=0;await assert.rejects(()=>A.run({model:'m',messages:[],request:async()=>{n++;return result({tool_calls:[tool('read_record',{})]});},execute:async()=>{throw new DOMException('停止','AbortError');}}),{name:'AbortError'});assert.equal(n,1);
});
test('过大或空的工具结果在可见状态中也标明未完成，与交给模型的错误一致',async()=>{
 for(const value of [undefined,{body:'a'.repeat(15000)}]){let n=0;const steps=[];const out=await A.run({model:'m',messages:[],onStep:s=>steps.push(s),request:async()=>result(++n===1?{tool_calls:[tool('read_record',{})]}:{content:'请缩小范围'}),execute:async()=>value});assert.equal(out.trace[0].ok,false);assert.equal(steps.find(s=>s.phase==='tool_result').ok,false);assert.ok(steps.find(s=>s.phase==='tool_result').error);}
});
test('Agent 首轮只发送工具和用户指令，读取后生成草稿并累计真实用量',async()=>{
  const bodies=[],actions=[],responses=[result({tool_calls:[tool('search_records',{module:'homework',limit:2})]},{prompt_tokens:100,prompt_tokens_details:{cached_tokens:30},completion_tokens:8}),result({tool_calls:[tool('draft_change',{operation:'create_todo',fields:{title:'交作业',deadline:'2026-10-22'}})]},{prompt_tokens:130,prompt_tokens_details:{cached_tokens:60},completion_tokens:9}),result({content:'请确认草稿'},{prompt_tokens:140,prompt_tokens_details:{cached_tokens:80},completion_tokens:7})];
  const out=await A.run({model:'own-model',messages:[{role:'user',content:'设个ddl'}],request:async b=>{bodies.push(structuredClone(b));return responses.shift();},execute:async(n,a)=>{actions.push([n,a]);return n==='draft_change'?{draftId:'p1',status:'待确认'}:{records:[]};}});
  assert.equal(bodies[0].messages.length,2);assert.equal(bodies[0].reasoning_effort,undefined);assert.equal(actions.length,2);assert.equal(out.text,'请确认草稿');assert.deepEqual(out.usage,{cacheHitInputTokens:170,cacheMissInputTokens:200,outputTokens:24,inputTokens:370});
});
test('未知工具、非法字段与原型字段被拒绝，不执行写入',async()=>{
  for(const fields of [{title:'a',sql:'delete'},JSON.parse('{"title":"a","__proto__":{"x":1}}'),{title:'a',constructor:'bad'},{title:'a',queued:'true'},{title:'a',repeatKind:'yearly'}])assert.throws(()=>A.validateDraft({operation:'create_todo',fields}));
  let executed=0,round=0;const out=await A.run({model:'m',messages:[],request:async()=>++round===1?result({tool_calls:[tool('run_code',{})]}):result({content:'工具不可用'}),execute:async()=>{executed++;}});assert.equal(executed,0);assert.equal(out.trace[0].ok,false);
});
test('工具循环有上限，停止请求、接口错误仍保留已知用量',async()=>{
  let count=0;await assert.rejects(()=>A.run({model:'m',messages:[],request:async()=>{count++;return result({tool_calls:[tool('search_records',{module:'courses'})]},{prompt_tokens:5,completion_tokens:1});},execute:async()=>({records:[]})}),e=>{assert.equal(count,8);assert.equal(e.usage.inputTokens,40);return true;});
  const controller=new AbortController();controller.abort();await assert.rejects(()=>A.run({model:'m',messages:[],signal:controller.signal,request:()=>{throw new Error('must not call');}}),{name:'AbortError'});
  let round=0;await assert.rejects(()=>A.run({model:'m',messages:[],request:async()=>{if(round++)throw new Error('offline');return result({tool_calls:[tool('search_records',{module:'courses'})]},{prompt_tokens:7,completion_tokens:2});},execute:async()=>({records:[]})}),e=>e.usage.inputTokens===7);
});
test('未返回缓存字段时展示未知，不捏造命中；兼容 DeepSeek 字段',()=>{
  assert.equal(A.usage({prompt_tokens:90,completion_tokens:3}).cacheMissInputTokens,null);
  assert.deepEqual(A.usage({prompt_tokens:10,prompt_cache_hit_tokens:4,prompt_cache_miss_tokens:6,completion_tokens:2}),{inputTokens:10,cacheHitInputTokens:4,cacheMissInputTokens:6,outputTokens:2});
});

test('实验与临时安排可以作为事项草稿，保留类型和晚间时段直到用户确认',async()=>{
  const actions=[];let round=0;
  const fields={title:'临时实验',kind:'event',timeMode:'range',startAt:'2026-10-20T22:00',endAt:'2026-10-20T23:00'};
  const output=await A.run({model:'m',messages:[{role:'user',content:'给我安排明晚十点的实验'}],request:async()=>round++===0?result({tool_calls:[tool('draft_change',{operation:'create_todo',fields})]}):result({content:'事项草稿待确认'}),execute:async(name,args)=>{actions.push(args);return {status:'待确认'};}});
  assert.equal(actions.length,1);assert.equal(actions[0].fields.kind,'event');assert.equal(actions[0].fields.endAt,'2026-10-20T23:00');assert.equal(output.text,'事项草稿待确认');
  assert.throws(()=>A.validateDraft({operation:'create_todo',fields:{title:'坏类型',kind:'course'}}));
});

test('新增作业有独立草稿操作，强制本机 homework 类型且仍需确认',()=>{
  const draft=A.validateDraft({operation:'create_homework',fields:{title:'模电实验报告',deadline:'2026-10-29',course:'电路实验'}});
  assert.equal(draft.operation,'create_homework');
  assert.equal(draft.fields.kind,'homework');
  assert.equal(draft.fields.deadline,'2026-10-29');
  assert.throws(()=>A.validateDraft({operation:'create_homework',fields:{deadline:'2026-10-29'}}));
});

test('实际模型请求带时间协议及字段说明，工具格式错误后可纠正再生成草稿',async()=>{
 const bodies=[],actions=[];let round=0;
 const out=await A.run({model:'m',messages:[{role:'user',content:'明天晚上安排实验'}],now:'2026-10-23 17:30',request:async body=>{bodies.push(structuredClone(body));return result(++round===1?{tool_calls:[tool('draft_change',{operation:'create_lesson',fields:{title:'实验',kind:'lesson',timeMode:'range',startAt:'2026-10-24T23:30',endAt:'2026-10-25T00:30',reminderOffsets:'60,10,0'}})]}:round===2?{tool_calls:[tool('draft_change',{operation:'create_lesson',fields:{title:'实验',kind:'lesson',timeMode:'range',startAt:'2026-10-24T23:30',endAt:'2026-10-25T00:30',reminderOffsets:[60,10,0]}})]}:{content:'已准备草稿，待你确认。'});},execute:async(name,args)=>{actions.push(args);return {status:'待用户确认'};}});
 const prompt=bodies[0].messages[0].content,fields=bodies[0].tools.find(t=>t.function.name==='draft_change').function.parameters.properties.fields.properties;
 for(const text of ['YYYY-MM-DDTHH:mm','不要带秒','跨午夜','21:15之后','不猜00:00','pending','[60,10,0]','工具返回error'])assert.ok(prompt.includes(text),text);
 assert.ok(fields.clock.description.includes('HH:mm'));assert.ok(fields.timeMode.description.includes('range'));assert.ok(fields.reminderOffsets.description.includes('0=到时'));
 assert.ok(JSON.parse(bodies[1].messages.findLast(m=>m.role==='tool').content).error.includes('数组'));assert.equal(actions.length,1);assert.deepEqual(actions[0].fields.reminderOffsets,[60,10,0]);assert.equal(actions[0].fields.endAt,'2026-10-25T00:30');assert.ok(out.text.includes('待你确认'));
});
