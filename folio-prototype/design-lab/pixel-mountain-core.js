(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioMountain=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function valid(data){return !!data&&typeof data.scope==='string'&&data.scope.length>0&&finite(data.total)&&data.total>0&&finite(data.remaining)&&data.remaining>=0&&data.remaining<=data.total}
 function count(data,size){if(!valid(data))throw new Error('Invalid lesson totals');return Math.round(size*data.remaining/data.total)}
 function terrain(){
  const heights=[3,5,7,9,10,12,15,16,15,14,13,14,17,20,22,21,19,17,15,14,15,16,15,13,12,13,11,10,8,7,5,4,2];
  const live=new Map(),removed=[];for(let col=0;col<heights.length;col++)for(let row=25-heights[col];row<25;row++)live.set(col+','+row,{x:29+col*6,y:65+row*6,col,row});
  let shell=0;while(live.size){const edge=[...live.values()].filter(c=>!live.has(c.col+','+(c.row-1))||!live.has((c.col-1)+','+c.row)||!live.has((c.col+1)+','+c.row));
   // Follow each exposed contour from right to left before going one layer deeper.
   edge.sort((a,b)=>b.col-a.col||a.row-b.row);for(const c of edge){removed.push({...c,shell});live.delete(c.col+','+c.row)}shell++;
  }return removed.reverse().map((c,id)=>({...c,id}));
 }
 function cached(raw,current){if(!valid(current))throw new Error('Invalid lesson totals');try{const previous=JSON.parse(raw);return previous?.version===2&&valid(previous)&&previous.scope===current.scope&&previous.total===current.total?previous:null}catch{return null}}
 function plan(previous,current,size){const end=count(current,size),start=previous?count(previous,size):end;return{start:end>start?end:start,end,removing:Math.max(0,start-end)}}
 function snapshot(data){if(!valid(data))throw new Error('Invalid lesson totals');return{version:2,scope:data.scope,total:data.total,remaining:data.remaining}}
 return{valid,count,terrain,cached,plan,snapshot};
});
