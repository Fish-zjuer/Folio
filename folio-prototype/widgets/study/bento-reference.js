/* User-supplied v5 art, literal geometry and sample values for inert previews only. */
(()=>{
"use strict";

const T='#A56A4D',O='#C9A26E',S='#9DA98F',G='#7E9E9A',D='#8886B0',K='#4E3426',W='#FAF8F5',B='#B9C2B7';
const E=(t,a,p)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};
const R=(p,x,y,w,h,f,o=1,r=2)=>E('rect',{x,y,width:w,height:h,rx:r,fill:f,'fill-opacity':o},p);
const C=(p,x,y,r,f,o=1)=>E('circle',{cx:x,cy:y,r,fill:f,'fill-opacity':o},p);
const L=(p,d,s,w=1.6,x={})=>E('path',{d,fill:'none',stroke:s,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round',...x},p);
const F=(p,d,f,o=1)=>E('path',{d,fill:f,'fill-opacity':o},p);
const eyes=(p,x,y,w,h)=>{const r=Math.min(w,h)*.11;C(p,x+w*.3,y+h*.38,r,W);C(p,x+w*.7,y+h*.38,r,W)};
const ring=(p,cx,cy,r,w,c,f)=>{const n=2*Math.PI*r;E('circle',{cx,cy,r,fill:'none',stroke:c,'stroke-opacity':.22,'stroke-width':w},p);
 E('circle',{cx,cy,r,fill:'none',stroke:c,'stroke-width':w,'stroke-linecap':'round','stroke-dasharray':`${n*f} ${n}`,transform:`rotate(-90 ${cx} ${cy})`},p)};
const spiral=n=>{const o=[];let t=0,b=n-1,l=0,r=n-1;while(t<=b&&l<=r){for(let c=l;c<=r;c++)o.push([t,c]);t++;for(let y=t;y<=b;y++)o.push([y,r]);r--;if(t<=b){for(let c=r;c>=l;c--)o.push([b,c]);b--}if(l<=r){for(let y=b;y>=t;y--)o.push([y,l]);l++}}return o};
const moon=(x,y,r,f)=>{const k=r*Math.abs(2*f-1);return`M${x} ${y-r}A${r} ${r} 0 0 1 ${x} ${y+r}A${k} ${r} 0 0 ${f>.5?1:0} ${x} ${y-r}Z`};

const cards=[];function card(paper,label,template,zones){cards.push({paper,label,template,zones});}
const SQ='0 0 40 40',TALL='0 0 40 84',WIDE='0 0 84 40';
const cell=(c,r)=>2.6+(r%2?2-c:c)*12.4; // 蛇形 3×3 的 x

/* 1 今日：左 课程竖轴 · 右上 三件事长叶 · 右下 距下一课的环 */
card('a','今日：左侧是 8 点到 19 点的竖轴，红色蛇头是现在；右上三个方块是待办，完成越多叶子越大；右下环越长离下一节课越久','"a b" 1fr "a c" 1fr/.8fr 1.2fr',[
 ['a','0 0 24 60',s=>{for(let h=8;h<20;h++){const y=(h-8)*4.9+.7,cls=[8,14,15].includes(h),k=h===9?T:cls?D:h===19?O:'rgba(110,135,110,.2)';
  R(s,2,y,20,3.6,k,h===8?.45:1,1.5);if(h===9)eyes(s,2,y,20,3.6)}}],
 ['b',SQ,s=>{const done=[1,0,0],bs=[[4,4],[22,4],[4,22]].map(([x,y],i)=>{const r=R(s,x,y,14,14,G,.22,4.5);r.classList.add('hit');return r});
  const lf=F(s,'M26 35C26 28 30 24 36 24C36 31 32 36 26 35Z',G);lf.style.transformOrigin='26px 35px';lf.style.transition='transform .5s cubic-bezier(.3,1.4,.5,1),opacity .4s';
  const up=()=>{bs.forEach((b,i)=>b.setAttribute('fill-opacity',done[i]?1:.22));const n=done.reduce((a,b)=>a+b);lf.style.transform=`scale(${.2+.8*n/3})`;lf.style.opacity=n?.5+.5*n/3:.25};
  up()}],
 ['c',SQ,s=>{ring(s,20,20,14,5,D,.58);R(s,14.5,14.5,11,11,D,1,3.2)}]]);

/* 2 学习：左上 四门课进度 · 左下 连胜小蛇 · 右 一周高低 */
card('b','学习：左上四个方块是四门课的进度；左下小蛇每天长一节，金苹果是明天；右侧七根柱子是最近七天，陶色是今天','"a c" 1fr "b c" 1fr/1fr 1fr',[
 ['a',SQ,s=>[[4,4,.7,D],[22,4,.45,O],[4,22,.9,T],[22,22,.25,G]].forEach(([x,y,p,c])=>{R(s,x,y,14,14,c,.22,4);R(s,x,y+14*(1-p),14,14*p,c,1,3)})],
 ['b',SQ,s=>{for(let k=0;k<9;k++){const r=k/3|0,x=cell(k%3,r),y=2.6+r*12.4;
  if(k===6)C(s,x+5,y+5,4.4,O);else{const q=R(s,x,y,10,10,k<5?G:k===5?'#3F5B57':G,k<5?.3+.15*k:k===5?1:.14,3);if(k===5)eyes(s,x,y,10,10)}}}],
 ['c',TALL,s=>{[44,30,64,18,74,52,34].forEach((h,i)=>{R(s,i*6,80-h,4,h,i===6?T:G,i===6?1:.6,2);if(i===4)C(s,i*6+2,80-h-4.5,1.9,O)});L(s,'M0 82.5H40',B,1.2)}]]);

/* 3 期末冲刺：左上 登山 · 右上 多米诺 · 下 章节掌握度 */
card('c','期末冲刺：左上台阶是三周，小方块是你；右上多米诺是考试，倒下的已考完；下方一格一章，越深越熟，红点还没学','"a b" 1fr "c c" 1fr/1fr 1fr',[
 ['a',SQ,s=>{for(let k=0;k<7;k++){const h=(k+1)*3.8,x=3+k*5;R(s,x,36-h,4.2,h,k<=2?T:G,k<=2?.4+.2*k:.3,1);
   if(k===2){R(s,x-.4,36-h-5.4,5,5,K,1,1.6);eyes(s,x-.4,36-h-5.4,5,5)}}
  L(s,'M35 9.4V1.5',K,1.2);F(s,'M35 1.5L40 3.4L35 5.4Z',O)}],
 ['b',SQ,s=>{[D,O,T,G].forEach((c,i)=>{const x=5+i*9,g=E('g',i<2?{transform:`rotate(${76+i*2} ${x+5} 33)`}:{},s);R(g,x,15,5,18,c,1,1.6);C(g,x+2.5,22,.8,W);C(g,x+2.5,27,.8,W)});L(s,'M3 34.6H38',B,1.3)}],
 ['c',WIDE,s=>{for(let i=0;i<48;i++){const r=i/12|0,c=i%12,l=(i*7+r*3)%5,x=3.2+c*6.6,y=7.6+r*6.6;
   R(s,x,y,5,5,l===4?'#6F9A94':G,l===4?1:.14+.2*l,1.4);if(l===0)C(s,x+2.5,y+2.5,1.3,T)}}]]);

/* 4 作息：上 一周的月亮 · 左下 咖啡杯 · 右下 日到夜 */
card('d','作息：上方七个月亮是最近七夜，越圆睡得越足，外圈是今晚；左下杯子旁圆点是今日咖啡；右下弧线是从日出到入睡，红点是现在','"a a" 1fr "b c" 1fr/1fr 1fr',[
 ['a',WIDE,s=>{[.8,.7,.45,.9,.75,.5,0].forEach((f,i)=>{const x=7+i*11.7;C(s,x,18,5.2,D,.22);
   if(i<6)F(s,moon(x,18,5.2,f),D);else E('circle',{cx:x,cy:18,r:6.4,fill:'none',stroke:T,'stroke-width':1.6},s);C(s,x,32,1.3,i<6?D:T,i<6?.5:1)})}],
 ['b',SQ,s=>{E('circle',{cx:16,cy:16,r:10.5,fill:'#F6EFE4',stroke:T,'stroke-width':3},s);C(s,16,16,6.4,'#6B4A3A');L(s,'M12.5 14.5a4 4 0 0 1 3-2.2','#F6EFE4',1.2);
  L(s,'M27 11.5h3.2a4.6 4.6 0 0 1 0 9.2H27',T,3);[10,18,26].forEach((x,i)=>i<2?C(s,x,34.5,2.5,T):E('circle',{cx:x,cy:34.5,r:2.2,fill:'none',stroke:T,'stroke-width':1.3},s))}],
 ['c',SQ,s=>{L(s,'M4 30H36',B,1.2);L(s,'M4 30A16 16 0 0 1 36 30',B,1.6,{'stroke-dasharray':'1.5 3'});C(s,4,30,3.2,O);F(s,moon(36,30,3.6,.35),D);
  const a=40*Math.PI/180;C(s,20-16*Math.cos(a),30-16*Math.sin(a),3.2,T)}]]);

/* 5 复习：左上 遗忘曲线 · 左下 待复习 · 右 灯泡与卡扇 */
card('b','复习：左上遗忘曲线，每次复习后下降更慢，空心点是今天；左下六张方块是待复习卡；右侧灯泡与卡扇是弄懂了','"a c" 1fr "b c" 1fr/1fr 1fr',[
 ['a',SQ,s=>{L(s,'M3 35H38','#C3CBBB',1.2);L(s,'M17 29V8M30 22V8',O,1.1,{'stroke-dasharray':'1.5 3'});
  L(s,'M4 8C8 22 12 27 17 29M17 8C22 16 26 20 30 22',T,2);L(s,'M30 8C33 11 36 13 38 14',T,1.6,{'stroke-dasharray':'1 4','stroke-opacity':.5});
  C(s,4,8,2.4,T);C(s,17,8,2.4,T);E('circle',{cx:30,cy:8,r:2.4,fill:'#E1E6DD',stroke:T,'stroke-width':1.5},s)}],
 ['b',SQ,s=>{for(let i=0;i<6;i++)R(s,7.7+(i%2)*12.5,2.5+(i/2|0)*12.5,10,10,T,i<4?1:.35,3)}],
 ['c',TALL,s=>{L(s,'M20 4a8 8 0 0 0-4.8 14.4v3.2h9.6v-3.2A8 8 0 0 0 20 4zM16.5 25h7M17.5 28.5h5M5 12l2.4 1.2M35 12l-2.4 1.2M3 20h3M37 20h-3',O,1.7);
  [[-20,D],[20,T],[0,O]].forEach(([a,c])=>{const g=E('g',{transform:`rotate(${a} 20 78)`},s);R(g,11,46,18,30,c,1,4);C(g,16,52,2.2,W,.6)})}]]);

/* 6 番茄日：左上 螺旋小蛇 · 右上 四颗番茄 · 下 今日专注条 */
card('a','番茄日：左上小蛇在往苹果走，一格一分钟；右上四颗番茄，实心是已完成；下方色块是今天的专注时段，颜色是科目，虚线是下一段','"a b" 1fr "c c" 1fr/1fr 1fr',[
 ['a',SQ,s=>{spiral(3).forEach(([r,c],k)=>{const x=2.6+c*12.4,y=2.6+r*12.4;
   if(k===8)C(s,x+5,y+5,4.5,O);else{R(s,x,y,10,10,k===5?K:T,k<5?.3+.14*k:k===5?1:.12,3);if(k===5)eyes(s,x,y,10,10)}})}],
 ['b',SQ,s=>{[[12,23],[28,23],[12,39],[28,39]].forEach(([x,y],i)=>{y-=11;
   if(i<3)C(s,x,y,6.8,T);else E('circle',{cx:x,cy:y,r:6.4,fill:'none',stroke:T,'stroke-width':1.6,'stroke-dasharray':'2.4 2.6'},s);
   L(s,`M${x} ${y-6.6}v-2.6M${x} ${y-8}q3-2 5-.4`,'#8A9E78',1.5)})}],
 ['c',WIDE,s=>{[[3,18,D],[22,10,O],[34,22,T],[58,9,S]].forEach(([x,w,c])=>R(s,x,10,w,16,c,1,3.5));
  E('rect',{x:69,y:10,width:12,height:16,rx:3.5,fill:'none',stroke:T,'stroke-width':1.4,'stroke-dasharray':'2.4 2.6'},s);
  L(s,'M3 33H81',B,1.2);[3,28,54,81].forEach(x=>L(s,`M${x} 31v4`,B,1.2))}]]);

/* 7 作业：左 DDL 竖轨 · 右上 四象限 · 右下 已交 */
card('d','作业：左侧竖轨从上到下是由近到远的截止日，方块越近越大越红；右上四象限是轻重缓急；右下叠起的纸与对勾是已交','"a b" 1fr "a c" 1fr/.8fr 1.2fr',[
 ['a','0 0 24 66',s=>{L(s,'M5 3V63',B,1.8);C(s,5,3,3,'#5E4B3C');[[10,12,T],[24,10,O],[40,8,S],[60,6,G]].forEach(([y,z,c])=>{L(s,`M5 ${y}H${11}`,c,1.6);R(s,11,y-z/2,z,z,c,1,z/3.2)})}],
 ['b',SQ,s=>{[[2,2,O,.28],[21,2,T,.3],[2,21,'#5E4B3C',.07],[21,21,S,.32]].forEach(([x,y,c,o])=>R(s,x,y,17,17,c,o,4.5));
  C(s,30,10,4,T);C(s,25,15,2.2,D);C(s,10,11,3.4,O);C(s,31,31,2.4,S);C(s,10,30,3,G)}],
 ['c',SQ,s=>{[[-9,D,.38],[-2,O,.5],[6,'#FFFFFF',.9]].forEach(([a,c,o])=>{const g=E('g',{transform:`rotate(${a} 20 22)`},s);R(g,9,5,22,29,c,o,3)});
  [14,19,24].forEach((y,i)=>L(s,`M14 ${y}h${i==2?5:10}`,B,1.4));C(s,29,30,6.5,G);L(s,'M26 30l2.5 2.6l4.4-5',W,1.8)}]]);

/* 8 成绩：左 台阶与学士帽 · 右上 四科成绩环 · 右下 学期走势 */
card('c','成绩：左侧十级台阶是绩点预估，红色小三角是目标 4.5，学士帽补在左上；右上四个环是四门课；右下折线是各学期走势','"a b" 1fr "a c" 1fr/1.1fr .9fr',[
 ['a',TALL,s=>{for(let i=0;i<10;i++){const x=3+i*3.5,h=14+i*6.2,f=Math.min(Math.max(4.18/.5-i,0),1);R(s,x,80-h,3,h,G,.22,1.2);if(f)R(s,x,80-h*f,3,h*f,G,1,1.2)}
  L(s,'M3 11H36',T,1,{'stroke-dasharray':'1.5 2.5'});F(s,'M33 3h6l-3 5.5z',T);
  F(s,'M4 22L13 18L22 22L13 26Z',D);L(s,'M8 24.5v4.5c3 2.2 7 2.2 10 0v-4.5',D,1.5);L(s,'M22 22v6',T,1.5)}],
 ['b',SQ,s=>[[11,11,.9,D],[29,11,.7,O],[11,29,.82,T],[29,29,.6,G]].forEach(([x,y,f,c])=>ring(s,x,y,6.4,3.2,c,f))],
 ['c',SQ,s=>{L(s,'M3 8H37',T,1,{'stroke-dasharray':'1.5 2.5'});F(s,'M4 32L13 27L22 29L31 19L36 11V36H4Z',G,.16);
  L(s,'M4 32L13 27L22 29L31 19L36 11',G,1.8);[[4,32],[13,27],[22,29],[31,19]].forEach(([x,y])=>C(s,x,y,2,G));C(s,36,11,3.4,T)}]]);

const ids=['today','learning','finals','routine','review','tomato','assignments','grades'];window.FolioStudyBentoReference=Object.freeze({get(id){const c=cards[ids.indexOf(id)];if(!c)throw Error('Unknown reference');return {paper:c.paper,template:c.template,zones:c.zones.map(([area,viewBox,paint])=>({area,viewBox,paint}))};}});
})();
