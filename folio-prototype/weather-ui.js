(()=>{
 'use strict';const root=document.querySelector('.workbench-weather');if(!root)return;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
 // Flat paper facets: straight silhouettes, no outlines, curves or soft shadows.
 const paper=(points,fill)=>`<polygon points="${points}" fill="${fill}" stroke="none"/>`;
 const sun=paper('17,1 20,6 25,4 25,10 31,11 27,16 30,21 24,23 23,29 17,26 12,30 10,24 4,24 6,18 2,14 8,11 8,5 14,6','#D6AB63')
  +paper('17,8 24,12 25,20 18,25 11,22 9,15','#E8C47F')
  +paper('17,8 18,25 11,22 9,15','#F1D59B')
  +paper('17,8 24,12 25,20 18,25 20,16','#D5A75D');
 const moon=paper('27,4 17,8 11,17 13,28 22,34 33,31 39,22 30,25 23,20 21,12','#A4B4BD')
  +paper('27,4 17,8 11,17 21,12','#CFD7D6')
  +paper('11,17 13,28 22,34 23,20 21,12','#BDC9CC')
  +paper('22,34 33,31 39,22 30,25 23,20','#8C9EA9')
  +paper('36,5 38,8 41,9 38,11 37,15 35,11 32,10 35,8','#D9BA7F');
 const cloud=paper('4,26 11,18 19,19 25,11 34,13 38,21 43,21 47,28 42,34 10,34','#DDE2D4')
  +paper('4,26 11,18 19,19 24,27 10,34','#EAEBDD')
  +paper('19,19 25,11 34,13 24,27','#EFF0E4')
  +paper('34,13 38,21 43,21 47,28 24,27','#C8D2C2')
  +paper('4,26 24,27 42,34 10,34','#B4C3B1')
  +paper('24,27 47,28 42,34','#9FB39F');
 function icon(kind){let art='';
  if(kind==='sun')art=`<g transform="translate(7 7)">${sun}</g>`;
  else if(kind==='moon')art=moon;
  else if(kind==='unknown')art=paper('11,12 29,10 38,19 35,34 12,34','#E2DDD1')+paper('29,10 28,21 38,19','#BFB5A3')+paper('12,34 28,21 35,34','#CEC5B4');
  else{art=(kind==='partly'?`<g transform="translate(1 -1) scale(.85)">${sun}</g>`:kind==='night-cloud'?`<g transform="translate(1 -1) scale(.85)">${moon}</g>`:'')+cloud;
   if(kind==='rain')art+=paper('14,36 17,36 14,43 11,43','#8DA9B5')+paper('26,36 29,36 26,43 23,43','#A7BFCA')+paper('38,36 41,36 38,43 35,43','#8DA9B5');
   if(kind==='snow')art+=paper('14,35 17,39 14,43 11,39','#9DB6C0')+paper('26,38 29,41 26,44 23,41','#B5CAD0')+paper('38,35 41,39 38,43 35,39','#9DB6C0');
   if(kind==='storm')art+=paper('25,27 20,36 25,36 22,45 35,32 28,32 30,27','#C58B62')+paper('25,27 20,36 25,36 30,27','#E9BB78');
   if(kind==='fog')art+=paper('7,36 40,36 38,38 5,38','#B6BFB0')+paper('14,41 43,41 41,43 12,43','#CDD2C3');
  }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 48 46');svg.setAttribute('aria-hidden','true');svg.innerHTML=art;return svg;
 }
 const open=el('button','weather-open'),main=el('span','workbench-weather-main'),temperature=el('span',''),caption=el('span','weather-caption');open.type='button';open.append(main,caption);root.replaceChildren(open);
 function render(){const s=FolioLiveData.weather(),d=s.data;main.replaceChildren(icon(d?.icon||'unknown'),temperature);temperature.replaceChildren(document.createTextNode(d?Math.round(d.temperature):'—'));if(d)temperature.append(el('span','workbench-degree','°'));caption.textContent=d?`${s.city.name} · ${d.label}${s.stale?' · 上次更新':''}`:s.loading?'加载天气':s.error?'天气未更新':s.city.name+' · 天气';open.setAttribute('aria-label',d?`${s.city.name} ${d.label} ${Math.round(d.temperature)}摄氏度，查看天气与切换城市`:'查看天气与切换城市');}
 function details(){const box=FolioChatUI.openPanel('天气'),s=FolioLiveData.weather(),d=s.data;box.classList.add('weather-panel');const summary=el('div','weather-detail-head');summary.append(icon(d?.icon||'unknown'),el('strong','',d?`${Math.round(d.temperature)}°`:'—'),el('span','',s.city.name+(d?' · '+d.label:'')));box.append(summary);
  if(d){const values=el('div','weather-detail-values');for(const [label,value]of [['体感',d.feelsLike==null?'—':Math.round(d.feelsLike)+'°'],['今天',d.low==null||d.high==null?'—':Math.round(d.low)+'° / '+Math.round(d.high)+'°'],['湿度',d.humidity==null?'—':Math.round(d.humidity)+'%'],['风速',d.wind==null?'—':Math.round(d.wind)+' km/h']]){const v=el('div','');v.append(el('small','',label),el('span','',value));values.append(v);}box.append(values);}
  const status=el('p','chat-panel-note',s.error?(d?'更新失败，保留上次天气。':'')+s.error:d?'更新于 '+new Date(d.observedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit'})+' · 城市范围的模型天气':'默认杭州，可搜索其他城市。');box.append(status);
  const refresh=el('button','chat-secondary','刷新天气');refresh.type='button';refresh.onclick=async()=>{refresh.disabled=true;status.textContent='正在更新…';await FolioLiveData.refreshWeather(true);if(box.isConnected&&!box.closest('[hidden]'))details();};box.append(refresh);
  const form=el('form','weather-city-form'),input=el('input',''),search=el('button','chat-secondary','搜索城市'),results=el('div','weather-city-results');input.type='search';input.placeholder='城市名称';input.setAttribute('aria-label','搜索天气城市');input.required=true;input.maxLength=80;search.type='submit';form.append(input,search);box.append(form,results);
  form.onsubmit=async e=>{e.preventDefault();search.disabled=true;results.textContent='正在查找…';try{const cities=await FolioLiveData.searchCities(input.value);results.replaceChildren();if(!cities.length)results.textContent='未找到城市，可以试试拼音。';for(const city of cities){const b=el('button','weather-city-option');b.type='button';b.append(el('strong','',city.name),el('small','',city.region));b.onclick=async()=>{b.disabled=true;status.textContent='正在更新 '+city.name+'…';await FolioLiveData.chooseCity(city);if(box.isConnected&&!box.closest('[hidden]'))details();};results.append(b);}}catch(err){results.textContent=err.message;}finally{search.disabled=false;}};
  const credit=el('a','weather-credit','Weather data by Open-Meteo · CC BY 4.0');credit.href='https://open-meteo.com/';credit.target='_blank';credit.rel='noopener noreferrer';box.append(credit);
 }
 open.onclick=details;document.addEventListener('folio-weather-change',render);render();window.FolioWeatherUI={icon};
})();
