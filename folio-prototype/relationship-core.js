/* Local relationship forest. Bounded retrieval; no network or provider access. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioRelationshipCore=api;})(globalThis,()=>{
 'use strict';
 const KEY='folio-relationships-v1',MAX=2000,STEP=250,ops=['create_relationship','update_relationship','move_relationship','delete_relationship'];
 const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function fingerprint(value){const text=JSON.stringify(value);let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}return `${text.length}:${a>>>0}:${b>>>0}`;}
 const empty=()=>({version:1,revision:0,capacity:STEP,nodes:[{id:'self',parent:null,name:'自己',note:'',tone:'root',expanded:true,dx:0,dy:0}],updatedAt:null});
 function restore(raw){
  if(raw==null)raw=empty();
  if(raw.version!==1||!Array.isArray(raw.nodes)||raw.nodes.length<1||raw.nodes.length>MAX||!Number.isSafeInteger(raw.revision)||raw.revision<0)throw Error('关系网格式无效，原记录已保留');
  const capacity=raw.capacity??STEP;if(!Number.isSafeInteger(capacity)||capacity<STEP||capacity>MAX||capacity%STEP||raw.nodes.length>capacity)throw Error('关系网超过已开拓容量，请先在设置中扩容');
  const ids=new Set(),nodes=raw.nodes.map(n=>{
   if(!n||typeof n.id!=='string'||!n.id||n.id.length>100||ids.has(n.id)||!['string','object'].includes(typeof n.parent)||n.parent!==null&&typeof n.parent!=='string'||typeof n.name!=='string'||!n.name.trim()||n.name.length>24||typeof n.note!=='string'||n.note.length>3000)throw Error('关系节点格式无效');
   ids.add(n.id);const row={id:n.id,parent:n.parent,name:n.name,note:n.note,expanded:n.expanded!==false};
   for(const k of ['dx','dy','fx','fy'])if(own(n,k)){if(!Number.isFinite(n[k])||Math.abs(n[k])>10000)throw Error('节点位置无效');row[k]=n[k];}
   if(['root','plum','sage','clay','blue','gold'].includes(n.tone))row.tone=n.tone;
   if(typeof n.formerParent==='string'&&n.formerParent.length<=100)row.formerParent=n.formerParent;
   return row;
  });
  const map=new Map(nodes.map(n=>[n.id,n]));if(!map.has('self')||map.get('self').parent!==null)throw Error('缺少自己的中心节点');
  for(const n of nodes){const seen=new Set();let p=n;while(p){if(seen.has(p.id))throw Error('关系不能形成循环');seen.add(p.id);if(p.parent===null)break;p=map.get(p.parent);if(!p)throw Error('父节点不存在');}}
  nodes.sort((a,b)=>a.id==='self'?-1:b.id==='self'?1:0);
  return {version:1,revision:raw.revision,capacity,nodes,updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:null};
 }
 function branch(state,id){const found=new Set(),children=new Map();for(const n of state.nodes){if(!children.has(n.parent))children.set(n.parent,[]);children.get(n.parent).push(n.id);}const stack=state.nodes.some(n=>n.id===id)?[id]:[];while(stack.length){const next=stack.pop();if(found.has(next))continue;found.add(next);stack.push(...(children.get(next)||[]));}return found;}
 function path(state,node,map=new Map(state.nodes.map(n=>[n.id,n]))){const names=[];let n=node;while(n){names.unshift(n.name);n=map.get(n.parent);}return names.join(' / ');}
 function validateDraft(args){
  if(!args||Object.keys(args).some(k=>!['operation','targetId','fields'].includes(k))||!ops.includes(args.operation)||!args.fields||typeof args.fields!=='object'||Array.isArray(args.fields))throw Error('关系网草稿格式无效');
  const fields={},allowed=args.operation==='create_relationship'?['name','note','parentId']:args.operation==='update_relationship'?['name','note','expanded']:args.operation==='move_relationship'?['parentId']:[];
  for(const [k,v]of Object.entries(args.fields)){
   if(!allowed.includes(k))throw Error('不支持的关系网字段：'+k);
   if(k==='expanded'){if(typeof v!=='boolean')throw Error('折叠状态应为开关');}
   else if(k==='parentId'){if(v!==null&&(typeof v!=='string'||!v||v.length>100))throw Error('父节点ID无效');}
   else if(typeof v!=='string'||v.length>(k==='name'?24:3000)||k==='name'&&!v.trim())throw Error('节点名称或备注无效');
   fields[k]=v;
  }
  if(args.operation==='create_relationship'){if(!fields.name)throw Error('新节点需要名称');if(!own(fields,'parentId'))fields.parentId='self';}
  else if(typeof args.targetId!=='string'||!args.targetId||args.targetId.length>100)throw Error('需要明确的关系节点ID');
  if(args.operation==='move_relationship'&&!own(fields,'parentId'))throw Error('需要新父节点；脱离请设parentId=null');
  if(args.operation==='update_relationship'&&!Object.keys(fields).length)throw Error('没有待修改的内容');
  return {operation:args.operation,targetId:args.targetId||null,fields};
 }
 function anchor(state,id){
  const map=new Map(state.nodes.map(n=>[n.id,n])),chain=[];let n=map.get(id);while(n){chain.unshift(n);n=map.get(n.parent);}
  let a=-Math.PI*1.06,b=Math.PI*.94,dx=0,dy=0,depth=0,root=chain[0];
  for(let i=1;i<chain.length;i++){const kids=state.nodes.filter(n=>n.parent===chain[i-1].id),j=kids.findIndex(n=>n.id===chain[i].id),span=(b-a)/kids.length,gap=Math.min(.12,(b-a)*.05),nextA=a+j*span+gap;b=a+(j+1)*span-gap;a=nextA;dx+=(chain[i-1].dx||0)*.7;dy+=(chain[i-1].dy||0)*.7;depth++;}
  return {x:(root.id==='self'?0:root.fx||0)+Math.cos((a+b)/2)*depth*112+dx+(chain.at(-1).dx||0),y:(root.id==='self'?0:root.fy||0)+Math.sin((a+b)/2)*depth*112+dy+(chain.at(-1).dy||0)};
 }
 function apply(raw,args,{id,now=new Date().toISOString()}={}){
  const s=restore(raw),d=validateDraft(args),f=d.fields,n=s.nodes.find(n=>n.id===d.targetId),creating=d.operation==='create_relationship';
  if(!creating&&!n)throw Error('关系节点不存在');
  if(creating){if(s.nodes.length>=s.capacity)throw Error(s.capacity>=MAX?'已达到当前版本2000个节点上限':'关系网容量已满，请到设置 → 关系网存储增加容量');if(!id||s.nodes.some(n=>n.id===id))throw Error('新节点ID重复或无效');const tone=f.parentId==='self'?['plum','sage','clay','blue','gold'][s.nodes.filter(n=>n.parent==='self').length%5]:f.parentId===null?'plum':null;s.nodes.push({id,parent:f.parentId,name:f.name,note:f.note||'',expanded:true,dx:0,dy:0,...(tone?{tone}:{})});}
  if(d.operation==='update_relationship')Object.assign(n,f);
  if(d.operation==='move_relationship'){
   if(n.id==='self')throw Error('自己的中心节点不能移动到别的父节点');
   const group=branch(s,n.id);if(group.has(f.parentId))throw Error('不能接到自己或自己的后代上');
   const oldParent=n.parent,position=anchor(s,n.id);let colored=n;while(!colored.tone&&colored.parent)colored=s.nodes.find(v=>v.id===colored.parent);const oldTone=colored.tone==='root'?'plum':colored.tone||'plum';n.parent=f.parentId;
   if(f.parentId===null){n.formerParent=oldParent;n.fx=position.x+12;n.fy=position.y;n.tone=oldTone;}else{delete n.fx;delete n.fy;delete n.formerParent;if(f.parentId==='self')n.tone=oldTone;else delete n.tone;const p=s.nodes.find(v=>v.id===f.parentId);if(p)p.expanded=true;}
   for(const child of s.nodes)if(group.has(child.id)){child.dx=0;child.dy=0;}
  }
  if(d.operation==='delete_relationship'){if(n.id==='self')throw Error('不能删除自己的中心节点');const group=branch(s,n.id);s.nodes=s.nodes.filter(n=>!group.has(n.id));}
  s.revision++;s.updatedAt=now;return restore(s);
 }
 const normalized=s=>String(s||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
 function fuzzy(a,b){
  if(!a||!b)return 0;if(a===b)return 1;if(b.includes(a))return .95;
  const ac=[...a],bc=[...b],grams=s=>{const chars=[...s];return new Set(chars.slice(1).map((c,i)=>chars[i]+c));},ga=grams(a),gb=grams(b);
  const dice=ga.size&&gb.size?2*[...ga].filter(g=>gb.has(g)).length/(ga.size+gb.size):0;
  const chars=new Set(bc),coverage=ac.filter(c=>chars.has(c)).length/ac.length;
  let edit=0;if(ac.length>=3&&ac.length<=40&&Math.abs(ac.length-bc.length)<=2){let prev=Array.from({length:bc.length+1},(_,i)=>i);for(let i=1;i<=ac.length;i++){const next=[i];for(let j=1;j<=bc.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+Number(ac[i-1]!==bc[j-1]));prev=next;}if(prev[bc.length]<=Math.max(1,Math.floor(ac.length*.25)))edit=1-prev[bc.length]/Math.max(ac.length,bc.length);}
  return Math.max(dice*.8+coverage*.2,edit*.85);
 }
 function search(raw,args={}){
  const s=restore(raw);if(typeof args.query!=='undefined'&&(typeof args.query!=='string'||args.query.length>120))throw Error('关系网关键词最多120字');
  const q=normalized(args.query),limit=Number.isInteger(args.limit)?Math.max(1,Math.min(10,args.limit)):6,offset=Number.isInteger(args.offset)?Math.max(0,Math.min(MAX,args.offset)):0;
  if(args.parentId&&!s.nodes.some(n=>n.id===args.parentId))throw Error('搜索范围的父节点不存在');
  const scope=args.parentId?branch(s,args.parentId):null;
  const map=new Map(s.nodes.map(n=>[n.id,n]));
  let rows=s.nodes.filter(n=>!scope||scope.has(n.id)).map(n=>{
   const p=path(s,n,map),score=!q?1:Math.max(fuzzy(q,normalized(n.name)),fuzzy(q,normalized(p))*.86,fuzzy(q,normalized(n.note))*.65);
   const note=String(n.note),start=q?Math.max(0,normalized(note).indexOf(q)-15):0;
   return {id:n.id,name:n.name,parentId:n.parent,path:p.slice(0,130),excerpt:q?note.slice(start,start+70):'',score};
  }).filter(n=>!q||n.score>=.32).sort((a,b)=>b.score-a.score);
  const total=rows.length;rows=rows.slice(offset,offset+limit).map(({score,...n})=>n);
  return {source:'本机关联备忘',revision:s.revision,total,offset,nextOffset:offset+rows.length<total?offset+rows.length:null,results:rows};
 }
 function read(raw,id,args={}){
  const s=restore(raw),n=s.nodes.find(n=>n.id===id);if(!n)throw Error('关系节点不存在');
  const offset=Number.isInteger(args.noteOffset)?Math.max(0,Math.min(3000,args.noteOffset)):0,chars=Number.isInteger(args.noteLimit)?Math.max(1,Math.min(1200,args.noteLimit)):800;
  const childOffset=Number.isInteger(args.childOffset)?Math.max(0,Math.min(MAX,args.childOffset)):0,kids=s.nodes.filter(k=>k.parent===id);
  return {source:'本机关联备忘',revision:s.revision,node:{id:n.id,name:n.name,parentId:n.parent,path:path(s,n).slice(0,180),note:n.note.slice(offset,offset+chars),noteOffset:offset,nextNoteOffset:offset+chars<n.note.length?offset+chars:null,expanded:n.expanded},children:kids.slice(childOffset,childOffset+8).map(k=>({id:k.id,name:k.name})),totalChildren:kids.length,nextChildOffset:childOffset+8<kids.length?childOffset+8:null};
 }
 function expand(raw){const s=restore(raw);if(s.capacity>=MAX)throw Error('已达到当前版本2000个节点的容量上限');s.capacity+=STEP;s.revision++;s.updatedAt=new Date().toISOString();return s;}
 return {KEY,MAX,STEP,ops,empty,restore,branch,path,validateDraft,apply,expand,search,read,fingerprint};
});
