/* Independent design study. The renderer accepts records; it never invents missing usage. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  function el(parent,tag,attrs={}){const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));parent.append(node);return node}
  function path(parent,d,fill,attrs={}){return el(parent,'path',{d,fill,...attrs})}
  function duration(minutes){const total=Math.round(minutes);return Math.floor(total/60)+' 小时 '+total%60+' 分钟'}
  function paper(x,y,w,h,seed){const r=Math.sin(seed*12.7)*.9;return `M${x+1} ${y+.5}Q${x+w*.5} ${y+r} ${x+w} ${y+1}L${x+w-.5} ${y+h}Q${x+w*.5} ${y+h+r} ${x} ${y+h-1}Z`}
  function mount(container,{days=[],today,mood='happy',companionStyle='lamp',onSelect=()=>{}}={}){
    const root=document.createElement('div');root.className='usage-square';container.replaceChildren(root);const svg=el(root,'svg',{viewBox:'0 0 240 240',role:'group','aria-label':'一周手机使用时间'});
    const deco=el(svg,'g',{'aria-hidden':'true'});path(deco,'M27 36l17 3-2 13-18-3Z','#c6cfb9');path(deco,'M28 36l3 5 13-2Z','#d6ddc9');path(deco,'M47 51l12-8-2 17Z','#b9c7af');path(deco,'M25 225l7-4m-3 9 7-4','none',{stroke:'#b4bea7','stroke-width':1.5,'stroke-linecap':'round'});
    let currentMood=['happy','waiting','sad'].includes(mood)?mood:'happy';
    let currentStyle=Object.hasOwn(FolioCompanion.labels,companionStyle)?companionStyle:'lamp';
    const companion=el(svg,'g',{transform:'translate(153 7) scale(.82)'});
    const drawCompanion=()=>FolioCompanion.render(companion,currentStyle,currentMood);drawCompanion();
    const records=days.slice(-7).filter(d=>typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&(d.minutes===null||Number.isFinite(d.minutes)&&d.minutes>=0));
    const peak=Math.max(240,...records.map(d=>d.minutes||0));const scale=124/peak;let chosen=null;
    const hourY=190-60*scale;
    path(svg,`M8 ${hourY-3}Q8 ${hourY-4.1} 9 ${hourY-3.5}L15.7 ${hourY-.8}Q17 ${hourY} 15.7 ${hourY+.8}L9 ${hourY+3.5}Q8 ${hourY+4.1} 8 ${hourY+3}Z`,'#b49b72',{role:'img','aria-label':'1 小时参考位置',class:'usage-hour-marker'});
    records.forEach((day,i)=>{const x=23+i*28;const g=el(svg,'g',{class:'usage-day',role:'button',tabindex:0,'aria-label':day.date+'，'+(day.minutes===null?'无记录':duration(day.minutes))});el(g,'rect',{x:x-2,y:70,width:28,height:147,rx:2,class:'focus-ring'});
      // null stays visibly unknown; a genuine zero is a small baseline tick.
      if(day.minutes===null)path(g,`M${x+8} 181h9`,'none',{stroke:'#a7b39c','stroke-width':2});
      else {const height=Math.max(2,day.minutes*scale);path(g,paper(x,190-height,24,height,i+5),day.date===today?'#7b957e':'#9bab8a',{class:'bar'});}
      const text=el(g,'text',{x:x+12,y:211,'text-anchor':'middle',class:'date'});text.textContent=String(Number(day.date.slice(8)));
      if(day.date===today)path(g,`M${x+12} 229v-10m-4 4 4-4 4 4`,'none',{stroke:'#6f896f','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'});
      const select=()=>{chosen?.classList.remove('is-selected');g.classList.add('is-selected');chosen=g;g.focus({preventScroll:true});onSelect({...day})};g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}});
    });
    if(!records.length){path(svg,'M24 190h192','none',{stroke:'#c3ccb8','stroke-width':2});root.setAttribute('aria-label','还没有手机使用记录')}
    return {setMood(value){if(!['happy','waiting','sad'].includes(value))return;currentMood=value;drawCompanion()},setCompanion(value){if(!Object.hasOwn(FolioCompanion.labels,value))return;currentStyle=value;drawCompanion()},clearSelection(){chosen?.classList.remove('is-selected');chosen=null},destroy(){container.replaceChildren()}};
  }
  window.FolioUsageCard={mount,duration};
})();
