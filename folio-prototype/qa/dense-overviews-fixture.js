/* Isolated workbench layout, shared read-only app data. No changes to the user's installed slots. */
document.addEventListener('DOMContentLoaded',()=>{
  showPreviewScreen('workbench',{focus:false});
  const grid=document.querySelector('.workbench-grid');
  for(const [index,id] of [[0,'overview-academic'],[1,'overview-affairs']]){
    const installed=FolioWorkbench.getLayout()[index];if(installed===id)continue;
    grid.children[index].querySelector(installed?'.workbench-change':'.workbench-add').click();
    const label=id==='overview-academic'?'学业总览':'事务总览';
    document.querySelector(`.workbench-choice-add[aria-label="添加${label}到${index===0?'左上':'右上'}"]`).click();
  }
  if(new URLSearchParams(location.search).has('verify')){
    const check=document.createElement('button');check.textContent='检查数字组件拖放';check.style='position:fixed;top:8px;left:8px;z-index:1000;padding:12px;color:#796b53;background:#eee5d3;border:1px solid #cebea0';document.body.append(check);
    check.onclick=async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms)),source=grid.children[0].querySelector('.overview-courses'),from=grid.children[0].getBoundingClientRect(),to=grid.children[1].getBoundingClientRect(),before=FolioWorkbench.getLayout().join(',');
      const pointer=(node,type,x,y)=>node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:8801,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y}));
      pointer(source,'pointerdown',from.x+from.width/2,from.y+from.height/2);await wait(450);
      const held=grid.classList.contains('is-widget-reordering');pointer(window,'pointermove',to.x+to.width/2,to.y+to.height/2);pointer(window,'pointerup',to.x+to.width/2,to.y+to.height/2);await wait(230);
      const swapped=FolioWorkbench.getLayout()[1]==='overview-academic';
      source.click();const noNavigation=currentScreen==='workbench';
      grid.children[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true,cancelable:true}));
      check.textContent=held&&swapped&&noNavigation&&FolioWorkbench.getLayout().join(',')===before?'PASS 长按、换位、防误点、恢复':'FAIL 拖放检查';
    };
  }
});
