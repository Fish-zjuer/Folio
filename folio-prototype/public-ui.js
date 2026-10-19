(function(){
  "use strict";
  const phone=document.querySelector(".phone"),home=document.getElementById("home-screen");
  const oldBadge=document.querySelector('.profile-badge');
  if(oldBadge){
    const badge=document.createElement('button');badge.type='button';badge.className='profile-badge';oldBadge.replaceWith(badge);
    let personalMark='';try{personalMark=localStorage.getItem('folio-profile-mark')||'';}catch{}
    const clean=value=>Array.from(value.trim().replace(/[\s\p{C}]/gu,'')).slice(0,2).join('').toLocaleUpperCase();
    function paintBadge(){badge.replaceChildren();badge.setAttribute('aria-label',personalMark?'修改个人标识：'+personalMark:'设置姓氏或首字母');if(personalMark){badge.textContent=personalMark;return;}const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.innerHTML='<circle cx="12" cy="8" r="3.3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>';badge.append(svg);}
    paintBadge();badge.addEventListener('click',()=>{
      const box=FolioChatUI.openPanel('个人标识'),field=document.createElement('label'),input=document.createElement('input'),note=document.createElement('p'),actions=document.createElement('div'),reset=document.createElement('button'),save=document.createElement('button');field.className='chat-field';field.textContent='姓氏或首字母';input.value=personalMark;input.placeholder='例如：陈 / F';input.maxLength=4;input.autocomplete='off';input.enterKeyHint='done';field.append(input);note.className='chat-panel-note';note.textContent='最多两个字或字母，仅保存在本机。';actions.className='chat-panel-actions';reset.type=save.type='button';reset.className='chat-secondary';reset.textContent='清除';save.className='chat-primary';save.textContent='保存';
      function commit(value){const next=clean(value);try{if(next)localStorage.setItem('folio-profile-mark',next);else localStorage.removeItem('folio-profile-mark');personalMark=next;paintBadge();FolioChatUI.closePanel();}catch{note.textContent='暂时无法保存，请重试。';}}
      save.onclick=()=>commit(input.value);reset.onclick=()=>commit('');input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();commit(input.value);}});actions.append(reset,save);box.append(field,note,actions);
    });
  }
  const homePath='<path d="m3 10 9-7 9 7v10H3Zm6 10v-7h6v7"/>';
  function homeIcon(){const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("aria-hidden","true");svg.innerHTML=homePath;return svg;}
  document.querySelectorAll(".settings-header").forEach(header=>{
    const actions=document.createElement("div");actions.className="app-header-actions";const previous=header.children[2];if(previous){if(previous.tagName!=="SPAN"||previous.children.length||previous.textContent.trim())actions.append(previous);else previous.remove();}
    const button=document.createElement("button");button.type="button";button.className="app-home-button";button.setAttribute("aria-label","返回首页");button.append(homeIcon());button.addEventListener("click",()=>showPreviewScreen("home"));actions.append(button);header.append(actions);
  });
  document.getElementById("close-menu").replaceChildren(homeIcon());
  const greeting=home.querySelector(".greeting"),welcome=document.createElement("div");welcome.className="home-welcome";greeting.before(welcome);
  const mark=document.createElementNS("http://www.w3.org/2000/svg","svg");mark.setAttribute("viewBox","0 0 48 48");mark.setAttribute("aria-hidden","true");mark.classList.add("home-welcome-mark");mark.innerHTML='<path d="M24 12c-5-5-12-5-19-3v27c7-2 14-2 19 3 5-5 12-5 19-3V9c-7-2-14-2-19 3Zm0 0v27M11 15c3-.5 6 0 8 1.5M11 22c3-.5 6 0 8 1.5M29 16.5c2-1.5 5-2 8-1.5M29 23.5c2-1.5 5-2 8-1.5"/>';welcome.append(mark,greeting);
  function greet(){const hour=Number(new Intl.DateTimeFormat("en-GB",{hour:"numeric",hourCycle:"h23",timeZone:"Asia/Shanghai"}).format(new Date()));greeting.textContent=hour<6?"夜深了":hour<12?"上午好":hour<18?"下午好":"晚上好";}
  greet();setInterval(greet,60000);
  if(window.FolioApp?.native){
    const notificationRow=[...document.querySelectorAll(".setting-row")].find(row=>row.querySelector(".setting-title")?.textContent==="推送成绩变动");
    if(notificationRow){
      const enabled=()=>localStorage.getItem("folio-grade-notifications")!=="off",toggle=notificationRow.querySelector(".setting-switch");notificationRow.disabled=false;notificationRow.setAttribute("aria-label","成绩更新通知设置");toggle?.classList.toggle("is-on",enabled());
      notificationRow.addEventListener("click",()=>{const box=FolioChatUI.openPanel("成绩更新通知"),label=document.createElement("label"),check=document.createElement("input"),note=document.createElement("p"),status=document.createElement("p"),allow=document.createElement("button"),settings=document.createElement("button");label.className="chat-check";check.type="checkbox";check.checked=enabled();label.append(check,document.createTextNode("通知我有新成绩"));note.className="chat-panel-note";note.textContent="首次同步已有成绩不会通知。后续同步发现新出分或更正时，App 在后台才发系统通知，通知中不显示分数。当前版本需主动同步，不会在后台定期查分。";status.className="chat-panel-note";allow.type=settings.type="button";allow.className=settings.className="chat-secondary";allow.textContent="允许系统通知";settings.textContent="系统通知设置";box.append(label,note,status,allow,settings);
        async function refresh(){try{const result=await FolioNative.call("app.notification.status");if(box.isConnected)status.textContent=result.allowed?"系统已允许通知":"系统尚未允许通知";}catch{status.textContent="暂时无法读取系统通知权限";}}
        check.addEventListener("change",()=>{try{localStorage.setItem("folio-grade-notifications",check.checked?"on":"off");toggle?.classList.toggle("is-on",check.checked);}catch{announce("未能保存通知设置");}});allow.addEventListener("click",()=>FolioNative.call("app.notification.permission").catch(()=>announce("未能打开通知授权")));settings.addEventListener("click",()=>FolioNative.call("app.notification.settings").catch(()=>announce("未能打开系统设置")));const update=()=>{if(box.isConnected&&!box.closest("[hidden]"))refresh();else window.removeEventListener("folio-notification-permission",update);};window.addEventListener("folio-notification-permission",update);refresh();
      });
    }
  }
  const toolsGroup=[...document.querySelectorAll('.settings-section')].find(s=>s.querySelector('h2')?.textContent==='外观与工具')?.querySelector('ul');
  if(toolsGroup){const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='setting-row';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+folioIcons.clock+'</svg><span class="setting-label"><span class="setting-title">手机使用时长</span><span class="setting-subtitle">系统授权与每日参考值</span></span>';button.onclick=()=>window.FolioUsageUI?.open(button);li.append(button);toolsGroup.append(li);}
  let chromeFrame=null,lastChrome="";
  function syncChrome(){
    chromeFrame=null;if(!window.FolioApp?.native)return;
    let remaining=1;const base=getComputedStyle(document.documentElement).getPropertyValue("--bg-canvas").trim()||"#F9F9F7",rgb=[1,3,5].map(i=>parseInt(base.slice(i,i+2),16));
    phone.querySelectorAll("#homework-shade,#sheet-shade,.chat-layer,.workbench-reading-shade,.workbench-shade,.folio-choice-shade").forEach(shade=>{
      if(shade.closest("[hidden],.is-closing")||!shade.getClientRects().length)return;const style=getComputedStyle(shade);if(style.visibility==="hidden")return;const channels=style.backgroundColor.match(/[\d.]+/g)||[];const alpha=(channels.length===4?Number(channels[3]):channels.length===3?1:0)*Number(style.opacity);remaining*=1-alpha;rgb.forEach((value,i)=>rgb[i]=value*(1-alpha)+Number(channels[i]||0)*alpha);
    });
    const payload={theme:document.documentElement.dataset.colorMode||"system",dim:Math.round((1-remaining)*1000)/1000,color:base,resolvedColor:"#"+rgb.map(v=>Math.round(v).toString(16).padStart(2,"0")).join(""),duration:180},key=JSON.stringify(payload);if(key===lastChrome)return;lastChrome=key;FolioNative.call("app.chrome",payload).catch(()=>{});
  }
  new MutationObserver(()=>{if(!chromeFrame)chromeFrame=requestAnimationFrame(syncChrome);}).observe(phone,{subtree:true,attributes:true,attributeFilter:["hidden","class","style"],childList:true});document.addEventListener("folio-theme-change",syncChrome);syncChrome();
  window.addEventListener("folio-open-grade",event=>{const id=event.detail?.gradeId;if(id&&window.FolioAcademicUI?.openGrade)FolioAcademicUI.openGrade(id);});
})();
