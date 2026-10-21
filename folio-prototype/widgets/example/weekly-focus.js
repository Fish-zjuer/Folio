/* Complete external-author example. No core-app edits or direct localStorage reads. */
FolioWidgetSDK.register({
 apiVersion:1,id:'example/weekly-focus',version:'1.0.0',name:'上周专注',description:'开发者接口示例',permissions:['focus'],
 themes:{light:{paper:'#E8E5EF',ink:'#81778F',accent:'#A49AB8'},dark:{paper:'#34313F',ink:'#C0B8D5',accent:'#9A96C1'}},
 preview(root){root.innerHTML='<svg viewBox="0 0 160 160" width="100%" height="100%" aria-hidden="true"><rect width="160" height="160" fill="var(--widget-paper)"/><path d="M25 116h20V84H25zm31 0h20V60H56zm31 0h20V74H87zm31 0h16V42h-16z" fill="var(--widget-accent)"/></svg>';},
 mount(root,ctx){
  const button=document.createElement('button');button.type='button';button.dataset.widgetHold='';button.style='width:100%;height:100%;padding:12%;text-align:left;border:0;background:var(--widget-paper);color:var(--widget-ink);border-radius:inherit';button.setAttribute('aria-label','进入专注搭建');root.append(button);
  button.onclick=()=>ctx.open('focus');
  ctx.subscribe('focus',data=>{button.replaceChildren();const label=document.createElement('span');label.textContent='上周专注';label.style='display:block;font:700 11px SimSun,serif';const value=document.createElement('strong');value.textContent=(data.lastWeek/3600000).toFixed(1)+' h';value.style='display:block;margin-top:12%;font:400 30px Georgia,serif';button.append(label,value);});
  return ()=>button.remove();
 }
});
