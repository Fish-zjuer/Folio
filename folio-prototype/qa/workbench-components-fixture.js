/* Isolated-port functional checks. Triggered explicitly, uses the real palette and reorder handlers. */
(()=>{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),root=document.createElement('aside'),run=document.createElement('button'),results=document.createElement('pre');
 root.style='position:fixed;left:8px;top:8px;z-index:1000;max-width:250px;font:11px/1.6 monospace;background:#f6f0e3;color:#786647;padding:10px;border:1px solid #d6c5a7';run.textContent='运行工作台交互检查';run.type='button';root.append(run,results);document.body.append(root);
 const errors=[];window.addEventListener('error',e=>errors.push(e.message));
 function check(name,ok){results.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';if(!ok)throw new Error(name)}
 run.onclick=async()=>{run.disabled=true;results.textContent='';const saved=localStorage.getItem('folio-qa-workbench-components-v1');try{
  showPreviewScreen('workbench',{focus:false});await sleep(340);const grid=document.querySelector('.workbench-grid');
  for(let i=0;i<4;i++){if(grid.children[i].classList.contains('has-widget')){FolioWorkbench.openPicker(i);document.querySelector('.workbench-leave-empty').click();await sleep(220)}}
  check('默认四个虚线加号',grid.querySelectorAll('.workbench-add').length===4);
  grid.children[0].querySelector('button').click();await sleep(80);const palette=document.querySelector('.workbench-picker'),choices=document.querySelector('.workbench-choices'),card=document.querySelector('.workbench-picker-card'),phone=document.querySelector('.phone');
  check('加号打开浮层并指向左上',!palette.hidden&&document.querySelector('#workbench-picker-title').textContent.includes('左上'));
  check('浮层在手机内、列表可独立滚动',card.getBoundingClientRect().width<phone.clientWidth&&choices.scrollHeight>choices.clientHeight);check('缩略图不接收交互且交还纵向滚动', [...choices.querySelectorAll('.workbench-choice-preview')].every(n=>n.inert&&getComputedStyle(n).pointerEvents==='none'&&getComputedStyle(n).touchAction==='pan-y'));
  choices.querySelector('button').click();await sleep(240);const first=grid.children[0].querySelector('.workbench-slot-content').firstElementChild;check('添加后只填左上',FolioWorkbench.getLayout()[0]==='sample-pressure'&&grid.querySelectorAll('.workbench-add').length===3);
  grid.children[1].querySelector('button').click();choices.querySelectorAll('button')[1].click();await sleep(240);check('加第二格不重建第一格',first===grid.children[0].querySelector('.workbench-slot-content').firstElementChild);
  const before=FolioWorkbench.getLayout(),a=grid.children[0].getBoundingClientRect(),b=grid.children[1].getBoundingClientRect(),source=grid.children[0].querySelector('.workbench-slot-content');const x=a.left+a.width/2,y=a.top+a.height/2,tx=b.left+b.width/2,ty=b.top+b.height/2;
  const pointer=(target,type,cx,cy)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:501,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:cx,clientY:cy}));
  pointer(source,'pointerdown',x,y);await sleep(450);check('长按进入外部编辑与拿起状态',grid.classList.contains('is-widget-reordering')&&!document.querySelector('.workbench-edit-tools').hidden&&!grid.querySelector('.workbench-change'));pointer(window,'pointermove',tx,ty);check('拖动随手且标记落点',grid.children[0].style.transform.includes('translate')&&grid.children[1].classList.contains('is-widget-drop'));pointer(window,'pointerup',tx,ty);await sleep(250);
  check('松手交换且保留原组件节点',FolioWorkbench.getLayout()[0]===before[1]&&FolioWorkbench.getLayout()[1]===before[0]&&grid.children[1].querySelector('.workbench-slot-content').firstElementChild===first);
  grid.children[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true,cancelable:true}));check('可换到空格',FolioWorkbench.getLayout()[1]===null&&FolioWorkbench.getLayout()[3]===before[0]);
  const prior=FolioWorkbench.getLayout().join(','),r=grid.children[3].getBoundingClientRect(),rx=r.left+r.width/2,ry=r.top+r.height/2;pointer(grid.children[3].querySelector('.workbench-slot-content'),'pointerdown',rx,ry);await sleep(450);pointer(window,'pointermove',-30,-30);pointer(window,'pointerup',-30,-30);await sleep(250);check('区域外松手取消',FolioWorkbench.getLayout().join(',')===prior);
  check('没有捕获到运行错误',errors.length===0);results.textContent+='DONE\n';
 }catch(e){results.textContent+='ERROR '+e.message+'\n'}finally{if(saved===null)localStorage.removeItem('folio-qa-workbench-components-v1');else localStorage.setItem('folio-qa-workbench-components-v1',saved);run.disabled=false}};
 document.addEventListener('DOMContentLoaded',()=>showPreviewScreen('workbench',{focus:false}));
})();


