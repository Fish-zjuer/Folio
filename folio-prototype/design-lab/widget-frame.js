(()=>{
 if(new URLSearchParams(location.search).get('embed')!=='1')return;
 const cards={'phone-usage.html':'usage-card','day-schedule.html':'day-card','deadlines.html':'deadline-card','free-gaps.html':'gaps-card','finals.html':'finals-card','recall.html':'recall-card','focus.html':'focus-card','news.html':'news-card','book-stack.html':'books-card','pixel-mountain.html':'mountain-card','daily-pressure.html':'pressure-card'};
 const id=cards[location.pathname.split('/').pop()];if(!id)return;const radius=new URLSearchParams(location.search).get('surface')==='workbench'?'0':'4px';
 const style=document.createElement('style');style.textContent=`html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:transparent!important}body *{visibility:hidden!important}#${id},#${id} *{visibility:visible!important}#${id}{position:fixed!important;inset:0!important;margin:0!important;width:100vw!important;max-width:none!important;height:100vh!important;min-height:0!important;aspect-ratio:auto!important;border-radius:${radius}!important}`;document.head.append(style);
})();

