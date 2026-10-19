const {test}=require('node:test');const assert=require('node:assert/strict');const A=require('./agent-core.js');
const tool=(name,args,id='tool-1')=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
const result=(message,usage)=>({choices:[{message}],usage});
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
