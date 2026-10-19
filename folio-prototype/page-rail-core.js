(function(root){'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function progress(dx,index,width,count){const raw=index-dx/Math.max(1,width),edge=clamp(raw,0,count-1);return edge+(raw-edge)*.12;}
 function destination(index,dx,velocity,width,count,cancelled=false){if(cancelled)return index;const dir=dx<0?1:-1,passes=Math.abs(dx)>=Math.max(32,width*.2)||Math.abs(dx)>=24&&Math.abs(velocity)>.35;return clamp(index+(passes?dir:0),0,count-1);}
 function scrub(x,left,width,count){return clamp((x-left)/Math.max(1,width),0,1)*(count-1);}
 function visiblePages(value,current,count){return Array.from({length:count},(_,i)=>i).filter(i=>Math.abs(i-value)<1||i===current);}
 const api={progress,destination,scrub,visiblePages};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FolioPageRailCore=api;})(typeof globalThis==='undefined'?this:globalThis);
