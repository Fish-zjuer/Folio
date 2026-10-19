(() => {
  'use strict';const NS='http://www.w3.org/2000/svg';
  function el(p,tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));p.append(n);return n}
  function text(p,x,y,value,size=15,color='#897b61',anchor='start'){const n=el(p,'text',{x,y,fill:color,'font-size':size,'font-weight':700,'font-family':'Songti SC, SimSun, serif','text-anchor':anchor});n.textContent=value;return n}
  function mount(container,{exams=[],today,forecast=null,target=null,importantThreshold=4.5,onOpen=()=>{}}={}){
    FolioQueue.dateValue(today);let state={today,forecast,target};
    const valid=exams.filter(e=>{try{return Number.isFinite(FolioQueue.dateValue(e.date))}catch{return false}}).map(e=>({...e})).sort((a,b)=>a.date.localeCompare(b.date));
    const button=document.createElement('button');button.type='button';button.className='finals-square';container.replaceChildren(button);
    const svg=el(button,'svg',{viewBox:'0 0 240 240','aria-hidden':'true'});
    el(svg,'path',{d:'M14 20L65 19 67 63 15 64Z',fill:'#d9c7a8'});
    el(svg,'path',{d:'M16 15L67 16 66 60 16 60Z',fill:'#f7efde'});
    el(svg,'path',{d:'M16 15L67 16 67 25 16 24Z',fill:'#bd8c6b'});
    el(svg,'path',{d:'M27 12v9m28-9v9',fill:'none',stroke:'#9e8768','stroke-width':2.5,'stroke-linecap':'round'});
    const number=text(svg,41,53,'',32,'#ae7c58','middle');
    const forecastLabel=text(svg,85,31,'—',19,'#b17d5c'),targetLabel=text(svg,222,31,'—',19,'#8c9a79','end');
    el(svg,'path',{d:'M146 25h18m-5-4 5 4-5 4',fill:'none',stroke:'#b6a685','stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round'});
    el(svg,'path',{d:'M88 49H219',fill:'none',stroke:'#d1c3a6','stroke-width':3,'stroke-linecap':'round'});
    const link=el(svg,'line',{y1:49,y2:49,'stroke-width':3});
    const dot=el(svg,'circle',{cy:49,r:4,class:'final-marker'});
    const diamond=el(svg,'path',{d:'M0-5 5 0 0 5-5 0Z',fill:'#e9e0ce',stroke:'#8c9a79','stroke-width':2,class:'final-marker'});
    el(svg,'path',{d:'M16 72H223',fill:'none',stroke:'#d5c8ad','stroke-width':1});
    const rows=el(svg,'g',{});
    function info(){const upcoming=valid.filter(e=>e.date>=state.today),next=upcoming[0]||null;return {next,exams:upcoming,days:next?(FolioQueue.dateValue(next.date)-FolioQueue.dateValue(state.today))/86400000:null}}
    function render(){const data=info();number.textContent=data.days===null?'—':String(data.days);number.setAttribute('fill',data.days!==null&&data.days<=7?'#b77555':'#a88967');
      const hasGoal=Number.isFinite(state.forecast)&&Number.isFinite(state.target);
      forecastLabel.textContent=Number.isFinite(state.forecast)?state.forecast.toFixed(2):'—';targetLabel.textContent=Number.isFinite(state.target)?state.target.toFixed(2):'—';
      [link,dot,diamond].forEach(n=>n.style.opacity=hasGoal?'1':'0');
      if(hasGoal){const low=Math.max(0,Math.min(state.forecast,state.target)-.3),high=Math.min(5,Math.max(state.forecast,state.target)+.3),position=v=>88+(v-low)/(high-low)*131,ax=position(state.forecast),gx=position(state.target),color=state.forecast<state.target?'#b17d5c':'#8a9a78';dot.setAttribute('cx',ax);dot.setAttribute('fill',color);diamond.setAttribute('transform',`translate(${gx} 49)`);link.setAttribute('x1',ax);link.setAttribute('x2',gx);link.setAttribute('stroke',color)}
      rows.replaceChildren();data.exams.slice(0,5).forEach((exam,i)=>{const y=94+i*29,hasTarget=Number.isFinite(exam.goal),important=hasTarget&&exam.goal>=importantThreshold;
        if(i===0)el(rows,'path',{d:`M13 ${y-15}L224 ${y-16} 223 ${y+11} 14 ${y+12}Z`,fill:'#f2e9d6'});
        el(rows,'path',{d:`M15 ${y+14}H223`,fill:'none',stroke:'#d9cdb6','stroke-width':.7});
        el(rows,'path',{d:`M16 ${y-10}L19 ${y-11} 19 ${y+5} 16 ${y+6}Z`,fill:important?'#bf8965':'#a7b091'});
        const label=exam.shortTitle||exam.title||'—';const title=text(rows,25,y,label.length>5?label.slice(0,5)+'…':label,14,important?'#9a7758':'#8c9678');
        const full=el(title,'title',{});full.textContent=exam.title;
        text(rows,141,y,exam.date.slice(5).replace('-','/'),14,'#ac9473','middle');
        text(rows,220,y,hasTarget?exam.goal.toFixed(1):'—',17,important?'#ad7957':'#8b9c7c','end');
      });
      if(!data.exams.length)el(rows,'path',{d:'M87 144l22 3 42-6',fill:'none',stroke:'#c8baa0','stroke-width':3,'stroke-linecap':'round'});
      button.setAttribute('aria-label',(data.next?'距'+data.next.title+'考试 '+data.days+' 天':'尚无后续考试日期')+(hasGoal?'，方案预计均绩 '+state.forecast.toFixed(2)+'，目标 '+state.target.toFixed(2):'，尚无完整均绩目标')+'；'+data.exams.length+' 场待考；'+data.exams.slice(0,5).map(e=>e.title+' '+e.date+(Number.isFinite(e.goal)?'，课程目标 '+e.goal:'')).join('；')+'，打开详情');
    }
    button.onclick=()=>onOpen(info());render();return {update(values){if(values.today){try{FolioQueue.dateValue(values.today)}catch{return}}state={...state,...values};render()},destroy(){button.remove()}};
  }
  window.FolioFinalsCard={mount};
})();
