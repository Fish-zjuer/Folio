/* 保留 select 的数据接口与 change 事件，仅替换系统弹出的选择界面。 */
(function(){
  "use strict";
  const phone=document.querySelector(".phone"),entries=new Map();
  if(!phone)return;
  let active=null,origin=null,blocked=[],timer=null,frame=null,layerWasInert=false;
  const layer=document.createElement("div");layer.className="folio-choice-layer";layer.hidden=true;
  const shade=document.createElement("button");shade.type="button";shade.className="folio-choice-shade";shade.tabIndex=-1;shade.setAttribute("aria-label","关闭选择");
  const card=document.createElement("section");card.className="folio-choice-card";card.setAttribute("role","dialog");card.setAttribute("aria-modal","true");card.tabIndex=-1;
  layer.append(shade,card);phone.append(layer);
  function title(select){return select.getAttribute("aria-label")||select.labels?.[0]?.childNodes&&[...select.labels[0].childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join("")||"选择选项";}
  function update(select){const entry=entries.get(select);if(!entry)return;const text=select.selectedOptions[0]?.textContent||"请选择";if(entry.caption.textContent!==text)entry.caption.textContent=text;if(entry.trigger.disabled!==select.disabled)entry.trigger.disabled=select.disabled;const label=`${title(select)}：${text}`;if(entry.trigger.getAttribute("aria-label")!==label)entry.trigger.setAttribute("aria-label",label);}
  function enhance(select){
    if(entries.has(select)||select.multiple)return;
    const wrap=document.createElement("span");wrap.className="folio-select-wrap";
    const trigger=document.createElement("button");trigger.type="button";trigger.className="folio-choice-trigger";trigger.setAttribute("aria-haspopup","listbox");trigger.setAttribute("aria-expanded","false");
    const caption=document.createElement("span");caption.className="folio-choice-caption";
    const arrow=document.createElementNS("http://www.w3.org/2000/svg","svg");arrow.setAttribute("viewBox","0 0 20 20");arrow.setAttribute("aria-hidden","true");arrow.innerHTML='<path d="m5 8 5 5 5-5"/>';
    select.before(wrap);wrap.append(select,trigger);trigger.append(caption,arrow);select.classList.add("folio-native-select");select.tabIndex=-1;select.setAttribute("aria-hidden","true");
    entries.set(select,{trigger,caption,wrap});trigger.addEventListener("click",event=>{event.preventDefault();open(select);});select.addEventListener("change",()=>update(select));select.addEventListener("invalid",event=>{event.preventDefault();open(select);});update(select);
  }
  function scan(){frame=null;phone.querySelectorAll("select").forEach(enhance);for(const [select,entry] of entries){if(!select.isConnected){entries.delete(select);if(active===select)close(true,false);}else if(!entry.wrap.contains(select)){entries.delete(select);}else update(select);}}
  function schedule(){if(!frame)frame=requestAnimationFrame(scan);}
  new MutationObserver(schedule).observe(phone,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","selected","aria-label"]});
  function close(immediate=false,restore=true){
    clearTimeout(timer);if(layer.hidden)return;const finish=()=>{layer.hidden=true;layer.inert=layerWasInert;layer.classList.remove("is-closing");blocked.forEach(([node,value])=>node.inert=value);blocked=[];if(active)entries.get(active)?.trigger.setAttribute("aria-expanded","false");active=null;if(restore&&origin?.isConnected&&!origin.closest("[hidden]"))origin.focus({preventScroll:true});};
    if(immediate===true||matchMedia("(prefers-reduced-motion: reduce)").matches)finish();else{layer.classList.add("is-closing");timer=setTimeout(finish,180);}
  }
  function open(select){
    if(select.disabled||!select.options.length)return;close(true,false);active=select;origin=entries.get(select).trigger;update(select);card.replaceChildren();
    const header=document.createElement("header");header.className="folio-choice-header";const heading=document.createElement("h2");heading.textContent=title(select);card.setAttribute("aria-label",heading.textContent);
    const dismiss=document.createElement("button");dismiss.type="button";dismiss.textContent="完成";dismiss.addEventListener("click",()=>close());header.append(heading,dismiss);card.append(header);
    const list=document.createElement("div");list.className="folio-choice-list";list.setAttribute("role","listbox");list.setAttribute("aria-label",heading.textContent);
    const buttons=[];
    [...select.options].forEach((option,index)=>{
      if(option.hidden)return;const button=document.createElement("button");button.type="button";button.className="folio-choice-option";button.setAttribute("role","option");button.setAttribute("aria-selected",String(index===select.selectedIndex));button.disabled=option.disabled||option.parentElement?.disabled;
      const label=document.createElement("span");label.textContent=option.textContent;const check=document.createElement("span");check.className="folio-choice-check";check.setAttribute("aria-hidden","true");check.textContent="✓";button.append(label,check);list.append(button);buttons.push(button);
      button.addEventListener("click",()=>{const changed=select.selectedIndex!==index;select.selectedIndex=index;update(select);close();if(changed){select.dispatchEvent(new Event("input",{bubbles:true}));select.dispatchEvent(new Event("change",{bubbles:true}));}});
    });
    if(buttons.length>9){const search=document.createElement("input");search.type="search";search.placeholder="筛选选项";search.className="folio-choice-search";search.setAttribute("aria-label","筛选选项");search.addEventListener("input",()=>buttons.forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(search.value.trim().toLowerCase())));card.append(search);}
    card.append(list);layer.classList.remove("is-closing");layerWasInert=layer.inert;layer.inert=false;layer.hidden=false;origin.setAttribute("aria-expanded","true");blocked=[...phone.children].filter(n=>n!==layer).map(n=>[n,n.inert]);blocked.forEach(([n])=>n.inert=true);card.focus({preventScroll:true});
    requestAnimationFrame(()=>{const selected=list.querySelector('[aria-selected="true"]');if(selected)list.scrollTop=selected.offsetTop-list.offsetTop-list.clientHeight/2+selected.clientHeight/2;});
  }
  shade.addEventListener("click",()=>close());
  window.addEventListener("keydown",event=>{
    if(layer.hidden)return;
    if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();close();return;}
    const options=[...card.querySelectorAll('.folio-choice-option:not(:disabled)')].filter(n=>!n.hidden);
    if(["ArrowDown","ArrowUp","Home","End"].includes(event.key)&&event.target.tagName!=="INPUT"){
      event.preventDefault();event.stopImmediatePropagation();const index=options.indexOf(document.activeElement),next=event.key==="Home"?0:event.key==="End"?options.length-1:Math.max(0,Math.min(options.length-1,index+(event.key==="ArrowDown"?1:-1)));options[next]?.focus();
    }
    if(event.key==="Tab"){const all=[...card.querySelectorAll("button:not(:disabled),input")].filter(n=>!n.hidden),first=all[0],last=all.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===card)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===card)){event.preventDefault();first?.focus();}event.stopImmediatePropagation();}
  },true);
  document.addEventListener("preview-screen-change",()=>close(true,false));
  window.FolioSelect={close,isOpen:()=>!layer.hidden};scan();
})();
