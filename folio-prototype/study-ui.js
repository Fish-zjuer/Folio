/* Host-owned detail/edit flows. Reading a widget never writes a record. */
(()=>{'use strict';const C=FolioStudyCore,el=(t,c,v)=>{const n=document.createElement(t);n.className=c||'';if(v!=null)n.textContent=v;return n;},button=(text,fn,cls='chat-secondary')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b;};
 function note(box,text){box.append(el('p','study-detail-note',text));}
 function field(box,label,value,type='text'){const wrap=el('label','chat-field',label),input=el(type==='textarea'?'textarea':type==='select'?'select':'input');if(input.tagName==='INPUT')input.type=type;input.value=value??'';input.setAttribute('aria-label',label);wrap.append(input);box.append(wrap);return input;}
 function row(box,title,meta,action){const b=el(action?'button':'div','study-detail-row',title);if(action){b.type='button';b.onclick=action;}if(meta)b.append(el('small','',meta));box.append(b);return b;}
 function save(box,kind,data,done){const error=el('p','chat-form-error');box.append(error,button('保存',async()=>{try{await FolioStudyStore.save(kind,data());if(done)done();else {FolioChatUI.closePanel();announce('已保存到本机');}}catch(e){error.textContent=e.message;}},'chat-primary'));}
 function routine(kind,selectedDay){const state=FolioStudyStore.read(),today=FolioBackend.today(),box=FolioChatUI.openPanel(kind==='coffee'?'咖啡记录':'睡眠记录');
  if(kind==='coffee'){note(box,'仅记录今天的杯数，不推断健康状态。');const count=field(box,'今日杯数',state.coffee.find(n=>n.date===today)?.count??'','number');count.min=0;count.max=30;count.step=1;save(box,'coffee',()=>({count:count.value}));}
  else{note(box,'日期表示醒来的那一天。未填写的夜晚保持空白，不从手机使用时长推断睡眠。');const date=field(box,'醒来日期',selectedDay||today,'date'),hours=field(box,'睡眠时长 · 小时',state.nights.find(n=>n.date===(selectedDay||today))?.hours??'','number');date.max=today;hours.min=0;hours.max=24;hours.step=.25;date.onchange=()=>{hours.value=state.nights.find(n=>n.date===date.value)?.hours??'';};save(box,'night',()=>{if(hours.value==='')throw Error('请填写睡眠时长');return {date:date.value,hours:hours.value};});}
 }
 function goals(){const s=FolioStudyStore.read(),box=FolioChatUI.openPanel('学习目标');note(box,'三环依次为专注、现存任务完成比例、今日复习。番茄只统计实际完成的25分钟会话；45分钟小屋成果沿用原规则。');const f=field(box,'每日专注目标 · 分钟',s.focusGoal,'number'),h=field(box,'睡眠目标 · 小时',s.sleepGoal,'number');f.min=15;f.max=720;h.min=4;h.max=12;h.step=.5;save(box,'goals',()=>({focusGoal:f.value,sleepGoal:h.value}));}
 function newCard(ctx,courseId){const box=FolioChatUI.openPanel('添加问答闪卡'),term=FolioStudyWidgets.read(ctx).term;note(box,'一张卡对应一个需要回忆的知识点或章节。先填写问题与答案；之后明确自评才会更新颜色。');const title=field(box,'章节或知识点',''),course=field(box,'所属课程','','select');for(const c of [{id:'',title:'不指定课程'},...(term?.courses||[])]){const o=el('option','',c.title);o.value=c.id;course.append(o);}course.value=courseId||'';const q=field(box,'问题','','textarea'),a=field(box,'参考答案','','textarea');save(box,'card',()=>({id:crypto.randomUUID(),title:title.value,courseId:course.value,termId:term?.id||'',question:q.value,answer:a.value}),()=>open('review',ctx));}
 function reviewCard(card,ctx){
  const box=FolioChatUI.openPanel(card.title||'回忆练习');box.classList.add('study-menu');box.append(button('‹ 返回知识点',()=>open('review',ctx,null,{motif:'mosaic',id:card.id}),'sm-back'),el('p','sm-question',card.question));
  const answer=el('div','study-detail-answer',card.answer),ratings=el('div','study-review-actions');answer.hidden=true;ratings.hidden=true;
  box.append(button('显示参考答案',event=>{answer.hidden=false;ratings.hidden=false;event.currentTarget.hidden=true;},'sm-primary'),answer,ratings);
  const error=el('p','chat-form-error');box.append(error);
  for(let level=0;level<=4;level++)ratings.append(button(['0 忘记','1 生疏','2 部分掌握','3 熟悉','4 熟练'][level],async()=>{try{await FolioStudyStore.save('review',{id:card.id,level});open('review',ctx,null,{motif:'reviewBlocks'});}catch(e){error.textContent=e.message;}},'sm-button'));
  const ai=el('details','sm-info');ai.append(el('summary','','用AI评估我的作答'));FolioStudyTools.answer(ai,card,ctx);box.append(ai);
  const deletion=el('details','sm-info');deletion.append(el('summary','','管理这张卡'),button('确认删除闪卡',async()=>{try{await FolioStudyStore.save('delete-card',{id:card.id});open('review',ctx);}catch(e){error.textContent=e.message;}},'chat-secondary danger'));box.append(deletion);
 }

 function open(kind,ctx,origin,selection={}){return FolioStudyMenuUI.open(kind,ctx,origin,selection,{routine,goals,newCard,reviewCard});}

 function openCard(id,ctx){const card=FolioStudyWidgets.read(ctx).cards.find(c=>c.id===id);if(card)return reviewCard(card,ctx);return open('review',ctx);}
  window.FolioStudyUI=Object.freeze({open,openCard});
})();
