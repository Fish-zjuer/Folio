(() => {
  'use strict';const KEY='folio-focus-study-v1',F=FolioFocus,B=FolioBuilding;let state=F.clean();try{state=F.restore(JSON.parse(localStorage.getItem(KEY)))}catch{}
  const $=s=>document.querySelector(s),text=(node,value)=>{if(node.textContent!==value)node.textContent=value};
  let preview=!state.active||state.active.runningFrom===null,previewMinutes=45,sceneKey='',clockValue='';
  const NS='http://www.w3.org/2000/svg';function el(p,t,a={}){const n=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,String(v)));p.append(n);return n}
  const card=document.createElement('button');card.type='button';card.className='focus-building-card';$('#focus-card').append(card);const svg=el(card,'svg',{viewBox:'0 0 240 240','aria-hidden':'true'}),scene=el(svg,'g',{}),clock=el(svg,'text',{x:20,y:40,class:'build-number'});const goal=el(svg,'text',{x:64,y:40,class:'build-goal'});goal.textContent='/ 45';el(svg,'path',{d:'M202 26l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',fill:'#d0ba89'});
  const panel=$('#build-dialog'),collectionDialog=$('#collection-dialog');
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
  function minutes(ms){return Math.floor(Math.max(0,ms)/60000)}
  function render(){const now=Date.now();if(B.complete(state,now)){state.sessions.at(-1).building.variant=B.collection(state).length-1;save()}
    const collected=B.collection(state),last=state.sessions.at(-1),active=state.active,running=active&&active.runningFrom!==null,elapsed=B.elapsed(state,now),shown=preview?previewMinutes:elapsed/60000,stage=Math.floor(shown/45*12),variant=preview?0:active?collected.length:last?.building?Math.max(0,collected.length-1):collected.length,key=stage+'-'+variant;
    if(key!==sceneKey){FolioBuildingArt.draw(scene,shown,variant,sceneKey!=='');sceneKey=key}
    const value=String(Math.floor(shown));if(value!==clockValue){text(clock,value);goal.setAttribute('x',20+Math.max(1,value.length)*19+9);clockValue=value}
    text($('#focus-caption'),preview?'搭建预览 · 示例不会进入小屋记录':running?'专注搭建中':active?'已暂停，积木保留':last?.building?'小屋已建好，已存入记录':last?.buildingDraft?'施工进度已保留，可以接着搭':'进入专注，开始搭建');
    card.setAttribute('aria-label',(preview?'预览，':'本机搭建，')+Math.floor(shown)+' / 45 分钟，'+(shown>=45?'小屋已建好':'搭建进度 '+stage+' / 12')+'，打开专注面板');
    $('#preview-mode').setAttribute('aria-pressed',String(preview));$('#local-mode').setAttribute('aria-pressed',String(!preview));$('#preview-mode').disabled=Boolean(running);$('#preview-minutes').disabled=Boolean(running);text($('#preview-value'),previewMinutes+' 分钟');text($('#open-collection'),'小屋记录 · '+collected.length);
    text($('#build-title'),running?'正在搭建':active?'暂停一下':last?.building?'小屋已建好':last?.buildingDraft?'这间还可以接着搭':'开始一间小屋');text($('#build-time'),minutes(elapsed)+' / 45 分钟');text($('#build-summary'),'今天累计 '+minutes(F.totalsByDay(state,now)[F.dayKey(now)]||0)+' 分钟 · 已建好 '+collected.length+' 间');text($('#build-primary'),running?'暂停':active||last?.buildingDraft?'接着搭':collected.length?'再搭一间':'开始搭建');$('#build-rest').disabled=!active;
  }
  function openPanel(){preview=false;render();panel.showModal()}
  card.onclick=openPanel;$('#open-focus').onclick=openPanel;
  $('#build-primary').onclick=()=>{const now=Date.now();if(state.active&&state.active.runningFrom!==null)F.pause(state,now);else B.begin(state,now);preview=false;save();render()};
  $('#build-rest').onclick=()=>{B.rest(state,Date.now());preview=false;save();render()};
  $('#preview-mode').onclick=()=>{if(state.active&&state.active.runningFrom!==null)return;preview=true;render()};$('#local-mode').onclick=()=>{preview=false;render()};$('#preview-minutes').addEventListener('input',e=>{previewMinutes=Number(e.target.value);preview=true;render()});
  function showCollection(){render();const holder=$('#house-records');holder.replaceChildren();const records=B.collection(state);text($('#collection-count'),'已建好 '+records.length+' 间');const cards=records.map((record,i)=>({...record,variant:record.variant??i,minutes:45}));
    const last=state.sessions.at(-1);if(state.active||last?.buildingDraft)cards.push({minutes:B.elapsed(state,Date.now())/60000,completedAt:null,variant:records.length});
    if(!cards.length){const empty=document.createElement('p');empty.className='houses-empty';empty.textContent='建好第一间小屋后，会留在这里。';holder.append(empty)}
    cards.reverse().forEach(record=>{const item=document.createElement('article');item.className='house-record';const image=el(item,'svg',{viewBox:'20 35 200 172',role:'img','aria-label':record.completedAt?'已建成的小屋':'施工中的小屋'});FolioBuildingArt.draw(image,record.minutes,record.variant);const label=document.createElement('p');label.textContent=record.completedAt?F.dayKey(record.completedAt)+' · 45 分钟':'施工中 · '+Math.floor(record.minutes)+' 分钟';item.append(label);holder.append(item)});collectionDialog.showModal();
  }
  $('#open-collection').onclick=showCollection;
  document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{$('#focus-card').style.width=b.dataset.size+'px';document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
  for(const dialog of [panel,collectionDialog]){let timer;function close(){if(dialog.classList.contains('is-closing'))return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return}dialog.classList.add('is-closing');timer=setTimeout(()=>dialog.close(),220)}dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();close()});dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('close',()=>{clearTimeout(timer);dialog.classList.remove('is-closing')});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}})}
  document.addEventListener('visibilitychange',render);setInterval(render,1000);render();
})();
