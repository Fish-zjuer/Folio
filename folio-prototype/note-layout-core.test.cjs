const test=require('node:test'),assert=require('node:assert/strict'),L=require('./note-layout-core');
test('便签先均匀占满可用位置，再错位覆盖，位置可重复且不越左右边界',()=>{const shapes=Array.from({length:12},(_,i)=>({x:(i*.37)%1,y:(i*.23)%1})),a=L.layout(350,240,shapes);assert.deepEqual(a,L.layout(350,240,shapes));for(const p of a)assert.ok(p.x>=8&&p.x+64<=350);for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(Math.abs(a[i].x-a[j].x)>64||Math.abs(a[i].y-a[j].y)>64);assert.ok(a.slice(4).some(p=>a.slice(0,4).some(q=>Math.abs(p.x-q.x)<64&&Math.abs(p.y-q.y)<64)));});

test('用户从袋内拖放的位置保留，后续新增不会重排该位置',()=>{const shape={manual:true,x:.4,y:.2},a=L.layout(350,240,[shape,{x:.5,y:.6}]),b=L.layout(350,240,[shape,{x:.5,y:.6},{x:.2,y:.1}]);assert.deepEqual(a[0],b[0]);assert.equal(a[0].x,12+.4*(350-88));});
test('保留装饰区后，自动和手动便签均避开咖啡与底部边界，密集时也不侵入',()=>{for(const width of[280,350,400])for(const height of[120,160,240]){const cup={left:width*.76,top:0,right:width,bottom:70},options={safe:true,topInset:48,exclusions:[cup]},shapes=Array.from({length:24},(_,i)=>({manual:i%5===0,x:(i*.37)%1,y:(i*.23)%1})),a=L.layout(width,height,shapes,options);assert.deepEqual(a,L.layout(width,height,shapes,options));for(const p of a){assert.ok(p.x>=12);assert.ok(p.x+78<=width+.01);assert.ok(p.y+78<=height+.01);assert.ok(p.x+78<=cup.left||p.y-4>=cup.bottom)}}});
test('手动落在装饰上的便签就近让开，新增便签不再挪动它',()=>{const s={manual:true,x:.99,y:0},o={safe:true,topInset:48,exclusions:[{left:260,top:0,right:350,bottom:75}]},a=L.layout(350,160,[s],o),b=L.layout(350,160,[s,{x:.2,y:.3}],o);assert.deepEqual(a[0],b[0]);assert.ok(a[0].x+78<=260||a[0].y-4>=75)});
test('避让后仍先铺开可用空间，再插空叠放',()=>{const o={safe:true,topInset:48,exclusions:[{left:260,top:0,right:350,bottom:75}]},a=L.layout(350,160,[{x:.2,y:.2},{x:.8,y:.5},{x:.4,y:.7}],o);for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)assert.ok(Math.abs(a[i].x-a[j].x)>=76||Math.abs(a[i].y-a[j].y)>=78)});

test('先为七张纸预留完整铺排，不让稀疏角落把中间空地割碎',()=>{
  const options={safe:true,topInset:48,exclusions:[{left:260,top:0,right:350,bottom:75}]};
  const shapes=Array.from({length:7},(_,i)=>({x:i/9,y:i/11})),positions=L.layout(350,240,shapes,options);
  for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)assert.ok(Math.abs(positions[i].x-positions[j].x)>=76||Math.abs(positions[i].y-positions[j].y)>=78,`paper ${i} overlaps ${j}`);
  const dense=L.layout(350,240,[...shapes,{x:.5,y:.5},{x:.3,y:.7}],options);
  assert.ok(dense.every(p=>p.x+78<=260||p.y-4>=75));
});
test('按各个装饰避让，仍可利用纵向空白；满之前不强行缩小间距',()=>{
  const options={safe:true,topInset:4,exclusions:[{left:270,top:0,right:350,bottom:75},{left:240,top:170,right:350,bottom:260},{left:0,top:200,right:60,bottom:260}]};
  const shapes=Array.from({length:6},(_,i)=>({x:i/7,y:i/9})),points=L.layout(350,260,shapes,options);
  assert.ok(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))>=78);
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.abs(points[i].x-points[j].x)>=76||Math.abs(points[i].y-points[j].y)>=78);
  for(const p of points)for(const r of options.exclusions)assert.ok(p.x+78<=r.left||p.x-12>=r.right||p.y+78<=r.top||p.y-4>=r.bottom);
});
