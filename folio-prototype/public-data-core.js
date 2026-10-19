/* Public services have explicit endpoints; no account cookies or model keys are used. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioPublicData=api;})(typeof globalThis==='undefined'?this:globalThis,()=>{
 const DEFAULT_CITY=Object.freeze({name:'杭州',latitude:30.2741,longitude:120.1551});
 function city(value){if(!value||typeof value.name!=='string'||!value.name.trim()||!Number.isFinite(value.latitude)||Math.abs(value.latitude)>90||!Number.isFinite(value.longitude)||Math.abs(value.longitude)>180)throw Error('请选择有效城市');return {name:value.name.trim().slice(0,60),latitude:value.latitude,longitude:value.longitude};}
 function url(kind,input={}){
  if(kind==='weather'){const c=city(input);return 'https://api.open-meteo.com/v1/forecast?latitude='+c.latitude+'&longitude='+c.longitude+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=Asia%2FShanghai';}
  if(kind==='cities'){const q=String(input.query||'').trim();if(!q||q.length>80)throw Error('请输入城市名称');return 'https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=8&language=zh&format=json';}
  if(kind==='news-list')return 'https://hacker-news.firebaseio.com/v0/topstories.json';
  if(kind==='news-item'){const id=Number(input.id);if(!Number.isSafeInteger(id)||id<=0)throw Error('资讯编号无效');return 'https://hacker-news.firebaseio.com/v0/item/'+id+'.json';}
  throw Error('未知公开数据服务');
 }
 function condition(code,isDay=true){
  if(code===0)return {label:'晴',icon:isDay?'sun':'moon'};
  if([1,2].includes(code))return {label:code===1?'少云':'多云',icon:isDay?'partly':'night-cloud'};
  if(code===3)return {label:'阴',icon:'cloud'};
  if([45,48].includes(code))return {label:'雾',icon:'fog'};
  if([51,53,55,56,57].includes(code))return {label:'毛毛雨',icon:'rain'};
  if([61,63,65,66,67,80,81,82].includes(code))return {label:[65,67,82].includes(code)?'大雨':'雨',icon:'rain'};
  if([71,73,75,77,85,86].includes(code))return {label:'雪',icon:'snow'};
  if([95,96,99].includes(code))return {label:'雷雨',icon:'storm'};
  return {label:'天气未知',icon:'unknown'};
 }
 function weather(raw,selected,fetchedAt=Date.now()){
  const c=raw?.current;if(!c||!Number.isFinite(c.temperature_2m)||c.temperature_2m< -100||c.temperature_2m>70||!Number.isInteger(c.weather_code)||typeof c.time!=='string')throw Error('天气服务未返回有效数据');
  const observedAt=Date.parse(c.time+(c.time.endsWith('Z')||/[+-]\d\d:\d\d$/.test(c.time)?'':'+08:00'));if(!Number.isFinite(observedAt))throw Error('天气更新时间无效');
  const finite=v=>Number.isFinite(v)?v:null;
  return {city:city(selected),temperature:c.temperature_2m,feelsLike:finite(c.apparent_temperature),humidity:finite(c.relative_humidity_2m),wind:finite(c.wind_speed_10m),low:finite(raw.daily?.temperature_2m_min?.[0]),high:finite(raw.daily?.temperature_2m_max?.[0]),code:c.weather_code,isDay:c.is_day===1,observedAt,fetchedAt,...condition(c.weather_code,c.is_day===1)};
 }
 function cities(raw){return (Array.isArray(raw?.results)?raw.results:[]).flatMap(v=>{try{return [{...city({name:v.name,latitude:v.latitude,longitude:v.longitude}),region:[v.admin1,v.country].filter(Boolean).join(' · ')}];}catch{return [];}});}
 function story(raw){if(!raw||raw.deleted||raw.dead||raw.type!=='story'||typeof raw.title!=='string'||!Number.isSafeInteger(raw.id))return null;let link='https://news.ycombinator.com/item?id='+raw.id;try{const u=new URL(raw.url);if(u.protocol==='https:'&&!u.username&&!u.password)link=u.href;}catch{}return {id:raw.id,title:raw.title.slice(0,250),url:link,discussion:'https://news.ycombinator.com/item?id='+raw.id,source:'Hacker News',publishedAt:Number.isFinite(raw.time)?raw.time*1000:null};}
 return {DEFAULT_CITY,city,url,condition,weather,cities,story};
});
