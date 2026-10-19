/* 周课表的时间坐标与重叠分组。课间压缩留白，课程仍按真实起止时刻定位。 */
(function(root) {
  "use strict";
  const clocks=["08:00","08:50","10:00","10:50","11:40","13:25","14:15","15:05","16:15","17:05","18:50","19:40","20:30","21:20","22:10"];
  const minute=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
  function scale(customTimes,options={}) {
    const pairs=customTimes||clocks.map(clock=>[clock,`${String(Math.floor((minute(clock)+45)/60)).padStart(2,"0")}:${String((minute(clock)+45)%60).padStart(2,"0")}`]);
    if(!pairs.length||pairs.some((p,i)=>!Array.isArray(p)||p.length!==2||p.some(c=>!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(c))||minute(p[1])<=minute(p[0])||i&&minute(p[0])<minute(pairs[i-1][1])))throw new Error("课表节次时间无效");
    let top=0;
    const segments=[],periods=[];
    pairs.forEach(([clock,finish],index)=>{
      const start=minute(clock),end=minute(finish);
      periods.push({number:index+1,clock,top,height:44});
      segments.push({start,end,top,height:44});top+=44;
      if(index<pairs.length-1) {
        const next=minute(pairs[index+1][0]),height=options.fitHeight!==undefined||next===end?0:Math.min(16,Math.max(6,(next-end)/3));
        segments.push({start:end,end:next,top,height});top+=height;
      }
    });
    const bounds=options.bounds;
    if(bounds){
      if(!Number.isFinite(bounds.start)||!Number.isFinite(bounds.end)||bounds.start<0||bounds.end>1440||bounds.end<=bounds.start)throw new Error("日程显示时间范围无效");
      const first=segments[0].start,last=segments.at(-1).end;
      const clock=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
      if(bounds.start<first){const height=(first-bounds.start)*44/45;periods.forEach(p=>p.top+=height);segments.forEach(p=>p.top+=height);periods.unshift({number:null,clock:clock(bounds.start),top:0,height});segments.unshift({start:bounds.start,end:first,top:0,height});top+=height;}
      if(bounds.end>last){const height=(bounds.end-last)*44/45;periods.push({number:null,clock:clock(last),top,height});segments.push({start:last,end:bounds.end,top,height});top+=height;}
    }
    const naturalHeight=top;
    if(options.fitHeight!==undefined){
      if(!Number.isFinite(options.fitHeight)||options.fitHeight<=0)throw new Error("课表可用高度无效");
      const ratio=options.fitHeight/naturalHeight;
      periods.forEach(period=>{period.top*=ratio;period.height*=ratio;});
      segments.forEach(segment=>{segment.top*=ratio;segment.height*=ratio;});
      top=options.fitHeight;
    }
    function at(value) {
      if(!Number.isFinite(value)) throw new Error("无效课程时刻");
      if(value<=segments[0].start) return 0;
      if(value>=segments.at(-1).end) return top;
      const part=segments.find(segment=>value>=segment.start&&value<=segment.end);
      const next=segments[segments.indexOf(part)+1],bottom=next?.top??top;if(value===part.end)return bottom;return Math.max(part.top,Math.min(bottom,part.top+(value-part.start)/(part.end-part.start)*(bottom-part.top)));
    }
    return {periods,height:top,naturalHeight,at};
  }
  function groups(entries) {
    const result=[];
    entries.slice().sort((a,b)=>a.startMinute-b.startMinute||a.endMinute-b.endMinute).forEach(entry=>{
      if(entry.endMinute<=entry.startMinute) throw new Error("无效课程时段");
      const previous=result.at(-1);
      if(previous&&entry.startMinute<previous.end) {previous.entries.push(entry);previous.end=Math.max(previous.end,entry.endMinute);}
      else result.push({start:entry.startMinute,end:entry.endMinute,entries:[entry]});
    });
    return result;
  }
  const api={scale,groups};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  else root.FolioTimetable=api;
})(typeof globalThis==="undefined" ? this : globalThis);
