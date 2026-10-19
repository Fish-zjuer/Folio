/* The current approved artwork is still sample content; registration does not claim a live data connection. */
(()=>{
 'use strict';if(!window.FolioWorkbench)return;
 const items=[
  ['pressure','每日压力','daily-pressure.html'],['day','一日日程','day-schedule.html'],['gaps','可用空档','free-gaps.html'],['usage','手机使用','phone-usage.html'],['focus','专注搭建','focus.html'],['mountain','像素挖山','pixel-mountain.html'],['recall','记忆提醒','recall.html'],['news','资讯剪报','news.html'],['books','课本堆','book-stack.html'],['finals','期末与目标','finals.html'],['deadlines','截止倒计时','deadlines.html']
 ];
 // All approved cards remain discoverable; live adapters supply their host renderers.
 FolioWorkbench.registerMany(items.map(([key,label])=>({id:'sample-'+key,label,description:'本地组件',mount(){},preview(){}})));
})();
