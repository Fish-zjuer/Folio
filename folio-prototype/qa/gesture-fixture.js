/* 只供本地功能夹具。通过 UI 按钮走真实 TouchEvent 监听，不写用户的主预览存储。 */
document.addEventListener("DOMContentLoaded",()=>{
  const panel=document.createElement("aside");panel.style="position:fixed;right:4px;top:4px;z-index:999;width:210px;background:#fff;border:1px solid #bbb;font:12px sans-serif;padding:8px";
  const run=document.createElement("button"),output=document.createElement("pre");run.textContent="运行触摸功能夹具";output.style="white-space:pre-wrap;font:11px/1.4 monospace";panel.append(run,output);document.body.append(panel);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function touch(target,type,x,y){
    const point=new Touch({identifier:31,target,clientX:x,clientY:y,pageX:x,pageY:y});
    target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==="touchend"?[]:[point],targetTouches:type==="touchend"?[]:[point],changedTouches:[point]}));
  }
  function gesture(target,dx,dy){const r=target.getBoundingClientRect(),x=r.left+r.width*.65,y=r.top+Math.min(r.height*.55,120);touch(target,"touchstart",x,y);touch(target,"touchmove",x+dx,y+dy);return ()=>touch(target,"touchend",x+dx,y+dy);}
  run.onclick=async()=>{
    run.disabled=true;const rows=[];
    const check=(name,value)=>{rows.push(`${value?"PASS":"FAIL"} ${name}`);output.textContent=rows.join("\n");if(!value)throw Error(name);};
    try{
      showPreviewScreen("home",{focus:false});await sleep(350);
      const home=previewScreens.home,phone=document.querySelector(".phone"),header=document.querySelector(".app-topbar"),before=header.getBoundingClientRect().left;
      let finish=gesture(home,-phone.clientWidth*.12,0);
      check("首页拖动实时跟随",Math.abs(home.getBoundingClientRect().left-phone.getBoundingClientRect().left+phone.clientWidth*.12)<2);
      check("共享顶部保持不动",Math.abs(header.getBoundingClientRect().left-before)<1);finish();await sleep(380);
      check("短拖动回弹首页",currentScreen==="home"&&previewScreens.workbench.hidden);
      finish=gesture(home,-phone.clientWidth*.4,0);await sleep(40);
      check("手指停下页面也停下",Math.abs(home.getBoundingClientRect().left-phone.getBoundingClientRect().left+phone.clientWidth*.4)<2);finish();await sleep(380);
      check("向左拖动到工作台",currentScreen==="workbench");
      finish=gesture(previewScreens.workbench,phone.clientWidth*.4,0);finish();await sleep(380);check("向右拖动回首页",currentScreen==="home");
      finish=gesture(home,-phone.clientWidth*.4,0);finish();await sleep(80);finish=gesture(phone,phone.clientWidth*.8,0);finish();await sleep(380);check("未完成切页可重新接住并拉回",currentScreen==="home"&&previewScreens.workbench.hidden);
      showPreviewScreen("calendar",{focus:false});await sleep(60);
      const month=document.querySelector(".schedule-month"),windowEl=document.querySelector(".schedule-month-window"),monthBefore=calendarMonth,height=windowEl.getBoundingClientRect().height;
      finish=gesture(windowEl,0,-90);finish();await sleep(370);
      check("月历上划收为一周",calendarCollapsed&&windowEl.getBoundingClientRect().height<height*.5);
      finish=gesture(windowEl,0,90);finish();await sleep(370);check("周历下划重新展开",!calendarCollapsed);
      finish=gesture(windowEl,-100,0);check("相邻月份随手指进入画面",document.querySelectorAll(".calendar-neighbor").length===2&&Math.abs(new DOMMatrixReadOnly(getComputedStyle(calendarMonthGrid).transform).m41+100)<2);finish();await sleep(360);check("日历内横滑仅切月份",calendarMonth!==monthBefore&&scheduleView==="month");
      finish=gesture(calendarAgenda,-phone.clientWidth*.5,0);finish();await sleep(400);check("日历外横滑进入课表",scheduleView==="week");
      for(let frame=0;frame<12&&Math.abs(timetableScale.height-timetableScroll.clientHeight)>=1;frame++)await sleep(80);
      check("15 节课表完整落入可用高度",timetableScale.periods.length===15&&Math.abs(timetableScale.height-timetableScroll.clientHeight)<1&&timetableScroll.scrollHeight<=timetableScroll.clientHeight+1);
      finish=gesture(timetableGrid,phone.clientWidth*.5,0);finish();await sleep(400);check("课表内横滑返回日程",scheduleView==="month");
    }catch(error){rows.push("ERROR "+error.message);output.textContent=rows.join("\n");}
    finally{run.disabled=false;}
  };
});
