/* Synthetic visual preview on the isolated QA origin; never writes the user's app origin. */
document.addEventListener('DOMContentLoaded',async()=>{
 if(location.port!=='4192')return;
 await FolioSchool.sync();showPreviewScreen('workbench',{focus:false});
 const desired=['每日压力','可用空档','专注搭建','像素挖山'];
 for(let index=0;index<4;index++){
  FolioWorkbench.openPicker(index);
  const choices=[...document.querySelectorAll('.workbench-choice-item')];
  const label=desired[index];
  const choice=choices.find(n=>n.querySelector('h3')?.textContent===label)||choices[index];
  choice?.querySelector('.workbench-choice-add').click();
  await new Promise(resolve=>setTimeout(resolve,190));
 }
 document.querySelector('.workbench-slot.has-widget')?.dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}));
});
