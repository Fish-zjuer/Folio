(()=>{'use strict';const e=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const page=e('section','settings-screen relationships-screen');page.id='relationships-screen';page.hidden=true;
 const head=e('header','settings-header'),back=e('button','menu-button'),title=e('h1','settings-page-title','关系网');back.type='button';back.setAttribute('aria-label','返回功能菜单');back.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>';back.onclick=()=>goBack('menu');head.append(back,title,e('span'));
 const frame=e('iframe','relationships-frame');frame.title='自己的关系备忘网';frame.setAttribute('data-gesture-own','');
 const error=e('p','chat-form-error');if(FolioRelationships.error)error.textContent=FolioRelationships.error+'；原记录已保留，请先保留应用数据。';
 const mapShell=e('div','relationships-map-shell');mapShell.append(frame);
 page.append(head,error,mapShell);document.querySelector('.phone').append(page);previewScreens.relationships=page;screenNames.relationships='关系网';screenFocusTargets.relationships=back;
 async function load(){try{await FolioRelationships.ready;if(!frame.getAttribute('src'))frame.src='relationship-view.html?app=1';}catch(e){error.textContent=e.message;}}
 document.addEventListener('preview-screen-change',event=>{if(event.detail.screen==='relationships'){load();frame.contentWindow.FolioRelationshipView?.resume();}else frame.contentWindow.FolioRelationshipView?.pause();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&currentScreen==='relationships'&&!document.querySelector('.chat-layer:not([hidden])')&&frame.contentWindow.FolioRelationshipView?.back()){event.preventDefault();event.stopImmediatePropagation();}},true);
 function openProposal(conversation,p){
  const C=FolioRelationshipCore,state=FolioRelationships.read(),target=state.nodes.find(n=>n.id===p.targetId),create=p.operation==='create_relationship',move=p.operation==='move_relationship',remove=p.operation==='delete_relationship';
  const box=FolioChatUI.openPanel(remove?'确认删除整条分支':move?'确认移动关系分支':create?'确认添加关系节点':'确认修改关系节点',true);
  box.append(e('p','chat-panel-note','尚未执行。关系网备忘与作业、待办分别保存。'));
  const form=e('form','chat-proposal-form'),f=p.fields,fields={};
  function field(label,key,type,value){const wrap=e('label','chat-field'),input=e(type==='textarea'?'textarea':'input');input.value=value??'';if(type!=='textarea')input.type=type;input.maxLength=key==='name'?24:3000;wrap.append(e('span','',label),input);form.append(wrap);fields[key]=input;}
  if(create||p.operation==='update_relationship'){field('名称','name','text',f.name??target?.name);field('备注','note','textarea',f.note??target?.note);}
  if(p.operation==='update_relationship'){const wrap=e('label','chat-check'),input=e('input');input.type='checkbox';input.checked=f.expanded??target.expanded;wrap.append(input,e('span','','展开分支'));form.append(wrap);fields.expanded=input;}
  if(create||move){
   const wrap=e('label','chat-field'),select=e('select');select.append(new Option('独立分支（脱离父节点）',''));const excluded=move?C.branch(state,p.targetId):new Set();
   for(const n of state.nodes)if(!excluded.has(n.id))select.append(new Option(C.path(state,n),n.id));select.value=f.parentId??'';wrap.append(e('span','',move?'新位置':'接在谁下面'),select);form.append(wrap);fields.parentId=select;
  }
  if(move||remove){const count=C.branch(state,p.targetId).size-1;form.append(e('h3','',target?.name||'所选关系节点'),e('p','chat-panel-note',`${remove?'将删除':'将整体移动'}当前节点${count?`及其下面的 ${count} 个子节点`:''}，${remove?'包括它们的备注。':'保留它们的备注和折叠状态。'}`));}
  const error=e('p','chat-form-error');error.setAttribute('role','alert');const actions=e('div','chat-panel-actions'),cancel=e('button','chat-secondary','取消这次修改'),ok=e('button','chat-primary',remove?'确认删除整条分支':'确认保存');cancel.type='button';ok.type='submit';
  cancel.onclick=()=>{p.status='discarded';if(FolioChatUI.persist()){FolioChatUI.closePanel();FolioChatUI.render();}else p.status='pending';};actions.append(cancel,ok);form.append(error,actions);box.append(form);
  form.onsubmit=async event=>{event.preventDefault();ok.disabled=true;try{for(const [key,input]of Object.entries(fields))f[key]=key==='expanded'?input.checked:key==='parentId'?input.value||null:input.value;C.validateDraft({operation:p.operation,targetId:p.targetId,fields:f});await FolioAgentRuntime.confirm(p);if(!FolioChatUI.persist()){p.status='pending';throw Error('已保存关系网，确认状态未保存，可重试');}FolioChatUI.closePanel();FolioChatUI.render();announce('关系网已更新');}catch(err){error.textContent=err.message;ok.disabled=false;}};
 }
 window.FolioRelationshipUI={openProposal,back:()=>goBack('menu'),open(){load();showPreviewScreen('relationships');},frame};
})();
