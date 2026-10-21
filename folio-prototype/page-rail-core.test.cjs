const test=require('node:test'),assert=require('node:assert/strict'),C=require('./page-rail-core.js');
test('页面位置连续跟随，边缘只做轻微阻尼',()=>{assert.equal(C.progress(-100,2,400,11),2.25);assert.equal(C.progress(100,2,400,11),1.75);assert(C.progress(100,0,400,11)>-.1);assert(C.progress(-100,10,400,11)<10.1);});
test('短触不切页，足够距离或速度才前进，取消恢复，不越界',()=>{assert.equal(C.destination(4,-10,-1,400,11),4);assert.equal(C.destination(4,-100,0,400,11),5);assert.equal(C.destination(4,30,.5,400,11),3);assert.equal(C.destination(4,-150,-1,400,11,true),4);assert.equal(C.destination(0,150,1,400,11),0);assert.equal(C.destination(10,-150,-1,400,11),10);});
test('标题轨道一次滑动覆盖全部页面且保留分数位置',()=>{assert.equal(C.scrub(20,20,360,11),0);assert.equal(C.scrub(200,20,360,11),5);assert.equal(C.scrub(380,20,360,11),10);assert.equal(C.scrub(470,20,360,11),10);assert.equal(C.scrub(29,20,360,11),.25);});

test('停在日程时不预显示下一站课表，防止其从零位置闪入',()=>{assert.deepEqual(C.visiblePages(2,1,12),[1,2]);assert.deepEqual(C.visiblePages(1.8,1,12),[1,2]);assert.deepEqual(C.visiblePages(2,2,12),[2]);assert.deepEqual(C.visiblePages(2.01,2,12),[2,3]);});

function fixture(){let id=0;const scheduled=new Map(),drawn=[];const q=C.frameQueue(v=>drawn.push(v),fn=>{const key=id++;scheduled.set(key,fn);return key;},key=>scheduled.delete(key));return {q,scheduled,drawn,tick(){const pending=[...scheduled.values()];scheduled.clear();pending.forEach(fn=>fn());}};}
test('同一帧输入突发只绘制最后位置，下一帧可继续',()=>{const f=fixture();for(let i=0;i<120;i++)f.q.push(i/120);assert.equal(f.scheduled.size,1);assert.deepEqual(f.drawn,[]);f.tick();assert.deepEqual(f.drawn,[119/120]);f.q.push(1.5);f.tick();assert.deepEqual(f.drawn,[119/120,1.5]);});
test('松手前flush绘制最后位置一次且不遗留下一帧回调',()=>{const f=fixture();f.q.push(.2);f.q.push(.45);assert.equal(f.q.flush(),true);assert.deepEqual(f.drawn,[.45]);assert.equal(f.scheduled.size,0);assert.equal(f.q.flush(),false);f.tick();assert.deepEqual(f.drawn,[.45]);});
test('导航或模式取消后不允许旧位置覆盖新页面，支持帧ID为0',()=>{const f=fixture();f.q.push(.9);f.q.cancel();assert.equal(f.scheduled.size,0);f.tick();assert.deepEqual(f.drawn,[]);f.q.push(0);f.tick();assert.deepEqual(f.drawn,[0]);});
