(() => {
  'use strict';const NS='http://www.w3.org/2000/svg';
  function el(p,tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));p.append(n);return n}
  function mount(container,{exams=[],today,forecast=null,target=null,onOpen=()=>{}}={}){
    FolioQueue.dateValue(today);let state={today,forecast,target};
    const valid=exams.filter(e=>{try{return Number.isFinite(FolioQueue.dateValue(e.date))}catch{return false}}).map(e=>({...e})).sort((a,b)=>a.date.localeCompare(b.date));
    const button=document.createElement('button');button.type='button';button.className='finals-square';container.replaceChildren(button);
    const svg=el(button,'svg',{viewBox:'0 0 240 240','aria-hidden':'true'}),pages=el(svg,'g',{});
    el(svg,'path',{d:'M35 36L205 37 203 152 37 153Z',fill:'#f6efdf'});
    el(svg,'path',{d:'M35 36L205 37 205 53 35 52Z',fill:'#bc8c6c'});
    el(svg,'path',{d:'M66 29v15m99-14v15',fill:'none',stroke:'#988469','stroke-width':4,'stroke-linecap':'round'});
    el(svg,'path',{d:'M187 153l1-16 16 15Z',fill:'#e1d1b5'});
    const number=el(svg,'text',{x:120,y:134,'text-anchor':'middle','font-size':76,'font-weight':700,'font-family':'Songti SC, SimSun, serif',fill:'#ac7858'});
    el(svg,'path',{d:'M36 194H204',fill:'none',stroke:'#c9bea5','stroke-width':3,'stroke-linecap':'round'});
    const connector=el(svg,'line',{y1:194,y2:194,stroke:'#c49374','stroke-width':3});
    const actual=el(svg,'g',{class:'final-marker'});el(actual,'circle',{r:5,fill:'#b87c5b'});
    const goal=el(svg,'g',{class:'final-marker'});el(goal,'path',{d:'M0-6 6 0 0 6-6 0Z',fill:'#e9e0ce',stroke:'#8c9b7c','stroke-width':2.5});
    const actualText=el(svg,'text',{y:178,'text-anchor':'middle','font-size':15,'font-weight':700,'font-family':'Songti SC, SimSun, serif',fill:'#ad7f5e'});
    const goalText=el(svg,'text',{y:218,'text-anchor':'middle','font-size':15,'font-weight':700,'font-family':'Songti SC, SimSun, serif',fill:'#8a9879'});
    function info(){const upcoming=valid.filter(e=>e.date>=state.today),next=upcoming[0]||null;return {next,exams:upcoming,days:next?(FolioQueue.dateValue(next.date)-FolioQueue.dateValue(state.today))/86400000:null}}
    function render(){const data=info();number.textContent=data.days===null?'—':String(data.days);number.setAttribute('fill',data.days!==null&&data.days<=7?'#b77555':'#a88967');pages.replaceChildren();const count=data.days===null?0:Math.min(4,Math.max(0,Math.ceil(data.days/7)-1));for(let i=count;i>0;i--)el(pages,'path',{d:`M${35-i*2} ${41+i*4}L${205+i} ${40+i*4} ${204+i} ${153+i*4} ${36-i*2} ${154+i*4}Z`,fill:i%2?'#d5c5a7':'#e0d0b3'});
      const hasGoal=Number.isFinite(state.forecast)&&Number.isFinite(state.target);[actual,goal,connector,actualText,goalText].forEach(n=>n.style.opacity=hasGoal?'1':'0');
      if(hasGoal){const low=Math.max(0,Math.min(state.forecast,state.target)-.3),high=Math.min(5,Math.max(state.forecast,state.target)+.3),x=v=>36+Math.max(0,Math.min(1,(v-low)/(high-low)))*168,ax=x(state.forecast),gx=x(state.target);actual.setAttribute('transform',`translate(${ax} 194)`);goal.setAttribute('transform',`translate(${gx} 194)`);connector.setAttribute('x1',ax);connector.setAttribute('x2',gx);actualText.setAttribute('x',Math.max(55,Math.min(185,ax)));goalText.setAttribute('x',Math.max(55,Math.min(185,gx)));actualText.textContent=state.forecast.toFixed(2);goalText.textContent=state.target.toFixed(2);const color=state.forecast<state.target?'#b87c5b':'#869a79';actual.querySelector('circle').setAttribute('fill',color);connector.setAttribute('stroke',color)}
      button.setAttribute('aria-label',(data.next?'距'+data.next.title+'考试 '+data.days+' 天':'尚无后续考试日期')+(hasGoal?'，方案预计均绩 '+state.forecast.toFixed(2)+'，目标 '+state.target.toFixed(2):'，尚无目标数据')+'，打开详情');
    }
    button.onclick=()=>onOpen(info());render();return {update(values){if(values.today){try{FolioQueue.dateValue(values.today)}catch{return}}state={...state,...values};render()},destroy(){button.remove()}};
  }
  window.FolioFinalsCard={mount};
})();
