const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('./snake-progress.js');

test('路线方向固定，横向间距相等，卡片增高时仍保持头像安全边距',()=>{
  for(const width of [40,60,64]) for(const height of [84,85,106,132]) {
    const points=S.route(width,height);
    assert.deepEqual(points.slice(1).map((point,index)=>point.x<points[index].x ? 'left' : point.y>points[index].y ? 'down' : 'up'),['down','left','up','left','down']);
    assert.equal(points[0].x-points[2].x,points[2].x-points[4].x);
    assert.ok(Math.abs(points[4].x-(width-points[0].x))<=1);
    assert.ok(Math.abs((points[1].y-points[0].y)-(height-24)*.9)<=8);
    for(let i=0;i<=100;i++) {
      const point=S.at(points,i/100);
      assert.ok(point.x>=12&&point.x<=width-12);
      assert.ok(point.y>=12&&point.y<=height-12);
    }
  }
  assert.throws(()=>S.route(10,20),/空间不足/);
});

test('方块连续相接且不重复，转弯无斜线或碎步',()=>{
  for(const height of [84,85,106,132]) {
    const path=S.cells(S.route(60,height));
    assert.equal(new Set(path.map(p=>`${p.x},${p.y}`)).size,path.length);
    path.forEach((point,index)=>{
      assert.equal(Math.abs((point.x-path[0].x)%8),0);
      assert.equal(Math.abs((point.y-path[0].y)%8),0);
      if(index) assert.equal(Math.abs(point.x-path[index-1].x)+Math.abs(point.y-path[index-1].y),8);
    });
  }
});

test('三节课的两次折返分别对应课间，宠物到达每个转角的时刻准确',()=>{
  const points=S.route(60,106),path=S.cells(points),plan=S.coursePlan(points,3,145);
  assert.deepEqual(plan.minutes,[0,45,50,95,100,145]);
  assert.deepEqual(plan.markers,[1,2,3,4,5]);
  plan.minutes.forEach((minute,vertex)=>assert.deepEqual(path[S.courseIndex(points,minute/145,3,145)],points[vertex]));
});

test('两节课只标一次课间，第二节走完剩余路线，边界和进度单调正确',()=>{
  const points=S.route(60,84),path=S.cells(points),plan=S.coursePlan(points,2,95);
  assert.deepEqual(plan.markers,[1,2,5]);
  assert.deepEqual(path[S.courseIndex(points,45/95,2,95)],points[1]);
  assert.deepEqual(path[S.courseIndex(points,50/95,2,95)],points[2]);
  assert.equal(S.courseIndex(points,-1,2,95),0);
  assert.equal(S.courseIndex(points,2,2,95),path.length-1);
  let previous=-1;
  for(let i=0;i<=100;i++) {const index=S.courseIndex(points,i/100,2,95);assert.ok(index>=previous&&index<path.length);previous=index;}
  assert.throws(()=>S.courseIndex(points,NaN,2,95),/无效/);
});

test('走过的路线保持灰色像素，终点完成也不擦除整条路',()=>{
  const previousDocument=global.document,previousPixels=global.FolioPixels;
  class Element {constructor(){this.attributes={};this.children=[];}setAttribute(k,v){this.attributes[k]=v;}append(child){this.children.push(child);}replaceChildren(...children){this.children=children;}}
  global.document={createElementNS:()=>new Element()};
  global.FolioPixels={presets:[{id:'test'}],DISPLAY_SIZE:24,svg:()=>new Element()};
  try{
    const host=new Element();host.clientWidth=60;host.clientHeight=106;host.dataset={};
    for(const progress of[.5,1]){S.render(host,progress,'#BFA787',{periods:3,duration:145});const pixels=host.children[0].children.filter(n=>n.attributes['data-path-pixel']);const passed=pixels.filter(n=>n.attributes['data-passed']==='true');assert.ok(passed.length>0);assert.ok(passed.every(n=>n.attributes.fill==='#C9C6BD'));if(progress===1)assert.equal(passed.length,pixels.length);}
  }finally{global.document=previousDocument;global.FolioPixels=previousPixels;}
});

test('秒级进度在同一像素内也移动头像，复用原图且不覆盖相邻竖线',()=>{
  const previousDocument=global.document,previousPixels=global.FolioPixels;
  class Element {constructor(){this.attributes={};this.children=[];}setAttribute(k,v){this.attributes[k]=v;}append(child){this.children.push(child);}replaceChildren(...children){this.children=children;}}
  global.document={createElementNS:()=>new Element()};
  global.FolioPixels={presets:[{id:'test'}],DISPLAY_SIZE:24,svg:()=>new Element()};
  try{
    const host=new Element();host.clientWidth=72;host.clientHeight=106;host.dataset={};
    const points=S.route(72,106);assert.equal(points[0].x-points[2].x-24/2-8/2,6);
    S.render(host,20/95,'#BFA787',{periods:2,duration:95});
    const svg=host.children[0],head=svg.children.at(-1),before=Number(head.attributes.y);
    S.update(host,(20+1/60)/95);
    assert.strictEqual(host.children[0],svg);assert.strictEqual(svg.children.at(-1),head);
    assert.ok(Number(head.attributes.y)>before);assert.ok(Number(head.attributes.y)-before<1);
    S.update(host,1);assert.ok(svg.children.filter(n=>n.attributes['data-path-pixel']).every(n=>n.attributes['data-passed']==='true'&&n.attributes.fill==='#C9C6BD'));
  }finally{global.document=previousDocument;global.FolioPixels=previousPixels;}
});

test('横向间距逐像素可调，竖向高度和24像素图标尺寸保持不变，转角时刻正确',()=>{
  for(let gap=18;gap<=28;gap++){
    const width=gap*2+28,points=S.route(width,106),path=S.cells(points),plan=S.coursePlan(points,3,145);
    assert.equal(points[0].x-points[2].x,gap);assert.equal(points[1].y-points[0].y,S.route(64,106)[1].y-S.route(64,106)[0].y);
    assert.ok(gap-12-4>=2);
    plan.minutes.forEach((minute,vertex)=>assert.deepEqual(path[S.courseIndex(points,minute/145,3,145)],points[vertex]));
    assert.equal(new Set(path.map(p=>p.x+','+p.y)).size,path.length);
  }
});
