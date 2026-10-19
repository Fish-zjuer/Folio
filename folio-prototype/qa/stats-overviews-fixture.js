document.addEventListener('DOMContentLoaded',()=>{
 showPreviewScreen('workbench',{focus:false});
 const grid=document.querySelector('.workbench-grid'),names=['专注账本','任务账本','课程统计','学业总览'],ids=['stats-focus','stats-tasks','stats-semester','overview-academic'],positions=['左上','右上','左下','右下'];
 for(let i=0;i<4;i++){const saved=FolioWorkbench.getLayout()[i];if(saved===ids[i])continue;grid.children[i].querySelector(saved?'.workbench-change':'.workbench-add').click();document.querySelector(`.workbench-choice-add[aria-label="添加${names[i]}到${positions[i]}"]`).click();}
});
