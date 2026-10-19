(()=>{
 'use strict';
 const core=FolioMountain,NS='http://www.w3.org/2000/svg',CACHE='folio-design-mountain-state-v1',INPUT='folio-design-mountain-target-v1';
 const root=document.querySelector('#mountain-card'),slider=document.querySelector('#remaining'),label=document.querySelector('#remaining-label'),status=document.querySelector('#mountain-status');
 const data={scope:'design-lab-example-semester',total:322,remaining:212};
 const read=k=>{try{return localStorage.getItem(k)}catch{return null}},write=(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
 const savedTarget=read(INPUT);if(savedTarget!==null&&/^\d+$/.test(savedTarget)&&Number(savedTarget)<=data.total)data.remaining=Number(savedTarget);
 slider.value=data.remaining;
 const el=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n};
 const svg=el('svg',{viewBox:'0 0 260 260','aria-hidden':'true'});root.append(svg);
 const backdrop=el('g',{'shape-rendering':'crispEdges'});svg.append(backdrop);
 // Pixel scenery shares the quarry palette: a timber-hung lamp and an ore cart, rather than unrelated icons.
 backdrop.append(
  el('path',{d:'M34 73h10v-4h16v4h11v4H34Z M78 76h13v3H78Z',fill:'#eee7d8'}),
  el('path',{d:'M191 23h43v4h-43Z M231 27h4v37h-4Z',fill:'#b19a77'}),
  el('path',{d:'M191 23h43v2h-43Z M231 27h2v37h-2Z',fill:'#cbb695'}),
  el('path',{d:'M209 27h2v5h-2Zm-1 6h4v2h-4Zm1 3h2v6h-2Z',fill:'#9a9f8a'}),
  el('path',{d:'M200 44h20v-4h-20Zm-4 4h28v17h-4v4h-20v-4h-4Z',fill:'#e9d7ad'}),
  el('path',{d:'M206 42h8v3h-8Zm-4 3h16v3h-16Zm0 3h3v13h-3Zm13 0h3v13h-3Zm-13 13h18v4h-18Z',fill:'#8f967f'}),
  el('path',{d:'M205 48h10v13h-10Z',fill:'#d5b46e'}),
  el('path',{d:'M208 49h4v10h-4Z',fill:'#f0dfac'}),
  el('path',{d:'M42 231h151v3H42Z',fill:'#c4bba5'}),
  el('path',{d:'M28 223h204v5h-11v4H44v-3H28Z',fill:'#d6c9b1'}),
  el('path',{d:'M19 220h17v-3h189v3h15v4H19Z',fill:'#c7bba1'}),
  el('path',{d:'M39 215h173v3H39Z',fill:'#b6b299'}),
  el('path',{d:'M52 225h24v2H52Zm39 3h39v2H91Zm67-3h31v2h-31Z',fill:'#e8deca'}),
  el('path',{d:'M23 212h6v5h-6Zm207 1h5v4h-5Zm-15 21h4v3h-4Z',fill:'#b0b19c'}),
  el('path',{d:'M23 212h6v2h-6Zm207 1h5v1h-5Z',fill:'#c9c9b2'})
 );
 const mountain=el('g',{'shape-rendering':'crispEdges'}),dust=el('g',{'shape-rendering':'crispEdges'});svg.append(mountain,dust);
 const cells=core.terrain(),palette=['#939c8e','#a8ae99','#89958a','#b1b49d','#9ca493'];
 const nodes=cells.map(c=>{const noise=((c.col*73856093)^(c.row*19349663))>>>0;let fill=palette[noise%palette.length];if(noise%47===0)fill='#d3b27b';else if(noise%61===0)fill='#86a9a0';const n=el('rect',{x:c.x,y:c.y,width:6,height:6,fill});mountain.append(n);return n});
 const pick=el('g',{'shape-rendering':'crispEdges'});pick.append(el('path',{d:'M-3 0h6v32h-6Z',fill:'#b68a5e'}),el('path',{d:'M-3 0h3v32h-3Z',fill:'#cfab79'}),el('path',{d:'M-18-7h30v5h6v5h-6v-3H-6v5h-6v6h-5V2h-5v-5h4Z',fill:'#657f7b'}),el('path',{d:'M-18-7h30v3h-30Z',fill:'#98aaa0'}));svg.append(pick);
 const foreground=el('g',{'shape-rendering':'crispEdges','aria-hidden':'true'});
 foreground.append(
  el('path',{d:'M21 244h77v2H21Z M30 241h5v7h-5Zm22 0h5v7h-5Zm23 0h5v7h-5Z',fill:'#c3b89e'}),
  el('path',{d:'M31 222h6v-6h8v3h9v-6h8v9h7v7H31Z',fill:'#99a68c'}),
  el('path',{d:'M43 217h6v7h-6Zm14 1h6v6h-6Z',fill:'#c7ae77'}),
  el('path',{d:'M28 225h47v4h-4v9H34v-9h-6Z',fill:'#9caa98'}),
  el('path',{d:'M28 225h47v3H28Z M34 228h3v10h-3Z',fill:'#bec5ac'}),
  el('path',{d:'M68 228h3v10H37v-3h31Z M44 229h2v4h-2Zm15 0h2v4h-2Z',fill:'#839684'}),
  el('path',{d:'M35 238h9v7h-9Zm24 0h9v7h-9Z',fill:'#7e8b7a'}),
  el('path',{d:'M38 240h3v3h-3Zm24 0h3v3h-3Z',fill:'#d2c8ac'})
 );svg.append(foreground);
 const number=el('text',{x:23,y:36,class:'mountain-number'}),unit=el('text',{x:24,y:52,class:'mountain-unit'},'TO GO'),total=el('text',{x:84,y:35,class:'mountain-total'},'/ 322');svg.append(number,unit,total);
 let currentCount=0,frame=0,generation=0,visible=false,activeData={...data};
 function draw(count){currentCount=count;nodes.forEach((n,i)=>n.style.display=i<count?'':'none')}
 function point(count){const edge=cells[Math.max(0,count-1)];return count>0&&edge?{x:edge.x+19,y:edge.y+5}:{x:205,y:197}}
 // A fixed tool angle: the stroke is a lift, a downward blow and a short recoil, never a spin.
 function pose(p,lift=0){pick.setAttribute('transform',`translate(${p.x+lift*.4} ${p.y-lift}) rotate(-25)`)}
 function commit(target){const ok=write(CACHE,JSON.stringify(core.snapshot(target)));status.textContent=ok?`当前 ${target.remaining} / ${target.total} 课时 · 山块 ${currentCount} / ${cells.length} · 已缓存`:'浏览器未允许保存缓存，本次仍可预览。'}
 function previewLabel(){label.textContent=`${slider.value} / 322`;}
 function start(target){
  generation++;const run=generation;cancelAnimationFrame(frame);dust.replaceChildren();activeData={...target};
  const previous=core.cached(read(CACHE),target),plan=core.plan(previous,target,cells.length);
  draw(plan.start);number.textContent=previous&&previous.remaining>=target.remaining?previous.remaining:target.remaining;root.setAttribute('aria-label',`本学期剩余 ${target.remaining} / ${target.total} 课时`);
  const rest=point(plan.start);pose(rest);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||plan.start===0){draw(plan.end);number.textContent=target.remaining;pose(point(plan.end));commit(target);return}
  status.textContent=previous?'从上次缓存的外边沿开始……':'首次进入，展示当前课时对应的山形。';
  const particles=[],strikes=[false,false],firstEnd=plan.start-Math.ceil(plan.removing/2);let began,anchored=false;
  function chip(cell,birth,seed,small=false){
   const size=small?3:6,n=el('rect',{x:-size/2,y:-size/2,width:size,height:size,fill:nodes[cell.id].getAttribute('fill')});dust.append(n);
   particles.push({n,x:cell.x+3,y:cell.y+3,size,vx:30+(seed*47)%100,vy:-95-(seed*29)%110,spin:((seed%2)?1:-1)*(180+(seed*53)%240),birth});
  }
  function hit(which){strikes[which]=true;if(!plan.removing){const surface=cells[currentCount-1];for(let i=0;i<4;i++)chip(surface,which?1100:480,i+which*7,true)}}
  function peel(to,birth){
   // The next block always belongs to the current exposed outline. Its exact cell becomes a rigid fragment.
   while(currentCount>to){const c=cells[currentCount-1];nodes[c.id].style.display='none';chip(c,birth,c.id);currentCount--}
  }
  function liftAt(t,impact){const q=t-impact;if(q<-300||q>230)return 0;if(q<-110)return 30*(q+300)/190;if(q<0)return 30*(1-Math.pow((q+110)/110,2));return 8*Math.sin(q/230*Math.PI)*Math.exp(-q/200)}
  function animate(now){
   if(run!==generation)return;if(began===undefined)began=now;const t=now-began;
   if(t>=480&&!strikes[0])hit(0);if(t>=1100&&!strikes[1])hit(1);
   if(plan.removing&&t>=480){const phase=t<1100?Math.min(1,(t-480)/170):Math.min(1,(t-1100)/170);const from=t<1100?plan.start:firstEnd,to=t<1100?firstEnd:plan.end;peel(from-Math.ceil((from-to)*phase),t)}
   pose(rest,liftAt(t,480)+liftAt(t,1100));
   for(let i=particles.length-1;i>=0;i--){const part=particles[i],age=Math.max(0,(t-part.birth)/1000),x=part.x+part.vx*age,y=part.y+part.vy*age+360*age*age;
    part.n.setAttribute('transform',`translate(${x} ${y}) rotate(${part.spin*age})`);
    // No fade: remove a fragment only after its complete rigid body has crossed the viewport.
    if(y-part.size>260||x-part.size>260){part.n.remove();particles.splice(i,1)}
   }
   if(t>=1320&&!anchored){anchored=true;draw(plan.end);number.textContent=target.remaining;commit(target)}
   if(t<1400||particles.length)frame=requestAnimationFrame(animate);else pose(rest);
  }
  frame=requestAnimationFrame(animate);
 }
 function enter(){data.remaining=Number(slider.value);write(INPUT,String(data.remaining));if(visible&&!document.hidden)start(data)}
 slider.addEventListener('input',previewLabel);document.querySelector('#enter').addEventListener('click',enter);document.querySelector('#week-later').addEventListener('click',()=>{slider.value=Math.max(0,data.remaining-22);previewLabel();enter()});
 document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{root.style.width=b.dataset.size+'px';document.querySelectorAll('[data-size]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
 function stop(){generation++;cancelAnimationFrame(frame);dust.replaceChildren()}
 new IntersectionObserver(entries=>{const next=entries[0].isIntersecting;if(next&&!visible&&!document.hidden){visible=true;start(data)}else if(!next){visible=false;stop()}},{threshold:.35}).observe(root);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(visible)start(activeData)});
 previewLabel();draw(core.count(data,cells.length));pose(point(currentCount));
})();
