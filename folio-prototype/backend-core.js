/* 学校协议适配自 Celechron（GPL-3.0），纯数据层可在 Node 中验收。 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FolioBackend=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";
  const colors=["#8A9C71","#6A9BCC","#C97963","#D4A359","#7F83AE"];
  const text=v=>v==null?"":String(v).trim(),number=v=>v==null||v===""?null:Number.isFinite(Number(v))?Number(v):null;
  const clean=v=>text(v).replace(/<br\s*\/?\s*>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").trim();
  function today(now=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);}
  function currentTerm(now=new Date()){const y=now.getFullYear(),m=now.getMonth()+1,start=m>=9?y:m<2?y-1:y-1;return `${start}-${start+1}-${m>=9||m<2?1:2}`;}
  function termId(value,fallback="unknown"){return text(value).match(/(20\d{2})-(20\d{2})-([12])/g)?.[0]||fallback;}
  function termLabel(id){const m=id.match(/^(\d{4})-(\d{4})-([12])$/);return m?`${m[1]}–${m[2]} ${m[3]==="1"?"秋冬":"春夏"}`:"学期待确认";}
  function sortTerms(terms,active){return [...terms].sort((a,b)=>a.id===active?-1:b.id===active?1:b.id.localeCompare(a.id));}
  function migrateCache(cache){
    const value=cache&&typeof cache==="object"?structuredClone(cache):{version:1,modules:{},terms:[]};value.modules||={};value.terms||=[];
    if(value.protocolVersion>=3)return {cache:value,backup:null};
    const backup=structuredClone(value);for(const term of value.terms){term.courses=[];term.calendar=null;term.stale=true;}
    for(const key of Object.keys(value.modules))if(key.startsWith("courses:")||key.startsWith("calendar:"))delete value.modules[key];
    value.protocolVersion=3;value.courseCacheResetReason="旧版课表使用了不完整学年，已隔离；请重新同步课表和校历";return {cache:value,backup};
  }
  function hash(value){let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  const courseName=v=>clean(v).replaceAll("(","（").replaceAll(")","）");
  const courseId=v=>`school-${hash(courseName(v))}`;
  function date(value){const s=text(value),m=s.match(/^(\d{4})[-年/ ]?(\d{2}|\d{1})[-月/ ]?(\d{2}|\d{1})/);if(!m)return "";const result=`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`,parsed=new Date(`${result}T00:00:00Z`);return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==result?"":result;}
  function localDateTime(value){const s=text(value);if(!s)return {day:"",clock:""};if(/[zZ]$|[+-]\d\d:\d\d$/.test(s)){const d=new Date(s);if(Number.isNaN(d.getTime()))return {day:"",clock:""};return {day:today(d),clock:new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(d)};}return {day:date(s),clock:s.match(/[T ](\d{2}:\d{2})/)?.[1]||""};}
  function decode(response){
    if(!response||response.status<200||response.status>=300)throw new Error(`读取失败（HTTP ${response?.status||"未知"}），保留原缓存`);
    const body=text(response.body);if(/captcha_error/i.test(body))throw new Error("课表需要验证码，请在教务连接中展开“课表验证码”，填写后重试");
    if(body.startsWith("<")||/zjuam\.zju\.edu\.cn\/cas\/login/.test(body))throw new Error("登录已过期，请重新登录对应学校平台");
    let data;try{data=JSON.parse(body);}catch{throw new Error("学校返回的数据格式不正确，保留原缓存");}
    if(data&&((data.code===401||data.code===403)||data.isLogin===false||data.success===false))throw new Error("学校拒绝了这次请求，请重新登录或稍后重试");
    return data;
  }
  function array(data,key){if(!Array.isArray(data?.[key]))throw new Error(`响应缺少 ${key}，原缓存未变`);return data[key];}
  function checked(raw,records){if(raw.length&&!records.length)throw new Error("所有记录均无法解析，原缓存未变");return records;}
  function grades(data){const raw=array(data,"items");if(raw.some(g=>!text(g.xkkh)||!text(g.kcmc)))throw new Error("成绩记录缺少课程标识，保留原缓存");return checked(raw,raw.map(g=>{
    const original=text(g.cj),passFail=/^(合格|不合格|P|F)$/.test(original)&&(/水测/.test(text(g.kcmc))||/合格/.test(original)||g.jfxs==="二级制"),grading=passFail?"passFail":/^(待录|缓考|弃修|无效|)$/.test(original)?"pending":/^\d+(\.\d+)?$/.test(original)?"percent":"fiveLevel";
    return {id:`school-grade-${g.xkkh}`,termId:termId(g.xkkh),courseId:courseId(g.kcmc),courseCode:text(g.kch)||/\(\d{4}-\d{4}-[12]\)-([^-]+)/.exec(text(g.xkkh))?.[1]||null,title:courseName(g.kcmc),credits:number(g.xf),original,reportedFive:passFail?null:number(g.jd),major:false,core:false,grading,source:"school"};
  }));}
  function homeworkCompletion(g){
    // Missing from /todos is not proof of submission: pages, filters and expired
    // sessions can all omit a record. Only explicit completion/submission fields are evidence.
    // Submitted work may still be editable; never let an editable flag turn it back into pending.
    const truthy=v=>[true,1,"1","true","yes","y","是"].includes(v);
    const falsy=v=>[false,0,"0","false","no","n","否"].includes(v);
    for(const key of ["submitted","is_submitted","isSubmit","is_submit","hasSubmitted","has_submitted","submitSuccess","submit_success"]){
      if(truthy(g[key]))return true;
    }
    for(const key of ["is_completed","completed","is_finished","finished"]){
      if(truthy(g[key]))return true;
    }
    const status=text(g.status||g.state||g.submit_status||g.submitStatus||g.submissionStatus||g.submission_status||g.submitState||g.homeworkStatus||g.homework_status||g.progress).toLowerCase().replace(/[\s_-]+/g,"");
    if(/已提交|已交|提交成功|待批阅|已批阅|已评分|已通过|已完成|^完成$|^submitted$|^completed$|^finished$/.test(status))return true;
    if(/未提交|未交|未完成|待提交|待完成|未开始|notsubmitted|unsubmitted|notcompleted|incomplete|pending/.test(status))return false;
    for(const key of ["submitted","is_submitted","isSubmit","is_submit","hasSubmitted","has_submitted","submitSuccess","submit_success"]){
      if(falsy(g[key]))return false;
    }
    for(const key of ["is_completed","completed","is_finished","finished"]){
      if(falsy(g[key]))return false;
    }
    return null;
  }
  function homework(data){const raw=array(data,"todo_list"),student=raw.filter(g=>g.is_student===true||g.is_student===1||g.is_student==="true");return checked(student,student.filter(g=>text(g.id)).map(g=>{const due=localDateTime(g.end_time),completion=homeworkCompletion(g);return {id:`school-homework-${g.id}`,schoolId:text(g.id),title:clean(g.title)||"未命名作业",course:clean(g.course_name)||"作业",source:"school",kind:"homework",queued:true,completed:completion===true,completionKnown:completion!==null,schoolCompleted:completion===true,deadline:due.day,deadlineClock:due.clock||null,important:false,urgent:false,timeMode:"deadline",repeat:{kind:"none",interval:1,weekdays:[],until:null},reminderMinutes:null,mountDate:null,mountedOn:null,url:typeof g.url==="string"&&/^https:\/\//.test(g.url)?g.url:"https://courses.zju.edu.cn/",description:typeof g.description==="string"?clean(g.description):""};}));}
  const defaultTimes=[["08:00","08:45"],["08:50","09:35"],["10:00","10:45"],["10:50","11:35"],["11:40","12:25"],["13:25","14:10"],["14:15","15:00"],["15:05","15:50"],["16:15","17:00"],["17:05","17:50"],["18:50","19:35"],["19:40","20:25"],["20:30","21:15"],["21:20","22:05"],["22:10","22:55"]];
  function calendar(data,id){const dates=data.startEnd?.map(date),match=id.match(/^(20\d{2})-(20\d{2})-([12])$/);if(!match||Number(match[2])!==Number(match[1])+1||dates?.length!==4||dates.some(d=>!d)||!Array.isArray(data.sessionTime))throw new Error("校历格式不正确，保留已有校历");
    const earliest=match[3]==="1"?`${match[1]}-08-01`:`${match[2]}-01-01`,latest=match[3]==="1"?`${match[2]}-03-31`:`${match[2]}-08-31`;
    if(!(earliest<=dates[0]&&dates[0]<=dates[1]&&dates[1]<dates[2]&&dates[2]<=dates[3]&&dates[3]<=latest))throw new Error("校历年份或半学期与所选学期不符，未套用这份校历");
    const labels=id.endsWith("1")?["秋","冬"]:["春","夏"],exchange={},holidays={...(data.holiday||{}),...(data.dummy||{})};
    for(const [key,value] of Object.entries(data.exchange||{})){if(key.length>=16){const off=date(key.slice(0,8)),work=date(key.slice(8,16));if(off&&work){exchange[work]=off;holidays[off]=value;}}}
    return {periods:[{id:"first",label:labels[0],half:"first",start:dates[0],end:dates[1],weekOffset:0},{id:"second",label:labels[1],half:"second",start:dates[2],end:dates[3],weekOffset:Math.round((Date.parse(dates[2])-Date.parse(dates[0]))/604800000)}],sessionTime:data.sessionTime,holidays:Object.fromEntries(Object.entries(holidays).map(([key,value])=>[date(key),value])),exchange};
  }
  function checkTimetableTerm(data,id){
    const expected=id.slice(0,9),reported=[data.xnm,data.xnmc,data.academicYear,data.year].filter(v=>v!=null&&v!=="");
    for(const value of reported){const year=text(value).match(/20\d{2}(?:\s*[-–—至]\s*20\d{2})?/);if(year){const normalized=year[0].replace(/\s/g,"").replace(/[–—至]/g,"-");if(normalized.length===4?normalized!==id.slice(0,4):normalized!==expected)throw new Error("学校返回的课表学年与所选学年不符，原缓存未变");}}
    const expectedSeason=id.slice(-1);for(const value of [data.xqm,data.semester,data.term]){if(value==null||value==="")continue;const s=text(value),n=s.match(/^[12](?:\||$)/)?.[0]?.[0];if(n&&n!==expectedSeason||/[春夏]/.test(s)&&expectedSeason!=="2"||/[秋冬]/.test(s)&&expectedSeason!=="1")throw new Error("学校返回的课表学期与所选学期不符，原缓存未变");}
    for(const row of data.kbList||[]){for(const key of ["xkkh","jxbrs_id","jxbmc"]){const returned=termId(row[key],"");if(returned&&returned!==id)throw new Error("课表包含其他学期的课程，原缓存未变");}}
    return data;
  }
  function courseCredits(data){const raw=array(data,"items");return raw.flatMap(r=>{const credits=number(r.xf),term=termId(r.xkkh,"");return term&&text(r.kcmc)&&credits!==null&&credits>=0?[{termId:term,courseId:courseId(r.kcmc),credits,schoolId:text(r.xkkh),courseCode:text(r.kch)||/\(\d{4}-\d{4}-[12]\)-([^-]+)/.exec(text(r.xkkh))?.[1]||null}]:[];});}
  function timetable(data,id,season,config){checkTimetableTerm(data,id);const raw=array(data,"kbList"),grouped=new Map();
    for(const r of raw){const parts=text(r.kcb).split(/<br\s*\/?\s*>/i),title=courseName(r.kcmc||parts[0]),start=Number(r.djj),length=Number(r.skcd),day=Number(r.xqj)-1;if(!title||!Number.isInteger(start)||!Number.isInteger(length)||length<1||start<1||start+length>16||day<0||day>6)throw new Error("课表记录缺少有效名称或节次，保留原缓存");
      const key=courseId(title),room=clean(r.cdmc||r.jasmc||parts[3]?.replace(/zwf.*$/s,"")),times=config?.sessionTime;
      const first=times?.[start]||defaultTimes[start-1],last=times?.[start+length-1]||defaultTimes[start+length-2];if(!first||!last)continue;
      const halves=text(r.xxq)||season,rule={day,start:first[0],end:last[1],room,firstHalf:/秋|春/.test(halves),secondHalf:/冬|夏/.test(halves),oddWeek:text(r.dsz)!=="1",evenWeek:text(r.dsz)!=="0",periods:length,startPeriod:start,startWeek:1};
      const session={...rule,id:hash(JSON.stringify(rule)),timeEstimated:!times};
      if(!grouped.has(key))grouped.set(key,{id:key,title,teacher:clean(r.xm||parts[2])||null,credits:number(r.xf),code:text(r.kch)||null,color:colors[grouped.size%colors.length],sessions:[],exams:[]});
      const course=grouped.get(key);if(!course.sessions.some(s=>s.id===session.id))course.sessions.push(session);
    }
    return checked(raw,[...grouped.values()]);
  }
  function exams(data){const raw=array(data,"items"),out=[];for(const r of raw){if(!text(r.xkkh)||!text(r.kcmc))throw new Error("考试记录缺少课程标识，保留原缓存");for(const [key,type,room,seat] of [["qzkssj","期中","qzjsmc","qzzwxh"],["kssj","期末","jsmc","zwxh"]]){
      const value=text(r[key]);if(!value)continue;const day=date(value),times=[...value.matchAll(/(\d{1,2}):(\d{2})/g)].map(m=>`${m[1].padStart(2,"0")}:${m[2]}`);
      out.push({id:`school-exam-${r.xkkh}-${key}`,semesterId:termId(r.xkkh),courseId:courseId(r.kcmc),title:courseName(r.kcmc),type,date:day,start:times[0]||"",end:times[1]||"",room:clean(r[room]),seat:text(r[seat]),source:"school",dateLabel:!day?clean(value):null,unscheduled:!day||times.length<2});
    }}return out;}
  function practice(data){if(!Array.isArray(data)&&(data?.success!==true||Number(data?.code)!==0))throw new Error("实践接口未返回有效业务结果，保留原缓存");const raw=Array.isArray(data)?data:Array.isArray(data?.data)?data.data:null;if(!raw)throw new Error("实践响应缺少项目列表，保留原缓存");
    const groups=[{id:"second",title:"第二课堂",points:0,detailsAvailable:true,items:[]},{id:"third",title:"第三课堂",points:0,detailsAvailable:true,items:[]},{id:"fourth",title:"第四课堂",points:0,detailsAvailable:true,items:[]}];
    for(const r of raw){const p=r.xm||{},category=Number(p.xmfl?.id)||["第二课堂","第三课堂","第四课堂"].indexOf(p.xmfl?.mc)+1;if(category<1||category>3||[true,1,"true","1"].includes(r.sfsc))continue;
      const approved=Number(r.cyrshzt?.value)===5||r.cyrshzt?.label==="审核通过",score=number(r.jd),item={id:`practice-${r.id}`,title:clean(p.mc)||"未命名项目",points:score,approved,status:clean(r.cyrshzt?.label||r.currentState?.name)||"状态未知",type:clean(p.xmlb?.mc),quality:clean(p.xmlx?.mc),role:clean(r.hdjjygrcdgz),remark:clean(r.qksm),start:text(r.hdsj),end:text(r.hdjssj),updatedAt:text(r.gxsj)};
      groups[category-1].items.push(item);if(approved&&score!==null&&score>=0)groups[category-1].points+=score;
    }return groups;
  }
  function practiceSummary(data){const raw=data?.extend?.myInfo;if(Number(data?.code)!==0||!raw||!["dektJf","dsktJf","dsiktJf"].some(k=>k in raw))throw new Error("实践汇总缺少有效记点，保留原缓存");const points=["dektJf","dsktJf","dsiktJf"].map(k=>number(raw[k]));if(points.some(n=>n!==null&&n<0))throw new Error("实践汇总记点无效");const passed=v=>v==null||v===""?null:[true,1,"1","1.0","true","yes","y","是","通过","已通过","达标","合格"].includes(typeof v==="string"?v.trim().toLowerCase():v)?true:[false,0,"0","0.0","false","no","n","否","未通过","不通过","未达标","不合格"].includes(typeof v==="string"?v.trim().toLowerCase():v)?false:null;return {points,myPassed:passed(raw.myTg),lyPassed:passed(raw.lyTg)};}
  function mergeHomework(old,incoming){
    const records=new Map(old.map(r=>[r.id,r.remoteMissing?{...r,remoteMissing:undefined}:r]));
    for(const r of incoming){
      const previous=records.get(r.id);
      if(previous&&previous.source!=="school")continue;
      // A refresh must not reopen work the user already completed locally.
      // Only an explicit school completion can add a completion; it never clears one.
      records.set(r.id,previous?{...r,completed:previous.completed===true||r.completed===true,schoolCompleted:previous.schoolCompleted===true||r.schoolCompleted===true,queued:previous.queued,mountDate:previous.mountDate,mountedOn:previous.mountedOn,important:previous.important,urgent:previous.urgent,manualDate:previous.manualDate,mountClock:previous.mountClock,placements:previous.placements,reminderOffsets:previous.reminderOffsets,reminderMinutes:previous.reminderMinutes??r.reminderMinutes,body:previous.body||r.body}:r);
    }
    return [...records.values()];
  }
  function restoreCourseCatalog(terms,records){
    const out=structuredClone(terms),byTerm=new Map(out.map(t=>[t.id,t]));
    for(const g of records||[]){
      if(!/^20\d{2}-20\d{2}-[12]$/.test(g.termId)||!g.courseId||!g.title)continue;
      let t=byTerm.get(g.termId);if(!t){t=emptyTerm(g.termId);out.push(t);byTerm.set(t.id,t);}
      const c=t.courses.find(c=>c.id===g.courseId);
      if(c){if(c.credits==null&&Number.isFinite(g.credits))c.credits=g.credits;if(!c.code&&g.courseCode)c.code=g.courseCode;continue;}
      t.courses.push({id:g.courseId,title:g.title,credits:Number.isFinite(g.credits)?g.credits:null,code:g.courseCode||null,teacher:null,room:null,color:'#B58B70',sessions:[],exams:[],source:'grades',catalogOnly:true});
    }
    return out;
  }
  function emptyTerm(id=currentTerm()){return {id,label:termLabel(id),calendar:null,courses:[]};}
  function mergeCourses(parts){const map=new Map();for(const part of parts)for(const c of part){if(!map.has(c.id))map.set(c.id,{...c,sessions:[]});const target=map.get(c.id);for(const s of c.sessions)if(!target.sessions.some(v=>v.id===s.id))target.sessions.push(s);}return [...map.values()];}
  return {restoreCourseCatalog,text,number,clean,today,currentTerm,termId,termLabel,sortTerms,migrateCache,hash,date,decode,array,grades,homework,calendar,timetable,checkTimetableTerm,courseCredits,exams,practice,practiceSummary,mergeHomework,emptyTerm,mergeCourses,defaultTimes};
});
