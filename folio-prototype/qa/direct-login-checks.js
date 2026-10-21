/* Isolated synthetic failure UI. No school credentials or real network. */
document.addEventListener('DOMContentLoaded',()=>{
  const tools=document.createElement('aside');tools.id='login-qa-tools';tools.style='position:fixed;bottom:8px;right:8px;z-index:99999;background:#e5e9df;padding:8px';
  const button=document.createElement('button');button.textContent='检查直接登录反馈';tools.append(button);document.body.append(tools);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  button.onclick=async()=>{button.disabled=true;const checks=[],ok=(name,value)=>{checks.push({name,ok:!!value});if(!value)throw Error(name);};try{
    FolioQA.demoAccount={username:'fixture-user',hasPassword:true,accountId:'fixture-account'};FolioQA.failSchool=true;showPreviewScreen('settings',{focus:false});await FolioLiveUI.openSchool();
    let panel=document.querySelector('.school-connect-panel'),submit=panel.querySelector('.school-connect-submit');submit.click();
    for(let i=0;i<100&&submit.disabled;i++)await wait(40);
    ok('刷新结束并显示具体平台与认证原因',!submit.disabled&&panel.querySelector('.school-connect-error').textContent.includes('成绩')&&panel.querySelector('.school-connect-error').textContent.includes('统一身份认证未完成'));
    ok('原生失败后未从前端重复认证',!FolioQA.calls.some(c=>c.op==='school.authenticate'));
    ok('失败原因留存在连接状态',FolioSchool.cache().lastLoginWarning?.includes('统一身份认证未完成'));
    FolioChatUI.closePanel(true,false);await FolioLiveUI.openSchool();panel=document.querySelector('.school-connect-panel');ok('重新打开仍能看到失败原因',panel.querySelector('.school-connect-error').textContent.includes('统一身份认证未完成'));
    FolioQA.failSchool=false;submit=panel.querySelector('.school-connect-submit');submit.click();for(let i=0;i<100&&submit.disabled;i++)await wait(40);
    ok('重试成功显示已更新',panel.querySelector('.school-connect-error').textContent==='已更新');ok('成功后清除过期登录警告',!FolioSchool.cache().lastLoginWarning&&FolioSchool.warnings().length===0);
    ok('虚构桥接没有脚本异常',FolioQA.errors.length===0);
    FolioQA.failSchool=true;submit.click();for(let i=0;i<100&&submit.disabled;i++)await wait(40);
    tools.hidden=true;parent.postMessage({directLoginQA:{passed:true,checks}},location.origin);
  }catch(e){parent.postMessage({directLoginQA:{passed:false,error:e.message,checks}},location.origin);button.disabled=false;}};
});
