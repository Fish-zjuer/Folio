document.addEventListener('DOMContentLoaded',()=>{
 if(location.port!=='4194')return;
 const panel=document.createElement('aside'),run=document.createElement('button'),out=document.createElement('pre');panel.style='position:fixed;right:4px;top:4px;z-index:9999;max-width:280px;max-height:45vh;overflow:auto;background:#F5EFDF;color:#837258;font:11px/1.6 monospace';run.textContent='验证真实天气与资讯';panel.append(run,out);document.body.append(panel);
 run.onclick=async()=>{run.disabled=true;out.textContent='';const check=(name,ok)=>{out.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';if(!ok)throw Error(name);};try{
  showPreviewScreen('workbench',{focus:false});const weather=await FolioLiveData.refreshWeather(true),status=FolioLiveData.weather();
  check('真实天气响应通过解析',!!weather&&Number.isFinite(weather.temperature));check('界面移除示例温度与示例标签',!document.querySelector('.workbench-weather').textContent.includes('示例')&&document.querySelector('.weather-caption').textContent.includes(weather.city.name));
  check('天气图标来自API天气代码',document.querySelector('.weather-open svg').getAttribute('viewBox')==='0 0 48 46');
  out.textContent+='WEATHER '+JSON.stringify({city:weather.city.name,temperature:weather.temperature,condition:weather.label,observedAt:weather.observedAt})+'\n';
  const cities=await FolioLiveData.searchCities('Hangzhou');check('真实城市搜索可用',cities.some(c=>c.name&&Number.isFinite(c.latitude)));
  const news=await FolioLiveData.refreshNews(true);check('真实资讯源返回文章',!!news?.items?.length&&news.items.every(i=>i.source==='Hacker News'&&i.url.startsWith('https:')));out.textContent+='NEWS '+news.items.length+' 条\n';
  check('浏览器不会伪造手机用量授权',!FolioPhoneUsage.available()&&!FolioPhoneUsage.snapshot().allowed);out.textContent+='DONE\n';
 }catch(e){out.textContent+='ERROR '+e.message+'\n天气状态：'+FolioLiveData.weather().error+'\n资讯状态：'+FolioLiveData.news().error;}finally{run.disabled=false;}};
 showPreviewScreen('workbench',{focus:false});
});
