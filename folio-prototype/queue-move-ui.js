/* 所有手动改挂载日统一走检查；系统 plan() 调配不受手动上限限制。 */
function queueManualOptions() {
  return { ...window.FolioGoalUI?.queueOptions(), weekdayLimit: 1, weekendLimit: homeworkState.weekendLimit || 3,
    capacityMode: "limit", weights: homeworkState.weights, nightCutoffHour: 8 };
}
function createQueueMoveControls(item) {
  const panel = make("div", "queue-move-controls"), form = make("form", "queue-date-form");
  const date = field("挂载日期", "date", item.mountDate || homeworkState.today);
  date.input.required = true;
  const load = make("p", "queue-hint"), partner = field("交换哪一项", "text", "");
  const select = make("select"); select.setAttribute("aria-label", "交换哪一项");
  partner.input.replaceWith(select);
  const feedback = make("p", "form-error"); feedback.setAttribute("role", "alert");
  const save = make("button", "small-action", "提前到这一天"); save.type = "submit";
  form.append(date.label, load, partner.label, feedback, save);
  function update() {
    feedback.textContent = ""; partner.label.hidden = true; select.replaceChildren();
    try {
      const options = queueManualOptions(), target = date.input.value;
      const check = FolioQueue.manualCheck(homeworkState.items,item,target,homeworkState.today,options);
      const count = FolioQueue.dayLoad(homeworkState.items,target), limit = FolioQueue.manualLimit(homeworkState.items,target,options);
      load.textContent = `这天已安排 ${count} 项，上限 ${limit} 项。`;
      save.textContent = check.code === "swap" ? "交换这两项的日期" : check.code === "same" ? "保持日期" : "提前到这一天";
      save.disabled = !check.ok && check.code !== "swap";
      if (check.code === "swap") {
        partner.label.hidden = false;
        const placeholder = make("option", "", "选择可交换的事项"); placeholder.value = ""; select.append(placeholder);
        const candidates = FolioQueue.swapCandidates(homeworkState.items,item,target,homeworkState.today,options);
        candidates.forEach(other => { const option = make("option", "", other.title); option.value = other.id; select.append(option); });
        save.disabled = !candidates.length;
        if (!candidates.length) feedback.textContent = "那天没有可交换的便签，请选别的日期。";
      } else if (!check.ok) feedback.textContent = check.message;
    } catch (error) { load.textContent = ""; feedback.textContent = error.message; save.disabled = true; }
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    try {
      const result = FolioQueue.manualMove(homeworkState.items,item,date.input.value,homeworkState.today,queueManualOptions(),select.value);
      if (!result.ok) { feedback.textContent = result.message; return; }
      closeHomeworkSheet(); commit(result.swapped ? "两项便签已交换日期，截止时间没有改变" : "挂载日已调整，截止时间没有改变");
    } catch (error) { feedback.textContent = error.message; }
  });
  date.input.addEventListener("change",update);
  panel.append(form, make("p", "queue-hint", "提前可以直接调；往后必须交换。冒烟或着火时不能推后。"));
  update();
  return { element: panel, refresh: update, setValue: value => { date.setValue(value); update(); }, moveNow() {
    const result = FolioQueue.manualMove(homeworkState.items,item,homeworkState.today,homeworkState.today,queueManualOptions());
    if (!result.ok) { feedback.textContent = result.message; return; }
    closeHomeworkSheet(); commit("已提前挂上便签");
  }};
}
