/* 仅供4190隔离反馈夹具：不在真实账号页面执行，不随APK打包。 */
window.runSchedule06Checks=async function(check){
  const pause=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const store=FolioScheduleOverrides,term=FolioCourses.semesters[0],oldTerm={courses:term.courses,calendar:term.calendar},oldItems=structuredClone(homeworkState.items),oldRules=store.list(),oldDate=calendarSelectedDay;
  const labelInput=text=>[...homeworkBody.querySelectorAll('.queue-field')].find(label=>label.querySelector('span')?.textContent===text)?.querySelector('input,select,textarea');
  const set=(input,value)=>{if(!input)throw Error('夹具找不到表单字段');input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));};
  try{
    oldRules.forEach(rule=>store.remove(rule.id));
    const times=FolioBackend.defaultTimes,session=n=>({id:'qa-s'+n,day:0,startPeriod:n,periods:1,start:times[n-1][0],end:times[n-1][1],room:'夹具实验楼203',firstHalf:true,secondHalf:true,oddWeek:true,evenWeek:true});
    term.calendar={periods:[{id:'qa',label:'秋',half:'first',start:'2026-10-01',end:'2026-11-30'}],sessionTime:[[],...times]};term.courses=[{id:'qa-exception-lab',title:'夹具不定期实验',color:'#8DABA0',sessions:[session(6),session(7),session(8)]}];
    const course=term.courses[0],day='2026-10-19',next='2026-10-26',entry=FolioCalendar.dayEntries(FolioCourses.onDate(term,day),day)[0];
    openCalendarEvent(entry,null);[...homeworkBody.querySelectorAll('button')].find(button=>button.textContent==='调整／排除这段排课').click();
    check('日程详情可进入单次排课调整',labelInput('调整范围').value==='once');homeworkBody.querySelector('form').requestSubmit();await pause();
    check('单次排除释放本日合并课块，下一周仍保留',FolioCourses.onDate(term,day).length===0&&FolioCourses.onDate(term,next).length===1);
    FolioScheduleOverrideUI.open(term,course,null);[...homeworkBody.querySelectorAll('button')].find(button=>button.textContent==='恢复').click();
    check('界面恢复排除后原安排重新出现',FolioCourses.onDate(term,day).length===1);
    set(labelInput('调整范围'),'sessions');set(labelInput('从哪天起'),day);set(labelInput('到哪天（选填）'),next);
    homeworkBody.querySelectorAll('.todo-check-row input').forEach(input=>input.checked=true);homeworkBody.querySelector('form').requestSubmit();await pause();
    check('多组批量排除同时作用起止日且不修改学校原课程',FolioCourses.onDate(term,day).length===0&&FolioCourses.onDate(term,next).length===0&&course.sessions.length===3);
    store.restoreCourse(term.id,course.id);
    openTodoEditor(null,null,{date:day,timeMode:'range',kind:'event'});
    check('日程新增默认真实事项类型并保留待办作业类型',labelInput('类型').value==='event'&&[...labelInput('类型').options].map(o=>o.value).join(',')==='todo,event,homework');
    set(labelInput('标题'),'夹具夜间补课事项');set(labelInput('地点（选填）'),'夹具实验楼203');set(labelInput('开始日期'),day);set(labelInput('结束日期'),'2026-10-20');set(labelInput('开始时刻'),'23:30');set(labelInput('结束时刻'),'00:30');
    check('时间输入无21:15限制并可跨日',labelInput('开始时刻').type==='time'&&!labelInput('开始时刻').max&&labelInput('开始时刻').value==='23:30');
    homeworkBody.querySelector('form').requestSubmit();await pause();
    const item=homeworkState.items.find(item=>item.title==='夹具夜间补课事项');
    check('表单确实保存event与晚间起止及地点，未混入作业',item?.kind==='event'&&item.startAt==='2026-10-19T23:30'&&item.endAt==='2026-10-20T00:30'&&item.location==='夹具实验楼203'&&!FolioQueue.homeworkItems(homeworkState.items).includes(item));
    selectCalendarDay(day);showPreviewScreen('calendar',{focus:false});showCalendarView('week');await pause();
    const monday=[...document.querySelectorAll('.timetable-course-column[data-date="2026-10-19"] .timetable-course-block')].find(node=>node.textContent.includes(item.title)),tuesday=[...document.querySelectorAll('.timetable-course-column[data-date="2026-10-20"] .timetable-course-block')].find(node=>node.textContent.includes(item.title)),grid=document.getElementById('timetable-grid').getBoundingClientRect();
    check('23:30跨日事项真实绘制到周课表两天，时段没有挤出边界',Boolean(monday&&tuesday)&&monday.getBoundingClientRect().height>0&&monday.getBoundingClientRect().bottom<=grid.bottom+1&&tuesday.getBoundingClientRect().top>=grid.top-1&&monday.getAttribute('aria-label').includes('23:30'));
  }finally{
    closeHomeworkSheet(true);store.list().forEach(rule=>store.remove(rule.id));oldRules.forEach(rule=>store.add(rule));Object.assign(term,oldTerm);homeworkState.items=oldItems;commit();selectCalendarDay(oldDate);if(scheduleView==='week')renderTimetable();
  }
};
