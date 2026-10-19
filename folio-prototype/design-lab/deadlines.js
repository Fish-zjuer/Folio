(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  function el(parent,tag,attrs={}){const p=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))p.setAttribute(key,String(value));parent.append(p);return p}
  function mount(container,{items=[],today,span=7,onSelect=()=>{}}={}){
    FolioQueue.dateValue(today);
    let day=today,horizon=span>0?span:7;
    const root=document.createElement('div');root.className='deadline-square';container.replaceChildren(root);
    const svg=el(root,'svg',{viewBox:'0 0 240 240',role:'group','aria-label':'截止倒计时'});
    const decoration=el(svg,'g',{'aria-hidden':'true'});
    el(decoration,'path',{d:'M183 19l21 3-2 13-21-3Z',fill:'#dcbda6'});el(decoration,'path',{d:'M194 17l20 6-4 12-20-6Z',fill:'#e7cab2'});el(decoration,'path',{d:'M183 19l5 5 16-2Z',fill:'#efdbc7'});
    el(decoration,'path',{d:'M27 215l6-5m0 9 6-5m0 8 6-5',fill:'none',stroke:'#ccad95','stroke-width':1.6,'stroke-linecap':'round'});
    el(svg,'path',{d:'M45 44V199',fill:'none',stroke:'#c8a78e','stroke-width':1.8,'stroke-dasharray':'4 6','aria-hidden':'true'});
    const valid=items.filter(item=>{if(item.completed||item.repeatTemplate||!item.deadline)return false;try{FolioQueue.dateValue(item.deadline);return true}catch{return false}}).map(item=>({...item})).sort((a,b)=>(a.deadline+(a.deadlineClock||'23:59')).localeCompare(b.deadline+(b.deadlineClock||'23:59'))).slice(0,4);
    const rows=valid.map((item,i)=>{
      const y=51+i*43,g=el(svg,'g',{class:'deadline-row',role:'button',tabindex:0});
      el(g,'rect',{x:17,y:y-5,width:207,height:38,rx:3,class:'focus'});
      el(g,'path',{d:`M47 ${y+1}L214 ${y} 214 ${y+26} 46 ${y+27}Z`,fill:'#e3cbbb','aria-hidden':'true'});
      const ribbon=el(g,'rect',{x:47,y,width:8,height:27,rx:1.5,class:'deadline-ribbon'});
      const tip=el(g,'path',{d:'M-3-5Q-3-6-2-5L5-1Q7 0 5 1L-2 5Q-3 6-3 5Z',class:'deadline-tip'});
      const zero=el(g,'circle',{cx:45,cy:y+13.5,r:3,class:'deadline-zero'});
      const select=()=>onSelect({...item},FolioQueue.usableDays(item,day));g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();select()}});
      return {item,g,ribbon,tip,zero,y};
    });
    function render(){rows.forEach(({item,g,ribbon,tip,zero,y})=>{
      const days=FolioQueue.usableDays(item,day),past=days<0,color=past?'#ad6c58':days<=1?'#ba7959':days<=3?'#c19a67':'#929e80';
      const length=past?Math.min(25,Math.max(10,-days*8)):days===0?0:Math.max(8,Math.min(horizon,days)/horizon*157);
      ribbon.setAttribute('x',past?45-length:47);ribbon.setAttribute('width',length);ribbon.setAttribute('fill',color);
      tip.setAttribute('transform',`translate(${past?45-length:47+length} ${y+13.5})${past?' rotate(180)':''}`);tip.setAttribute('fill',color);zero.setAttribute('fill',color);zero.style.opacity=days===0?'1':'0';
      g.setAttribute('aria-label',(item.course?item.course+'，':'')+item.title+'，截止 '+item.deadline+(item.deadlineClock?' '+item.deadlineClock:'')+'，可用日余量 '+days+' 天');
    })}
    if(!valid.length)el(svg,'path',{d:'M87 119l22 3 42-6',fill:'none',stroke:'#d5bba7','stroke-width':3,'stroke-linecap':'round'});
    render();return {setToday(value){try{FolioQueue.dateValue(value)}catch{return}day=value;render()},setSpan(value){if(!Number.isFinite(value)||value<1)return;horizon=value;render()},destroy(){root.remove()}};
  }
  window.FolioDeadlines={mount};
})();
