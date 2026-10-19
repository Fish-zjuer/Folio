(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioWorkbenchSlots=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const valid=i=>Number.isInteger(i)&&i>=0&&i<4;
 function swap(slots,from,to){if(!Array.isArray(slots)||slots.length!==4||!valid(from)||!valid(to))throw new TypeError('Invalid workbench position');const next=slots.slice();[next[from],next[to]]=[next[to],next[from]];return next}
 function hit(rects,x,y){return rects.findIndex(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)}
 function neighbor(index,key){if(!valid(index))return -1;const moves={ArrowLeft:index%2?index-1:-1,ArrowRight:index%2?-1:index+1,ArrowUp:index>=2?index-2:-1,ArrowDown:index<2?index+2:-1};return moves[key]??-1}
 return{swap,hit,neighbor};
});
