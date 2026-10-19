/* 日程单次排除、按课程/多组安排批量排除，以及可恢复的本地清单。 */
(function(){
  "use strict";
  function manager(term,course,origin,entry=null){
    if(!term||!course||!window.FolioScheduleOverrides)return;
    openHomeworkSheet("本地调整上课安排",origin);
    homeworkBody.append(make("p","queue-hint",`${course.title}：排除后不再占用本地日程；学校原课表和成绩保持原样。可随时在这里恢复。`));
    const form=make("form","queue-form"),scope=selectField("调整范围",[["once","仅这一次"],["sessions","选择上课安排（可多选）"],["course","这门课全部安排"]],entry?"once":"sessions");
    if(!entry)scope.input.querySelector('option[value="once"]').remove();
    form.append(scope.label);
    const dates=make("div","todo-time-fields"),from=field("从哪天起","date",entry?.date||homeworkState.today),until=field("到哪天（选填）","date","");dates.append(from.label,until.label);form.append(dates);
    const sessions=make("div","todo-check-row"),checks=course.sessions.map(session=>{
      const label=`周${["一","二","三","四","五","六","日"][session.day]} ${session.start}–${session.end} · ${session.room||"地点未定"}`;
      const check=checkField(label,entry?(entry.session?.mergedSessionIds||[entry.session?.id]).includes(session.id):false);sessions.append(check.label);return {session,input:check.input};});form.append(sessions);
    const error=make("p","form-error");error.setAttribute("role","alert");const submit=make("button","sheet-submit","排除所选安排");submit.type="submit";form.append(error,submit);
    function update(){const once=scope.input.value==="once";dates.hidden=once;sessions.hidden=scope.input.value!=="sessions";submit.textContent=once?"仅排除这一次":"排除所选安排";}
    scope.input.addEventListener("change",update);update();
    form.addEventListener("submit",event=>{event.preventDefault();try{
      const selected=scope.input.value==="once"?(entry.session.mergedSessionIds||[entry.session.id]):scope.input.value==="sessions"?checks.filter(check=>check.input.checked).map(check=>check.session.id):[];
      if(scope.input.value==="sessions"&&!selected.length)throw new Error("至少选择一组上课安排");
      const fromDay=scope.input.value==="once"?entry.date:from.input.value,untilDay=scope.input.value==="once"?entry.date:until.input.value||null;
      FolioScheduleOverrides.add({termId:term.id,courseId:course.id,sessionIds:selected,from:fromDay,until:untilDay,title:course.title});
      closeHomeworkSheet();announce("已从本地课表排除，可在课程安排里恢复");
    }catch(problem){error.textContent=problem.message;}});homeworkBody.append(form);
    const list=FolioScheduleOverrides.list(term.id,course.id);
    if(list.length){const section=make("section","todo-form-section");section.append(make("h3","","已排除"));
      list.forEach(rule=>{const row=make("div","course-info-row"),copy=make("span","",`${rule.from}${rule.until&&rule.until!==rule.from?` — ${rule.until}`:rule.until?"":" 起"} · ${rule.sessionIds.length?`${rule.sessionIds.length} 组安排`:"全部安排"}`);
        row.append(copy,action("恢复",()=>{try{FolioScheduleOverrides.remove(rule.id);manager(term,course,origin,entry);}catch(problem){announce(problem.message);}},"small-action"));section.append(row);});homeworkBody.append(section);}
  }
  window.FolioScheduleOverrideUI=Object.freeze({open:manager});
})();
