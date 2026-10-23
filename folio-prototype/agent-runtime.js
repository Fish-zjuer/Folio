/* Agent 的数据工具与提案事务。模型只能生成草稿；此处 confirm 只由用户提交表单调用。 */
(function(){
  "use strict";
  const id=()=>crypto.randomUUID(),copy=v=>structuredClone(v),B=window.FolioBackend,readSets=new WeakMap();
  function schoolChange(p,target){if(target?.source!=="school")return;if(p.operation!=="update_todo"||Object.keys(p.fields).some(k=>!["completed","important","urgent","queued","body","placements","reminderOffsets","reminderMinutes","pinAction"].includes(k)))throw Error("学校原始作业字段只读；可修改本地完成、重要性、入队、便签挂载、显示位置、备注和提醒。卸下便签请用pinAction=return_to_inbox，不需要复制学校作业。");}
  function records(module){
    if(module==="learning")return (window.FolioLearning?.records()||[]).filter(r=>!window.FolioLearning?.isVisibleKind||FolioLearning.isVisibleKind(r.kind));
    if(module==="courses")return FolioCourses.semesters.flatMap(t=>t.courses.map(c=>({...c,id:`${t.id}::${c.id}`,termId:t.id})));
    if(["homework","todos","events","lessons"].includes(module))return homeworkState.items.filter(r=>r.kind===({homework:"homework",todos:"todo",events:"event",lessons:"lesson"}[module]));
    if(module==="exams")return [...officialExamRecords,...customExamRecords];
    if(module==="grades")return FolioNative.cache().modules.grades?.data||[];
    if(module==="goals"){try{const g=JSON.parse(localStorage.getItem("folio-goals-v1"));return g?.applied?[{id:"applied-goal",...g.applied}]:[];}catch{return [];}}
    throw new Error("模块不正确");
  }
  function summary(module,r){
    if(module==="learning")return {id:r.id,title:r.title,kind:r.kind,date:r.date,courseId:r.courseId,termId:r.termId,updatedAt:r.updatedAt};
    const common={id:r.id,title:r.title||r.course||"",source:r.source};
    if(module==="courses")return {...common,termId:r.termId,credits:r.credits,teacher:r.teacher};
    if(module==="grades")return {...common,termId:r.termId,credits:r.credits,original:r.original,grading:r.grading,major:r.major};
    if(module==="goals")return {id:r.id,type:r.type,target:r.target,termId:r.termId};
    if(module==="calendar")return {...common,courseId:r.courseId,date:r.date,startAt:r.startAt,endAt:r.endAt,room:r.room,seat:r.seat,type:r.type};
    return {...common,kind:r.kind,course:r.course,deadline:r.deadline,startAt:r.startAt,endAt:r.endAt,date:r.date,start:r.start,end:r.end,completed:r.completed,queued:r.queued};
  }
  const relationshipReads=new WeakMap();
  async function execute(name,args,conversation,messageId,userText,options){
    if(['search_relationships','read_relationship','draft_relationship'].includes(name)){
      const R=window.FolioRelationships,C=window.FolioRelationshipCore;if(!R||!C)throw Error('关系网未加载');await R.ready;await R.flush();
      if(name==='search_relationships')return R.search(args);
      if(name==='read_relationship'){
        const result=await R.detail(args.id,args);if(!relationshipReads.has(conversation))relationshipReads.set(conversation,new Map());const seen=relationshipReads.get(conversation),key=`${messageId}:${args.id}`,stamp=C.fingerprint(R.read().nodes.find(n=>n.id===args.id)),old=seen.get(key);seen.set(key,{stamp,ranges:[...(old?.stamp===stamp?old.ranges:[]),[result.node.noteOffset,result.node.noteOffset+result.node.note.length]]});return result;
      }
      const clean=C.validateDraft(args),state=R.read(),target=state.nodes.find(n=>n.id===clean.targetId),seen=relationshipReads.get(conversation);
      function requireRead(id){const row=state.nodes.find(n=>n.id===id);if(!row)throw Error('关系节点不存在，请先搜索');if(seen?.get(`${messageId}:${id}`)?.stamp!==C.fingerprint(row))throw Error('修改前先用 read_relationship 读取目标和新父节点的最新内容');}
      if(clean.operation!=='create_relationship')requireRead(clean.targetId);
      if(clean.operation==='update_relationship'&&'note' in clean.fields){let end=0;for(const [a,b]of [...seen.get(`${messageId}:${target.id}`).ranges].sort((a,b)=>a[0]-b[0]))if(a<=end)end=Math.max(end,b);if(end<target.note.length)throw Error('替换备注前请按nextNoteOffset分段读完原备注，避免丢掉未读取的内容');}
      if(['create_relationship','move_relationship'].includes(clean.operation)&&clean.fields.parentId!==null)requireRead(clean.fields.parentId);
      const existing=conversation.proposals.find(p=>p.messageId===messageId&&p.status==='pending'&&p.operation===clean.operation&&p.targetId===clean.targetId&&JSON.stringify(p.fields)===JSON.stringify(clean.fields));if(existing)return {draftId:existing.id,status:'待用户确认'};
      if(conversation.proposals.filter(p=>p.messageId===messageId).length>=FolioAgent.limits(options).maxDrafts)throw Error('本次修改草稿已达上限，可在设置 → Agent 对话中调整');
      const proposalId=id();C.apply(state,clean,{id:'chat-'+proposalId});
      const p={id:proposalId,messageId,status:'pending',...clean,before:C.fingerprint(state),createdAt:new Date().toISOString()};conversation.proposals.push(p);
      return {draftId:p.id,status:'待用户确认，尚未执行',operation:p.operation,target:target?.name||clean.fields.name,descendants:target?C.branch(state,target.id).size-1:0};
    }
    if(name==="read_preferences")return {settings:FolioPreferences.snapshot()};
    if(name==="draft_preferences")return FolioPreferences.draft(args,conversation,messageId,options);
    if((args.module==="grades")&&!/成绩|绩点|均绩|保研|gpa|学分|学业/i.test(userText))throw new Error("用户未明确要求读取成绩，请先询问用户");
    if(args.module==="learning"){if(!/日记|笔记|录音|回顾|复盘|学习记录|journal|note|recording|reflection/i.test(userText))throw Error("请先让用户明确授权查询学习记录");await FolioLearning.ready;}
    if(name==="search_records"){
      let list;if(args.module==="calendar"){
        const from=args.from||B.today(),to=args.to||FolioTodo.addDays(from,6);const days=(FolioQueue.dateValue(to)-FolioQueue.dateValue(from))/86400000;
        if(days<0||days>62)throw new Error("日程单次查询最多63天");list=[];
        for(let d=from;d<=to;d=FolioTodo.addDays(d,1)){list.push(...FolioCourses.onDate(FolioCourses.semesters[0],d),...FolioExams.entries(currentExams(),d),...FolioQueue.calendarEntries(homeworkState.items).filter(r=>r.date===d||r.startAt?.startsWith(d)));}
      }else list=records(args.module);
      const q=String(args.query||"").toLowerCase();if(q)list=list.filter(r=>[r.title,r.course,r.body,r.teacher].some(v=>String(v||"").toLowerCase().includes(q)));
      if(args.module!=="calendar"&&(args.from||args.to))list=list.filter(r=>{const day=r.date||r.deadline||r.startAt?.slice(0,10);return day&&(!args.from||day>=args.from)&&(!args.to||day<=args.to);});
      const offset=Math.max(0,Math.min(10000,Number(args.offset)||0)),limit=Math.max(1,Math.min(20,Number(args.limit)||10));
      return {source:"本机缓存",updatedAt:FolioNative.cache().modules[args.module]?.updatedAt||null,total:list.length,offset,records:list.slice(offset,offset+limit).map(r=>summary(args.module,r))};
    }
    if(name==="read_record"){
      const row=records(args.module).find(r=>r.id===args.id);if(!row)throw new Error("没有找到该记录");
      if(!readSets.has(conversation))readSets.set(conversation,new Set());readSets.get(conversation).add(`${messageId}:${row.id}`);
      const result=args.module==="learning"?FolioLearning.aiRecord(row):copy(row);delete result.attachments;if(result.body)result.body=result.body.slice(0,5000);if(result.description)result.description=result.description.slice(0,5000);return {source:"本机缓存",record:result};
    }
    if(name==="draft_change"){
      const argsClean=FolioAgent.validateDraft(args),module=argsClean.operation.endsWith("learning")?"learning":argsClean.operation.endsWith("exam")?"exams":"todos";
      if(module==='learning'&&argsClean.fields.kind&&window.FolioLearning?.isVisibleKind&&!FolioLearning.isVisibleKind(argsClean.fields.kind))throw Error('日记和录音暂时隐藏，当前只开放课程笔记；原数据保留。');
      if(module==="learning"){await FolioLearning.ready;const fields=argsClean.fields;if(fields.courseId){const candidates=FolioCourses.semesters.flatMap(t=>t.courses.filter(c=>(!fields.termId||fields.termId===t.id)&&(c.id===fields.courseId||t.id+'::'+c.id===fields.courseId)).map(c=>({id:c.id,termId:t.id})));if(candidates.length!==1)throw Error("无法唯一匹配课程，请先检索课程并选择学期");fields.courseId=candidates[0].id;fields.termId=candidates[0].termId;}else if(fields.courseId===''){fields.termId='';}}
      const pool=module==="learning"?records("learning"):module==="exams"?records("exams"):homeworkState.items,target=pool.find(r=>r.id===argsClean.targetId);
      if(!argsClean.operation.startsWith("create_")&&!target)throw new Error("待修改的记录不存在，请先检索");
      if(!argsClean.operation.startsWith("create_")&&!readSets.get(conversation)?.has(`${messageId}:${target.id}`))throw new Error("修改前必须先通过 read_record 读取该事项");
      if(module==="exams"&&target?.source==="school")throw new Error("学校考试是只读数据，可以创建自定义考试或本地备注");
      schoolChange(argsClean,target);
      const existing=conversation.proposals.find(p=>p.messageId===messageId&&p.status==="pending"&&p.operation===argsClean.operation&&p.targetId===argsClean.targetId&&JSON.stringify(p.fields)===JSON.stringify(argsClean.fields));if(existing)return {draftId:existing.id,status:"待用户确认"};
      const maxDrafts=FolioAgent.limits(options).maxDrafts;
      if(conversation.proposals.filter(p=>p.messageId===messageId).length>=maxDrafts)throw new Error(`本次任务的修改草稿已达${maxDrafts}项，可在设置 → Agent 对话中调整；请先确认已有修改。`);
      const proposal={id:id(),messageId,status:"pending",operation:argsClean.operation,targetId:argsClean.targetId,fields:argsClean.fields,before:target?JSON.stringify(target):null,createdAt:new Date().toISOString()};
      conversation.proposals.push(proposal);return {draftId:proposal.id,status:"待用户确认，尚未执行",operation:proposal.operation};
    }
    throw new Error("不支持此工具");
  }
  function confirm(p){
    if(p.status!=="pending")return;
    if(p.operation.endsWith('_relationship'))return FolioRelationships.apply(p);
    if(p.operation==="update_preferences")return FolioPreferences.apply(p);
    if(p.operation.endsWith("learning")){FolioAgent.validateDraft(p);return FolioLearning.applyProposal(p);}
    const f=FolioItemPolicy.normalizeTime(p.fields),exam=p.operation.endsWith("exam"),create=p.operation.startsWith("create_"),remove=p.operation.startsWith("delete_"),targetId=create?`chat-${p.id}`:p.targetId;
    const all=exam?customExamRecords:homeworkState.items,previous=all.find(r=>r.id===targetId);
    if(create&&previous){p.status="confirmed";return;}
    if(!create&&p.appliedFingerprint&&p.appliedFingerprint===JSON.stringify(previous)){p.status="confirmed";return;}
    if(!create&&p.before!==JSON.stringify(previous)){
      if(remove&&!previous){p.status="confirmed";return;}throw new Error("这项记录已有变化，请核对后重新生成修改，原草稿仍保留。");
    }
    FolioAgent.validateDraft(p);schoolChange(p,previous);
    if(!create&&exam&&previous?.source==="school")throw Error("学校考试是只读数据");
    let nextRecord;
    if(!remove&&exam){nextRecord={...(previous||{}),id:targetId,semesterId:previous?.semesterId||examSemester.id,source:"custom",title:f.title??previous?.title,type:f.type??previous?.type??"小测",date:f.date??previous?.date,start:f.start??previous?.start,end:f.end??previous?.end,room:f.room??previous?.room??"",seat:f.seat??previous?.seat??"",note:f.note??previous?.note??"",courseId:previous?.courseId||null};const error=FolioExams.validate(nextRecord);if(error)throw new Error(error);}
    if(!remove&&!exam){
      const base=previous||{id:targetId,title:"",body:"",kind:p.operation==="create_lesson"?"lesson":p.operation==="create_homework"?"homework":"todo",course:"",source:"personal",important:false,urgent:false,timeMode:"none",deadline:"",deadlineClock:null,repeat:{kind:"none",interval:1,weekdays:[],until:null},reminderMinutes:null,queued:false,completed:false,createdDay:B.today(),mountDate:null,mountedOn:null};
      nextRecord={...base};for(const key of ["title","body","kind","course","location","timeMode","deadline","startAt","endAt","important","urgent","queued","completed","reminderMinutes","reminderOffsets","placements","scheduledDay","courseId","termId"])if(key in f)nextRecord[key]=f[key];
      if(p.operation==="create_homework")nextRecord.kind="homework";
      if(p.operation==="create_lesson")nextRecord.kind="lesson";
      if(nextRecord.kind==="lesson"){nextRecord.termId=nextRecord.termId||B.currentTerm();const linked=FolioCourses.semesters.find(t=>t.id===nextRecord.termId)?.courses.find(c=>c.id===nextRecord.courseId||c.title===nextRecord.course);if(linked){nextRecord.courseId=linked.id;nextRecord.color=linked.color;}}
      if("clock" in f)nextRecord.deadlineClock=f.clock||null;if(!("timeMode" in f)){if(f.startAt)nextRecord.timeMode="range";else if(f.deadline)nextRecord.timeMode="deadline";}
      if(nextRecord.timeMode!=="deadline"){nextRecord.deadline=null;nextRecord.deadlineClock=null;}
      if(nextRecord.timeMode!=="range"){nextRecord.startAt=null;nextRecord.endAt=null;}
      if(nextRecord.timeMode==="none"){nextRecord.reminderMinutes=null;nextRecord.reminderOffsets=[];}
      if("reminderOffsets" in f)nextRecord.reminderMinutes=FolioItemPolicy.offsets(nextRecord)[0]??null;
      if(f.repeatKind){nextRecord.repeat={...base.repeat,kind:f.repeatKind};if(f.repeatKind==="weekly"&&!nextRecord.repeat.weekdays?.length)nextRecord.repeat.weekdays=[(new Date(`${FolioTodo.anchor(nextRecord)}T00:00:00Z`).getUTCDay()+6)%7+1];}
      if(nextRecord.kind==="homework"&&!nextRecord.course)nextRecord.course="自定义";
      FolioTodo.validate(nextRecord);
      if("queued" in f)FolioQueue.setQueued(nextRecord,f.queued);if(nextRecord.completed)FolioQueue.complete(nextRecord);
      if(f.pinAction==="return_to_inbox")FolioQueue.returnToInbox(nextRecord,B.today());
      else if(f.pinAction==="hang_now")FolioQueue.move(nextRecord,B.today(),B.today());
    }
    const next=all.filter(r=>r.id!==targetId);if(!remove)next.push(nextRecord);
    // 先写持久记录，再发布 UI；草稿状态最后落盘。创建用固定 ID，可安全重试。
    if(exam){if(!persistCustomExams(next))throw new Error("考试未能保存，草稿仍保留");}
    else{localStorage.setItem(homeworkDemo.storageKey,JSON.stringify({...homeworkState,items:next}));homeworkState.items=next;commit();}
    p.appliedFingerprint=JSON.stringify((exam?customExamRecords:homeworkState.items).find(r=>r.id===targetId));p.status="confirmed";p.confirmedAt=new Date().toISOString();
  }
  async function provider(body,signal){const response=await FolioNative.call("provider",{path:"chat/completions",body},signal);let data;try{data=JSON.parse(response.body);}catch{throw new Error(`模型返回的不是 JSON（HTTP ${response.status}），请检查 base_url`);}if(response.status<200||response.status>=300||data.error)throw new Error(`模型请求失败（${response.status}）：${String(data.error?.message||"请检查密钥、模型、图片或工具支持情况").slice(0,350)}`);return data;}
  window.FolioAgentRuntime={records,execute,confirm,provider};
})();
