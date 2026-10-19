/* 本学期考试的数据规则；时间按中国本地时区解析。 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FolioExams=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const clock=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||"")&&Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;}
  function validate(exam){
    if(!exam||typeof exam.title!=="string"||!exam.title.trim())return "请填写考试名称。";
    if(!validDate(exam.date))return "请选择考试日期。";
    if(!clock.test(exam.start||"")||!clock.test(exam.end||""))return "时间请按 09:00 这样的格式填写。";
    if(exam.end<=exam.start)return "结束时间要晚于开始时间。";
    return "";
  }
  function timestamp(exam,key="start"){return Date.parse(`${exam.date}T${exam[key]}:00+08:00`);}
  const byTime=(a,b)=>timestamp(a)-timestamp(b)||timestamp(a,"end")-timestamp(b,"end")||a.id.localeCompare(b.id);
  function current(exams,semesterId){return exams.filter(exam=>exam.semesterId===semesterId&&!validate(exam)).slice().sort(byTime);}
  function dayGroups(exams){
    const groups=new Map();exams.filter(exam=>!validate(exam)).slice().sort(byTime).forEach(exam=>{if(!groups.has(exam.date))groups.set(exam.date,[]);groups.get(exam.date).push(exam);});
    return [...groups].map(([date,exams])=>({date,exams}));
  }
  function overlaps(exam,exams){return exams.filter(other=>other.id!==exam.id&&other.date===exam.date&&exam.start<other.end&&other.start<exam.end);}
  function countdown(exams,now){
    const next=exams.filter(exam=>timestamp(exam,"end")>now).slice().sort((a,b)=>timestamp(a)-timestamp(b)||a.id.localeCompare(b.id))[0];
    if(!next)return {state:"empty",exam:null};
    const gap=timestamp(next)-now;
    if(gap<=0)return {state:"active",exam:next};
    return gap>=86400000?{state:"upcoming",exam:next,value:Math.ceil(gap/86400000),unit:"天"}
      :{state:"upcoming",exam:next,value:Math.ceil(gap/360000)/10,unit:"小时"};
  }
  function entries(exams,date){return exams.filter(exam=>exam.date===date).map(exam=>({...exam,id:`exam-${exam.id}`,examId:exam.id,kind:"exam",color:"#B84A39",startAt:`${date}T${exam.start}`,endAt:`${date}T${exam.end}`}));}
  return {validDate,validate,timestamp,current,dayGroups,overlaps,countdown,entries};
});
