/* Host card composition. Use the public registry's real mounts and cleanup hooks. */
(()=>{'use strict';const C=FolioCardPackCore,W=FolioWorkbench,KEY='folio-card-packs-v1',mounted=new Set();
 const el=(t,c,text)=>{const n=document.createElement(t);n.className=c||'';if(text!=null)n.textContent=text;return n;},button=(text,fn,cls='sm-button')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
 let state=C.clean();try{state=C.restore(JSON.parse(localStorage.getItem(KEY)));}catch{}
 const get=id=>state.packs.find(p=>p.id===id),catalog=()=>W.listComponents().filter(c=>c.id!=='card-pack'),name=id=>catalog().find(c=>c.id===id)?.label||'暂未安装的卡片';
 function dispose(handle){try{if(typeof handle==='function')handle();else handle?.destroy?.();}catch{console.warn('Pack child cleanup failed');}}
 function commit(id,op,data){const next=C.change(state,id,op,data);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw Error('未能保存卡片包，请检查本机存储');}state=next;for(const m of mounted)if(m.id===id)m.update();document.dispatchEvent(new CustomEvent('folio-card-packs-change'));}
 function safe(fn){try{return fn();}catch(e){announce(e.message||'未能更新卡片包');}}
 function register(p){W.register({id:p.id,label:'卡片包',description:'灰色托盘 · 横滑切换',hidden:true,isPack:true,manage:()=>manage(p.id),mount:root=>mount(root,p.id),preview});}
 function create(){const id='pack:'+crypto.randomUUID();commit(id,'create');register(get(id));return id;}
 function preview(root){const tray=el('div','card-pack card-pack-preview'),frame=el('div','card-pack-frame'),paper=el('div','card-pack-sample');frame.setAttribute('aria-hidden','true');paper.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="#7e9e9a"><rect x="18" y="25" width="14" height="14" rx="3"/><rect x="36" y="25" width="14" height="14" rx="3" opacity=".4"/><rect x="54" y="25" width="14" height="14" rx="3" opacity=".65"/><rect x="18" y="43" width="14" height="14" rx="3" opacity=".25"/><rect x="36" y="43" width="14" height="14" rx="3" opacity=".7"/><rect x="54" y="43" width="14" height="14" rx="3" opacity=".2"/></g><path d="M18 70h50" fill="none" stroke="#c9a26e" stroke-width="3" stroke-linecap="round"/></svg>';tray.append(frame,paper);root.append(tray);return()=>tray.remove();}
 function mount(root,id){
  const tray=el('div','card-pack'),frame=el('div','card-pack-frame'),viewport=el('div','card-pack-viewport'),track=el('div','card-pack-track'),handles=new Map(),pages=new Map();
  viewport.dataset.gestureLock='';viewport.tabIndex=0;viewport.setAttribute('role','group');viewport.setAttribute('aria-label','卡片包，左右滑动切换卡片，长按编辑整个包');viewport.append(track);frame.setAttribute('aria-hidden','true');tray.append(frame,viewport);root.append(tray);
  let disposed=false,signature='',active=0,blockedUntil=0,dragging=false,gesture;
  const position=(dx=0)=>{track.style.transform=`translate3d(calc(${-active*100}% + ${dx}px),0,0)`;};

  function neighbors(p,force=false){for(let i=0;i<p.cards.length;i++){
   const c=p.cards[i],page=pages.get(c.key),near=Math.abs(i-active)<=1;page.inert=i!==active;page.setAttribute('aria-hidden',i===active?'false':'true');
   if(handles.has(c.key)&&(!near||force)){dispose(handles.get(c.key));handles.delete(c.key);page.replaceChildren();}
   if(near&&!handles.has(c.key)){const content=el('div','card-pack-child');page.append(content);try{const h=W.mountComponent(c.widget,content);handles.set(c.key,h||(()=>{}));}catch{content.replaceChildren(el('span','card-pack-missing',name(c.widget)),button('管理包',()=>manage(id),'card-pack-empty-add'));handles.set(c.key,()=>{});}}
  }}
  function select(i){const p=get(id);if(!p||i<0||i>=p.cards.length)return;commit(id,'select',{key:p.cards[i].key});document.dispatchEvent(new CustomEvent('folio-pack-active'));}
  function update(force=false){if(disposed)return;const p=get(id);if(!p)return;const sig=JSON.stringify(p.cards),changed=sig!==signature;active=Math.max(0,p.cards.findIndex(c=>c.key===p.active));
   if(changed){gesture?.cancel();for(const h of handles.values())dispose(h);handles.clear();pages.clear();track.replaceChildren();for(const c of p.cards){const page=el('div','card-pack-page');page.dataset.packPage=c.key;track.append(page);pages.set(c.key,page);}signature=sig;
    if(!p.cards.length){const empty=el('div','card-pack-empty');const add=button('',()=>choose(id),'card-pack-empty-add');add.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';add.setAttribute('aria-label','往卡片包添加卡片');empty.append(add);track.append(empty);}}
   tray.classList.toggle('is-empty',!p.cards.length);viewport.setAttribute('aria-label',p.cards.length?`卡片包，第${active+1}张，共${p.cards.length}张：${name(p.cards[active].widget)}，左右滑动切换，长按编辑整个包`:'空卡片包，添加卡片');neighbors(p,force&&!changed);position();
  }
  gesture=FolioGesture.bind(viewport,{axis:'x',enabled:()=>!W.isEditing()&&get(id)?.cards.length>1,
   ignore:target=>!!target.closest('input,textarea,select,[contenteditable=true]')||target.closest('[data-gesture-lock]')!==viewport,start:()=>({width:viewport.clientWidth}),
   move(s){if(disposed)return;dragging=true;tray.classList.add('is-swiping');let dx=s.dx;const n=get(id).cards.length;if(active===0&&dx>0||active===n-1&&dx<0)dx=Math.sign(dx)*Math.min(18,Math.abs(dx)*.16);position(dx);},
   end(s,e,cancelled){if(disposed)return;dragging=false;tray.classList.remove('is-swiping');blockedUntil=performance.now()+350;const p=get(id),to=C.destination(active,p.cards.length,s.dx,s.velocityX,s.extra.width,cancelled);if(to!==active)safe(()=>select(to));position();}
  });
  const click=e=>{if(performance.now()<blockedUntil){e.preventDefault();e.stopImmediatePropagation();}};viewport.addEventListener('click',click,true);
  const key=e=>{if(e.target!==viewport||!['ArrowLeft','ArrowRight'].includes(e.key)||W.isEditing())return;e.preventDefault();safe(()=>select(active+(e.key==='ArrowRight'?1:-1)));};viewport.addEventListener('keydown',key);
  const cancel=()=>{gesture.cancel();dragging=false;tray.classList.remove('is-swiping');position();};document.addEventListener('folio-widget-drag-start',cancel);document.addEventListener('preview-screen-change',cancel);
  const view={id,update};mounted.add(view);update();
  return()=>{disposed=true;mounted.delete(view);gesture.destroy();document.removeEventListener('folio-widget-drag-start',cancel);document.removeEventListener('preview-screen-change',cancel);viewport.removeEventListener('click',click,true);viewport.removeEventListener('keydown',key);for(const h of handles.values())dispose(h);handles.clear();pages.clear();tray.remove();};
 }
 let panelDisposers=[];
 function clearPanelPreviews(){for(const h of panelDisposers)dispose(h);panelDisposers=[];}
 function thumb(id){const n=el('div','card-pack-manager-thumb');n.inert=true;n.setAttribute('aria-hidden','true');try{panelDisposers.push(W.mountComponent(id,n,{preview:true}));}catch{n.append(el('span','card-pack-missing','—'));}return n;}
 function panel(title){clearPanelPreviews();const p=FolioChatUI.openPanel(title);p.classList.add('study-menu','card-pack-manager');return p;}
 function manage(id){const data=get(id);if(!data)return;const p=panel('卡片包'),top=el('div','sm-context');top.append(el('span','',`${data.cards.length} 张卡片`),el('span','','外层长按可整包移除'));p.append(top,button('添加卡片',()=>choose(id),'sm-primary'));
  if(!data.cards.length)p.append(el('p','sm-empty','托盘还是空的，先放一张卡片。'));
  data.cards.forEach((c,i)=>{const row=el('div','card-pack-manager-row'),copy=el('div','card-pack-manager-copy'),actions=el('div','card-pack-manager-actions');copy.append(el('strong','',name(c.widget)),el('small','',`${i+1} / ${data.cards.length}${c.key===data.active?' · 正在显示':''}`));
   const action=(text,label,fn)=>{const b=button(text,()=>safe(fn),'card-pack-small-action');b.setAttribute('aria-label',label);actions.append(b);return b;};
   action('↑','前移'+name(c.widget),()=>{commit(id,'move',{key:c.key,to:i-1});manage(id);}).disabled=i===0;
   action('↓','后移'+name(c.widget),()=>{commit(id,'move',{key:c.key,to:i+1});manage(id);}).disabled=i===data.cards.length-1;
   action('移除','从包中移除'+name(c.widget),()=>{commit(id,'remove',{key:c.key});manage(id);});row.append(thumb(c.widget),copy,actions);p.append(row);
  });
 }
 function choose(id){const p=panel('放入卡片包');p.append(button('‹ 返回卡片包',()=>manage(id),'sm-back'));const list=el('div','card-pack-choices');p.append(list);
  for(const c of catalog()){const choice=el('article','card-pack-choice'),preview=thumb(c.id);preview.classList.add('card-pack-choice-preview');choice.append(preview,el('h3','',c.label),button('放入',()=>safe(()=>{commit(id,'add',{key:crypto.randomUUID(),widget:c.id});manage(id);announce('已放入卡片包');}),'card-pack-add-choice'));list.append(choice);}
 }
 // Preview DOM is disposable even when another host modal replaces this one.
 const observer=new MutationObserver(()=>{const p=document.querySelector('.card-pack-manager');if(!p||p.closest('[hidden]'))clearPanelPreviews();});observer.observe(document.querySelector('.phone'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
 document.addEventListener('folio-widget-registry-change',event=>{if(event.detail?.ids?.every(id=>id==='card-pack'||id.startsWith('pack:')))return;for(const view of mounted)view.update(true);});
 W.register({id:'card-pack',label:'卡片包',description:'灰色托盘装多张卡片，横滑切换，长按整包管理或移除。',isPack:true,create,mount:root=>{const id=create();return mount(root,id);},preview});
 for(const p of state.packs)register(p);
 window.FolioCardPacks=Object.freeze({read:()=>C.restore(state),manage});
})();
