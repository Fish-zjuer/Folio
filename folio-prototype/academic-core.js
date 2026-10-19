/* 原始教务快照、本地计算方案和刷新状态分开。无真实教务请求。 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FolioAcademic=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const copy=value=>JSON.parse(JSON.stringify(value));
  // 来自原版 lib/model/grade.dart；绩点仍取教务 jd，不从文字等级推造。
  const fiveLevelPercent=Object.freeze({"优秀":90,"良好":80,"中等":70,"及格":60,"不及格":0});
  const fiveLevelPoints=Object.freeze({"优秀":4.5,"良好":3.5,"中等":2.5,"及格":1.5,"不及格":0});
  function fiveLevelLabel(original){const text=String(original).replace(/\s/g,"").replaceAll("（","(").replaceAll("）",")").toUpperCase();const levels=[['优秀','A'],['良好','B'],['中等','C'],['及格','D'],['不及格','F']];return levels.find(([label,letter])=>[label,letter,`${label}(${letter})`].includes(text))?.[0]||null;}
  function percentScore(original,grading){if(grading==="fiveLevel"){const label=fiveLevelLabel(original);return label?fiveLevelPercent[label]:null;}if(grading!=="percent")return null;const value=Number(original);return String(original).trim()&&Number.isFinite(value)&&value>=0&&value<=100?value:null;}
  // 用户 2026-10-15 提供的分档。小数分的取整口径未给定，暂不擅自取整。
  function fivePointScore(original,grading){
    if(grading==="fiveLevel"){const label=fiveLevelLabel(original);return label?fiveLevelPoints[label]:null;}
    if(grading!=="percent")return null;const score=percentScore(original,grading);if(score===null||!Number.isInteger(score))return null;
    const bands=[[95,5],[92,4.8],[89,4.5],[86,4.2],[83,3.9],[80,3.6],[77,3.3],[74,3],[71,2.7],[68,2.4],[65,2.1],[62,1.8],[60,1.5],[0,0]];return bands.find(([minimum])=>score>=minimum)[1];
  }
  function gradePoints(original,grading){const five=fivePointScore(original,grading);return {five,four43:five===null?null:five>4?({5:4.3,4.8:4.2,4.5:4.1,4.2:4}[five]??null):five,four:five===null?null:Math.min(4,five),gpaIncluded:five!==null};}
  const fresh=()=>({version:1,overrides:{},undo:[],plan:false,cache:{},reveal:{enabled:true,seen:{},baselineVersion:2,initialized:false,known:{},pending:{},notices:{}}});
  const isPublished=g=>typeof g.original==="string"&&Boolean(g.original.trim())&&g.grading!=="pending"&&!["待录","缓考","弃修","无效"].includes(g.original);
  const fingerprint=g=>JSON.stringify([g.grading,g.original,g.five??null,g.four43??null,g.four??null,g.score??null]);
  // 首次导入与 0.2 缓存迁移仅建立基线。只有基线之后发生的出分/更正才需要揭晓。
  function migrateReveal(state,records=state.cache?.grades?.data||[]){const next=copy(state),old=next.reveal||{};if(old.baselineVersion===2)return next;next.reveal={enabled:old.enabled!==false,seen:{...old.seen},baselineVersion:2,initialized:records.length>0,known:{},pending:{},notices:{}};for(const g of records){const value=isPublished(g)?fingerprint(g):null;next.reveal.known[g.id]=value;if(value!==null)next.reveal.seen[g.id]=value;}return next;}
  const isSealed=(state,g)=>state.reveal?.enabled!==false&&isPublished(g)&&state.reveal?.pending?.[g.id]===fingerprint(g)&&state.reveal?.seen?.[g.id]!==fingerprint(g);
  function revealGrade(state,g){const next=migrateReveal(state);if(isPublished(g)){next.reveal.seen[g.id]=fingerprint(g);delete next.reveal.pending[g.id];}return next;}
  function setRevealEnabled(state,enabled,records){let next=migrateReveal(state,records);next.reveal.enabled=Boolean(enabled);if(!enabled)for(const g of records)next=revealGrade(next,g);return next;}
  function observeGrades(state,records){const r=state.reveal;if(!r.initialized){for(const g of records){const value=isPublished(g)?fingerprint(g):null;r.known[g.id]=value;if(value!==null)r.seen[g.id]=value;}if(records.length)r.initialized=true;return;}
    for(const g of records){const published=isPublished(g),value=published?fingerprint(g):null,previous=r.known[g.id];if(published&&previous!==value){r.notices[g.id]={fingerprint:value,title:g.title};if(r.enabled!==false)r.pending[g.id]=value;else r.seen[g.id]=value;}r.known[g.id]=value;if(!published)delete r.pending[g.id];}
  }
  function gradeUpdates(before,after){if(before.reveal?.baselineVersion!==2||!before.reveal?.initialized)return [];return Object.entries(after.reveal?.notices||{}).filter(([id,n])=>before.reveal?.notices?.[id]?.fingerprint!==n.fingerprint).map(([id,n])=>({id,...n}));}
  function termOrder(id){const value=String(id),canonical=/^(\d{4})-\d{4}-([12])$/.exec(value),short=/^(\d{4})-(spring|autumn)$/.exec(value);if(canonical)return Number(canonical[1])+(canonical[2]==="1"?.75:1.25);if(short)return Number(short[1])+(short[2]==="autumn"?.75:.25);return null;}
  function sortedTerms(terms){return [...terms].sort((a,b)=>{const x=termOrder(a.id),y=termOrder(b.id);return x===null?(y===null?0:1):y===null?-1:y-x;});}
  function groupByTerm(records,terms){const groups=new Map();for(const record of records){if(!groups.has(record.termId))groups.set(record.termId,[]);groups.get(record.termId).push(record);}const ids=[...sortedTerms(terms).map(t=>t.id),...groups.keys()];return [...new Set(ids)].filter(id=>groups.has(id)).map(id=>({id,label:terms.find(t=>t.id===id)?.label||id,records:groups.get(id)})).sort((a,b)=>{const x=termOrder(a.id),y=termOrder(b.id);return x===null?(y===null?0:1):y===null?-1:y-x;});}
  function effective(grade,overrides){const local=overrides[grade.id]||{};return {...grade,major:typeof local.major==="boolean"?local.major:grade.major,core:typeof local.core==="boolean"?local.core:Boolean(grade.core),local:Object.keys(local).length>0};}
  function setOverride(state,grade,values){
    const next=copy(state),override={};
    if(typeof values.core==="boolean"&&values.core!==Boolean(grade.core))override.core=values.core;
    if(typeof values.major==="boolean"&&values.major!==Boolean(grade.major))override.major=values.major;
    if(JSON.stringify(next.overrides[grade.id]||{})===JSON.stringify(override))return next;
    next.undo.push(copy(next.overrides));next.undo=next.undo.slice(-10);
    if(Object.keys(override).length)next.overrides[grade.id]=override;else delete next.overrides[grade.id];return next;
  }
  function restore(state,id){const next=copy(state);if(!Object.keys(next.overrides).length)return next;next.undo.push(copy(next.overrides));next.undo=next.undo.slice(-10);if(id)delete next.overrides[id];else next.overrides={};return next;}
  function undo(state){const next=copy(state),previous=next.undo.pop();if(previous)next.overrides=previous;return next;}
  // 课号是重修归组依据；体育课按学期独立计入，不按名称猜测同一门课。
  function courseCode(record){const raw=String(record.id||"");const match=/\(\d{4}-\d{4}-[12]\)-([^-]+)/.exec(raw);return record.courseCode||record.kch||match?.[1]||record.courseId||raw;}
  function selectAttempts(records,mode="highest"){
    const groups=new Map();for(const record of records){if(!isPublished(record))continue;const code=courseCode(record),key=/^(401|PPAE)/i.test(code)?`${record.termId}:${code}`:code;
      const previous=groups.get(key);if(!previous){groups.set(key,record);continue;}
      const oldTerm=termOrder(previous.termId),newTerm=termOrder(record.termId),earlier=newTerm!==null&&(oldTerm===null||newTerm<oldTerm);
      const score=g=>g.grading==="passFail"?(g.earned?1:0):Number.isFinite(g.score)?g.score:percentScore(g.original,g.grading)??-1;
      if(mode==="first"?earlier:score(record)>score(previous)||score(record)===score(previous)&&earlier)groups.set(key,record);
    }return [...groups.values()];
  }
  function summary(records,overrides={},plan=false,retakeMode="highest"){
    let earned=0,majorEarned=0,credit=0,majorCredit=0,unknownEarned=0,weightedMajorPoints=0;const sum=[0,0,0,0],majorSum=[0,0,0,0];
    // 学分是否获得不随 GPA 重修口径切换，已通过的重修也只算一次学分。
    for(const original of selectAttempts(records,"highest")){const g=plan?effective(original,overrides):original;
      if(g.earned===null || g.earned&& !Number.isFinite(g.credits))unknownEarned++;
      if(g.earned&&Number.isFinite(g.credits)){earned+=g.credits;if(g.major)majorEarned+=g.credits;}
    }
    for(const original of selectAttempts(records,retakeMode)){const g=plan?effective(original,overrides):original;
      if(g.grading==="passFail" || !g.gpaIncluded || ![g.credits,g.five,g.four43,g.four,g.score].every(Number.isFinite))continue;
      credit+=g.credits;const values=[g.five,g.four43,g.four,g.score];
      values.forEach((v,i)=>sum[i]+=v*g.credits);
      if(g.major){majorCredit+=g.credits;values.forEach((v,i)=>majorSum[i]+=v*g.credits);weightedMajorPoints+=g.five*g.credits*(g.core?1.2:1);}
    }
    return {earned,majorEarned,credit,majorCredit,unknownEarned,gpa:sum.map(v=>credit?v/credit:null),majorGpa:majorSum.map(v=>majorCredit?v/majorCredit:null),weightedMajorGpa:majorCredit?weightedMajorPoints/majorCredit:null};
  }
  function validRecord(module,record){
    if(!record || typeof record.id!=="string" || !record.id)return false;
    if(module==="grades"&&["percent","fiveLevel"].includes(record.grading)&&record.gpaIncluded!==true)return false;
    if(module==="grades")return typeof record.title==="string"&&typeof record.original==="string"&&(Number.isFinite(record.credits)&&record.credits>=0||record.credits===null&&!record.gpaIncluded)&&typeof record.major==="boolean"&&typeof record.gpaIncluded==="boolean"&&(typeof record.earned==="boolean"||record.earned===null&&!record.gpaIncluded)&&!(record.grading==="passFail"&&record.gpaIncluded)&&(!record.gpaIncluded||[record.five,record.four43,record.four,record.score].every(Number.isFinite));
    if(module==="courses")return typeof record.title==="string"&&Array.isArray(record.sessions)&&(record.credits===null||Number.isFinite(record.credits)&&record.credits>=0);
    if(module==="homework")return typeof record.title==="string"&&typeof record.completed==="boolean";
    if(module==="practice")return typeof record.title==="string"&&(record.points===null||Number.isFinite(record.points)&&record.points>=0);
    return true;
  }
  function accept(state,key,module,response,now){
    const next=module==="grades"?migrateReveal(state):copy(state),old=next.cache[key]||{data:[],lastSuccess:null,warning:null,dismissed:false};
    const valid=response?.ok===true&&response.complete===true&&Array.isArray(response.data)&&response.data.every(record=>validRecord(module,record))&&new Set(response.data.map(r=>r.id)).size===response.data.length;
    if(!valid || (!response.data.length&&!response.allowEmpty)){
      next.cache[key]={...old,warning:"refresh-failed",dismissed:false};return {state:next,success:false};
    }
    // 未返回的成绩/课程仍保留。清除需要显式的权威空结果或独立删除信息。
    let data=response.data;
    if(module==="grades"||module==="courses"){
      const merged=new Map(old.data.map(record=>[record.id,record]));for(const record of response.data)merged.set(record.id,{...merged.get(record.id),...record});data=[...merged.values()];
    }
    next.cache[key]={data:copy(data),lastSuccess:now,warning:null,dismissed:false};if(module==="grades")observeGrades(next,data);return {state:next,success:true};
  }
  function dismiss(state,keys){const next=copy(state);for(const key of keys){if(next.cache[key]?.warning)next.cache[key].dismissed=true;}return next;}
  return {fresh,effective,setOverride,restore,undo,summary,selectAttempts,courseCode,accept,dismiss,validRecord,fiveLevelPercent,percentScore,fiveLevelPoints,fivePointScore,gradePoints,isPublished,fingerprint,isSealed,revealGrade,setRevealEnabled,migrateReveal,gradeUpdates,groupByTerm,sortedTerms,termOrder};
});
