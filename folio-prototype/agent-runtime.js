/* Agent 的数据工具与提案事务。模型只能生成草稿；此处 confirm 只由用户提交表单调用。 */
(function(){
  "use strict";
  const id=()=>crypto.randomUUID(),copy=v=>structuredClone(v),B=window.FolioBackend,readSets=new WeakMap();
  function records(module){
    if(module==="courses")return FolioCourses.semesters.flatMap(t=>t.courses.map(c=>({...c,id:`${t.id}::${c.id}`,termId:t.id})));
    if(["homework","todos","events"].includes(module))return homeworkState.items.filter(r=>r.kind===({homework:"homework",todos:"todo",events:"event"}[module]));
    if(module==="exams")return [...officialExamRecords,...customExamRecords];
    if(module==="grades")return FolioNative.cache().modules.grades?.data||[];
    if(module==="goals"){try{const g=JSON.parse(localStorage.getItem("folio-goals-v1"));return g?.applied?[{id:"applied-goal",...g.applied}]:[];}catch{return [];}}
    throw new Error("模块不正确");
  }
  function summary(module,r){
    const common={id:r.id,title:r.title||r.course||"",source:r.source};
    if(module==="courses")return {...common,termId:r.termId,credits:r.credits,teacher:r.teacher};
    if(module==="grades")return {...common,termId:r.termId,credits:r.credits,original:r.original,grading:r.grading,major:r.major};
    if(module==="goals")return {id:r.id,type:r.type,target:r.target,termId:r.termId};
    if(module==="calendar")return {...common,courseId:r.courseId,date:r.date,startAt:r.startAt,endAt:r.endAt,room:r.room,seat:r.seat,type:r.type};
    return {...common,kind:r.kind,course:r.course,deadline:r.deadline,startAt:r.startAt,endAt:r.endAt,date:r.date,start:r.start,end:r.end,completed:r.completed,queued:r.queued};
  }
  async function execute(name,args,conversation,messageId,userText){
    if((args.module==="grades")&&!/成绩|绩点|均绩|保研|gpa|学分|学业/i.test(userText))throw new Error("用户未明确要求读取成绩，请先询问用户");
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
      const result=copy(row);delete result.attachments;if(result.body)result.body=result.body.slice(0,5000);if(result.description)result.description=result.description.slice(0,5000);return {source:"本机缓存",record:result};
    }
    if(name==="draft_change"){
      const argsClean=FolioAgent.validateDraft(args),module=argsClean.operation.endsWith("exam")?"exams":"todos";
      const pool=module==="exams"?records("exams"):homeworkState.items,target=pool.find(r=>r.id===argsClean.targetId);
      if(!argsClean.operation.startsWith("create_")&&!target)throw new Error("待修改的记录不存在，请先检索");
      if(!argsClean.operation.startsWith("create_")&&!readSets.get(conversation)?.has(`${messageId}:${target.id}`))throw new Error("修改前必须先通过 read_record 读取该事项");
      if(module==="exams"&&target?.source==="school")throw new Error("学校考试是只读数据，可以创建自定义考试或本地备注");
      if(target?.source==="school"&&Object.keys(argsClean.fields).some(k=>!["completed","important","urgent","queued","body"].includes(k)))throw new Error("学校原始作业字段只读；可修改本地完成、重要性、入队状态，或另建个人事项");
      const existing=conversation.proposals.find(p=>p.messageId===messageId&&p.status==="pending"&&p.operation===argsClean.operation&&p.targetId===argsClean.targetId&&JSON.stringify(p.fields)===JSON.stringify(argsClean.fields));if(existing)return {draftId:existing.id,status:"待用户确认"};
      if(conversation.proposals.filter(p=>p.messageId===messageId).length>=8)throw new Error("本轮草稿已达8项，请先确认已有修改");
      const proposal={id:id(),messageId,status:"pending",operation:argsClean.operation,targetId:argsClean.targetId,fields:argsClean.fields,before:target?JSON.stringify(target):null,createdAt:new Date().toISOString()};
      conversation.proposals.push(proposal);return {draftId:proposal.id,status:"待用户确认，尚未执行",operation:proposal.operation};
    }
    throw new Error("不支持此工具");
  }
  function confirm(p){
    if(p.status!=="pending")return;
    const f=p.fields,exam=p.operation.endsWith("exam"),create=p.operation.startsWith("create_"),remove=p.operation.startsWith("delete_"),targetId=create?`chat-${p.id}`:p.targetId;
    const all=exam?customExamRecords:homeworkState.items,previous=all.find(r=>r.id===targetId);
    if(create&&previous){p.status="confirmed";return;}
    if(!create&&p.appliedFingerprint&&p.appliedFingerprint===JSON.stringify(previous)){p.status="confirmed";return;}
    if(!create&&p.before!==JSON.stringify(previous)){
      if(remove&&!previous){p.status="confirmed";return;}throw new Error("这项记录已有变化，请核对后重新生成修改，原草稿仍保留。");
    }
    let nextRecord;
    if(!remove&&exam){nextRecord={...(previous||{}),id:targetId,semesterId:previous?.semesterId||examSemester.id,source:"custom",title:f.title??previous?.title,type:f.type??previous?.type??"小测",date:f.date??previous?.date,start:f.start??previous?.start,end:f.end??previous?.end,room:f.room??previous?.room??"",seat:f.seat??previous?.seat??"",note:f.note??previous?.note??"",courseId:previous?.courseId||null};const error=FolioExams.validate(nextRecord);if(error)throw new Error(error);}
    if(!remove&&!exam){
      const base=previous||{id:targetId,title:"",body:"",kind:"todo",course:"",source:"personal",important:false,urgent:false,timeMode:"none",deadline:"",deadlineClock:null,repeat:{kind:"none",interval:1,weekdays:[],until:null},reminderMinutes:null,queued:false,completed:false,createdDay:B.today(),mountDate:null,mountedOn:null};
      nextRecord={...base};for(const key of ["title","body","kind","course","location","timeMode","deadline","startAt","endAt","important","urgent","queued","completed","reminderMinutes"])if(key in f)nextRecord[key]=f[key];
      if("clock" in f)nextRecord.deadlineClock=f.clock||null;if(!("timeMode" in f)){if(f.startAt)nextRecord.timeMode="range";else if(f.deadline)nextRecord.timeMode="deadline";}
      if(nextRecord.timeMode!=="deadline"){nextRecord.deadline=null;nextRecord.deadlineClock=null;}
      if(nextRecord.timeMode!=="range"){nextRecord.startAt=null;nextRecord.endAt=null;}
      if(nextRecord.timeMode==="none")nextRecord.reminderMinutes=null;
      if(f.repeatKind){nextRecord.repeat={...base.repeat,kind:f.repeatKind};if(f.repeatKind==="weekly"&&!nextRecord.repeat.weekdays?.length)nextRecord.repeat.weekdays=[(new Date(`${FolioTodo.anchor(nextRecord)}T00:00:00Z`).getUTCDay()+6)%7+1];}
      if(nextRecord.kind==="homework"&&!nextRecord.course)nextRecord.course="自定义";
      FolioTodo.validate(nextRecord);
      if("queued" in f)FolioQueue.setQueued(nextRecord,f.queued);if(nextRecord.completed)FolioQueue.complete(nextRecord);
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
