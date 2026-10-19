(()=>{
 'use strict';const C=FolioPublicData,read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
 const native=()=>window.FolioApp?.native&&location.hostname==='appassets.androidplatform.net';
 async function request(kind,input={}){
  const address=C.url(kind,input),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
  try{if(native())return (await FolioNative.call('public.data',{kind,...input},controller.signal)).value;
   const response=await fetch(address,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('公开数据请求失败（'+response.status+'）');return await response.json();
  }catch(error){if(error.name==='AbortError')throw Error('连接超时，请稍后重试');throw error;}finally{clearTimeout(timer);}
 }
 let selected;try{selected=C.city(read('folio-weather-city-v1',C.DEFAULT_CITY));}catch{selected={...C.DEFAULT_CITY};}
 let cached=read('folio-weather-cache-v1',null),weatherError='',weatherJob=null,nextWeatherAttempt=0,newsJob=null,newsError='',newsFetched=read('folio-news-feed-v1',null),nextNewsAttempt=0;
 if(cached?.city?.name!==selected.name||cached?.city?.latitude!==selected.latitude||cached?.city?.longitude!==selected.longitude||!Number.isFinite(cached?.temperature)||!Number.isFinite(cached?.fetchedAt))cached=null;
 const emit=name=>document.dispatchEvent(new Event(name));
 async function refreshWeather(force=false){
  if(weatherJob)return weatherJob;if(!force&&Date.now()<nextWeatherAttempt)return cached;if(!force&&cached&&Date.now()-cached.fetchedAt<900000)return cached;
  const city={...selected};weatherJob=(async()=>{try{const value=C.weather(await request('weather',city),city);if(city.latitude===selected.latitude&&city.longitude===selected.longitude){cached=value;weatherError='';save('folio-weather-cache-v1',value);}return value;}catch(e){weatherError=e.message;nextWeatherAttempt=Date.now()+60000;return cached;}finally{weatherJob=null;emit('folio-weather-change');}})();emit('folio-weather-change');return weatherJob;
 }
 async function chooseCity(value){selected=C.city(value);cached=null;weatherError='';nextWeatherAttempt=0;save('folio-weather-city-v1',selected);save('folio-weather-cache-v1',null);emit('folio-weather-change');if(weatherJob)await weatherJob;return refreshWeather(true);}
 async function refreshNews(force=false){if(newsJob)return newsJob;if(!force&&Date.now()<nextNewsAttempt)return newsFetched;if(!force&&newsFetched&&Date.now()-newsFetched.fetchedAt<1800000)return newsFetched;
  newsJob=(async()=>{try{const ids=await request('news-list');if(!Array.isArray(ids))throw Error('资讯源没有返回列表');const settled=await Promise.allSettled(ids.slice(0,8).map(id=>request('news-item',{id})));const items=settled.flatMap(r=>r.status==='fulfilled'?[C.story(r.value)].filter(Boolean):[]);if(!items.length)throw Error('暂时无法获取资讯');newsFetched={items,fetchedAt:Date.now(),source:'Hacker News'};newsError='';save('folio-news-feed-v1',newsFetched);return newsFetched;}catch(e){newsError=e.message;nextNewsAttempt=Date.now()+120000;return newsFetched;}finally{newsJob=null;emit('folio-news-change');}})();return newsJob;
 }
 window.FolioLiveData=Object.freeze({request,refreshWeather,chooseCity,searchCities:async q=>C.cities(await request('cities',{query:q})),weather:()=>({city:{...selected},data:cached,error:weatherError,loading:!!weatherJob,stale:!!cached&&Date.now()-cached.fetchedAt>3600000}),refreshNews,news:()=>({data:newsFetched,error:newsError,loading:!!newsJob})});
 document.addEventListener('preview-screen-change',e=>{if(e.detail.screen==='workbench'){refreshWeather();if(localStorage.getItem('folio-news-auto-v1')!=='off')refreshNews();}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentScreen==='workbench')refreshWeather();});
 window.addEventListener('folio-native-resume',()=>{if(currentScreen==='workbench')refreshWeather();});
 setInterval(()=>{if(!document.hidden&&currentScreen==='workbench'){refreshWeather();if(localStorage.getItem('folio-news-auto-v1')!=='off')refreshNews();}},60000);
})();
