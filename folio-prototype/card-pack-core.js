/* Local composition only. Entries reference registered widgets, never their data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioCardPackCore=api;})(globalThis,()=>{
 'use strict';const MAX=64,validId=id=>typeof id==='string'&&id.length>0&&id.length<=160&&!id.startsWith('pack:')&&id!=='card-pack';
 function clean(){return {version:1,packs:[]};}
 function restore(raw){const out=clean(),seen=new Set();if(raw?.version!==1||!Array.isArray(raw.packs))return out;for(const p of raw.packs.slice(0,256)){
  if(!p||!/^pack:[a-zA-Z0-9-]{1,80}$/.test(p.id)||seen.has(p.id))continue;seen.add(p.id);const keys=new Set(),cards=[];
  for(const c of (Array.isArray(p.cards)?p.cards:[]).slice(0,MAX)){if(!c||!validId(c.widget)||typeof c.key!=='string'||!c.key||c.key.length>100||keys.has(c.key))continue;keys.add(c.key);cards.push({key:c.key,widget:c.widget});}
  out.packs.push({id:p.id,cards,active:cards.some(c=>c.key===p.active)?p.active:cards[0]?.key||null});
 }return out;}
 function change(state,id,op,data={}){const next=restore(state);let p=next.packs.find(p=>p.id===id);
  if(op==='create'){if(p||!/^pack:[a-zA-Z0-9-]{1,80}$/.test(id))throw Error('卡片包标识不正确');if(next.packs.length>=256)throw Error('卡片包存储已满');next.packs.push({id,cards:[],active:null});return next;}
  if(!p)throw Error('找不到这个卡片包');
  if(op==='add'){if(!validId(data.widget)||typeof data.key!=='string'||!data.key||data.key.length>100||p.cards.some(c=>c.key===data.key))throw Error('卡片不正确');if(p.cards.length>=MAX)throw Error('一个卡片包最多放64张');p.cards.push({key:data.key,widget:data.widget});p.active=data.key;}
  else if(op==='select'){if(!p.cards.some(c=>c.key===data.key))throw Error('找不到这张卡片');p.active=data.key;}
  else if(op==='remove'){const i=p.cards.findIndex(c=>c.key===data.key);if(i<0)throw Error('找不到这张卡片');p.cards.splice(i,1);if(p.active===data.key)p.active=p.cards[Math.min(i,p.cards.length-1)]?.key||null;}
  else if(op==='move'){const i=p.cards.findIndex(c=>c.key===data.key),to=data.to;if(i<0||!Number.isInteger(to)||to<0||to>=p.cards.length)throw Error('位置不正确');const [c]=p.cards.splice(i,1);p.cards.splice(to,0,c);}
  else throw Error('不支持的卡片包操作');return next;
 }
 function destination(index,count,dx,velocity,width,cancelled=false){if(cancelled||width<=0||count<2)return index;const go=Math.abs(dx)>width*.22||Math.abs(dx)>18&&Math.abs(velocity)>.35;return go?Math.max(0,Math.min(count-1,index+(dx<0?1:-1))):index;}
 return Object.freeze({MAX,clean,restore,change,destination});
});
