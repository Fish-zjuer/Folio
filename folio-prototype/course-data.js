/* 本地课程示例；课程列表、日程、课表共用标识和安排。教师、学分及考试也是示例。 */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.FolioCourses=api;})(typeof globalThis!=="undefined"?globalThis:this,(root)=>{
  const calendarCourses={
    sport:{title:"乒乓球（中级）",room:"玉泉新桥门乒乓球房",start:"08:00",end:"09:35",color:"#C97963"},
    robot:{title:"运动控制与机器人",room:"玉泉教 4－402",start:"10:00",end:"12:25",color:"#D4A359"},
    electric:{title:"电气控制技术",room:"玉泉教 4－302",start:"18:50",end:"20:25",color:"#7F83AE"},
    math:{title:"微积分",room:"东 1－302",start:"08:00",end:"09:35",color:"#8A9C71"},
    physics:{title:"大学物理",room:"东 2－201",start:"10:00",end:"11:35",color:"#6A9BCC"},
    data:{title:"数据结构",room:"东 1－401",start:"13:25",end:"15:00",color:"#C97963"},
    english:{title:"大学英语",room:"西 1－202",start:"15:05",end:"16:40",color:"#D4A359"},
    lab:{title:"电路基础与电子技术综合实验",room:"电气实验楼 203",start:"16:45",end:"18:20",color:"#7F83AE"},
  };
  const week=[["math","data","electric"],["physics","english"],["sport","robot","electric"],
    ["math","physics","data","english","lab"],["robot","electric"],["english","lab"],[]];
  const metadata={math:[5.5,"陈老师","MATH-101"],physics:[4,"林老师","PHYS-102"],data:[3,"周老师","CS-201"],
    english:[3,"王老师","ENG-103"],robot:[3,"李老师","AUTO-301"],electric:[2,"张老师","EE-302"],
    sport:[1,"吴老师","PE-104"],lab:[1.5,null,"EE-LAB-303"]};
  const current=Object.entries(metadata).map(([id,[credits,teacher,code]])=>({...calendarCourses[id],id,credits,teacher,code,
    sessions:week.flatMap((keys,day)=>keys.includes(id)?[{id:`${id}-${day}`,day,start:calendarCourses[id].start,end:calendarCourses[id].end,room:calendarCourses[id].room,
      firstHalf:true,secondHalf:true,oddWeek:id!=="lab"||day===5,evenWeek:id!=="lab"||day===3,startWeek:1,endWeek:16,periods:id==="robot"?3:2}]:[]),
    exams:({math:[{date:"2026-11-18",start:"09:00",end:"11:00",room:"东 1－302",seat:null,type:"期中"}],
      physics:[{date:"2026-10-16",start:"10:00",end:"11:30",room:"东 2－201",seat:"23",type:"期中"}],
      electric:[{date:"2027-01-12",start:"14:00",end:"16:00",room:null,seat:null,type:"期末"}]}[id]||[])}));
  // 仅为原型校历，不代表学校实际开学日期。首周可不从周一开始，冬学期重新计算单双周。
  const semesters=[{id:"2026-autumn",label:"2026—2027 秋冬",calendar:{periods:[
    {id:"autumn",label:"秋",half:"first",start:"2026-10-08",end:"2026-11-29",weekOffset:0},
    {id:"winter",label:"冬",half:"second",start:"2026-11-30",end:"2027-01-24",weekOffset:8},
  ]},courses:current},
    {id:"2026-spring",label:"2025—2026 春夏",courses:[
      {id:"linear",title:"线性代数",credits:3,teacher:"赵老师",code:"MATH-105",color:"#8A9C71",grade:"88",sessions:[],exams:[]},
      {id:"programming",title:"程序设计",credits:3,teacher:null,code:null,color:"#6A9BCC",grade:"优秀",sessions:[],exams:[]},
    ]}];
  function summary(courses){let credits=0,missingCredits=0;for(const course of courses){if(typeof course.credits==="number"&&Number.isFinite(course.credits)&&course.credits>=0)credits+=course.credits;else missingCredits++;}return {count:courses.length,credits:Number(credits.toFixed(2)),missingCredits};}
  function meter(credits,maximum=5){
    if(typeof credits!=="number"||!Number.isFinite(credits)||credits<0)return [];
    const scale=Math.max(5,credits,typeof maximum==="number"&&Number.isFinite(maximum)?maximum:5),amount=credits/scale*5;
    return Array.from({length:5},(_,index)=>Math.min(1,Math.max(0,amount-index)));
  }
  const DAY=86400000,clock=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  function dateValue(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return null;const value=Date.parse(`${date}T00:00:00Z`);return Number.isFinite(value)&&new Date(value).toISOString().slice(0,10)===date?value:null;}
  function monday(value){return value-((new Date(value).getUTCDay()+6)%7)*DAY;}
  function weekInfo(term,date){
    const value=dateValue(date);if(value===null)return null;
    const period=term.calendar?.periods?.find(part=>date>=part.start&&date<=part.end);if(!period)return null;
    const start=dateValue(period.start);if(start===null)return null;
    const week=Math.floor((monday(value)-monday(start))/(7*DAY))+1;
    return {periodId:period.id,label:period.label,half:period.half,week,semesterWeek:(period.weekOffset||0)+week,parity:week%2?"单周":"双周"};
  }
  function runs(numbers){
    const values=[...new Set(numbers.filter(value=>Number.isInteger(value)&&value>0))].sort((a,b)=>a-b),parts=[];
    for(let i=0;i<values.length;i++){const start=values[i];let end=start;while(values[i+1]===end+1)end=values[++i];parts.push(end===start?String(start):`${start}–${end}`);}
    return parts.join("、");
  }
  function patternLabel(session){
    if(session.customRepeat){const weeks=runs(session.customRepeatWeeks||[]);return weeks?`第${weeks}周`:"未安排周次";}
    const odd=session.oddWeek!==false,even=session.evenWeek!==false;
    return odd&&even?"每周":odd?"单周":even?"双周":"不上课";
  }
  function ruleLabel(session,term){
    if(session.customRepeat)return patternLabel(session);
    const halves=(term.calendar?.periods||[]).filter(part=>(part.half==="first"?session.firstHalf:session.secondHalf)!==false).map(part=>part.label).join("");
    const lower=Number.isInteger(session.startWeek)?session.startWeek:1;
    const range=Number.isInteger(session.endWeek)?`第${lower}${session.endWeek!==lower?`–${session.endWeek}`:""}周`:Number.isInteger(session.startWeek)?`第${lower}周起`:"";
    return [halves,range,patternLabel(session)].filter(Boolean).join(" · ");
  }
  function sessionOccurs(session,term,date){
    const info=weekInfo(term,date),value=dateValue(date);if(!info||session.day!==(new Date(value).getUTCDay()+6)%7)return false;
    if(session.customRepeat)return (session.customRepeatWeeks||[]).includes(info.semesterWeek);
    if((info.half==="first"?session.firstHalf:session.secondHalf)===false)return false;
    if(Number.isInteger(session.startWeek)&&info.semesterWeek<session.startWeek||Number.isInteger(session.endWeek)&&info.semesterWeek>session.endWeek)return false;
    return info.week%2?session.oddWeek!==false:session.evenWeek!==false;
  }
  function mergeSessions(sessions,times){
    const defaults=["08:00","08:50","10:00","10:50","11:40","13:25","14:15","15:05","16:15","17:05","18:50","19:40","20:30","21:20","22:10"],starts=times?.map(p=>p?.[0])||defaults;
    const out=[];for(const source of [...sessions].sort((a,b)=>a.day-b.day||a.start.localeCompare(b.start))){const s={...source},first=Number.isInteger(s.startPeriod)?s.startPeriod:starts.indexOf(s.start)+1,count=s.periods||2;s.startPeriod=first>0?first:null;
      const weeks=s=>[...new Set(s.customRepeatWeeks||[])].sort((a,b)=>a-b);
      const same=(a,b)=>["day","room","firstHalf","secondHalf","oddWeek","evenWeek","startWeek","endWeek","customRepeat"].every(k=>JSON.stringify(a[k]??null)===JSON.stringify(b[k]??null))&&(!a.customRepeat||JSON.stringify(weeks(a))===JSON.stringify(weeks(b)));
      const candidates=out.filter(p=>same(p,s)&&p.startPeriod&&s.startPeriod&&(p.startPeriod+p.periods===s.startPeriod||s.startPeriod+count===p.startPeriod));
      if(candidates.length){const p=candidates[0];p.start=p.start<s.start?p.start:s.start;p.end=p.end>s.end?p.end:s.end;p.startPeriod=Math.min(p.startPeriod,s.startPeriod);p.periods+=count;p.mergedSessionIds=[...(p.mergedSessionIds||[p.id]),s.id];}else out.push({...s,periods:count});
    }return out;
  }
  function onDate(term,date,shouldExclude=root.FolioScheduleOverrides?.excluded){
    const effectiveDate=term.calendar?.exchange?.[date]||date;
    if(term.calendar?.holidays?.[date]&&!term.calendar?.exchange?.[date])return [];
    const info=weekInfo(term,effectiveDate);if(!info)return [];
    return term.courses.flatMap(course=>mergeSessions(course.sessions.filter(session=>!shouldExclude?.(term.id,course.id,session,date)),term.calendar?.sessionTime?.length>1?term.calendar.sessionTime.slice(1):undefined).flatMap((session,index)=>{
      if(!sessionOccurs(session,term,effectiveDate)||!clock.test(session.start||"")||!clock.test(session.end||"")||session.end<=session.start)return [];
      return [{...course,termId:term.id,courseId:course.id,session,teachingWeek:info,room:session.room||course.room||"地点待更新",start:session.start,end:session.end,periods:session.periods||2,
        id:`course-${date}-${course.id}-${session.id||index}`,kind:"course",date,startAt:`${date}T${session.start}`,endAt:`${date}T${session.end}`}];
    })).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)||a.id.localeCompare(b.id));
  }
  if (typeof window!=="undefined" && window.FolioApp?.native) {
    const cache=window.FolioNative.cache(),cached=FolioBackend.restoreCourseCatalog(cache.terms||[],cache.modules.grades?.data||[]);
    semesters.splice(0,semesters.length,...(cached?.length?cached:[FolioBackend.emptyTerm()]));
  }
  return {calendarCourses,week,semesters,summary,meter,weekInfo,sessionOccurs,patternLabel,ruleLabel,onDate,mergeSessions};
});
