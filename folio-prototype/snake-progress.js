/* 8px 实线路线与课间时刻映射；16×16 自定义形象统一显示为 24×24。 */
(function(root) {
  "use strict";
  const PITCH=8,PIXEL_SIZE=8;
  function route(width,height) {
    if(width<40||height<40) throw new Error("像素路线空间不足");
    const middle=Math.floor(width/2),spacing=Math.floor((width-24)/2/PITCH)*PITCH;
    const span=Math.min(Math.floor((height-24)/PITCH)*PITCH,Math.max(PITCH,Math.round((height-24)*.9/PITCH)*PITCH));
    const left=middle-spacing,right=middle+spacing,top=Math.floor((height-span)/2),bottom=top+span;
    return [{x:right,y:top},{x:right,y:bottom},{x:middle,y:bottom},
      {x:middle,y:top},{x:left,y:top},{x:left,y:bottom}];
  }
  function cells(points) {
    const result=[{...points[0]}];
    points.slice(1).forEach((end,index)=>{
      const start=points[index],dx=end.x-start.x,dy=end.y-start.y;
      if((dx&&dy)||Math.abs(dx+dy)%PITCH!==0) throw new Error("路线必须沿固定网格转弯");
      const count=(Math.abs(dx)+Math.abs(dy))/PITCH;
      for(let step=1;step<=count;step++) result.push({x:start.x+Math.sign(dx)*step*PITCH,y:start.y+Math.sign(dy)*step*PITCH});
    });
    return result;
  }
  function at(points,fraction) {
    if(!Number.isFinite(fraction)) throw new Error("无效进度");
    const path=cells(points),index=Math.floor(Math.max(0,Math.min(1,fraction))*(path.length-1)+1e-9);
    return {...path[index]};
  }
  function coursePlan(points,periods,duration) {
    const distances=[0];
    points.slice(1).forEach((end,index)=>distances.push(distances.at(-1)+Math.abs(end.x-points[index].x)+Math.abs(end.y-points[index].y)));
    const total=distances.at(-1);
    // 本地课表示例为 45 分钟一节、课间 5 分钟；正式接入时从课表提供节次时间。
    let minutes,markers;
    if(periods===3&&duration===145) {
      minutes=[0,45,50,95,100,145];markers=[1,2,3,4,5];
    } else if(periods===2&&duration===95) {
      const rest=total-distances[2];
      minutes=[0,45,50,50+45*(distances[3]-distances[2])/rest,50+45*(distances[4]-distances[2])/rest,95];markers=[1,2,5];
    } else {
      minutes=distances.map(distance=>duration*distance/total);markers=[5];
    }
    return {distances,minutes,markers,total};
  }
  function courseIndex(points,fraction,periods,duration) {
    if(!Number.isFinite(fraction)||!Number.isFinite(duration)||duration<=0) throw new Error("无效课程进度");
    const plan=coursePlan(points,periods,duration),elapsed=Math.max(0,Math.min(1,fraction))*duration;
    const segment=Math.min(4,Math.max(0,plan.minutes.findIndex((minute,index)=>index>0&&minute>=elapsed)-1));
    const ratio=(elapsed-plan.minutes[segment])/(plan.minutes[segment+1]-plan.minutes[segment]);
    return Math.floor((plan.distances[segment]+ratio*(plan.distances[segment+1]-plan.distances[segment]))/PITCH+1e-9);
  }
  function render(element,fraction,color,options={}) {
    const width=element.clientWidth,height=element.clientHeight;
    if(width<40||height<40) return;
    const progress=Math.max(0,Math.min(1,fraction)),points=route(width,height);
    const path=cells(points),duration=options.duration||95,periods=options.periods||2;
    const plan=coursePlan(points,periods,duration),headIndex=courseIndex(points,progress,periods,duration);
    const passedColor="#C9C6BD";
    const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
    svg.setAttribute("viewBox",`0 0 ${width} ${height}`);svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("aria-hidden","true");
    path.forEach((point,index)=>{
      const marker=plan.markers.find(vertex=>plan.distances[vertex]/PITCH===index);
      const special=marker===5 ? "#9B634F" : marker%2 ? "#8A9C71" : "#6A9BCC";
      const rect=document.createElementNS(ns,"rect");
      rect.setAttribute("x",String(point.x-PIXEL_SIZE/2));rect.setAttribute("y",String(point.y-PIXEL_SIZE/2));
      rect.setAttribute("width",String(PIXEL_SIZE));rect.setAttribute("height",String(PIXEL_SIZE));
      rect.setAttribute("fill",index<=headIndex ? passedColor : marker ? special : color);
      rect.setAttribute("data-path-pixel","true");rect.setAttribute("data-passed",String(index<=headIndex));
      if(marker) rect.setAttribute("data-milestone",marker===5 ? "finish" : marker%2 ? "break-start" : "break-end");
      svg.append(rect);
    });
    const head=path[headIndex],avatar=root.FolioAvatar?.active||root.FolioPixels.presets[0];
    const figure=root.FolioPixels.svg(avatar),size=root.FolioPixels.DISPLAY_SIZE;
    figure.setAttribute("data-pet-head","true");figure.setAttribute("data-avatar",avatar.id);
    figure.setAttribute("x",String(head.x-size/2));figure.setAttribute("y",String(head.y-size/2));
    figure.setAttribute("width",String(size));figure.setAttribute("height",String(size));
    svg.append(figure);element.replaceChildren(svg);
    element.dataset.elapsed=String(progress);element.dataset.headX=String(head.x);element.dataset.headY=String(head.y);
  }
  const api={route,cells,at,coursePlan,courseIndex,render};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  else root.FolioSnakeProgress=api;
})(typeof globalThis==="undefined" ? this : globalThis);
