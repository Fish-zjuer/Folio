/* 先占用分散的纸张位置；容量用尽后错位叠放。相同输入保持相同位置。 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FolioNoteLayout=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  function safeLayout(width,height,shapes,{exclusions=[],topInset=44}={}){
    const minX=12,maxX=Math.max(minX,width-78),minY=Math.max(8,Math.min(topInset,height-80)),maxY=Math.max(minY,height-78);
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const bounds=p=>({left:p.x-12,right:p.x+78,top:p.y-4,bottom:p.y+78});
    const valid=p=>!exclusions.some(r=>overlap(bounds(p),r));
    const xs=[],ys=[],cells=[];for(let x=minX;x<maxX;x+=8)xs.push(x);xs.push(maxX);for(let y=minY;y<maxY;y+=8)ys.push(y);ys.push(maxY);
    for(const y of ys)for(const x of xs){const p={x,y};if(valid(p))cells.push(p)}
    if(!cells.length)return shapes.map(()=>({x:minX,y:minY}));
    const desired=s=>({x:clamp(12+(s.x??.5)*Math.max(0,width-88),minX,maxX),y:clamp(minY+(s.y??.5)*(maxY-minY),minY,maxY)});
    const nearest=p=>valid(p)?p:cells.reduce((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)<=Math.hypot(b.x-p.x,b.y-p.y)?a:b);
    const manuals=new Map();shapes.forEach((s,i)=>{if(s.manual)manuals.set(i,nearest(desired(s)))});
    const manualPoints=[...manuals.values()],clear=(p,q)=>Math.abs(p.x-q.x)>=76||Math.abs(p.y-q.y)>=78;
    // Reserve a complete packing before choosing a scattered order. Farthest-point
    // placement alone can strand gaps that are too narrow for the next paper.
    const phases=(span,pitch)=>{const rest=span%pitch,values=[0,rest];for(let n=4;n<rest;n+=4)values.push(n);return values;};
    let slots=[],spread=-Infinity;
    for(const dx of phases(maxX-minX,76))for(const dy of phases(maxY-minY,78)){
      const candidate=[];
      for(let y=minY+dy;y<=maxY+.001;y+=78)for(let x=minX+dx;x<=maxX+.001;x+=76){const p={x,y};if(valid(p)&&manualPoints.every(q=>clear(p,q)))candidate.push(p);}
      const balance=candidate.reduce((n,p)=>n+Math.hypot(p.x-(minX+maxX)/2,p.y-(minY+maxY)/2),0);
      if(candidate.length>slots.length||candidate.length===slots.length&&balance>spread){slots=candidate;spread=balance;}
    }
    const placed=[],remaining=slots.slice();
    return shapes.map((s,index)=>{
      if(manuals.has(index)){const p=manuals.get(index);placed.push(p);return p;}
      const others=placed.concat(manualPoints);
      let best=null,score=-Infinity,bestIndex=-1;
      const candidates=remaining.length?remaining:cells;
      candidates.forEach((p,i)=>{
        const distance=others.length?Math.min(...others.map(q=>Math.hypot(p.x-q.x,p.y-q.y))):Math.hypot(p.x-width*.25,p.y-height*.4);
        // Once every reserved slot is used, occupy the least-covered hole;
        // penalise actual covered area rather than repeatedly stacking centres.
        const covered=others.reduce((n,q)=>n+Math.max(0,76-Math.abs(p.x-q.x))*Math.max(0,78-Math.abs(p.y-q.y)),0);
        const value=-covered*100+distance+(s.x??.5)*i*.0001;
        if(value>score){best=p;score=value;bestIndex=i;}
      });
      if(remaining.length)remaining.splice(bestIndex,1);
      placed.push(best);return best;
    });
  }

  function layout(width,height,shapes,options){
    if(options?.safe)return safeLayout(width,height,shapes,options);
    const columns=Math.max(1,Math.floor((width-24)/82)),rows=Math.max(1,Math.floor((height-138)/84)+1),cells=[];
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const x=12+(columns===1?0:col*(width-94)/(columns-1)),y=44+(rows===1?0:row*(height-138)/(rows-1));
      if(x>width*.68&&y<76)continue;cells.push({x,y});
    }
    if(!cells.length)cells.push({x:12,y:44});
    const manual=shapes.filter(s=>s.manual).map(s=>({x:12+s.x*Math.max(0,width-88),y:44+s.y*Math.max(0,height-151)})),placed=[],used=new Set();let automatic=0;
    shapes.forEach((shape,index)=>{
      if(shape.manual){placed.push({x:12+shape.x*Math.max(0,width-88),y:44+shape.y*Math.max(0,height-151)});return;}
      const layer=Math.floor(automatic/cells.length);if(automatic++%cells.length===0)used.clear();
      let best=0,score=-Infinity;
      cells.forEach((cell,i)=>{if(used.has(i))return;const distance=placed.length?Math.min(...placed.map(p=>Math.hypot(p.x-cell.x,p.y-cell.y))):Math.hypot(cell.x-width*.25,cell.y-height*.35);const covered=manual.some(p=>Math.abs(p.x-cell.x)<70&&Math.abs(p.y-cell.y)<70);const value=distance+(shape.x??.5)*i*.1-(covered?1000:0);if(value>score){best=i;score=value;}});
      used.add(best);const base=cells[best],offset=layer?((layer%2?1:-1)*Math.min(24,12+layer*4)):0;
      placed.push({x:Math.max(8,Math.min(width-72,base.x+offset+(shape.x-.5)*6)),y:base.y+(layer?18+Math.floor(layer/2)*12:0)+(shape.y-.5)*4});
    });return placed;
  }return {layout};
});
