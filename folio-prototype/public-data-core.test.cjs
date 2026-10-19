const test=require('node:test'),assert=require('node:assert/strict'),P=require('./public-data-core');
test('public services stay on fixed HTTPS hosts, with no arbitrary URL or private credentials',()=>{
 const u=new URL(P.url('weather',P.DEFAULT_CITY));assert.equal(u.hostname,'api.open-meteo.com');assert.equal(u.searchParams.get('latitude'),'30.2741');assert.ok(u.searchParams.get('current').includes('weather_code'));assert.throws(()=>P.url('weather',{name:'x',latitude:NaN,longitude:0}));assert.throws(()=>P.url('provider',{url:'https://evil.invalid'}));assert.throws(()=>P.url('news-item',{id:'../../x'}));
 assert.equal(new URL(P.url('cities',{query:'Hangzhou & x=1'})).searchParams.get('name'),'Hangzhou & x=1');
});
test('night and weather-code states choose distinct paper icons; missing data never becomes sunny zero',()=>{
 assert.equal(P.condition(0,false).icon,'moon');assert.equal(P.condition(0,true).icon,'sun');assert.equal(P.condition(2,false).icon,'night-cloud');assert.equal(P.condition(65).icon,'rain');assert.equal(P.condition(75).icon,'snow');assert.equal(P.condition(95).icon,'storm');assert.equal(P.condition(999).icon,'unknown');assert.throws(()=>P.weather({current:{temperature_2m:null,weather_code:0,time:'2026-10-19T12:00'}},P.DEFAULT_CITY));
});
test('real response retains source timestamp, allows true zero and keeps absent metrics unknown',()=>{
 const w=P.weather({current:{temperature_2m:0,weather_code:71,is_day:0,time:'2026-10-19T22:00'},daily:{temperature_2m_min:[-1],temperature_2m_max:[3]}},P.DEFAULT_CITY,123);assert.equal(w.temperature,0);assert.equal(w.icon,'snow');assert.equal(w.humidity,null);assert.equal(w.fetchedAt,123);assert.equal(w.observedAt,Date.parse('2026-10-19T22:00:00+08:00'));
});
test('news discards deleted/non-story items and never emits unsafe links',()=>{
 assert.equal(P.story({id:3,type:'story',title:'x',deleted:true}),null);assert.equal(P.story({id:3,type:'comment',title:'x'}),null);assert.equal(P.story({id:3,type:'story',title:'x',url:'javascript:alert(1)'}).url,'https://news.ycombinator.com/item?id=3');assert.equal(P.story({id:4,type:'story',title:'x',url:'https://example.com/a'}).url,'https://example.com/a');
});
