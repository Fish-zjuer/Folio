const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('./public-data-core');
function environment(name,call,native=true){const values=new Map(),events=[];const win={FolioApp:{native},addEventListener(){}};const ctx={window:win,document:{addEventListener(){},dispatchEvent:e=>events.push(e.type),hidden:false},location:{hostname:native?'appassets.androidplatform.net':'127.0.0.1'},FolioNative:{call},FolioPublicData:P,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},AbortController,setTimeout,clearTimeout,setInterval(){},Event,Date,console,currentScreen:'workbench'};vm.runInNewContext(fs.readFileSync(require.resolve('./'+name),'utf8'),ctx);return {api:win.FolioLiveData||win.FolioPhoneUsage,values,events};}
const raw={current:{temperature_2m:12,weather_code:3,is_day:0,time:'2026-10-19T23:00'}};
test('weather requests deduplicate and a failed refresh preserves the last real value',async()=>{
 let finish,calls=0,fail=false;const e=environment('public-data-store.js',()=>{calls++;return fail?Promise.reject(Error('offline')):new Promise(r=>{finish=r;});});
 const a=e.api.refreshWeather(true),b=e.api.refreshWeather(true);assert.equal(calls,1);finish({value:raw});await Promise.all([a,b]);assert.equal(e.api.weather().data.temperature,12);
 fail=true;await e.api.refreshWeather(true);assert.equal(e.api.weather().data.temperature,12);assert.equal(e.api.weather().error,'offline');assert.ok(e.events.includes('folio-weather-change'));
});
test('native usage requires permission and can retain real zero without inventing old records',async()=>{
 let response={allowed:false,days:[]};const e=environment('phone-usage-store.js',async()=>response);await e.api.refresh(true);assert.equal(e.api.snapshot().allowed,false);assert.equal(e.api.snapshot().days.length,0);
 response={allowed:true,days:[{date:'2026-10-19',minutes:0,partial:false}],updatedAt:123};await e.api.refresh(true);assert.equal(e.api.snapshot().days[0].minutes,0);assert.equal(JSON.parse(e.values.get('folio-phone-usage-v1'))[0].minutes,0);
 response={allowed:false,days:[]};await e.api.refresh(true);assert.equal(e.api.snapshot().days.length,0);assert.ok(e.values.has('folio-phone-usage-v1'));
});
test('browser usage cannot claim Android authorization or issue a permission command',async()=>{
 let calls=0;const e=environment('phone-usage-store.js',async()=>{calls++;},false);await e.api.refresh(true);assert.equal(calls,0);assert.equal(e.api.available(),false);await assert.rejects(e.api.authorize(),/Android/);
});
