/* 目标测算纯函数。模拟成绩独立于教务成绩，按真实离散档位计算。 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FolioGoal=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";
  const EPS=1e-9;
  const percentBands=[[0,"不及格"],[1.5,"60–61 分"],[1.8,"62–64 分"],[2.1,"65–67 分"],[2.4,"68–70 分"],[2.7,"71–73 分"],[3,"74–76 分"],[3.3,"77–79 分"],[3.6,"80–82 分"],[3.9,"83–85 分"],[4.2,"86–88 分"],[4.5,"89–91 分"],[4.8,"92–94 分"],[5,"95–100 分"]];
  const levelBands=[[0,"不及格"],[1.5,"及格"],[2.5,"中等"],[3.5,"良好"],[4.5,"优秀"]];
  const finite=n=>typeof n==="number"&&Number.isFinite(n);
  function bands(grading){if(grading==="percent")return percentBands.map(([value,label])=>({value,label}));if(grading==="fiveLevel")return levelBands.map(([value,label])=>({value,label}));if(grading==="passFail")return [];throw new Error("请确认课程的成绩制式");}
  function limits(course,floor){
    const values=bands(course.grading);if(!values.length)return [];
    const minimum=Math.max(floor,course.minimum??floor),maximum=course.maximum??values.at(-1).value;
    if(!finite(minimum)||!finite(maximum)||minimum<0||maximum>5||minimum>maximum)throw new Error(`${course.title||"课程"}的上下限不正确`);
    const allowed=values.filter(b=>b.value+EPS>=minimum&&b.value<=maximum+EPS);
    if(!allowed.length)throw new Error(`${course.title||"课程"}没有符合上下限的成绩档位`);
    return allowed;
  }
  function prepare(input){
    if(!["total","semester","major","weighted"].includes(input.type))throw new Error("请选择计算类型");
    const weighted=input.type==="weighted",majorOnly=["major","weighted"].includes(input.type);
    if(!finite(input.target)||input.target<0||input.target>(weighted?6:5))throw new Error("请填写有效目标均绩");
    if(!finite(input.floor)||input.floor<1.5||input.floor>5)throw new Error("最低可接受绩点需在 1.5 到 5 之间");
    const baseline=input.baseline||{points:0,credits:0};
    if(!finite(baseline.points)||!finite(baseline.credits)||baseline.points<0||baseline.credits<0||(!baseline.credits&&baseline.points)||baseline.points>baseline.credits*(weighted?6:5)+EPS)throw new Error("已计入绩点的基准或学分不正确");
    if(!Array.isArray(input.courses)||new Set(input.courses.map(c=>c.id)).size!==input.courses.length)throw new Error("课程记录重复或缺失");
    const courses=input.courses.map(c=>{
      if(typeof c.id!=="string"||!c.id)throw new Error("请确认课程 ID");
      if(!finite(c.credits)||c.credits<0)throw new Error(`${c.title||"课程"}的学分待确认，请先填写真实学分`);
      if(majorOnly&&c.grading!=="passFail"&&typeof c.major!=="boolean")throw new Error(`${c.title||"课程"}的主修归属待确认`);
      const allowed=limits(c,input.floor),included=c.credits>0&&c.grading!=="passFail"&&(!majorOnly||c.major),weight=weighted&&c.core?1.2:1;
      return {...c,allowed,included,weight};
    });
    return {baseline,courses};
  }
  function preferred(course,floor){
    const allowed=limits(course,floor);if(!allowed.length)return null;
    if(course.minimum==null&&course.maximum==null)return allowed[0].value;
    const center=(Math.max(floor,course.minimum??floor)+(course.maximum??bands(course.grading).at(-1).value))/2;
    return allowed.reduce((best,b)=>Math.abs(b.value-center)<=Math.abs(best-center)+EPS?b.value:best,allowed[0].value);
  }
  function preserveAssignments(input,existing){
    const {courses}=prepare(input),assignments={};
    for(const c of courses){
      if(!c.allowed.length)continue;
      const value=existing?.[c.id];
      assignments[c.id]=finite(value)&&c.allowed.some(b=>Math.abs(b.value-value)<EPS)?value:preferred(c,input.floor);
    }
    return assignments;
  }
  function evaluate(input,assignments){
    const {baseline,courses}=prepare(input);let points=baseline.points,credits=baseline.credits;
    for(const c of courses){if(!c.allowed.length)continue;const value=assignments[c.id];if(!c.allowed.some(b=>Math.abs(b.value-value)<EPS))throw new Error(`${c.title||"课程"}的目标不在可用档位内`);if(c.included){credits+=c.credits;points+=value*c.credits*c.weight;}}
    const projected=credits?points/credits:null;
    return {points,credits,projected,reached:projected!==null&&projected+EPS>=input.target,gap:projected===null?null:projected-input.target};
  }
  function allocate(input){
    const {baseline,courses}=prepare(input),assignments={},priority=input.priority||[];
    const rank=c=>{const i=priority.indexOf(c.id);return i<0?priority.length:i;};
    const ordered=[...courses].sort((a,b)=>rank(a)-rank(b)||b.credits-a.credits||a.id.localeCompare(b.id));
    for(const c of courses)if(c.allowed.length){const locked=input.locked?.[c.id];if(locked!==undefined&&!c.allowed.some(b=>Math.abs(b.value-locked)<EPS))throw new Error(`${c.title||"课程"}的锁定目标不在上下限内`);assignments[c.id]=locked??preferred(c,input.floor);}
    const included=courses.filter(c=>c.included),credits=baseline.credits+included.reduce((n,c)=>n+c.credits,0);
    const maxPoints=baseline.points+included.reduce((n,c)=>n+(input.locked?.[c.id]??c.allowed.at(-1).value)*c.credits*c.weight,0);
    const maximum=credits?maxPoints/credits:null;
    const requestedMargin=finite(input.margin)?Math.max(0,Math.min(.1,input.margin)):.01;
    let aim=maximum===null?input.target:Math.min(input.target+requestedMargin,Math.max(input.target,maximum));
    let points=baseline.points+included.reduce((n,c)=>n+assignments[c.id]*c.credits*c.weight,0);
    if(points+EPS>=input.target*credits)aim=input.target;
    for(const c of ordered){
      if(!c.included||input.locked?.[c.id]!==undefined||points+EPS>=aim*credits)continue;
      const old=assignments[c.id],needed=(aim*credits-points)/(c.credits*c.weight)+old;
      const value=(c.allowed.find(b=>b.value+EPS>=needed)||c.allowed.at(-1)).value;
      assignments[c.id]=value;points+=(value-old)*c.credits*c.weight;
    }
    const result=evaluate(input,assignments);
    return {...result,assignments,maximum,margin:result.reached?Math.max(0,result.gap):0,status:result.projected===null?"empty":result.reached?"reached":"shortfall"};
  }
  function groups(courses,assignments,floor){
    const groups=new Map();for(const c of courses){if(!finite(c.credits)||c.credits<0)continue;const key=String(c.credits);if(!groups.has(key))groups.set(key,{credits:c.credits,courses:[],high:0,low:0});const g=groups.get(key);g.courses.push(c);if(c.grading!=="passFail"&&assignments[c.id]>Math.max(floor,c.minimum??floor)+EPS)g.high++;else g.low++;}
    return [...groups.values()].sort((a,b)=>b.credits-a.credits);
  }
  // 只有学期与课程 ID 都一致时才返回已选用方案的提醒；草稿不参与。
  function reminder(saved,termId,courseId){if(!saved?.applied||saved.applied.termId!==termId)return null;const c=saved.applied.courses.find(c=>c.id===courseId);if(!c||!c.important)return null;const value=saved.applied.assignments[c.id];return {value,title:c.title,grading:c.grading,important:true};}
  return {bands,limits,preferred,preserveAssignments,evaluate,allocate,groups,reminder};
});
