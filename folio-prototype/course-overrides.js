/* 可恢复的本地课表排除；不修改教务原始课程、学分或考试。 */
(function(root,factory){const core=factory();if(typeof module==="object"&&module.exports)module.exports=core;else root.FolioScheduleOverrides=core.createStore({storage:root.localStorage,notify:()=>{document.dispatchEvent(new Event("folio-schedule-overrides-change"));document.dispatchEvent(new Event("folio-data-change"));}});})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";
  const storageKey="folio-schedule-overrides-v1";
  const validDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||"")&&Number.isFinite(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
  function normalize(rule){
    if(!rule||typeof rule.termId!=="string"||!rule.termId||typeof rule.courseId!=="string"||!rule.courseId)throw new Error("请选择有效课程");
    const from=rule.date||rule.from,until=rule.date||rule.until||null;
    if(!validDate(from)||until&&(!validDate(until)||until<from))throw new Error("请填写有效的排除日期范围");
    if(rule.sessionIds!=null&&(!Array.isArray(rule.sessionIds)||rule.sessionIds.some(id=>typeof id!=="string"||!id)))throw new Error("请选择有效上课安排");
    return {id:rule.id||`exclude-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,termId:rule.termId,courseId:rule.courseId,sessionIds:[...new Set(rule.sessionIds||[])],from,until,title:typeof rule.title==="string"?rule.title.slice(0,160):""};
  }
  function excluded(rules,termId,courseId,session,date){
    return rules.some(rule=>rule.termId===termId&&rule.courseId===courseId&&date>=rule.from&&(!rule.until||date<=rule.until)&&(!rule.sessionIds.length||rule.sessionIds.includes(session.id)));
  }
  function createStore({storage,notify=()=>{}}={}){
    let rules=[];try{const saved=JSON.parse(storage?.getItem(storageKey)||"null");if(saved?.version===1&&Array.isArray(saved.rules))rules=saved.rules.flatMap(rule=>{try{return [normalize(rule)];}catch{return [];}});}catch{}
    function save(next){try{storage?.setItem(storageKey,JSON.stringify({version:1,rules:next}));}catch{throw new Error("排除设置未保存，请检查本机存储后重试");}rules=next;notify();}
    return Object.freeze({list:(termId,courseId)=>rules.filter(rule=>(!termId||rule.termId===termId)&&(!courseId||rule.courseId===courseId)).map(rule=>({...rule,sessionIds:[...rule.sessionIds]})),
      excluded:(termId,courseId,session,date)=>excluded(rules,termId,courseId,session,date),
      add(rule){const next=normalize(rule);if(rules.some(item=>item.id===next.id))throw new Error("排除记录已存在");save([...rules,next]);return next.id;},
      remove(id){save(rules.filter(rule=>rule.id!==id));},
      restoreCourse(termId,courseId){save(rules.filter(rule=>rule.termId!==termId||rule.courseId!==courseId));}});
  }
  return {storageKey,normalize,excluded,createStore};
});
