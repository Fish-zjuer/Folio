(()=>{
'use strict';
const courses=[
 {name:'微积分',weekly:5,end:16,color:'#9eae92',dark:'#849778',width:173,offset:0,tilt:-1.6},
 {name:'大学物理',weekly:4,end:16,color:'#9eb7ba',dark:'#819e9f',width:160,offset:7,tilt:1.4},
 {name:'数据结构',weekly:3,end:16,color:'#c98f73',dark:'#af785f',width:174,offset:-3,tilt:-1},
 {name:'大学英语',weekly:3,end:14,color:'#d2b16f',dark:'#b69657',width:148,offset:13,tilt:2.2},
 {name:'运动控制与机器人',weekly:3,end:12,color:'#b4a7b8',dark:'#988b9d',width:159,offset:4,tilt:-2},
 {name:'电气控制技术',weekly:2,end:16,color:'#a8b0a0',dark:'#8e9985',width:146,offset:8,tilt:1.3},
 {name:'体育',weekly:2,end:10,color:'#d4a48c',dark:'#b88d75',width:137,offset:12,tilt:-1.5}
];
const NS='http://www.w3.org/2000/svg',card=document.querySelector('#books-card'),week=document.querySelector('#week'),dialog=document.querySelector('#books-detail');
const el=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n};
const svg=el('svg',{viewBox:'0 0 260 260','aria-hidden':'true'});card.append(svg);
// Decorations stay still as the book shapes settle onto the same desk line.
svg.append(el('path',{d:'M19 216L231 214L235 222L21 224Z',fill:'#c8b99a'}));
svg.append(el('path',{d:'M21 214L231 212L231 216L21 219Z',fill:'#f2e9d6'}));
svg.append(el('path',{d:'M216 34l5-8 3 7 8 1-6 5 1 8-7-4-7 3 2-8-5-5Z',fill:'#d5bd8e'}));
svg.append(el('path',{d:'M215 62q8-10 17-1q-10 8-17 1m4 7q8-4 13 4q-10 5-13-4',fill:'#b6bc9f'}));
const volumes=Array.from({length:14},(_,i)=>courses[i%courses.length]);const groups=volumes.map(c=>{const g=el('g',{class:'book-shape'}),shadow=el('path',{fill:'#ab9673',opacity:'.32'}),cover=el('path',{fill:c.color}),pages=el('path',{fill:'#f4eddb'}),edge=el('path',{fill:c.dark}),line=el('path',{stroke:'#cbbd9e','stroke-width':'.7',fill:'none',class:'book-pages'}),label=el('path',{fill:'#eee3c8',opacity:'.85'}),stitch=el('path',{stroke:c.dark,'stroke-width':'1.6',fill:'none'});g.append(shadow,cover,pages,line,edge,label,stitch);svg.append(g);return{g,shadow,cover,pages,edge,line,label,stitch}});
const number=el('text',{x:29,y:39,class:'book-number'}),unit=el('text',{x:29,y:55,class:'book-unit'},'课时'),total=el('text',{x:92,y:38,class:'book-total'});svg.append(number,unit,total);
const initial=courses.reduce((s,c)=>s+c.weekly*c.end,0);
function remaining(c){return Math.max(0,c.end-Number(week.value))*c.weekly}
function render(){let bottom=210;const sum=courses.reduce((s,c)=>s+remaining(c),0),count=Math.ceil(sum/24);volumes.forEach((c,i)=>{const left=43+c.offset,w=c.width,h=9;const a=groups[i];a.g.style.opacity=i<count?'1':'0';a.g.style.transform=`translate(${left}px,${bottom-h}px) rotate(${c.tilt}deg)`;a.shadow.setAttribute('d',`M4 5h${w}v${h}H4Z`);a.cover.setAttribute('d',`M4 0L${w-2} 1Q${w+3} 2 ${w} 5L${w-1} ${h-1}L4 ${h}Q-2 ${h} 0 ${h-5}V5Q0 0 4 0Z`);a.pages.setAttribute('d',`M9 4L${w-4} 5L${w-5} ${Math.max(5,h-3)}L9 ${Math.max(5,h-2)}Z`);a.edge.setAttribute('d',`M4 0L${w-2} 1V4L9 3V${Math.max(4,h-3)}L${w} ${Math.max(4,h-3)}V${h}H4Q0 ${h} 0 ${h-5}V5Q0 0 4 0Z`);a.line.setAttribute('d',`M19 7L${w-11} 8M17 ${h-6}L${w-14} ${h-5}`);a.label.setAttribute('d',`M${w*.3} 1h${w*.3}v3h-${w*.3}Z`);a.stitch.setAttribute('d',`M6 5v${Math.max(0,h-10)}`);if(i<count)bottom-=h+2});number.textContent=sum;total.textContent='/ '+initial;document.querySelector('#week-label').textContent=Number(week.value)===16?'学期结束':`第 ${Number(week.value)+1} / 16 周`;card.setAttribute('aria-label',`本学期剩余 ${sum} 课时，点开看课程明细`);document.querySelector('#detail-total').textContent=`${sum} / ${initial} 课时`;const list=document.querySelector('#course-list');list.replaceChildren();for(const c of courses){const row=document.createElement('div');row.className='book-course';row.style.setProperty('--book-color',c.color);const mark=document.createElement('i'),name=document.createElement('b'),value=document.createElement('span');name.textContent=c.name;value.textContent=remaining(c)>0?remaining(c)+' 课时':'已结束';row.append(mark,name,value);list.append(row)}}
week.addEventListener('input',render);card.addEventListener('click',()=>dialog.showModal());document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{card.style.width=b.dataset.size+'px';document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
let timer;function close(){if(dialog.classList.contains('is-closing'))return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return}dialog.classList.add('is-closing');timer=setTimeout(()=>dialog.close(),220)}dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();close()});dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('close',()=>{clearTimeout(timer);dialog.classList.remove('is-closing')});render();
})();



