/* 本地原型考试仓库：教务示例与自定义记录共用读取接口。没有教务或 AI 请求。 */
const examSemester=FolioCourses.semesters[0];
const examStorageKey="folio-custom-exams-v1";
const officialExamRecords=examSemester.courses.flatMap(course=>course.exams.map((exam,index)=>({...exam,
  id:`official-${course.id}-${index}`,semesterId:examSemester.id,courseId:course.id,title:course.title,source:"school"})));
if(window.FolioApp?.native)officialExamRecords.splice(0,officialExamRecords.length,...(FolioNative.cache().modules.exams?.data||[]).filter(e=>!e.unscheduled));
const initialCustomExams=window.FolioApp?.native?[]:[{id:"custom-demo-quiz",semesterId:examSemester.id,courseId:"data",title:"数据结构随堂小测",type:"小测",date:"2026-10-15",start:"15:30",end:"16:15",room:"东 1－401",seat:"",note:"复习链表与栈。",source:"custom"}];
let customExamRecords=(()=>{
  try {const raw=localStorage.getItem(examStorageKey);if(raw===null)return structuredClone(initialCustomExams);
    const records=JSON.parse(raw);if(!Array.isArray(records))return structuredClone(initialCustomExams);
    const seen=new Set();return records.filter(exam=>exam?.source==="custom"&&typeof exam.id==="string"&&!seen.has(exam.id)&&!FolioExams.validate(exam)&&(seen.add(exam.id),true));
  }catch{return structuredClone(initialCustomExams);}
})();
function currentExams(termId=examSemester.id){return FolioExams.current([...officialExamRecords,...customExamRecords],termId);}
function examsForCourse(courseId){return currentExams().filter(exam=>exam.courseId===courseId);}
function persistCustomExams(next){
  // 存储失败时保留表单，避免把没有保存的记录当成已保存。
  try{localStorage.setItem(examStorageKey,JSON.stringify(next));}catch{announce("没有保存成功，请检查浏览器是否允许本地存储。");return false;}
  customExamRecords=next;document.dispatchEvent(new Event("folio-exams-change"));return true;
}
