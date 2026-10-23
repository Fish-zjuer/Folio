/* Public reasoning summaries and observable tool activity. Never raw reasoning_content. */
(()=>{'use strict';
 const names={search_relationships:'模糊搜索关系网',read_relationship:'读取关系备忘',draft_relationship:'准备关系网修改',search_records:'检索本机记录',read_record:'读取记录详情',draft_change:'准备待确认修改',read_preferences:'读取当前设置',draft_preferences:'准备设置修改'};
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
 function record(message,step){
  const rows=message.progress||(message.progress=[]),id=step.id;
  if(step.phase==='model')rows.push({kind:'status',text:step.round?'继续整理回答':'了解请求',round:step.round});
  else if(step.phase==='summary'||step.phase==='plan')rows.push({kind:step.phase==='summary'?'thinking':'plan',text:String(step.text).slice(0,6000),round:step.round});
  else if(step.phase==='tool')rows.push({kind:'tool',id,name:step.name,text:names[step.name]||'不可用工具',status:'running'});
  else if(step.phase==='tool_result'){
   const row=rows.findLast(r=>r.kind==='tool'&&r.id===id);if(row){row.status=step.ok?'done':'error';if(!step.ok)row.error=step.error||'工具未完成';}
  }
  message.text=step.phase==='tool'?names[step.name]||'检查工具':step.phase==='tool_result'&&!step.ok?'工具未完成，正在整理结果':'正在思考';
 }
 function create(message){
  const node=el('details','chat-progress'),summary=el('summary','chat-progress-summary'),label=el('span','chat-progress-first'),state=el('small','chat-progress-state'),viewport=el('div','chat-progress-log'),list=el('div','chat-progress-entries');
  const mark=document.createElementNS('http://www.w3.org/2000/svg','svg');mark.setAttribute('viewBox','0 0 20 20');mark.setAttribute('aria-hidden','true');mark.innerHTML='<path d="m10 2 2.2 5.8L18 10l-5.8 2.2L10 18l-2.2-5.8L2 10l5.8-2.2Z"/>';
  const chevron=document.createElementNS('http://www.w3.org/2000/svg','svg');chevron.setAttribute('viewBox','0 0 24 24');chevron.setAttribute('aria-hidden','true');chevron.classList.add('chat-progress-chevron');chevron.innerHTML='<path d="m5 9 7 7 7-7"/>';
  summary.append(mark,label,state,chevron);viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','思考摘要与工具过程，可滚动查看');viewport.append(list);node.append(summary,viewport);
  let current=message,pinned=true,position=0,revision='';
  function place(){if(!node.open)return;viewport.scrollTop=pinned?viewport.scrollHeight:position;viewport.classList.toggle('has-earlier',viewport.scrollTop>2);}
  viewport.addEventListener('scroll',()=>{position=viewport.scrollTop;pinned=viewport.scrollHeight-viewport.clientHeight-position<12;viewport.classList.toggle('has-earlier',position>2);},{passive:true});
  node.addEventListener('toggle',()=>{if(node.open){if(current.pending)pinned=true;requestAnimationFrame(place);}});
  function update(next){
   current=next;const rows=(next.progress||[]).map(r=>typeof r==='string'?{kind:'status',text:r}:r),first=rows.find(r=>r.kind==='thinking'||r.kind==='plan');
   label.textContent=(first?.text||(next.pending?'正在思考':'思考与工具过程')).split(/\r?\n/).find(t=>t.trim())||'处理过程';
   state.textContent=next.pending?'生成中':next.status==='error'?'未完成':next.status==='stopped'?'已停止':'已完成';
   const value=JSON.stringify(rows);if(value!==revision){revision=value;position=viewport.scrollTop;list.replaceChildren();for(const r of rows){const row=el('div','chat-progress-entry'),kind=el('span','chat-progress-kind',r.kind==='tool'?'工具':r.kind==='thinking'?'摘要':r.kind==='plan'?'计划':'过程'),text=el('span','chat-progress-text',r.text);row.dataset.kind=r.kind;row.append(kind,text);if(r.kind==='tool'){row.dataset.status=r.status||'done';const result=el('small','chat-progress-result',r.status==='running'?(next.pending?'调用中':'已中断'):r.status==='error'?'未完成':'完成');text.append(result);if(r.error)text.append(el('span','chat-progress-error',r.error));}list.append(row);}requestAnimationFrame(place);}
   requestAnimationFrame(place);
  }
  update(message);return {node,update};
 }
 window.FolioAgentProgress=Object.freeze({record,create});
})();
