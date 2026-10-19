(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg',core=FolioPressure,TODAY='2026-10-19',card=document.querySelector('#pressure-card'),dialog=document.querySelector('#pressure-detail');
 const colors=['#e3d5bb','#d9be90','#cf9f69','#c1835e','#a7654a'];
 const tasks=[
  {id:'report',title:'机器人课程报告',date:'2026-10-19',minutes:210,due:'2026-10-22'},
  {id:'math',title:'微积分习题',date:'2026-10-21',minutes:180,due:'2026-10-23'},
  {id:'physics',title:'物理实验整理',date:'2026-10-23',minutes:240,due:'2026-10-24'},
  {id:'code',title:'数据结构课程设计',date:'2026-10-26',minutes:270,due:'2026-10-29'},
  {id:'english',title:'英语阅读与笔记',date:'2026-10-28',minutes:60,due:'2026-10-30'},
  {id:'unknown',title:'实验预习（尚未估时）',date:'2026-10-20',minutes:null,due:'2026-10-21'},
  {id:'past1',title:'程序设计练习',date:'2026-10-08',minutes:150,due:'2026-10-09'},
  {id:'past2',title:'物理实验报告',date:'2026-10-13',minutes:240,due:'2026-10-15'},
  {id:'past3',title:'小组报告',date:'2026-10-16',minutes:180,due:'2026-10-17'}
 ];
 let year=2026,index=9,finished=false;
 const el=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n};
 function records(dates){const courseNames=['微积分 · 数据结构','大学物理 · 大学英语','机器人 · 概率论','微积分 · 大学物理','机器人课程',''];return dates.flatMap(d=>d.weekday<5?[{title:courseNames[d.weekday],date:d.key,minutes:[180,135,225,180,90][d.weekday],kind:'class'}]:[]).concat(tasks.map(t=>({...t,completed:t.id==='report'&&finished})))}
 function paper(x,y,w,seed){const n=i=>{const v=Math.sin(seed*19.27+i*8.3)*43758.54;return(v-Math.floor(v)-.5)*1.3},r=seed%4===0?2:.8;return `M${x+r} ${y+n(1)}Q${x+w*.48} ${y+n(2)} ${x+w-r} ${y+n(3)}Q${x+w} ${y} ${x+w+n(4)} ${y+r}L${x+w+n(5)} ${y+w-r}Q${x+w} ${y+w} ${x+w-r} ${y+w+n(6)}Q${x+w*.5} ${y+w+n(7)} ${x+r} ${y+w}Q${x} ${y+w} ${x+n(8)} ${y+w-r}L${x+n(9)} ${y+r}Q${x} ${y} ${x+r} ${y+n(1)}Z`}
 function show(date,data){const s=core.summary(data,date.key);document.querySelector('#pressure-title').textContent=`${Number(date.key.slice(5,7))} 月 ${date.day} 日`;document.querySelector('#pressure-total').textContent=s.minutes?`${s.minutes} 分钟已排安排`:'暂无已排时长';const list=document.querySelector('#pressure-items');list.replaceChildren();for(const item of s.scheduled){const row=document.createElement('div'),meta=document.createElement('span');row.className='pressure-item';row.textContent=item.title;meta.textContent=item.minutes?`${item.minutes} 分钟${item.kind==='class'?' · 课程':' · 预留任务时间'}`:'未估时，未计入色块深浅';row.append(meta);list.append(row)}for(const item of s.due){const row=document.createElement('div');row.className='pressure-item';row.textContent='到期 · '+item.title;list.append(row)}if(!list.childElementCount){const row=document.createElement('p');row.className='fine';row.textContent='示例里这天没有课程、已排任务或截止事项。';list.append(row)}dialog.showModal()}
 let svg,nodes=[];
 function update(){const data=records(core.month(year,index));for(const {date,g,fill,today}of nodes){const s=core.summary(data,date.key);fill.setAttribute('fill',colors[s.level]);if(today)today.setAttribute('stroke',s.level>=2?'#f6ead5':'#9d7952');g.setAttribute('aria-label',`${date.key}${date.key===TODAY?'，今天':''}，已排 ${s.minutes} 分钟，${s.due.length} 件到期${s.unestimated.length?'，有未估时事项':''}`);g.onclick=()=>show(date,data);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(date,data)}}}document.querySelector('#demo-status').textContent=finished?'19 日报告已提前完成：当天从 390 分钟降到 180 分钟，色块变浅。':'演示完成已排任务后，当天色块减轻。'}
 function render(){const dates=core.month(year,index),rows=dates.length/7,size=26,step=30,x0=(260-(7*size+6*4))/2,y0=128-(rows*size+(rows-1)*4)/2;svg=el('svg',{viewBox:'0 0 260 260','aria-label':`${year}年${index+1}月压力热力图`});nodes=[];card.replaceChildren(svg);
  // Reuse the sun strokes from square-layouts.html; all decoration stays outside the heatmap.
  svg.append(el('path',{d:'M199 33a10 10 0 0 1 20 0m-25 0h-5m35 0h5m-20-15v-5m-12 9-4-4m28 4 4-4M29 226l7-4m-4 11 7-4m-4 11 7-4',fill:'none',stroke:'#c5aa82','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round'}));
  dates.forEach((date,i)=>{const x=x0+i%7*step,y=y0+Math.floor(i/7)*step,g=el('g',{class:'pressure-day',role:'button',tabindex:0,opacity:date.inMonth?1:.32}),fill=el('path',{d:paper(x,y,size,i),class:'pressure-paper'});g.append(fill,el('rect',{x:x-1.5,y:y-1.5,width:size+3,height:size+3,rx:2,class:'pressure-focus'}));let today=null;if(date.key===TODAY){today=el('path',{d:`M${x+13} ${y+7}v12m-4-4 4 4 4-4`,fill:'none','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'});g.append(today)}svg.append(g);nodes.push({date,g,fill,today})});
  const legend=el('g',{'aria-label':'压力由低到高，色块由小到大、由浅到深',role:'img'});let lx=79;colors.forEach((color,i)=>{const s=8+i*3;legend.append(el('path',{d:paper(lx,246-s,s,i+41),fill:color}));lx+=s+8});svg.append(legend);
  document.querySelector('#month-label').textContent=`${year} / ${String(index+1).padStart(2,'0')}`;update();
 }
 function move(delta){index+=delta;if(index<0){index=11;year--}if(index>11){index=0;year++}render()}
 document.querySelector('#prev-month').onclick=()=>move(-1);document.querySelector('#next-month').onclick=()=>move(1);document.querySelector('#finish-example').onclick=()=>{finished=!finished;document.querySelector('#finish-example').textContent=finished?'恢复报告，比较原来压力':'演示：提前完成 19 日报告';update()};document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{card.style.width=b.dataset.size+'px';document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 let timer;function close(){if(dialog.classList.contains('is-closing'))return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return}dialog.classList.add('is-closing');timer=setTimeout(()=>dialog.close(),220)}dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();close()});dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('close',()=>{clearTimeout(timer);dialog.classList.remove('is-closing')});render();
})();
