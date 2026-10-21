/* 四个独立插槽。后续组件通过 register 注册；本轮不预填任何组件。 */
(() => {
  "use strict";
  const KEY = location.pathname.endsWith("/qa/stats-overviews.html") ? "folio-qa-stats-overviews-v1" : location.pathname.endsWith("/qa/dense-overviews.html") ? "folio-qa-dense-overviews-v1" : location.pathname.endsWith("/qa/workbench-components.html") ? "folio-qa-workbench-components-v1" : "folio-workbench-v1", positions = ["左上", "右上", "左下", "右下"];
  const registry = new Map(), phone = document.querySelector(".phone");
  const paperPalette = [
    ["#F4C3AC","#E19A7B","#F8D5C5"], ["#BDD3EA","#8DB1D8","#D3E3F3"],
    ["#D2DEBF","#A9BE8E","#E1EAD2"], ["#F3DDA0","#DDB85E","#F8EBC4"], ["#EBC0CF","#D494AB","#F3D6DF"],
  ];
  const notePalette = paperPalette.map(colors => colors[0]);
  const legacyColors = ["#E4C5AD", "#DDC98E", "#C3CFAE", "#B8CBCD", "#C5BED4", "#DDBEBD", "#D4C9B6", "#B9CBBE"];
  const noteColors = new Map();
  const noteShapes = new Map();
  let slots = [null, null, null, null], selected = 0, returnFocus = null;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.version === 1 && Array.isArray(saved.slots) && saved.slots.length === 4)
      slots = saved.slots.map(id => typeof id === "string" ? id : null);
    if (saved?.version === 1 && saved.noteColors && typeof saved.noteColors === "object")
      Object.entries(saved.noteColors).forEach(([id, color]) => {
        if (notePalette.includes(color)) noteColors.set(id, color);
        else if (legacyColors.includes(color)) noteColors.set(id, paperPalette[[0,3,2,1,4,4,3,2][legacyColors.indexOf(color)]][0]);
      });
    if (saved?.version === 1 && saved.noteShapes && typeof saved.noteShapes === "object")
      Object.entries(saved.noteShapes).forEach(([id, shape]) => {
        if (shape && [shape.x, shape.y, shape.angle, shape.scale, shape.variant].every(Number.isFinite) && shape.x >= 0 && shape.x <= 1 && shape.y >= 0 && shape.y <= 1 && Math.abs(shape.angle) <= 12 && shape.scale >= .85 && shape.scale <= 1.12 && Number.isInteger(shape.variant) && shape.variant >= 0 && shape.variant < 3) noteShapes.set(id, shape);
      });
  } catch {}
  function el(tag, className, text) {
    const node = document.createElement(tag); node.className = className;
    if (text != null) node.textContent = text; return node;
  }
  function button(className, label, action, path) {
    const node = el("button", className); node.type = "button";
    node.setAttribute("aria-label", label); node.addEventListener("click", action);
    if (path) node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
    return node;
  }
  const page = el("section", "workbench-screen"); page.id = "workbench-screen";
  page.hidden = true; page.setAttribute("aria-label", "自定义工作台");
  const header = el("header", "workbench-header");
  let menu = button("menu-button", "打开工作台功能菜单", () => showPreviewScreen("menu"), '<path d="M3 5.5h18M3 12h18M3 18.5h9"/>');
  const back = button("workbench-home", "返回对话首页", () => showPreviewScreen("home"), '<path d="m14 5-7 7 7 7"/>');
  header.append(menu, el("h1", "workbench-title", "工作台"), back);
  const grid = el("div", "workbench-grid"); grid.setAttribute("aria-label", "四格组件区域");
  const overview = el("section", "workbench-overview"); overview.setAttribute("aria-label", "时间与天气");
  const clockBlock = el("div", "workbench-clock-block"), clock = el("time", "workbench-clock"), dateLabel = el("p", "workbench-date");
  clockBlock.append(clock, dateLabel);
  const weather = el("section", "workbench-weather"); weather.setAttribute("aria-label", "天气");
  weather.innerHTML = '<div class="workbench-weather-main"><span>—</span></div><p>天气未更新</p>';
  overview.append(clockBlock, weather);
  const main = el("div", "workbench-main");
  const board = el("section", "workbench-board"); board.setAttribute("aria-label", "便签板");
  const desk = document.createElementNS("http://www.w3.org/2000/svg", "svg"); desk.classList.add("workbench-desk"); desk.setAttribute("aria-hidden", "true");
  // 只复用用户参考的图形，不带入原文件的“点击即完成”行为或演示作业。
  desk.innerHTML = '<rect class="desk-mat" x="0" y="0" width="380" height="260" rx="18" fill="#F4EEDF"/><g class="desk-coffee" transform="translate(324 45)"><circle r="24" fill="#D97757"/><circle r="17" fill="#F3E9D6"/><circle r="13" fill="#6B4A3A"/><path d="M23 -8h8a8 8 0 0 1 0 16h-8" fill="none" stroke="#D97757" stroke-width="5" stroke-linecap="round"/></g><g class="desk-pencil"><rect x="-38" y="-6" width="64" height="12" rx="2" fill="#E5B567"/><rect x="-48" y="-6" width="12" height="12" rx="3" fill="#D97757"/><rect x="-36" y="-6" width="4" height="12" fill="#B9AE95"/><path d="M26 -6 44 0 26 6Z" fill="#F3DFB8"/><path d="m38 -2 6 2-6 2Z" fill="#141413"/></g><g class="desk-plant"><ellipse cy="-13" rx="6" ry="13" fill="#788C5D"/><ellipse cy="-13" rx="6" ry="13" fill="#8DA06F" transform="rotate(72)"/><ellipse cy="-13" rx="6" ry="13" fill="#788C5D" transform="rotate(144)"/><ellipse cy="-13" rx="6" ry="13" fill="#8DA06F" transform="rotate(216)"/><ellipse cy="-13" rx="6" ry="13" fill="#788C5D" transform="rotate(288)"/><circle r="14" fill="#C4694A"/><circle r="9" fill="#7A4A36"/></g><g class="desk-inbox"><rect width="92" height="66" rx="10" fill="#DCCDAF"/><rect x="6" y="6" width="80" height="54" rx="6" fill="#CDBC9A"/><path d="M0 35H92V56a10 10 0 0 1-10 10H10A10 10 0 0 1 0 56Z" fill="#E7DABF"/><path d="M0 35H92" stroke="#F1E7CF" stroke-width="4"/></g>';
  const notes = el("div", "workbench-notes"); notes.setAttribute("aria-label", "已挂上的便签"); notes.tabIndex = 0;
  const inboxButton = button("workbench-inbox-hit", "展开待贴便签袋", () => incomingPanel.hidden || incomingPanel.classList.contains("is-closing") ? openIncoming() : closeIncoming());
  inboxButton.setAttribute("aria-expanded","false");
  const incomingPanel = el("div","workbench-incoming"); incomingPanel.hidden=true; incomingPanel.setAttribute("role","group"); incomingPanel.setAttribute("aria-label","待贴便签");
  const interactionStatus = el("p","workbench-sr-only"); interactionStatus.setAttribute("role","status");
  const inboxStack = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const inboxGroup = desk.querySelector(".desk-inbox"); inboxGroup.insertBefore(inboxStack, inboxGroup.querySelector("path"));
  const pencilHit = button("workbench-pencil-hit", "更新学在浙大作业", () => {});
  let pencilBusy=false;
  pencilHit.addEventListener("click", async()=>{if(pencilBusy)return;pencilBusy=true;pencilHit.disabled=true;try{await refreshHomeworkFromDesk();}finally{pencilBusy=false;pencilHit.disabled=false;}});
  async function refreshHomeworkFromDesk() {
    if (!window.FolioSchool?.refresh) { announce("当前没有可刷新的学校连接"); return; }
    announce("正在刷新学在浙大作业…");
    try { await window.FolioSchool.refresh("homework"); announce("学在浙大作业已刷新"); }
    catch (error) { announce(error?.message || "刷新学在浙大作业失败"); }
  }
  board.append(desk, notes, inboxButton, incomingPanel, pencilHit, interactionStatus);window.FolioWidgetPalette?.bind(board); const lessonQueue=el("section","workbench-lesson-queue");lessonQueue.setAttribute("aria-label","课程安排队列");lessonQueue.hidden=true;main.append(grid,lessonQueue,board);
  page.append(header, overview, main); phone.insertBefore(page, homeworkLayer);
  const home = previewScreens.home, homeHeader = home.querySelector(".topbar");
  const sharedHeader = homeHeader || header;
  const headerSpace = () => { const space = el("div","app-topbar-space"); space.setAttribute("aria-hidden","true"); return space; };
  if (homeHeader) homeHeader.replaceWith(headerSpace());
  header.replaceWith(headerSpace());
  sharedHeader.classList.add("app-topbar"); sharedHeader.setAttribute("aria-label","应用导航");
  phone.prepend(sharedHeader);
  menu = sharedHeader.querySelector(".menu-button");
  function syncHeader() {
    sharedHeader.hidden = !["home","workbench"].includes(currentScreen);
    sharedHeader.classList.toggle("has-conversation",home.classList.contains("has-conversation"));
  }
  new MutationObserver(syncHeader).observe(home,{attributes:true,attributeFilter:["class"]});
  syncHeader();
  function setWorkbenchInert(value) { page.inert=value; sharedHeader.inert=value && currentScreen === "workbench"; }
  previewScreens.workbench = page; screenNames.workbench = "工作台"; screenFocusTargets.workbench = menu;

  const reader = el("section", "workbench-reading"); reader.hidden = true;
  reader.setAttribute("role", "dialog"); reader.setAttribute("aria-modal", "true"); reader.setAttribute("aria-labelledby", "workbench-reading-title");
  const readerShade = button("workbench-reading-shade", "关闭便签阅读", closeReader); readerShade.tabIndex = -1;
  const readerCard = el("article", "workbench-reading-card"), readerSubject = el("p", "workbench-reading-subject"), readerTitle = el("h2", "", ""); readerTitle.id = "workbench-reading-title";
  const readerClose = button("workbench-reading-close", "关闭便签阅读", closeReader, '<path d="m6 6 12 12M18 6 6 18"/>');
  const readerGrip = button("workbench-reading-grip","拖动便签贴到书桌，或按回车提前贴出", () => {
    if (performance.now() >= ignoreIncomingClick && currentReaderItem && returnToInbox) pinIncoming(currentReaderItem,null);
  }); readerGrip.hidden=true;
  const readerBody = el("div", "workbench-reading-body"), readerLinks = el("div", "workbench-reading-links");
  readerCard.append(readerGrip, readerClose, readerSubject, readerTitle, readerBody, readerLinks); reader.append(readerShade, readerCard); phone.append(reader);
  let readerOrigin = null, returnToInbox = false, currentReaderItem = null, ignoreIncomingClick = 0;
  function webUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
  function openReader(item, origin, fromInbox = false) {
    reader.classList.remove("is-closing");
    returnToInbox = fromInbox; currentReaderItem=item; readerGrip.hidden=!fromInbox;
    readerOrigin = origin; readerSubject.textContent = item.course || (item.source === "school" ? "作业" : item.kind === "homework" ? "自定义作业" : "待办");
    readerTitle.textContent = item.title; readerBody.replaceChildren(); readerLinks.replaceChildren();
    // 描述与文件只显示已有真实字段；不伪造抓取结果，不注入远端 HTML。
    const description = typeof item.description === "string" ? item.description : typeof item.body === "string" ? item.body : "";
    if (description) readerBody.append(el("p", "workbench-reading-description", description));
    const attachments = Array.isArray(item.attachments) ? item.attachments : [];
    attachments.forEach(file => {
      const url = webUrl(file?.url); if (!url) return;
      const link = el("a", "workbench-reading-file", typeof file.name === "string" ? file.name : "附件"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; readerBody.append(link);
    });
    const direct = webUrl(item.url) || webUrl(item.homeworkUrl) || webUrl(item.sourceUrl);
    const url = direct || (item.source === "school" ? "https://courses.zju.edu.cn/" : null);
    if (url) { const link = el("a", "workbench-reading-link", direct ? "打开作业 ↗" : "打开学在浙大 ↗"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; readerLinks.append(link); }
    reader.style.setProperty("--reading-paper", origin.style.getPropertyValue("--note-color") || "#F4EEDF");
    reader.hidden = false; setWorkbenchInert(true); readerClose.focus({preventScroll:true});
    readerClose.setAttribute("aria-label", fromInbox ? "返回待贴便签袋" : "关闭便签阅读");
    readerClose.innerHTML = fromInbox ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  }
  function closeReader(immediate = false) {
    if (reader.hidden) return;
    if (immediate !== true && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reader.classList.add("is-closing");
      return;
    }
    reader.hidden = true; reader.classList.remove("is-closing"); setWorkbenchInert(false);
    if (returnToInbox) {
      returnToInbox = false;
      const origin = readerOrigin?.isConnected && !incomingPanel.hidden ? readerOrigin : inboxButton;
      origin.focus({preventScroll:true});
      return;
    }
    if (readerOrigin?.isConnected) readerOrigin.focus({preventScroll:true}); else menu.focus({preventScroll:true});
  }
  reader.addEventListener("animationend", event => {
    if (event.target === reader && event.animationName === "workbench-reading-close" && reader.classList.contains("is-closing")) closeReader(true);
  });
  function incomingItems() { return homeworkState.items.filter(item => !item.repeatTemplate && !item.completed && item.schoolCompleted !== true && item.remoteMissing !== true && item.kind!=="lesson" && item.queued && !item.mountedOn).sort((a,b)=>(a.mountDate||"9999").localeCompare(b.mountDate||"9999") || a.id.localeCompare(b.id)); }
  function preparePaper(node,item,index) {
    if(!noteColors.has(item.id))noteColors.set(item.id,notePalette[Math.floor(Math.random()*notePalette.length)]);
    const color=noteColors.get(item.id), colors=paperPalette.find(p=>p[0]===color)||paperPalette[0];
    node.style.setProperty("--note-color",color);node.style.setProperty("--paper-top",colors[2]);node.style.setProperty("--paper-fold",colors[1]);
    node.innerHTML=paperGraphic(index,index%3);
  }
  function renderInbox() {
    inboxStack.replaceChildren();let added=false;const upcoming=incomingItems();
    upcoming.forEach(item=>{if(!noteColors.has(item.id)){noteColors.set(item.id,notePalette[Math.floor(Math.random()*notePalette.length)]);added=true;}});
    upcoming.slice(0,3).forEach((item,index) => {
      const paper = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      paper.setAttribute("x", String(12 + index * 18)); paper.setAttribute("y", String(15 - index * 3));
      paper.setAttribute("width", "30"); paper.setAttribute("height", "36"); paper.setAttribute("rx", "1");
      paper.setAttribute("fill",noteColors.get(item.id) || paperPalette[index][0]);
      paper.setAttribute("transform",`rotate(${[-8,3,8][index]} ${27+index*18} 33)`); inboxStack.append(paper);
    });
    return added;
  }
  function closeIncoming(immediate = false) {
    inboxButton.setAttribute("aria-expanded","false");
    if (incomingPanel.hidden) return;
    if (immediate !== true && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      incomingPanel.classList.add("is-closing");
      return;
    }
    incomingPanel.hidden=true; incomingPanel.classList.remove("is-closing");
  }
  incomingPanel.addEventListener("animationend", event => {
    if (event.target === incomingPanel && event.animationName === "workbench-incoming-close" && incomingPanel.classList.contains("is-closing")) closeIncoming(true);
  });
  function openIncoming() {
    if (incomingPanel.classList.contains("is-closing")) {
      incomingPanel.classList.remove("is-closing"); inboxButton.setAttribute("aria-expanded","true");
      incomingPanel.querySelector("button")?.focus({preventScroll:true});
      return;
    }
    incomingPanel.replaceChildren(); const items=incomingItems();
    if(!items.length){interactionStatus.textContent="袋子里没有待贴便签";inboxGroup.animate([{opacity:1},{opacity:.4},{opacity:1}],{duration:300});closeIncoming();return;}
    items.forEach((item,index)=>{
      const paper=button("workbench-incoming-note",`查看待贴便签 ${index+1}`,()=>{
        if(performance.now()>=ignoreIncomingClick)openReader(item,paper,true);
      });paper.dataset.itemId=item.id;preparePaper(paper,item,index);
      paper.style.setProperty("--incoming-angle",`${(index%3-1)*4}deg`);
      bindIncomingDrag(paper,()=>item,false);incomingPanel.append(paper);
    });
    persist();incomingPanel.hidden=false;inboxButton.setAttribute("aria-expanded","true");
    incomingPanel.querySelector("button")?.focus({preventScroll:true});
  }
  function pinIncoming(item, point) {
    if(!incomingItems().includes(item))return {ok:false,message:"这张便签已经不在袋子里"};
    const options=typeof queueManualOptions==="function"?queueManualOptions():{weekdayLimit:1,weekendLimit:homeworkState.weekendLimit||3};
    const result=FolioQueue.manualMove(homeworkState.items,item,homeworkState.today,homeworkState.today,options);
    if(!result.ok){interactionStatus.textContent=result.message;inboxGroup.animate([{opacity:1},{opacity:.45},{opacity:1}],{duration:350});return result;}
    if(point){
      const r=notes.getBoundingClientRect(),h=Math.max(notes.clientHeight,parseFloat(notes.style.getPropertyValue("--note-field-height"))||0);
      const old=noteShapes.get(item.id)||randomShape([]),clamp=n=>Math.max(0,Math.min(1,n));
      noteShapes.set(item.id,{...old,manual:true,x:clamp((point.x-r.left-42)/Math.max(1,r.width-88)),y:clamp((point.y-r.top+notes.scrollTop-40)/Math.max(1,h-86))});
    }
    returnToInbox=false;reader.hidden=true;reader.classList.remove("is-closing");setWorkbenchInert(false);closeIncoming(true);persist();
    if(typeof commit==="function")commit();else renderNotes();
    interactionStatus.textContent="便签已提前贴到书桌";
    requestAnimationFrame(()=>[...notes.querySelectorAll("button")].find(n=>n.dataset.itemId===item.id)?.focus({preventScroll:true}));
    return {ok:true};
  }
  function bindIncomingDrag(source,getItem,fromReader) {
    let drag=null;
    function finish(event,cancel=false){
      if(!drag||event.pointerId!==drag.id)return;
      const active=drag;drag=null;
      if(!active.moved)return;
      ignoreIncomingClick=performance.now()+500;
      const r=board.getBoundingClientRect(),bag=inboxButton.getBoundingClientRect();
      const point={x:event.clientX,y:event.clientY};
      const onDesk=!cancel&&point.x>r.left+12&&point.x<r.right-12&&point.y>r.top+12&&point.y<r.bottom-64&&!(point.x>bag.left-6&&point.y>bag.top-6);
      const result=onDesk?pinIncoming(active.item,point):{ok:false};
      reader.classList.remove("is-dragging-note");incomingPanel.classList.remove("is-dragging-note");
      board.classList.remove("is-drop-target");
      const ghost=active.ghost;if(!ghost)return;
      if(matchMedia("(prefers-reduced-motion: reduce)").matches){ghost.remove();return;}
      const end=result.ok?{transform:"scale(.85)",opacity:0}:{transform:`translate(${active.x-event.clientX}px,${active.y-event.clientY}px) scale(.75)`,opacity:0};
      ghost.animate([{transform:"none",opacity:1},end],{duration:result.ok?180:300,easing:"cubic-bezier(.22,1,.36,1)"}).finished.finally(()=>ghost.remove()).catch(()=>{});
    }
    source.addEventListener("pointerdown",event=>{
      const item=getItem();if(!item||!event.isPrimary||event.button!==0)return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,item,moved:false,ghost:null};
      source.setPointerCapture(event.pointerId);
    });
    source.addEventListener("pointermove",event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
      event.preventDefault();
      if(!drag.moved){
        drag.moved=true;const ghost=el("div","workbench-drag-note");preparePaper(ghost,drag.item,0);ghost.setAttribute("aria-hidden","true");phone.append(ghost);drag.ghost=ghost;
        incomingPanel.classList.add("is-dragging-note");
        if(fromReader)reader.classList.add("is-dragging-note");
        board.classList.add("is-drop-target");
      }
      const p=phone.getBoundingClientRect();drag.ghost.style.left=`${event.clientX-p.left-30}px`;drag.ghost.style.top=`${event.clientY-p.top-26}px`;
    });
    source.addEventListener("pointerup",event=>finish(event));source.addEventListener("pointercancel",event=>finish(event,true));
    source.addEventListener("lostpointercapture",event=>finish(event,true));
  }
  bindIncomingDrag(readerGrip,()=>returnToInbox?currentReaderItem:null,true);
  document.addEventListener("keydown",event=>{if(!incomingPanel.hidden&&event.key==="Escape"&&reader.hidden){event.preventDefault();event.stopImmediatePropagation();closeIncoming();inboxButton.focus({preventScroll:true});}},true);
  board.addEventListener("click",event=>{if(!incomingPanel.hidden&&event.target===notes)closeIncoming();});
  document.addEventListener("keydown", event => {
    if (reader.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closeReader(); }
    if (event.key === "Tab") {
      const targets = [...readerCard.querySelectorAll("button,a[href]")], first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);

  const picker = el("section", "workbench-picker"); picker.hidden = true;
  picker.setAttribute("role", "dialog"); picker.setAttribute("aria-modal", "true"); picker.setAttribute("aria-labelledby", "workbench-picker-title");
  const shade = button("workbench-shade", "关闭组件选择", closePicker);
  shade.tabIndex = -1;
  const card = el("div", "workbench-picker-card"), heading = el("div", "workbench-picker-heading");
  const title = el("h2", "", "添加组件"); title.id = "workbench-picker-title";
  const close = button("workbench-picker-close", "关闭组件选择", closePicker, '<path d="m6 6 12 12M18 6 6 18"/>');
  heading.append(title, close);
  const choices = el("div", "workbench-choices");
  const leave = button("workbench-leave-empty", "保持空白", () => { slots[selected] = null; persist(); render(); closePicker(); });
  const pickerNote = el("p", "workbench-picker-note", window.FolioApp?.native?"读取本机已保存记录，未同步的数据保留空值。":"已接入组件读取本地记录；标注“样稿”的仍为设计预览。网页示例不代表学校连接。");
  leave.textContent = "保持空白"; card.append(heading, pickerNote, choices, leave); picker.append(shade, card); phone.append(picker);
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, slots, noteColors: Object.fromEntries(noteColors), noteShapes: Object.fromEntries(noteShapes) })); }
    catch { choices.prepend(el("p", "workbench-picker-empty", "未能保存，离开后可能无法保留。")); }
  }
  let editIndex = -1;
  const trash=button("workbench-trash","移除选中的组件",()=>removeWidget(editIndex));trash.hidden=true;
  trash.innerHTML='<svg viewBox="0 0 76 78" aria-hidden="true"><path d="M20 64H58V69H20Z" fill="#C7BA9E"/><path class="basket-body" d="M20 27H56L52 63H24Z"/><path class="basket-weave" d="m29 36 2 17m7-17v17m9-17-2 17"/><path class="basket-rim" d="M18 25H58V30H18Z"/><g class="basket-lid"><path d="M17 20H59V25H17Z"/><path d="M31 20v-6h14v6" fill="none"/></g></svg>';
  page.append(trash);
  function removeWidget(index){
    const id=slots[index];if(!id||!registry.has(id))return;
    slots[index]=null;persist();render();exitEdit();
    const toast=announce("组件已收起"),undo=button("workbench-undo","撤销移除组件",()=>{
      const target=slots[index]===null?index:slots.indexOf(null);
      if(target<0){announce("先留一个空位，再恢复组件");return;}
      slots[target]=id;persist();render();undo.disabled=true;announce("组件已恢复");
      document.dispatchEvent(new CustomEvent("folio-workbench-change",{detail:{slots:slots.slice()}}));
    });undo.textContent="撤销";toast.append(undo);
    document.dispatchEvent(new CustomEvent("folio-workbench-change",{detail:{slots:slots.slice()}}));
  }
  const editTools=el("div","workbench-edit-tools");editTools.hidden=true;editTools.setAttribute("role","toolbar");editTools.setAttribute("aria-label","组件编辑");
  const editLabel=el("span","workbench-edit-label"),editChange=button("workbench-edit-change","更换组件",()=>openPicker(editIndex)),editRemove=button("workbench-edit-remove","移除组件",()=>removeWidget(editIndex)),editDone=button("workbench-edit-done","完成编辑",()=>exitEdit());
  editChange.textContent="更换";editRemove.textContent="移除";editDone.textContent="完成";const editManage=button("workbench-edit-manage","管理卡片包",()=>registry.get(slots[editIndex])?.manage?.());editManage.textContent="管理包";editManage.hidden=true;editTools.append(editLabel,editManage,editChange,editRemove,editDone);page.append(editTools);
  function positionEditTools(){if(editTools.hidden)return;editTools.style.top=`${Math.max(0,grid.getBoundingClientRect().top-page.getBoundingClientRect().top-46)}px`;}
  function editSlot(index){if(!Number.isInteger(index)||index<0||index>3||!registry.has(slots[index]))return;editIndex=index;editTools.hidden=false;trash.hidden=false;page.classList.add("is-widget-editing");for(const slot of slotNodes)slot.classList.toggle("is-widget-selected",Number(slot.dataset.index)===index);editLabel.textContent=`${positions[index]} · ${registry.get(slots[index]).label}`;editManage.hidden=typeof registry.get(slots[index]).manage!=="function";editRemove.textContent=registry.get(slots[index]).isPack?"整包移除":"移除";positionEditTools();}
  function exitEdit(){editIndex=-1;editTools.hidden=true;trash.hidden=true;trash.classList.remove("is-target");page.classList.remove("is-widget-editing");for(const slot of slotNodes)slot.classList.remove("is-widget-selected");}
  grid.addEventListener("click",event=>{if(editIndex<0)return;const slot=event.target.closest(".workbench-slot.has-widget");if(slot){event.preventDefault();event.stopImmediatePropagation();editSlot(Number(slot.dataset.index));}},true);
  grid.addEventListener("keydown",event=>{const slot=event.target.closest(".workbench-slot.has-widget");if(slot===event.target&&["Enter","F2"," "].includes(event.key)){event.preventDefault();editSlot(Number(slot.dataset.index));editChange.focus({preventScroll:true});}});
  document.addEventListener("pointerdown",event=>{if(editIndex<0)return;if(event.target.closest(".workbench-grid,.workbench-edit-tools,.workbench-trash"))return;exitEdit();},true);
  window.addEventListener("resize",positionEditTools);
  main.addEventListener("scroll",positionEditTools,{passive:true});
  let slotNodes = [];
  let previewDisposers=[];
  function disposeView(handle){try{if(typeof handle==="function")handle();else handle?.destroy?.();}catch{console.warn("Widget cleanup failed");}}
  function clearPreviews(){previewDisposers.forEach(disposeView);previewDisposers=[];choices.replaceChildren();}
  function render() {
    if (!slotNodes.length) slotNodes = slots.map(() => el("section", "workbench-slot"));
    slots.forEach((id, index) => {
      const slot = slotNodes[index]; slot.dataset.index = index;
      const component = registry.get(id);
      slot.setAttribute("aria-label", `${positions[index]}${component ? `，${component.label}，长按编辑或拖动换位，回车进入编辑` : "空组件"}`);
      slot.classList.toggle("has-widget", !!component); slot.tabIndex = component ? 0 : -1;
      if (slot._rendered && slot._id === id && slot._component === component) {
        slot.querySelector(".workbench-add")?.setAttribute("aria-label", `${positions[index]}添加组件`);
      } else {
      disposeView(slot._dispose);slot._dispose=null;
      slot.replaceChildren();
      if (component) {
        const content = el("div", "workbench-slot-content");
        try{const stopColors=window.FolioWidgetPalette?.bind(content),mounted=component.mount(content);slot._dispose=()=>{disposeView(mounted);stopColors?.();};}catch{content.append(el("p","workbench-picker-empty","组件未能加载"));console.warn("Widget mount failed",id);}
        slot.append(content);
      } else {
        slot.append(button("workbench-add", `${positions[index]}添加组件`, () => openPicker(Number(slot.dataset.index)), '<path d="M12 4v16M4 12h16"/>'));
      }
      slot._id = id; slot._component = component; slot._rendered = true;
      }
      if (grid.children[index] !== slot) {
        if (slot.isConnected && typeof grid.moveBefore === "function") grid.moveBefore(slot, grid.children[index] || null);
        else grid.insertBefore(slot, grid.children[index] || null);
      }
    });
  }
  function swapSlots(from, to) {
    slots = FolioWorkbenchSlots.swap(slots, from, to);
    [slotNodes[from], slotNodes[to]] = [slotNodes[to], slotNodes[from]];
    persist(); render(); if(editIndex===from)editSlot(to);else if(editIndex===to)editSlot(from); interactionStatus.textContent = `${positions[from]}与${positions[to]}已交换。`;
    document.dispatchEvent(new CustomEvent("folio-workbench-change", { detail: { slots: slots.slice() } }));
  }
  const reorder = FolioWorkbenchReorder.bind(grid, {
    enabled: () => currentScreen === "workbench" && picker.hidden && reader.hidden,
    swap: swapSlots, hold: editSlot,
    trash:()=>trash,remove:removeWidget,
    announce: text => { interactionStatus.textContent = text; },
  });
  function updateClock() {
    const now = new Date();
    clock.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    clock.dateTime = now.toISOString();
    const date = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric" }).format(now);
    const weekday = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", weekday: "short" }).format(now);
    dateLabel.textContent = `${date} · ${weekday}`;
  }
  function arrangeNotes() {
    const width = notes.clientWidth, height = Math.max(0, board.clientHeight - 20);
    if (!width || !height) return;
    const scale = width / 380, usableHeight = Math.max(80, height);
    notes.style.height = `${usableHeight}px`;
    const cupLeft = Math.max(0, 292 * scale - 3), cupBottom = Math.min(usableHeight, 78 * scale + 3);
    notes.style.removeProperty("clip-path");
    const sceneHeight = height * 380 / width;
    desk.setAttribute("viewBox", `0 0 380 ${sceneHeight}`);
    desk.querySelector(".desk-mat").setAttribute("height", sceneHeight);
    desk.querySelector(".desk-pencil").setAttribute("transform", `translate(156 ${sceneHeight-26}) rotate(-8)`);
    const pencilWidth=108*scale,pencilHeight=34*scale;
    pencilHit.style.left=`${10+156*scale-pencilWidth/2}px`;
    pencilHit.style.top=`${10+height-26*scale-pencilHeight/2}px`;
    pencilHit.style.width=`${pencilWidth}px`;pencilHit.style.height=`${pencilHeight}px`;
    desk.querySelector(".desk-plant").setAttribute("transform", `translate(37 ${sceneHeight-30})`);
    desk.querySelector(".desk-inbox").setAttribute("transform", `translate(274 ${sceneHeight-79})`);
    inboxButton.style.left = `${10 + 274 * scale}px`; inboxButton.style.top = `${10 + height - 79 * scale}px`;
    inboxButton.style.width = `${92 * scale}px`; inboxButton.style.height = `${66 * scale}px`;
    const noteNodes=[...notes.querySelectorAll(".workbench-note")];
    // Protect each decoration individually, keeping the gaps between them usable.
    const exclusions = [
      {left:cupLeft,top:0,right:width,bottom:cupBottom},
      {left:6*scale,top:height-62*scale,right:69*scale,bottom:height},
      {left:101*scale,top:height-44*scale,right:207*scale,bottom:height-8*scale},
      {left:268*scale,top:height-85*scale,right:Math.min(width,372*scale),bottom:height}
    ];
    const positions=FolioNoteLayout.layout(width,usableHeight,noteNodes.map(n=>noteShapes.get(n.dataset.itemId)),{safe:true,topInset:4,exclusions});
    noteNodes.forEach((note,index) => {
      const shape = noteShapes.get(note.dataset.itemId);
      // 留出卷纸、旋转和火焰的边缘；数量增加后自然叠压，不把纸越挤越小。
      const {x,y}=positions[index];
      note.style.left = `${x}px`; note.style.top = `${y}px`;
    });
    const fieldHeight=Math.max(usableHeight,...positions.map(p=>p.y+78));
    notes.style.setProperty("--note-field-height", `${fieldHeight}px`);
    notes.style.overflow=fieldHeight<=usableHeight+1?"visible":"auto";
    updateNoteOverflow();
  }
  function updateNoteOverflow() { board.classList.toggle("has-more-notes", notes.scrollHeight > notes.clientHeight + notes.scrollTop + 2); }
  function randomShape(existing) {
    let best = null, bestDistance = -1;
    for (let attempt = 0; attempt < 28; attempt++) {
      const candidate = { x: .05 + Math.random() * .9, y: .05 + Math.random() * .9 };
      const distance = existing.length ? Math.min(...existing.map(shape => Math.hypot(candidate.x - shape.x, (candidate.y - shape.y) * .65))) : Math.random();
      if (distance > bestDistance) { bestDistance = distance; best = candidate; }
    }
    return { ...best, angle: Math.random() * 16 - 8, scale: .9 + Math.random() * .18, variant: Math.floor(Math.random() * 3) };
  }
  function paperGraphic(index, variant) {
    const corner = [10,13,16][variant], bottom = 61, right = 57;
    return `<svg class="workbench-paper" viewBox="0 0 64 68" aria-hidden="true"><rect x="5" y="10" width="55" height="55" rx="2" fill="#D6C9AB"/><path d="M2 6H${right}V${bottom-corner}L${right-corner} ${bottom}H2Z" fill="var(--note-color)"/><path d="M2 6H${right}V16H2Z" fill="var(--paper-top)"/><path d="M${right} ${bottom-corner}L${right-corner} ${bottom}V${bottom-corner}Z" fill="var(--paper-fold)"/><rect x="18" y="2" width="24" height="10" fill="white" fill-opacity=".6" transform="rotate(-3 30 7)"/></svg>`;
  }
  function fireGraphic() {
    // 采用用户 fire-notes.html 的火舌、四层配色、火星与中等焦边，缩放到原便签坐标。
    const tongue = "M50 2C54 22 62 30 72 44C82 58 88 70 86 88C84 108 70 124 50 124C30 124 16 108 14 88C12 72 20 62 28 52C32 62 36 64 40 62C36 44 42 20 50 2Z";
    function layer(transform, color, duration, delay) {
      return `<g class="note-fire-layer" style="animation-duration:${duration}s;animation-delay:${delay}s"><path d="${tongue}" fill="${color}" transform="${transform}"/></g>`;
    }
    function flame(x, y, scale, delay) {
      return `<g transform="translate(${x} ${y}) scale(${scale})">`
        + layer("translate(-50 -124)","#E5532D",1.25,delay)
        + layer("translate(1 0) scale(.66) translate(-50 -124)","#F28C38",1.05,delay+.15)
        + layer("translate(-1 0) scale(.4) translate(-50 -124)","#F8CF5A",.9,delay+.3)
        + layer("scale(.2) translate(-50 -124)","#FFF3D1",.8,delay+.1) + "</g>";
    }
    return '<svg class="workbench-note-fire" viewBox="0 0 64 68" aria-hidden="true"><g transform="translate(2 6) scale(.6547619)">'
      + '<path d="M0 0H84V20L70 14L56 24L42 16L28 22L14 13L0 18Z" fill="#A8683F"/>'
      + '<path d="M0 0H84V13L70 7L56 17L42 9L28 15L14 6L0 11Z" fill="#3B2A22"/>'
      + '<circle cx="29.4" cy="30" r="1.8" fill="#E5532D"/><circle cx="65.52" cy="34" r="1.6" fill="#F28C38"/>'
      + flame(23.52,14,.44,0) + flame(57.12,10,.6,.35)
      + '<circle class="note-fire-spark" cx="42" cy="-14" r="2.4" fill="#F8CF5A" style="--spark-dx:6px;animation-delay:.2s"/>'
      + '</g></svg>';
  }
  function smokeGraphic() {
    return '<svg class="workbench-note-smoke" viewBox="0 0 60 72" aria-hidden="true"><g class="note-smoke"><path d="M22 58C14 59 11 51 16 47C12 40 19 35 25 39C30 31 39 36 38 42C46 42 47 52 41 55C35 62 29 57 22 58Z"/><ellipse cx="29" cy="58" rx="7" ry="4"/></g><g class="note-smoke note-smoke-second"><path d="M22 58C14 59 11 51 16 47C12 40 19 35 25 39C30 31 39 36 38 42C46 42 47 52 41 55C35 62 29 57 22 58Z"/></g></svg>';
  }
  let noteRenderSignature="";
  function renderNotes() {
    const signature=JSON.stringify([homeworkState.today,homeworkState.items,window.FolioGoalUI?.queueOptions()]);if(signature===noteRenderSignature){requestAnimationFrame(arrangeNotes);return;}noteRenderSignature=signature;
    const lessons=FolioQueue.lessonRail(homeworkState.items,homeworkState.today);lessonQueue.hidden=!lessons.length;lessonQueue.replaceChildren();for(const item of lessons){const b=button("workbench-lesson-card",item.title,event=>openItem(item,event.currentTarget));b.style.setProperty("--lesson-color",item.color||"#B8CDC4");b.append(el("strong","",item.title),el("span","",item.startAt?item.startAt.slice(11)+"–"+item.endAt.slice(11):"时间待定"),el("small","",item.location||"地点待定"));b.dataset.itemId=item.id;lessonQueue.append(b);}
    const items = FolioQueue.rail(homeworkState.items);
    const inboxColorsAdded=renderInbox();
    notes.replaceChildren();
    let newColors = inboxColorsAdded, previousColor = null, previousVariant = null;
    const existing = items.flatMap(item => noteShapes.has(item.id) ? [noteShapes.get(item.id)] : []);
    items.forEach((item, index) => {
      if (!noteColors.has(item.id)) {
        const available = notePalette.filter(color => color !== previousColor);
        noteColors.set(item.id, available[Math.floor(Math.random() * available.length)]); newColors = true;
      }
      if (!noteShapes.has(item.id)) { const shape = randomShape(existing); noteShapes.set(item.id, shape); existing.push(shape); newColors = true; }
      if (noteShapes.get(item.id).variant === previousVariant) { noteShapes.get(item.id).variant = (previousVariant + 1 + Math.floor(Math.random() * 2)) % 3; newColors = true; }
      const note = button("workbench-note", `打开便签 ${index + 1}`, event => openReader(item, event.currentTarget));
      note.dataset.itemId = item.id;
      previousColor = noteColors.get(item.id); note.style.setProperty("--note-color", previousColor);
      const colors = paperPalette.find(colors => colors[0] === previousColor) || paperPalette[legacyColors.indexOf(previousColor) % paperPalette.length] || paperPalette[0];
      note.style.setProperty("--paper-top",colors[2]); note.style.setProperty("--paper-fold",colors[1]);
      const shape = noteShapes.get(item.id);
      previousVariant = shape.variant;
      note.style.setProperty("--note-angle", `${shape.angle}deg`); note.style.setProperty("--note-scale", shape.scale);
      note.style.zIndex = String(index + 1);
      note.innerHTML = paperGraphic(index, shape.variant);
      const stage = FolioQueue.noticeStage(item, homeworkState.today, window.FolioGoalUI?.queueOptions());
      if (stage === "fire") { note.classList.add("is-burning"); note.insertAdjacentHTML("beforeend", fireGraphic()); }
      else if (stage === "smoke") { note.classList.add("is-smoking"); note.insertAdjacentHTML("beforeend", smokeGraphic()); }
      note.style.setProperty("--flame-delay", `${-Math.random() * 3}s`);
      notes.append(note);
    });
    if (newColors) persist();
    if(!incomingPanel.hidden && !incomingPanel.classList.contains("is-closing") && reader.hidden)openIncoming();
    requestAnimationFrame(arrangeNotes);
  }
  let noteLayoutFrame=0;
  const noteResize = new ResizeObserver(()=>{if(!noteLayoutFrame)noteLayoutFrame=requestAnimationFrame(()=>{noteLayoutFrame=0;arrangeNotes();});}); noteResize.observe(board); noteResize.observe(notes);
  notes.addEventListener("scroll", updateNoteOverflow, { passive: true });
  document.addEventListener("folio-data-change", renderNotes);
  document.addEventListener("folio-goals-change", renderNotes);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) updateClock(); });
  setInterval(() => { if (currentScreen === "workbench" && !document.hidden) updateClock(); }, 10000);
  let pickerCloseTimer=null;
  function openPicker(index) {
    reorder.cancel(); exitEdit();
    clearTimeout(pickerCloseTimer);picker.classList.remove("is-closing");
    selected = index; returnFocus = document.activeElement;
    title.textContent = `添加到${positions[index]}`; clearPreviews(); choices.scrollTop = 0;
    if (!registry.size) choices.append(el("p", "workbench-picker-empty", "暂无可添加的组件"));
    FolioWorkbenchSlots.catalog(registry.values()).forEach(component => {
      const item = el("article", "workbench-choice-item"), preview = el("div", "workbench-choice-preview");
      preview.setAttribute("aria-hidden", "true"); preview.inert=true;
      try{previewDisposers.push(window.FolioWidgetPalette?.bind(preview),component.preview?.(preview));}catch{console.warn("Widget preview failed",component.id);}
      const label = el("h3", "workbench-choice-label", component.label);
      const description = el("p", "workbench-choice-description", component.description || "");
      const choice = button("workbench-choice-add", `添加${component.label}到${positions[index]}`, () => {
        try{slots[selected] = component.create?component.create():component.id;persist();render();closePicker();}catch(error){announce(error.message||"未能添加组件");}
      }); choice.textContent = "添加"; item.append(preview, label, description, choice); choices.append(item);
    });
    picker.hidden = false; setWorkbenchInert(true); close.focus({ preventScroll: true });
  }
  function closePicker(immediate=false) {
    clearTimeout(pickerCloseTimer);
    if (picker.hidden) return;
    const finish=()=>{
    picker.hidden = true; setWorkbenchInert(false);
    clearPreviews();
    picker.classList.remove("is-closing");
    const target = returnFocus?.isConnected ? returnFocus : grid.children[selected]?.querySelector("button") || grid.children[selected];
    target?.focus({ preventScroll: true });
    };
    if(immediate===true||matchMedia("(prefers-reduced-motion: reduce)").matches)finish();else{picker.classList.add("is-closing");pickerCloseTimer=setTimeout(finish,180);}
  }
  document.addEventListener("keydown", event => {
    if(event.key==="Escape"&&picker.hidden&&editIndex>=0){event.preventDefault();event.stopImmediatePropagation();exitEdit();return;}
    if (picker.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); closePicker(); }
    if (event.key === "Tab") {
      const controls = [...card.querySelectorAll("button:not(:disabled)")];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);

  // 两张实际页面随手指移动，共享顶栏是 phone 的独立子节点，始终不参与平移。
  let pageDrag=null,pageSettleTimer=null,committingPageDrag=false,suppressClickUntil=0;
  function clearPageDrag(){
    if(pageDrag?.week)window.FolioHomeWeek?.close(true);
    clearTimeout(pageSettleTimer);pageSettleTimer=null;pageDrag=null;
    [home,page].forEach(surface=>{
      surface.classList.remove("is-page-dragging");
      ["transform","transition","z-index"].forEach(key=>surface.style.removeProperty(key));
      surface.inert=false;surface.hidden=previewScreens[currentScreen]!==surface;
    });
  }
  function positionPages(index,dx,width){
    home.style.transform=`translateX(${-index*width+dx}px)`;
    page.style.transform=`translateX(${(1-index)*width+dx}px)`;
  }
  const homePagerGesture=FolioGesture.bind(phone,{
    axis:"x",
    enabled:()=>!window.FolioPageRail?.enabled&&picker.hidden&&reader.hidden&&!reorder.active&&["home","workbench"].includes(currentScreen),
    ignore:target=>{
      if(pageSettleTimer&&target===phone)return false;
      if(!previewScreens[currentScreen]?.contains(target)&&!window.FolioHomeWeek?.contains(target)&&!(pageSettleTimer&&(home.contains(target)||page.contains(target))))return true;
      return Boolean(target.closest("input,textarea,select,dialog,[role=dialog],[contenteditable=true],[data-gesture-lock],.workbench-edit-tools"));
    },
    start:()=>{let offset=0;if(pageSettleTimer){clearTimeout(pageSettleTimer);pageSettleTimer=null;const matrix=new DOMMatrixReadOnly(getComputedStyle(home).transform);offset=matrix.m41+(currentScreen==="home"?0:phone.clientWidth);[home,page].forEach(s=>s.style.transition="none");pageDrag=null;}const week=currentScreen==="home"&&Boolean(window.FolioHomeWeek?.visible);if(week)offset=FolioHomeWeek.offset();return {index:currentScreen==="home"?0:1,width:phone.clientWidth,offset,week,weekOpened:Boolean(window.FolioHomeWeek?.opened)};},
    move(swipe){
      if(swipe.extra.week||(!pageDrag&&swipe.extra.index===0&&swipe.dx+swipe.extra.offset>0&&window.FolioHomeWeek)){
        swipe.extra.week=true;pageDrag=swipe.extra;page.hidden=true;
        FolioHomeWeek.drag(swipe.dx+swipe.extra.offset);return;
      }
      if(!pageDrag){
        pageDrag=swipe.extra;
        if(swipe.extra.index===0)updateClock();
        [home,page].forEach(surface=>{surface.hidden=false;surface.classList.add("is-page-dragging");surface.style.transition="none";surface.style.zIndex="10";});
        previewScreens[swipe.extra.index===0?"workbench":"home"].inert=true;
      }
      const dx=FolioGesture.pageOffset(swipe.dx+swipe.extra.offset,swipe.extra.index,swipe.extra.width);
      const overflow=swipe.dx+swipe.extra.offset-dx;positionPages(swipe.extra.index,dx+Math.sign(overflow)*Math.min(28,Math.abs(overflow)*.18),swipe.extra.width);
    },
    end(swipe,event,cancelled){
      if(!pageDrag)return;
      if(pageDrag.week){
        const drawer=window.FolioHomeWeek,x=swipe.dx+swipe.extra.offset;
        const open=cancelled?swipe.extra.weekOpened:Math.abs(swipe.dx)>22&&Math.abs(swipe.velocityX)>.45?swipe.velocityX>0:x>=(swipe.extra.weekOpened?drawer.width()*.65:Math.max(56,drawer.width()*.35));
        suppressClickUntil=performance.now()+350;pageDrag=null;drawer.settle(open);return;
      }
      suppressClickUntil=performance.now()+350;
      const next=FolioGesture.destination(swipe.extra.index,swipe.dx+swipe.extra.offset,swipe.velocityX,swipe.extra.width,cancelled,{minDistance:12,distanceRatio:.04,flickDistance:8,flickVelocity:.08});
      const duration=matchMedia("(prefers-reduced-motion: reduce)").matches?0:330;
      void home.getBoundingClientRect();
      [home,page].forEach(surface=>surface.style.transition=`transform ${duration}ms cubic-bezier(.22,.82,.28,1.035)`);
      positionPages(swipe.extra.index,(swipe.extra.index-next)*swipe.extra.width,swipe.extra.width);
      pageSettleTimer=setTimeout(()=>{
        committingPageDrag=true;
        if(next!==swipe.extra.index)showPreviewScreen(next===0?"home":"workbench",{focus:false});
        committingPageDrag=false;clearPageDrag();
      },duration);
    }
  });
  grid.addEventListener("folio-widget-drag-start",()=>homePagerGesture.cancel());
  phone.addEventListener("click",event=>{
    if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  let menuSwipe=null,menuTimer=null;
  const menuSurface=previewScreens.menu;
  function clearMenuSwipe(){clearTimeout(menuTimer);menuTimer=null;menuSwipe=null;[menuSurface,home].forEach(s=>{s.classList.remove("is-menu-dragging");s.style.removeProperty("transform");s.style.removeProperty("transition");s.style.removeProperty("z-index");s.inert=false;s.hidden=previewScreens[currentScreen]!==s;});if(currentScreen!=="menu")menuSurface.classList.remove("is-menu-settled");}
  FolioGesture.bind(menuSurface,{axis:"x",enabled:()=>currentScreen==="menu"&&!menuTimer,
    ignore:target=>Boolean(target.closest("input,textarea,select,[contenteditable=true]")),
    start:()=>({width:phone.clientWidth}),
    move(swipe){
      // 左滑把菜单从左侧推出；右侧首页跟随进入。轻扫只回弹，不误触发整段切换。
      if(swipe.dx>=0&&!menuSwipe)return;
      if(!menuSwipe){menuSwipe=swipe;swipe.extra.offset=Math.min(0,new DOMMatrixReadOnly(getComputedStyle(menuSurface).transform).m41);menuSurface.classList.add("is-menu-settled");home.inert=true;home.style.transform=`translateX(${swipe.extra.width}px)`;[home,menuSurface].forEach(s=>{s.classList.add("is-menu-dragging");s.style.transition="none";s.style.zIndex=s===menuSurface?"12":"11";});home.hidden=false;}
      const width=swipe.extra.width,dx=Math.max(-width,Math.min(0,swipe.dx+swipe.extra.offset));
      menuSurface.style.transform=`translateX(${dx}px)`;home.style.transform=`translateX(${width+dx}px)`;
    },
    end(swipe,event,cancelled){
      if(!menuSwipe)return;
      suppressClickUntil=performance.now()+700;
      const width=swipe.extra.width;
      const complete=!cancelled&&(swipe.dx<=-Math.max(44,width*.15)||(swipe.dx<=-24&&swipe.velocityX<-.45));
      const duration=matchMedia("(prefers-reduced-motion: reduce)").matches?0:300;
      [home,menuSurface].forEach(s=>s.style.transition=`transform ${duration}ms cubic-bezier(.22,.82,.28,1.025)`);
      menuSurface.style.transform=`translateX(${complete?-width:0}px)`;home.style.transform=`translateX(${complete?0:width}px)`;
      menuTimer=setTimeout(()=>{
        if(complete)showPreviewScreen("home",{focus:false});
        clearMenuSwipe();
      },duration);
    }
  });
  let previous = currentScreen, animations = [];
  document.addEventListener("preview-screen-change", event => {
    reorder.cancel(); exitEdit();
    if(menuSwipe)clearMenuSwipe();
    if(!committingPageDrag&&pageDrag)clearPageDrag();
    closePicker(true); returnToInbox=false; closeReader(true);closeIncoming(true);
    animations.forEach(animation => animation.cancel()); animations = [];
    phone.querySelectorAll(".workbench-transition").forEach(node => node.remove());
    const next = event.detail.screen;
    if(next!=="menu")menuSurface.classList.remove("is-menu-settled");
    syncHeader();
    if (["home","workbench"].includes(next) && event.detail.focus !== false) menu.focus({preventScroll:true});
    if (next === "workbench") { updateClock(); renderNotes(); }
    if (!window.FolioPageRail?.enabled && !committingPageDrag && ((previous === "home" && next === "workbench") || (previous === "workbench" && next === "home")) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const direction = next === "workbench" ? 1 : -1;
      const old = previewScreens[previous].cloneNode(true); old.hidden = false; old.inert = true;
      old.classList.add("workbench-transition"); old.setAttribute("aria-hidden", "true");
      old.removeAttribute("id"); old.querySelectorAll("[id]").forEach(node => node.removeAttribute("id")); phone.append(old);
      const timing = { duration: 300, easing: "cubic-bezier(.22,1,.36,1)" };
      const out = old.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-direction * 100}%)` }], timing);
      const incoming = previewScreens[next].animate([{ transform: `translateX(${direction * 100}%)` }, { transform: "translateX(0)" }], timing);
      out.finished.finally(() => old.remove()).catch(() => {}); animations = [out, incoming];
    }
    previous = next;
  });
  window.FolioWorkbench = Object.freeze({
    apiVersion:1,
    register(component) {
      if (!component || typeof component.id !== "string" || !component.id || typeof component.label !== "string" || typeof component.mount !== "function") throw new TypeError("组件需提供 id、label 和 mount");
      registry.set(component.id, component);render();document.dispatchEvent(new CustomEvent("folio-widget-registry-change",{detail:{ids:[component.id]}}));
    },
    registerMany(components) {
      components.forEach(component => {
        if (!component || typeof component.id !== "string" || !component.id || typeof component.label !== "string" || typeof component.mount !== "function") throw new TypeError("组件需提供 id、label 和 mount");
      });
      components.forEach(component=>registry.set(component.id,component));render();document.dispatchEvent(new CustomEvent("folio-widget-registry-change",{detail:{ids:components.map(c=>c.id)}}));
    },
    listComponents(){return FolioWorkbenchSlots.catalog(registry.values()).map(({id,label,description})=>({id,label,description:description||""}));},
    mountComponent(id,root,{preview=false}={}){const c=registry.get(id);if(!c||c.isPack)throw Error("这个组件不可放入卡片包");const stopColors=window.FolioWidgetPalette?.bind(root),handle=preview?c.preview?.(root):c.mount(root);return()=>{disposeView(handle);stopColors?.();};},
    getLayout() { return slots.slice(); },
    isEditing(){return editIndex>=0||reorder.active;},
    edit: editSlot, openPicker,
    openInbox(){showPreviewScreen("workbench");openIncoming();},
  });
  updateClock(); render(); renderNotes();
})();
