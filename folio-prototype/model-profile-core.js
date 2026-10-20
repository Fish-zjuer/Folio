/* Display names never replace provider model IDs. Effort capabilities are explicit. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioModelProfile=api;})(globalThis,()=>{
 'use strict';
 const normalize=base=>String(base||'').trim().replace(/\/+$/,'');
 function profile(config,id){return (config.profiles||[]).find(p=>normalize(p.baseUrl)===normalize(config.baseUrl)&&p.model===id)||{};}
 function options(config,id){const mode=profile(config,id).effortMode||'compatible';return mode==='none'?['auto']:['auto','low','medium','high',...(['xhigh','max'].includes(mode)?['max']:[])];}
 function effort(config,id,value){const chosen=options(config,id).includes(value)?value:'auto';return chosen==='max'?profile(config,id).effortMode:chosen;}
 function label(config,id){const alias=profile(config,id).alias;return typeof alias==='string'&&alias.trim()?alias.trim().slice(0,80):id||'选择模型';}
 function upsert(config,id,values){const list=(config.profiles||[]).filter(p=>!(normalize(p.baseUrl)===normalize(config.baseUrl)&&p.model===id));list.push({baseUrl:normalize(config.baseUrl),model:id,alias:String(values.alias||'').trim().slice(0,80),effortMode:['none','compatible','xhigh','max'].includes(values.effortMode)?values.effortMode:'compatible'});return list.slice(-400);}
 return {normalize,profile,options,effort,label,upsert};
});
