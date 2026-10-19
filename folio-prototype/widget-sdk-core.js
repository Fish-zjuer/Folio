(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioWidgetContract=api;})(typeof globalThis==='undefined'?this:globalThis,()=>{
 'use strict';const datasets=Object.freeze(['courses','tasks','exams','academic','focus']);
 function validate(m){if(!m||m.apiVersion!==1)throw Error('Widget API version must be 1');if(!/^[a-z][a-z0-9-]{0,39}\/[a-z][a-z0-9-]{0,59}$/.test(m.id||''))throw Error('Widget id must be publisher/name');if(typeof m.name!=='string'||!m.name.trim()||m.name.length>30)throw Error('Widget name is required (max 30 characters)');if(typeof m.version!=='string'||!/^\d+\.\d+\.\d+$/.test(m.version))throw Error('Widget version must be x.y.z');if(typeof m.mount!=='function')throw Error('Widget mount is required');if(!Array.isArray(m.permissions)||m.permissions.some(p=>!datasets.includes(p)))throw Error('Unknown widget data permission');return {...m,permissions:[...new Set(m.permissions)]};}
 function readonly(value){const copy=JSON.parse(JSON.stringify(value));function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}return freeze(copy);}
 function storageKey(id,key){if(!/^[a-zA-Z0-9_-]{1,64}$/.test(key))throw Error('Invalid widget preference key');return 'folio-widget-pref-v1:'+id+':'+key;}
 return {datasets,validate,readonly,storageKey};
});
