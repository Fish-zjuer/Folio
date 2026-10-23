/* Synthetic visual sample only; no real model requests or personal writes. */
document.addEventListener('DOMContentLoaded',()=>{if(!new URLSearchParams(location.search).has('demo'))return;setTimeout(()=>{
 document.querySelector('#qa-native-status')?.closest('aside').remove();
 const state=FolioChatUI.state(),c=FolioChat.create(state),user={id:'demo-agent-user',role:'user',text:'把这份实验报告收回待贴袋，先让我确认。',createdAt:new Date().toISOString()};
 const reply={id:'demo-agent-reply',role:'assistant',text:'已整理为待确认修改。确认后只调整本地便签挂载，学校原始作业保持不变。',replyTo:user.id,createdAt:user.createdAt,status:'done',pending:false,progress:[
  {kind:'thinking',text:'先找到对应的实验报告，再核对本地可改字段。'},
  {kind:'tool',id:'a',name:'search_records',text:'检索本机记录',status:'done'},
  {kind:'tool',id:'b',name:'read_record',text:'读取记录详情',status:'done'},
  {kind:'thinking',text:'只收回便签，保留原题目和截止时间，不重复创建作业。'},
  {kind:'tool',id:'c',name:'draft_change',text:'准备待确认修改',status:'done'},
  {kind:'plan',text:'等待你确认，尚未执行修改。'}
 ]};c.messages.push(user,reply);FolioChatUI.render();showPreviewScreen('home',{focus:false});requestAnimationFrame(()=>{const p=document.querySelector('.chat-progress');if(p)p.open=true;});
 },200);});
