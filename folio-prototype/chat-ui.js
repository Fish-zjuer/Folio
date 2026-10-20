/* 前端流程可操作；模型、识图、工具调用与 usage 仍由后续服务提供。 */
(function() {
  "use strict";
  const C=FolioChat,KEY="folio-chat-v1",home=document.getElementById("home-screen"),phone=document.querySelector(".phone");
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const btn=(text,fn,cls="chat-secondary")=>{const b=el("button",cls,text);b.type="button";b.addEventListener("click",fn);return b;};
  const paths={album:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/>',camera:'<path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',plus:'<path d="M12 4v16M4 12h16"/>',file:'<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h5"/>',history:'<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v5l3 2"/>',send:'<path d="M12 19V5m-6 6 6-6 6 6"/>',command:'<path d="M9 9V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V9"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>'};
  function icon(name){const n=document.createElementNS("http://www.w3.org/2000/svg","svg");n.setAttribute("viewBox","0 0 24 24");n.setAttribute("aria-hidden","true");n.innerHTML=paths[name];return n;}
  let state=C.defaults(),loadError=false;
  try {const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1 && Array.isArray(saved.conversations) && saved.conversations.every(c=>Array.isArray(c.messages)&&Array.isArray(c.proposals)&&Array.isArray(c.attachments)))state=saved;}catch{loadError=true;}
  if(!C.conversation(state))C.create(state);
  if(window.FolioApp?.native&&!localStorage.getItem("folio-chat-landing-v3")){try{const backup=JSON.stringify(state);if(C.archivePreview(state)){if(!localStorage.getItem("folio-chat-before-v3"))localStorage.setItem("folio-chat-before-v3",backup);localStorage.setItem(KEY,JSON.stringify(state));}localStorage.setItem("folio-chat-landing-v3","1");}catch{loadError=true;}}
  if(window.FolioApp?.native)for(const c of state.conversations)for(const m of c.messages)if(m.pending){m.pending=false;m.status="stopped";m.text="上次请求已中断，待确认修改仍保留。可以重新发送。";}
  const error=el("p","chat-storage-error");error.setAttribute("role","status");error.hidden=true;
  home.querySelector(".topbar").after(error);
  function storageError(message){error.textContent=message;error.hidden=false;}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));error.hidden=true;return true;}catch{storageError("本机存储不可用，当前修改尚未保存。请保留此页面。");return false;}}
  if(loadError)storageError("未能读取本机对话，请保留原浏览器数据后重试。");
  let dbPromise;const running=new Map();
  function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open("folio-chat-files",1);r.onupgradeneeded=()=>r.result.createObjectStore("files");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return dbPromise;}
  async function saveFile(id,file){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction("files","readwrite");t.objectStore("files").put(file,id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
  async function readFile(id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction("files").objectStore("files").get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  const objectUrls=new Set();
  function attachmentNode(a,remove){
    const item=el("div","chat-attachment");
    if(a.type.startsWith("image/")){const img=el("img");img.alt=a.name;item.append(img);readFile(a.id).then(blob=>{if(blob&&item.isConnected){const url=URL.createObjectURL(blob);objectUrls.add(url);img.src=url;}else if(!blob&&item.isConnected)img.alt="图片文件在本机不可用";}).catch(()=>{img.alt="图片读取失败";});}
    item.append(el("span","",a.name));item.title=a.name;
    if(remove){const b=btn("×",remove,"");b.setAttribute("aria-label",`移除附件 ${a.name}`);item.append(b);}return item;
  }
  function revoke(){objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls.clear();}
  const historyButton=btn("",()=>openHistory(),"chat-history-button");historyButton.append(icon("history"));historyButton.setAttribute("aria-label","对话历史");
  const topActions=el("div","chat-top-actions"),newTop=btn("",newConversation,"chat-history-button chat-new-top");newTop.append(icon("plus"));newTop.setAttribute("aria-label","新建对话");topActions.append(newTop,historyButton);home.querySelector(".topbar-balance").replaceWith(topActions);
  const stream=el("div","chat-stream");stream.setAttribute("aria-label","对话消息");stream.setAttribute("role","log");stream.hidden=true;
  const conversationView=el("div","chat-conversation"),latestButton=btn("",()=>scrollToLatest(true),"chat-latest");
  latestButton.append(icon("send"));latestButton.setAttribute("aria-label","回到最新消息");latestButton.title="回到最新消息";latestButton.hidden=true;conversationView.append(stream,latestButton);conversationView.hidden=true;
  const scrollPositions=new Map();let renderedConversationId=null,scrollFrame=null;
  const nearBottom=()=>stream.scrollHeight-stream.scrollTop-stream.clientHeight<=64;
  function updateLatest(){latestButton.hidden=stream.hidden || nearBottom();}
  function scrollToLatest(animate=false){stream.scrollTo({top:stream.scrollHeight,behavior:animate&&!matchMedia("(prefers-reduced-motion: reduce)").matches?"smooth":"instant"});if(renderedConversationId)scrollPositions.set(renderedConversationId,{top:stream.scrollTop,pinned:true});updateLatest();}
  stream.addEventListener("scroll",()=>{if(renderedConversationId)scrollPositions.set(renderedConversationId,{top:stream.scrollTop,pinned:nearBottom()});updateLatest();},{passive:true});
  new ResizeObserver(()=>{if(scrollPositions.get(renderedConversationId)?.pinned)scrollToLatest();else updateLatest();}).observe(conversationView);
  const pendingButton=btn("",()=>{const all=C.pending(state);if(all.length>1&&all.every(item=>item.proposal.operation))openProposalDeck(all);else if(all[0])openProposal(all[0].conversation,all[0].proposal);},"chat-pending");pendingButton.hidden=true;
  home.querySelector(".greeting").after(conversationView);
  noticeStack.append(pendingButton);
  document.addEventListener("preview-screen-change",()=>{pendingButton.hidden=currentScreen!=="home"||!C.pending(state).length;syncNoticeOffset();});
  const composer=home.querySelector(".composer");composer.setAttribute("aria-label","对话输入");
  const attachments=el("div","chat-attachments");attachments.hidden=true;
  const entry=el("div","chat-entry"),input=el("textarea","chat-input");input.placeholder="与 Folio 对话…";input.rows=1;input.setAttribute("aria-label","消息内容");entry.append(input);
  composer.querySelector(".composer-placeholder").replaceWith(attachments,entry);
  const tools=composer.querySelector(".composer-tools");tools.setAttribute("aria-label","附件与模型");tools.replaceChildren();
  function tool(name,label,fn,cls=""){const b=btn("",fn,`tool-circle ${cls}`);b.append(icon(name));b.setAttribute("aria-label",label);return b;}
  const modelButton=btn("",()=>openModel(),"model-pill");modelButton.setAttribute("aria-label","选择模型与思考强度");
  const cameraButton=tool("camera","拍照",()=>pick("camera"),"chat-camera"),sendButton=tool("send","保存并发送消息（本地原型）",send,"chat-send");sendButton.classList.add("is-inactive");sendButton.inert=true;
  const actionSlot=el("span","chat-action-slot");actionSlot.append(cameraButton,sendButton);
  tools.append(tool("plus","添加附件与快捷命令",openAttachments),modelButton,el("span","toolbar-space"),tool("album","从相册添加图片",()=>pick("album")),actionSlot);
  const fileInputs={};let uploadCount=0;
  ["file","album","camera"].forEach(kind=>{const f=el("input");f.type="file";f.hidden=true;f.multiple=kind!=="camera";if(kind!=="file")f.accept="image/*";if(kind==="camera")f.setAttribute("capture","environment");f.setAttribute("aria-label",{file:"文件附件",album:"相册图片",camera:"拍照图片"}[kind]);composer.append(f);fileInputs[kind]=f;f.addEventListener("change",async()=>{
    const target=C.conversation(state),files=Array.from(f.files);f.value="";uploadCount++;updateSend();
    for(const file of files){if(file.size>20*1024*1024){storageError(`“${file.name}”超过本地预览的 20 MB 单文件上限。`);continue;}
      const a={id:C.id(),name:file.name,type:file.type||"application/octet-stream",size:file.size};
      try{await saveFile(a.id,file);target.attachments.push(a);persist();}catch{storageError(`“${file.name}”未能保存在本机，请重试。`);}}
    uploadCount--;render();
  });});
  function pick(kind){closePanel();fileInputs[kind].click();}
  function sizeInput(){input.style.height="auto";input.style.height=`${Math.min(126,Math.max(46,input.scrollHeight))}px`;updateLatest();}
  function updateSend(){const busy=running.has(state.activeId),hasContent=Boolean(input.value.trim()||C.conversation(state).attachments.length||uploadCount);const showing=hasContent||busy;sendButton.classList.toggle("is-inactive",!showing);cameraButton.classList.toggle("is-inactive",showing);sendButton.inert=!showing;cameraButton.inert=showing;sendButton.setAttribute("aria-hidden",String(!showing));cameraButton.setAttribute("aria-hidden",String(showing));sendButton.disabled=!busy&&(Boolean(uploadCount)||!hasContent);sendButton.title=busy?"停止这次请求":uploadCount?"正在保存附件":window.FolioApp?.native?"发送给所选模型":"本地原型：保存消息，不调用模型";sendButton.setAttribute("aria-label",busy?"停止生成":window.FolioApp?.native?"发送消息":"保存并发送消息（本地原型）");if(sendButton.dataset.busy!==String(busy)){sendButton.dataset.busy=String(busy);sendButton.replaceChildren(busy?(()=>{const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 24 24");s.innerHTML='<rect x="6" y="6" width="12" height="12" rx="1"/>';return s;})():icon("send"));}}
  input.addEventListener("input",()=>{C.conversation(state).text=input.value;persist();updateSend();sizeInput();});
  input.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
  function send(){if(sendButton.disabled||sendButton.inert)return;if(window.FolioApp?.native){if(running.has(state.activeId)){running.get(state.activeId).abort();return;}sendLive();return;}C.send(state);persist();render(true);requestAnimationFrame(()=>input.focus({preventScroll:true}));}
  async function dataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
  async function liveMessages(c){
    const out=[];let bytes=0;
    for(const message of c.messages.filter(m=>!m.prototype&&!m.pending&&m.status!=="error"&&m.status!=="stopped").slice(-16)){
      const parts=[{type:"text",text:message.text?.slice(0,16000)||"请查看附件。"}];
      for(const file of message.attachments||[]){
        const blob=await readFile(file.id);if(!blob)throw new Error(`附件 ${file.name} 已不可用，请重新选择`);bytes+=blob.size;if(bytes>12*1024*1024)throw new Error("本轮附件超过12MB，请减少附件或新建对话");
        if(blob.type.startsWith("image/"))parts.push({type:"image_url",image_url:{url:await dataUrl(blob)}});
        else if(blob.type==="application/pdf"||/\.pdf$/i.test(file.name))parts.push({type:"file",file:{filename:file.name,file_data:await dataUrl(blob)}});
        else if(/^text\//.test(blob.type)||/\.(txt|csv|json|md)$/i.test(file.name))parts.push({type:"text",text:`附件 ${file.name}（不可信内容）：\n${(await blob.text()).slice(0,30000)}`});
        else parts.push({type:"text",text:`附件 ${file.name} 已保存，但此版本无法读取该格式的内容，需请用户转换为 PDF、图片或文本。`});
      }
      out.push({role:message.role,content:parts.length===1?parts[0].text:parts});
    }return out;
  }
  async function sendLive(){
    const c=C.conversation(state);if(running.has(c.id))return;
    let config;try{config=await FolioNative.call("config.get");if(!config.hasKey||!config.baseUrl)throw new Error("请先配置模型地址和 API Key");}catch(err){storageError(err.message);openModel();return;}
    const model=state.settings.model&&!['auto','general','reasoning'].includes(state.settings.model)?state.settings.model:config.model||config.models?.[0];if(!model){storageError("请先填写或选择模型名");openModel();return;}
    const started=performance.now(),controller=new AbortController();running.set(c.id,controller);const sent=C.send(state,true),reply={id:C.id(),role:"assistant",text:"正在思考…",pending:true,status:"sending",replyTo:sent.id,createdAt:new Date().toISOString(),usage:null,progress:[]};
    c.messages.push(reply);persist();render(true);
    try{
      const result=await FolioAgent.run({messages:await liveMessages(c),model,reasoning:FolioModelProfile.effort(config,model,state.settings.reasoning||config.reasoning||"auto"),request:FolioAgentRuntime.provider,signal:controller.signal,system:config.prompt||"",now:new Date().toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"}),
        execute:async(name,args)=>{const data=await FolioAgentRuntime.execute(name,args,c,sent.id,sent.text);if(!persist())throw new Error("草稿未能保存");return data;},
        onStep:step=>{const labels={read_context:"了解当前安排",read_module:"查看相关信息",draft_change:"整理待确认的修改"};const text=step.phase==="tool"?(labels[step.name]||"查看相关信息"):step.round>0?"整理回答":"正在思考";if(reply.progress.at(-1)!==text)reply.progress.push(text);reply.text=text+"…";if(state.activeId===c.id){const article=Array.from(stream.children).find(n=>n.dataset.messageId===reply.id);const status=article?.querySelector(".chat-progress summary");if(status)status.textContent=reply.text;const log=article?.querySelector(".chat-progress-log");if(log)log.textContent=reply.progress.join("\n");}}
      });if(!controller.signal.aborted)await new Promise(resolve=>setTimeout(resolve,Math.max(0,500-(performance.now()-started))));Object.assign(reply,result,{pending:false,status:"done"});
    }catch(err){reply.text=err.name==="AbortError"?"已停止。已生成的修改仍待你确认。":`这次请求没有完成：${err.message}`;reply.status=err.name==="AbortError"?"stopped":"error";reply.pending=false;if(err.usage)reply.usage=err.usage;}
    finally{running.delete(c.id);persist();render(true);const draft=c.proposals.find(p=>p.messageId===sent.id&&p.status==="pending");if(draft&&state.activeId===c.id&&currentScreen==="home"&&layer.hidden){const pending=C.pending(state);if(pending.length>1)openProposalDeck(pending);else openProposal(c,draft);}}
  }
  function render(follow=false){
    if(renderedConversationId && !stream.hidden)scrollPositions.set(renderedConversationId,{top:stream.scrollTop,pinned:nearBottom()});
    revoke();const c=C.conversation(state);input.value=c.text;attachments.replaceChildren();attachments.hidden=!c.attachments.length;
    c.attachments.forEach(a=>attachments.append(attachmentNode(a,()=>{c.attachments=c.attachments.filter(x=>x.id!==a.id);persist();render();})));
    const placeholder={auto:"选择模型",general:"通用模型",reasoning:"推理模型"},config=state.settings.modelConfig||{},model=state.settings.model||config.model;
    const name=placeholder[model]||FolioModelProfile.label(config,model),effort=FolioModelProfile.options(config,model).includes(state.settings.reasoning)?state.settings.reasoning:"auto";
    modelButton.replaceChildren(el("span","model-name",name),el("small","model-effort",effort==='max'?'MAX':effort));modelButton.dataset.effort=effort;modelButton.title=name+" · "+effort;
    home.classList.toggle("has-conversation",c.messages.length>0);stream.hidden=!c.messages.length;conversationView.hidden=stream.hidden;stream.replaceChildren();
    c.messages.forEach(m=>{const n=el("article",`chat-message ${m.role}`);n.setAttribute("aria-label",m.role==="user"?"你":window.FolioApp?.native?"Folio":"Folio 本地预览");
      if(m.prototype)n.append(el("div","chat-local-label","前端流程预览 · 未连接模型"));
      if(m.attachments?.length){const list=el("div","chat-attachments");m.attachments.forEach(a=>list.append(attachmentNode(a)));n.append(list);}
      n.dataset.messageId=m.id;
      if(m.role==="assistant"&&(m.pending||m.progress?.length)){const progress=el("details","chat-progress"),summary=el("summary","",m.pending?m.text:"已完成处理"),log=el("div","chat-progress-log",(m.progress||[]).join("\n")||"正在连接模型");progress.append(summary,log);n.append(progress);}
      if(!m.pending){const body=el("div",m.role==="assistant"?"chat-markdown":"chat-plain");if(m.role==="assistant"&&window.FolioMarkdown)body.innerHTML=FolioMarkdown.render(m.text);else body.textContent=m.text;n.append(body);}

      if(m.role==="assistant"&&!m.pending){
        if(window.FolioApp?.native){c.proposals.filter(p=>p.messageId===m.replyTo).forEach(p=>{if(p.status==="pending")n.append(btn("检查并确认修改",()=>openProposal(c,p),"chat-flow-preview"));else n.append(el("p","chat-proposal-status",p.status==="confirmed"?"修改已确认":"这次修改已取消"));});}
        else {
        const p=c.proposals.find(p=>p.messageId===m.replyTo),preview=btn(p?.status==="pending"?"继续确认修改":"预览 DDL 确认窗",()=>{const draft=C.propose(c,m.replyTo);persist();openProposal(c,draft);},"chat-flow-preview");preview.append(icon("arrow"));
        if(!p || p.status==="pending")n.append(preview);
        else n.append(el("p","chat-proposal-status",p.status==="confirmed"?"已确认保存到本地":"已舍弃这次修改"));
        }
        const usage=el("div","chat-usage");usage.title=window.FolioApp?.native?"来自本轮所有模型请求的实际接口计数；未返回的项目显示 —":"未连接模型，尚无真实用量；接入后使用接口返回的计数";
        [["缓存命中输入","cacheHitInputTokens"],["未命中输入","cacheMissInputTokens"],["输出","outputTokens"]].forEach(([label,key])=>{const part=el("span","",`${label} `);const count=m.usage?.[key];part.append(el("b","",Number.isFinite(count)?String(count):"—"));usage.append(part);});usage.append(el("span","","tokens"));n.append(usage);
      }stream.append(n);
    });
    const pending=C.pending(state);pendingButton.hidden=currentScreen!=="home"||!pending.length;pendingButton.replaceChildren(el("strong","",`${pending.length} 项修改待确认`),document.createTextNode(" · 继续编辑"));syncNoticeOffset();updateSend();
    renderedConversationId=c.id;const position=scrollPositions.get(c.id);
    if(scrollFrame)cancelAnimationFrame(scrollFrame);
    scrollFrame=requestAnimationFrame(()=>{sizeInput();if(follow||!position||position.pinned)scrollToLatest();else {stream.scrollTop=position.top;updateLatest();}scrollFrame=null;});
  }
  function newConversation(){const c=C.conversation(state);if(c.messages.length||c.text||c.attachments.length)C.create(state);persist();closePanel();showPreviewScreen("home");render();}
  document.getElementById("new-chat").addEventListener("click",newConversation);
  document.addEventListener("preview-screen-change",()=>{if(!layer.hidden)closePanel(true);});
  const layer=el("div","chat-layer");layer.hidden=true;phone.append(layer);
  let panel=null,origin=null,blocked=[],onClose=null,closeTimer=null,lastPanelControl=null;
  phone.addEventListener("pointerdown",event=>{lastPanelControl=event.target.closest("button");},{passive:true,capture:true});
  function closePanel(immediate=false,restoreFocus=true){clearTimeout(closeTimer);if(layer.hidden)return;const finish=()=>{layer.hidden=true;layer.classList.remove("is-closing","is-proposal-deck");blocked.forEach(([n,v])=>{n.inert=v;});blocked=[];if(onClose)onClose();onClose=null;if(restoreFocus){const focus=origin?.isConnected&&!origin.closest("[hidden]")?origin:document.getElementById("open-menu");focus.focus({preventScroll:true});}};if(immediate===true||matchMedia("(prefers-reduced-motion: reduce)").matches)finish();else{layer.classList.add("is-closing");closeTimer=setTimeout(finish,180);}}
  function openPanel(title,minimize=false){
    const target=lastPanelControl?.isConnected?lastPanelControl:document.activeElement?.matches("button")?document.activeElement:document.getElementById("open-menu");closePanel(true,false);origin=target;layer.replaceChildren();panel=el("section","chat-panel");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",title);panel.tabIndex=-1;
    const header=el("header","chat-panel-header");header.append(el("h2","",title),btn(minimize?"收起":"关闭",closePanel,"chat-panel-close"));panel.append(header);layer.append(panel);layer.hidden=false;
    blocked=Array.from(phone.children).filter(n=>n!==layer).map(n=>[n,n.inert]);blocked.forEach(([n])=>{n.inert=true;});panel.focus({preventScroll:true});return panel;
  }
  layer.addEventListener("click",e=>{if(e.target===layer)closePanel();});
  document.addEventListener("keydown",e=>{if(layer.hidden)return;if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();closePanel();}
    if(e.key==="Tab"){const all=Array.from(panel.querySelectorAll("button:not(:disabled),input,textarea,select,[tabindex='0']")).filter(n=>!n.hidden&&n.getClientRects().length&&!n.closest('[inert]'));const first=all[0],last=all.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel)){e.preventDefault();first?.focus();}}},true);
  function menuRow(name,text,fn,note){const b=btn("",fn,"chat-menu-row");b.append(icon(name),el("span","",text));if(note)b.append(el("small","",note));panel.append(b);return b;}
  function openAttachments(){openPanel("添加到对话");menuRow("file","上传文件",()=>pick("file"));menuRow("album","相册",()=>pick("album"));menuRow("camera","拍照",()=>pick("camera"));menuRow("command","快捷命令",()=>{},"稍后设计").disabled=true;panel.append(el("p","chat-panel-note",window.FolioApp?.native?"附件先保存在本机，发送对话时才提交给所选模型。":"附件仅保存在此浏览器，尚未上传给模型。"));}
  function formField(label,type,value,change){const wrap=el("label","chat-field",label),f=el(type==="select"?"select":type==="textarea"?"textarea":"input");if(f.tagName==="INPUT")f.type=type;f.value=value;f.setAttribute("aria-label",label);f.addEventListener(type==="select"?"change":"input",()=>change(f.value));wrap.append(f);return {wrap,input:f};}
  function selectField(label,value,options,change){const field=formField(label,"select",value,change);options.forEach(([v,t])=>{const o=el("option","",t);o.value=v;field.input.append(o);});field.input.value=value;return field;}
  function openModel(){
    if(window.FolioApp?.native){window.FolioLiveUI.openProvider();return;}
    openPanel("模型与思考");panel.append(el("p","chat-panel-note","连接厂商后自动读取可用模型。当前选项仅供界面预览，不会发起模型请求。"));
    const update=(key,value)=>{state.settings[key]=value;persist();render();};
    panel.append(selectField("模型厂商",state.settings.provider,[["unconnected","尚未连接"],["openai","OpenAI · 待连接"],["anthropic","Anthropic · 待连接"],["compatible","其他兼容接口 · 待连接"]],v=>update("provider",v)).wrap,
      selectField("模型",state.settings.model,[["auto","自动选择 · 未连接"],["general","通用模型 · 示例"],["reasoning","推理模型 · 示例"]],v=>update("model",v)).wrap,
      selectField("思考强度",state.settings.reasoning,[["auto","auto"],["low","low"],["medium","medium"],["high","high"]],v=>update("reasoning",v)).wrap,
      el("p","chat-panel-note","真实可调项目会随模型能力变化；不支持思考强度的模型将隐藏此项。"),btn("完成",closePanel,"chat-primary"));
  }
  function openHistory(){openPanel("对话历史");panel.append(el("p","chat-panel-note","保存在当前浏览器，包含消息、附件与未确认草稿。"));
    panel.append(btn("新建对话",newConversation,"chat-primary"));
    state.conversations.forEach(c=>{const row=el("div","chat-history-row"),b=btn("",()=>{state.activeId=c.id;persist();closePanel();showPreviewScreen("home");render();},"chat-history-open");
      b.append(el("strong","",c.title),el("small","",`${new Date(c.createdAt).toLocaleDateString("zh-CN")} · ${c.messages.filter(m=>m.role==="user").length} 条消息${c.text||c.attachments.length?" · 有未发送内容":""}`));row.append(b);if(c.proposals.some(p=>p.status==="pending"))row.append(el("span","chat-history-badge","待确认"));panel.append(row);
    });
  }
  function openProposal(c,p){
    if(p.operation){openLiveProposal(c,p);return;}
    if(homeworkState.items.some(item=>item.id===`chat-${p.id}`)){
      p.status="confirmed";persist();render();announce("这项修改已经保存，不会重复添加。");return;
    }
    openPanel("确认添加",true);panel.append(el("p","chat-panel-note","本地流程演示：尚未识别消息或图片，请填写并检查。收起、离开页面或刷新都会保留；确认后才加入待办。"));
    const form=el("form","chat-proposal-form");form.noValidate=true;const f=p.fields;
    const write=(key,v)=>{f[key]=v;persist();};
    const title=formField("标题","text",f.title,v=>write("title",v));title.input.required=true;title.input.maxLength=200;
    const body=formField("内容","textarea",f.body,v=>write("body",v));
    const kind=selectField("添加为",f.kind,[["todo","待办"],["lesson","上课／实验"],["event","活动／事项"],["homework","自定义作业"]],v=>write("kind",v));
    const day=formField("截止日期","text",f.deadline,v=>write("deadline",v));day.input.type="hidden";
    const dateButton=btn(f.deadline||"选择日期",()=>{dateChooser.hidden=!dateChooser.hidden;dateButton.setAttribute("aria-expanded",String(!dateChooser.hidden));},"chat-date-button");dateButton.setAttribute("aria-label","选择截止日期");dateButton.setAttribute("aria-expanded","false");
    const dateChooser=el("div","chat-date-chooser");dateChooser.hidden=true;
    const dateCalendar=FolioDate.create(f.deadline,v=>{day.input.value=v;dateButton.textContent=v;dateChooser.hidden=true;dateButton.setAttribute("aria-expanded","false");write("deadline",v);dateButton.focus();},{fallback:homeworkState.today});dateChooser.append(dateCalendar.element);day.wrap.append(dateButton);
    const clock=formField("截止时间（可不填）","time",f.clock,v=>write("clock",v));
    const dates=el("div","chat-field-row");dates.append(day.wrap,clock.wrap);
    const check=el("label","chat-check"),queue=el("input");queue.type="checkbox";queue.checked=f.queued;queue.addEventListener("change",()=>write("queued",queue.checked));check.append(queue,document.createTextNode("加入便签推荐队列"));
    const validation=el("p","chat-form-error");validation.setAttribute("role","alert");
    const actions=el("div","chat-panel-actions"),discard=btn("舍弃",()=>{p.status="discarded";if(persist()){closePanel();render();}else p.status="pending";},"chat-secondary danger"),confirm=el("button","chat-primary","确认添加");confirm.type="submit";
    actions.append(discard,confirm);form.append(title.wrap,body.wrap,kind.wrap,dates,dateChooser,check,validation,actions);panel.append(form);
    form.addEventListener("submit",e=>{e.preventDefault();if(p.status!=="pending")return;
      try{
        const todo=C.toTodo(p);FolioTodo.validate(todo);
        // 先持久化待办，再完成提案。固定 ID 让刷新/重试不会重复新增。
        if(!homeworkState.items.some(item=>item.id===todo.id)){
          const next={...homeworkState,items:[...homeworkState.items,todo]};
          localStorage.setItem(homeworkDemo.storageKey,JSON.stringify(next));homeworkState.items.push(todo);commit();
        }
        p.status="confirmed";
        if(!persist()){p.status="pending";validation.textContent="记录已添加，但确认状态尚未保存。可重试确认，不会重复添加。";return;}
        closePanel();render();announce("已保存到本地");
      }catch(err){validation.textContent=err.name==="QuotaExceededError"?"本机空间不足，未能保存，请保留草稿后重试。":err.message;}
    });
    onClose=()=>{render();};
  }
  // 侧栏提供历史入口，返回首页后也能找到任意对话与未确认修改。
  function openLiveProposal(c,p){
    const remove=p.operation.startsWith("delete_"),exam=p.operation.endsWith("exam"),create=p.operation.startsWith("create_");
    openPanel(remove?"确认删除":p.operation==="create_lesson"?"确认添加课程安排":p.operation==="create_homework"?"确认添加作业":create?"确认添加":"确认修改",true);
    panel.append(el("p","chat-panel-note","尚未执行。可以修改后确认；收起、切换页面或短暂退出都会保留，只有确认或取消才结束这次修改。"));
    const form=el("form","chat-proposal-form"),f=p.fields;Object.assign(f,FolioItemPolicy.normalizeTime(f));let options=null,reminders=null;
    const target=(exam?[...customExamRecords,...officialExamRecords]:homeworkState.items).find(r=>r.id===p.targetId)||{};
    const write=(key,value)=>{f[key]=value;persist();};
    const field=(label,key,type="text",fallback="")=>{const entry=formField(label,type,f[key]??target[key]??fallback,value=>write(key,value));form.append(entry.wrap);return entry;};
    if(remove)form.append(el("h3","",target.title||"所选事项"));
    else{
      field("标题","title");field("内容","body","textarea");
      if(exam){field("日期","date","date");field("开始","start","time");field("结束","end","time");field("类型","type","text","小测");field("教室","room");field("座号","seat");field("备注","note","textarea");}
      else{
        const kind=selectField("类型",f.kind??(p.operation==="create_homework"?"homework":p.operation==="create_lesson"?"lesson":target.kind??"todo"),[["todo","待办"],["lesson","上课／实验"],["event","活动／事项"],["homework","自定义作业"]],v=>write("kind",v));form.append(kind.wrap);field("科目／关联课程（选填）","course");field("地点（事项选填）","location");
        const time=selectField("时间安排",f.timeMode??target.timeMode??(f.deadline?"deadline":f.startAt?"range":"none"),[["none","不设时间"],["deadline","截止时间"],["range","特定时间段"],["pending","时间待定"]],v=>{write("timeMode",v);day.wrap.hidden=clock.wrap.hidden=v!=="deadline";start.wrap.hidden=end.wrap.hidden=v!=="range";scheduled.wrap.hidden=v!=="pending";});form.append(time.wrap);
        const day=field("截止日期","deadline","date"),clock=field("截止时刻（选填）","clock","time",target.deadlineClock||""),start=field("开始时间","startAt","datetime-local"),end=field("结束时间","endAt","datetime-local");
        const scheduled=field("安排日期（选填）","scheduledDay","date");scheduled.wrap.hidden=time.input.value!=="pending";
        day.wrap.hidden=clock.wrap.hidden=time.input.value!=="deadline";start.wrap.hidden=end.wrap.hidden=time.input.value!=="range";
        form.append(selectField("重复",f.repeatKind??target.repeat?.kind??"none",[["none","不重复"],["daily","每天"],["weekly","每周"],["monthly","每月"]],v=>write("repeatKind",v)).wrap);
        reminders=FolioItemOptions.reminders(form,{...target,...f});options=FolioItemOptions.mount(form,{...target,...f,kind:f.kind??target.kind??(p.operation==="create_lesson"?"lesson":"todo")},value=>{Object.assign(f,value);persist();});reminders.input.addEventListener("change",()=>{try{f.reminderOffsets=reminders.read();persist();}catch{}});kind.input.addEventListener("change",()=>options.setKind(kind.input.value));
        for(const [key,label] of [["important","重要"],["urgent","紧急"],["completed","已完成"]]){const wrap=el("label","chat-check"),check=el("input");check.type="checkbox";check.checked=Boolean(f[key]??target[key]);check.addEventListener("change",()=>write(key,check.checked));wrap.append(check,document.createTextNode(label));form.append(wrap);}

      }
    }
    const error=el("p","chat-form-error");error.setAttribute("role","alert");const actions=el("div","chat-panel-actions"),cancel=btn("取消这次修改",()=>{p.status="discarded";if(persist()){closePanel();render();}else p.status="pending";},"chat-secondary danger"),ok=el("button","chat-primary",remove?"确认删除":"确认保存");ok.type="submit";actions.append(cancel,ok);form.append(error,actions);panel.append(form);
    form.addEventListener("submit",event=>{event.preventDefault();try{if(options){Object.assign(f,options.read());f.reminderOffsets=reminders.read();persist();}FolioAgentRuntime.confirm(p);if(!persist()){p.status="pending";throw new Error("记录已保存，但确认状态未保存，请重试。");}closePanel();render();announce("修改已保存");}catch(err){error.textContent=err.message;}});onClose=()=>render();
  }
  // Reuse the existing modal lifetime, focus trap and Android back handling.
  // The external agent's second overlay could restore inert after an editor opened.
  function openProposalDeck(entries){
    openPanel("待确认修改",true);
    panel.classList.add("chat-deck");layer.classList.add("is-proposal-deck");
    const track=el("div","chat-deck-track");panel.append(track);
    const labels={kind:"类型",course:"科目",location:"地点",deadline:"截止日期",clock:"截止时间",startAt:"开始",endAt:"结束",date:"日期",start:"开始",end:"结束",room:"教室",seat:"座号",note:"备注",body:"内容",repeatKind:"重复",reminderMinutes:"提前提醒（分钟）",important:"重要",urgent:"紧急",placements:"显示位置",scheduledDay:"待定安排日期",reminderOffsets:"多个提前提醒（分钟）",queued:"加入工作台队列",completed:"已完成"};
    const values={lesson:"上课／实验",calendar:"日程",timetable:"课表",todos:"待办列表",home:"首页当天栏",pending:"时间待定",event:"事项",homework:"作业",todo:"待办",none:"不重复",daily:"每天",weekly:"每周",monthly:"每月"};
    function removeCard(card){
      card.classList.add("is-leaving");
      const delay=matchMedia("(prefers-reduced-motion: reduce)").matches?0:180;
      setTimeout(()=>{
        const rest=[...track.children].filter(n=>n!==card),positions=rest.map(n=>n.getBoundingClientRect().left);
        card.remove();
        if(!track.children.length){closePanel();return;}
        if(!matchMedia("(prefers-reduced-motion: reduce)").matches)rest.forEach((n,i)=>n.animate([{transform:`translateX(${positions[i]-n.getBoundingClientRect().left}px)`},{transform:"none"}],{duration:220,easing:"cubic-bezier(.22,1,.36,1)"}));
      },delay);
    }
    entries.forEach(({conversation,proposal:p})=>{
      if(p.status!=="pending"||!p.operation)return;
      const target=(p.operation.endsWith("exam")?[...customExamRecords,...officialExamRecords]:homeworkState.items).find(r=>r.id===p.targetId)||{},f=p.fields||{},remove=p.operation.startsWith("delete_");
      const card=el("article","chat-deck-card"),heading=el("h3","",f.title||target.title||"待确认修改"),action=el("p","chat-deck-operation",remove?"删除":p.operation==="create_homework"?"添加作业":p.operation.startsWith("create_")?"添加":"修改");
      card.append(action,heading);
      const details=el("dl","chat-deck-details");
      for(const [key,label] of Object.entries(labels)){
        const value=f[key]??target[key];if(value==null||value==="")continue;
        details.append(el("dt","",label),el("dd","",typeof value==="boolean"?(value?"是":"否"):values[value]||String(value).replace("T"," ")));
      }
      if(!details.children.length)details.append(el("dd","chat-panel-note","打开编辑可核对完整内容。"));
      const error=el("p","chat-form-error");error.setAttribute("role","alert");
      const actions=el("div","chat-deck-actions"),discard=btn("舍弃",()=>{if(p.status!=="pending")return;p.status="discarded";if(persist()){removeCard(card);render();}else p.status="pending";},"chat-secondary danger"),edit=btn("编辑",()=>openProposal(conversation,p),"chat-secondary"),ok=btn(remove?"确认删除":"确认",()=>{
        if(p.status!=="pending")return;
        try{FolioAgentRuntime.confirm(p);if(!persist()){p.status="pending";throw new Error("记录已保存，确认状态未保存，可重试。");}actions.querySelectorAll("button").forEach(b=>b.disabled=true);removeCard(card);render();announce("修改已保存");}catch(err){error.textContent=err.message;}
      },"chat-primary");
      actions.append(discard,edit,ok);card.append(details,error,actions);track.append(card);
    });
  }
  window.FolioChatUI={state:()=>state,persist,render,openModel,openProposal,openPanel,closePanel,openProposalDeck};
  document.addEventListener("folio-native-background",()=>persist());
  const historyItem=el("li"),sideHistory=btn("",openHistory,"menu-entry");sideHistory.append(icon("history"),el("span","","对话历史"));historyItem.append(sideHistory);const homeItem=el("li"),sideHome=btn("",()=>showPreviewScreen("home"),"menu-entry");sideHome.dataset.feature="home";sideHome.setAttribute("aria-label","打开首页");const homeIcon=document.createElementNS("http://www.w3.org/2000/svg","svg");homeIcon.setAttribute("viewBox","0 0 24 24");homeIcon.setAttribute("aria-hidden","true");homeIcon.innerHTML='<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>';sideHome.append(homeIcon,el("span","","首页"));homeItem.append(sideHome);document.getElementById("primary-menu").prepend(homeItem,historyItem);
  render();
})();
