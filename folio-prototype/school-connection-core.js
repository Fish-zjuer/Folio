/* All school refresh entry points share one bounded session recovery. */
(function(root){
 'use strict';
 const siteFor=module=>module==='homework'?'homework':module.startsWith('practice')?'practice':'academic';
 const needsLogin=e=>/登录|认证|会话|未连接|session|unauthori[sz]ed|not.?logged/i.test(e?.message||'');
 function failureSummary(entries=[]){const groups=new Map();for(const e of entries){const warning=String(e.warning||'').trim();if(!warning)continue;if(!groups.has(warning))groups.set(warning,[]);groups.get(warning).push(e.label);}const rows=[...groups].map(([message,labels])=>`${labels.join('、')}：${message}`);return rows.slice(0,2).join('；')+(rows.length>2?'；其余原因可点对应模块查看。':'');}
 function create({call,decode,nativeRecovery=false}){const auth=new Map();return async function request(module,args={}){
  const read=async()=>decode(await call('school',{module,...args}));
  try{return await read();}catch(error){
   if(nativeRecovery||module==='calendar'||!needsLogin(error))throw error;
   const site=siteFor(module);let job=auth.get(site);
   if(!job){job=Promise.resolve().then(()=>call('school.authenticate',{site}));auth.set(site,job);}
   try{await job;}finally{if(auth.get(site)===job)auth.delete(site);}
   return read();
  }
 };}
 const api={create,siteFor,needsLogin,failureSummary};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FolioSchoolConnection=api;
})(typeof globalThis==='undefined'?this:globalThis);
