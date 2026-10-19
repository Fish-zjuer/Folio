(()=>{
 'use strict';let status={allowed:false,days:[],error:'',loading:false},job=null,lastAttempt=0;
 const native=()=>window.FolioApp?.native&&location.hostname==='appassets.androidplatform.net';
 async function refresh(force=false){if(!native())return status;if(job)return job;if(!force&&Date.now()-lastAttempt<60000)return status;lastAttempt=Date.now();status.loading=true;
  job=(async()=>{try{const result=await FolioNative.call('app.usage.read');status={allowed:!!result.allowed,days:Array.isArray(result.days)?result.days:[],updatedAt:result.updatedAt||null,error:'',loading:false};if(status.allowed)localStorage.setItem('folio-phone-usage-v1',JSON.stringify(status.days));}catch(e){status.error=e.message;status.loading=false;}finally{job=null;document.dispatchEvent(new Event('folio-usage-change'));}return status;})();return job;}
 window.FolioPhoneUsage=Object.freeze({refresh,snapshot:()=>({...status}),available:native,async authorize(){if(!native())throw Error('请在 Android 应用中开启使用情况访问权限');await FolioNative.call('app.usage.settings');}});
 document.addEventListener('preview-screen-change',e=>{if(e.detail.screen==='workbench')refresh();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
 window.addEventListener('focus',()=>refresh(true));window.addEventListener('folio-native-resume',()=>refresh(true));
})();
