/* 两阶段目标编辑：草稿自动保存；明确应用后才联动课程与作业。 */
(()=>{
  "use strict";
  const G=FolioGoal,KEY="folio-goals-v1",clone=x=>JSON.parse(JSON.stringify(x));
  const types={total:"总均绩",semester:"学期均绩",major:"主修均绩",weighted:"加权均绩"},fmt=n=>Number.isFinite(n)?Number(Math.abs(n)>0&&Math.abs(n)<.001?n.toPrecision(2):n.toFixed(3)).toString():"—";
  function previewNumber(value){if(!Number.isFinite(value))return {text:"—",digits:3};const gap=value-d.target,digits=gap<0&&Number(value.toFixed(3))>=d.target?Math.min(9,Math.max(4,Math.ceil(-Math.log10(-gap))+1)):3;return {text:Number(value.toFixed(digits)).toString(),digits};}
  const fresh=()=>({phase:"setup",termId:FolioCourses.semesters[0].id,type:"total",source:window.FolioApp?.native?"academic":"example",target:4.45,floor:3,threshold:4.5,baselineGpa:4.4,baselineCredits:100,coreMultiplier:false,groups:[],order:[],meta:{},assignments:{}});
  let store={version:1,draft:fresh(),applied:null};
  try{const v=JSON.parse(localStorage.getItem(KEY));if(v?.version===1&&v.draft){const exists=FolioCourses.semesters.some(t=>t.id===v.draft.termId);store={...store,...v,draft:exists?{...fresh(),...v.draft}:{...fresh(),previousTermId:v.draft.termId},archivedDraft:exists?v.archivedDraft:clone(v.draft)};}}catch{}
  if(store.draft.coreMultiplier&&store.draft.type==="major")store.draft.type="weighted";
  store.draft.coreMultiplier=store.draft.type==="weighted";
  let d=store.draft,calculation=null,input=null,data=null,warning="",dirty=false;
  const page=make("section","settings-screen goal-screen");page.id="goals-screen";page.hidden=true;page.setAttribute("aria-label","课程目标页");
  const header=make("header","goal-header"),back=action("",()=>goBack("menu"),"detail-back");back.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>';back.setAttribute("aria-label","返回上一页");
  const titleBlock=make("div","goal-heading"),title=make("h1","","目标调试"),reconfigure=action("重新调试",()=>{d.phase="setup";persist();render();},"goal-text-button");titleBlock.append(title,reconfigure);
  const live=make("aside","goal-live"),liveLabel=make("span","goal-live-label"),liveValue=make("strong"),liveGap=make("span","goal-live-gap"),home=action("",()=>showPreviewScreen("home"),"detail-back goal-home");home.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/></svg>';home.setAttribute("aria-label","回首页");live.setAttribute("aria-label","目标实时预览");live.append(liveLabel,liveValue,liveGap);header.append(back,titleBlock,live,home);
  const scroll=make("div","settings-scroll goal-scroll"),body=make("div"),error=make("p","goal-error"),footer=make("footer","goal-footer"),notice=make("p","goal-save-note"),submit=action("",()=>d.phase==="setup"?finalize():apply(),"goal-primary");error.setAttribute("role","alert");scroll.append(body,error);footer.append(notice,submit);page.append(header,scroll,footer);document.querySelector(".phone").insertBefore(page,homeworkLayer);
  previewScreens.goals=page;screenNames.goals="目标";screenFocusTargets.goals=back;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(store));return true;}catch{error.textContent="没有保存成功，请检查本机存储空间。当前修改仍留在页面中。";return false;}}
  function term(){return FolioCourses.semesters.find(t=>t.id===d.termId);}
  function exampleData(){return {source:"独立示例",baseline:{credits:d.type==="semester"?0:d.baselineCredits,points:d.type==="semester"?0:d.baselineGpa*d.baselineCredits},known:0,courses:term().courses.map(c=>({...c,grading:"percent",major:!["english","sport"].includes(c.id),core:false}))};}
  function material(){
    const result=d.source==="academic"?FolioAcademicUI.goalData({termId:d.termId,type:d.type,coreMultiplier:d.coreMultiplier}):exampleData();
    result.courses=(result.courses||[]).map(c=>({...c,...d.meta[c.id],id:c.id,title:c.title,credits:Number.isFinite(d.meta[c.id]?.credits)?d.meta[c.id].credits:c.credits}));
    return result;
  }
  function makeInput(){data=material();if(data.blocked)throw new Error(data.blocked);const groups=[...new Set(data.courses.filter(c=>Number.isFinite(c.credits)).map(c=>String(c.credits)))].sort((a,b)=>Number(b)-Number(a));
    const groupOrder=[...new Set([...d.groups.filter(k=>groups.includes(k)),...groups])],priority=groupOrder.flatMap(k=>data.courses.filter(c=>String(c.credits)===k).sort((a,b)=>{const ai=d.order.indexOf(a.id),bi=d.order.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)||a.id.localeCompare(b.id);}).map(c=>c.id));
    return {type:d.type,target:d.target,floor:d.floor,margin:.01,coreMultiplier:d.type==="weighted",baseline:data.baseline,courses:data.courses,priority};
  }
  function calculate(){
    data=null;
    try{
      if(!Number.isFinite(d.threshold)||d.threshold<1.5||d.threshold>5)throw new Error("重要课门槛需在 1.5 到 5 之间");
      input=makeInput();
      // Empty/unloaded course material must not discard an existing user's targets.
      if(!input.courses.length){calculation=G.evaluate(input,d.assignments);}
      else if(d.phase==="setup"&&!Object.keys(d.assignments||{}).length){calculation=G.allocate(input);d.assignments=calculation.assignments;}
      else{d.assignments=G.preserveAssignments(input,d.assignments);calculation=G.evaluate(input,d.assignments);}
      warning="";error.textContent="";
    }catch(e){calculation=null;input=null;warning=e.message;error.textContent=e.message;}
    const display=previewNumber(calculation?.projected);liveLabel.textContent=`预计${types[d.type]}`;liveValue.textContent=display.text;liveValue.style.fontSize=display.digits>5?"18px":display.digits>3?"23px":"";
    liveGap.textContent=!calculation?"待确认":calculation.projected===null?"暂无可计入课程":calculation.reached?`超出 ${fmt(Math.max(0,calculation.gap))}`:`还差 ${fmt(-calculation.gap)}`;
    live.classList.toggle("is-short",Boolean(calculation&&!calculation.reached));
    liveValue.setAttribute("aria-label",calculation?`预计${types[d.type]} ${fmt(calculation.projected)}`:"暂不能计算");
    submit.disabled=!calculation||calculation.projected===null;
    submit.textContent=d.phase==="setup"?"确定课程目标":dirty?"保存并应用":"保存并应用";
    notice.textContent=d.phase==="setup"?"先分配，再选择具体课程":"调整会实时测算，保存后更新课程提醒";
    page.querySelectorAll(".goal-status-copy").forEach(el=>el.textContent=warning?"":statusText());
    return Boolean(calculation);
  }
  document.addEventListener("folio-academic-calculation-change",()=>{if(currentScreen==="goals")render();});
  function statusText(){if(!calculation)return "";if(!data.courses.length)return "这个学期的课程都已有结果，无待分配课程。";if(!calculation.reached)return `按当前条件还达不到 ${d.target}${calculation.maximum!==undefined?`，最高可到 ${previewNumber(calculation.maximum).text}`:""}。可以继续调整，也可以保存这份较低的目标。`;return "";}
  function changed(full=false,reallocate=true){dirty=true;if(reallocate&&d.phase==="setup")d.assignments={};calculate();persist();if(full)render();else if(d.phase==="setup"){renderGroups();updateSetupTargets();}else updateCourseLabels();}
  function field(label,control){const l=make("label","goal-field");l.append(make("span","",label),control);return l;}
  function numeric(label,value,change,{min=0,max=5,step=.01}={}){const n=make("input");n.type="number";n.inputMode="decimal";n.min=min;n.max=max;n.step=step;n.value=Number.isFinite(value)?value:"";n.setAttribute("aria-label",label);n.addEventListener("input",()=>change(n.value===""?NaN:Number(n.value)));return field(label,n);}
  function select(label,options,value,change){const s=make("select");s.setAttribute("aria-label",label);options.forEach(([id,text])=>{const o=make("option","",text);o.value=id;s.append(o);});s.value=String(value);s.addEventListener("change",()=>change(s.value));return field(label,s);}
  function render(){
    title.textContent=d.phase==="setup"?"目标调试":"课程目标";reconfigure.hidden=d.phase==="setup";calculate();body.replaceChildren();
    const intro=make("div","goal-intro"),termText=term().label.replace("—","–");intro.append(make("span","goal-eyebrow",d.source==="example"?"独立示例 · 非教务成绩":"本地学业缓存"),make("p","goal-term",termText));body.append(intro);if(d.previousTermId)intro.append(make("p","goal-field-help","旧目标学期已不在当前课表中，原草稿已保留。请核对本学期后重新分配。"));
    if(d.phase==="setup")renderSetup();else renderPlan();
    error.textContent=warning;
  }
  function renderSetup(){
    const settings=make("section","goal-settings"),grid=make("div","goal-field-grid");
    grid.append(select("计算类型",Object.entries(types),d.type,v=>{d.type=v;d.coreMultiplier=v==="weighted";changed(true);}),select("目标学期",FolioAcademic.sortedTerms(FolioCourses.semesters).map(t=>[t.id,t.label.replace("—","–")]),d.termId,v=>{d.termId=v;d.groups=[];d.order=[];d.meta={};changed(true);}),numeric("目标均绩",d.target,v=>{d.target=v;changed();},{max:d.type==="weighted"?6:5}),numeric("最低可接受绩点",d.floor,v=>{d.floor=v;changed();},{min:1.5}),numeric("重要课门槛",d.threshold,v=>{d.threshold=v;changed(false,false);},{min:1.5}));
    grid.children[3].querySelector("span").textContent="保底绩点";grid.children[4].querySelector("span").textContent="重要门槛";
    const importantNote=make("p","goal-field-help","课程目标 ≥ 门槛即为重要课，作业提前 3 天紧急。");settings.append(grid,importantNote);
    const baseline=make("details","goal-baseline"),summary=make("summary","","计算基准与规则");baseline.append(summary);
    baseline.append(select("基准来源",[["example","独立示例 / 手动基准"],["academic","使用学业缓存"]],d.source,v=>{d.source=v;d.meta={};changed(true);}));
    if(d.source==="example"&&d.type!=="semester"){
      const fields=make("div","goal-field-grid");fields.append(numeric("已有均绩（示例）",d.baselineGpa,v=>{d.baselineGpa=v;changed();},{max:6}),numeric("已计绩点学分（示例）",d.baselineCredits,v=>{d.baselineCredits=v;changed();},{max:1000,step:.5}));baseline.append(fields);
    }
    if(d.type==="weighted")baseline.append(make("p","goal-field-help","独立的保研加权口径：主修课计入，核心课绩点在分子乘 1.2，分母仍为主修学分。不会改变普通均绩。"));baseline.append(make("p","goal-field-help",d.source==="example"?"默认课程制式与主修归属仅供示例，可点课程设置调整。手动基准的均绩应与所选口径一致。":"沿用本地主修归属；尚未出分课程的制式和缺少的真实学分可在课程设置中确认。已出分课程只计入基准，不重复分配。"));settings.append(baseline);body.append(settings);
    const advance=action("继续分配 ↓",()=>advanceToAllocation(),"goal-continue");settings.append(advance);let jumped=false;settings.addEventListener("focusout",event=>{if(jumped||event.relatedTarget&&settings.contains(event.relatedTarget))return;setTimeout(()=>{if(!settings.isConnected||settings.contains(document.activeElement)||!Number.isFinite(d.target)||!Number.isFinite(d.floor)||!Number.isFinite(d.threshold))return;jumped=true;advanceToAllocation();},160);});
    const heading=make("div","goal-section-heading"),groupCount=data?.courses?new Set(data.courses.filter(c=>Number.isFinite(c.credits)).map(c=>c.credits)).size:0;heading.id="goal-allocation-heading";heading.append(make("h2","","分配优先级"),make("span","",`${groupCount?`${groupCount} 组 · `:""}向上冲高`));body.append(heading,make("p","goal-instruction","拖动右侧三横杠。默认高学分在前，同学分由你选。"));
    const groups=make("div","goal-groups");body.append(groups);renderGroups();
    const status=make("p","goal-status-copy",warning?"":statusText());body.append(status);
    const courseSettings=make("details","goal-baseline goal-course-information"),caption=make("summary","","同学分选择与课程信息");courseSettings.open=Boolean(data?.courses?.some(c=>!Number.isFinite(c.credits)||["major","weighted"].includes(d.type)&&c.major===null));courseSettings.append(caption);
    if(data?.courses)for(const c of data.courses){const row=make("div","goal-setup-course");const copy=make("span","goal-setup-copy");copy.append(make("span","",`${c.title} · ${Number.isFinite(c.credits)?`${c.credits} 学分`:"学分待确认"}${c.major===null?" · 教务未返回归属":""}`),make("strong","goal-setup-target",`建议目标 ${targetText(c)}`));row.append(copy);
      const actions=make("div");actions.append(action("设置",e=>editCourse(c,e.currentTarget),"goal-text-button"));if(data.courses.some(p=>p.id!==c.id&&p.credits===c.credits))actions.append(action("优先这门",()=>{d.order=[c.id,...d.order.filter(id=>id!==c.id)];changed(true);},"goal-text-button"));row.append(actions);courseSettings.append(row);}
    body.append(courseSettings);
  }
  function advanceToAllocation(){const unknown=data?.courses?.some(c=>!Number.isFinite(c.credits)),target=body.querySelector(unknown?".goal-course-information":"#goal-allocation-heading");if(!target)return;if(unknown)target.open=true;scroll.scrollTo({top:scroll.scrollTop+target.getBoundingClientRect().top-scroll.getBoundingClientRect().top-12,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});}
  function updateSetupTargets(){if(!data)return;const rows=body.querySelectorAll(".goal-setup-course");data.courses.forEach((c,index)=>{const label=rows[index]?.querySelector(".goal-setup-target");if(label)label.textContent=`建议目标 ${targetText(c)}`;});}
  function targetText(c){return c.grading==="passFail"?"合格":Number.isFinite(d.assignments[c.id])?`${fmt(d.assignments[c.id])} 绩点`:"待测算";}
  function renderGroups(){
    const list=body.querySelector(".goal-groups");if(!list)return;list.replaceChildren();if(!calculation){list.append(make("p","goal-missing-credits",warning||"请补全课程信息后测算。"));if(!data?.courses?.length)return;}
    const groups=G.groups(data.courses,d.assignments,d.floor),keys=[...new Set([...d.groups,...groups.map(g=>String(g.credits))])];groups.sort((a,b)=>keys.indexOf(String(a.credits))-keys.indexOf(String(b.credits)));
    for(const group of groups){
      const card=make("section","goal-allocation-card");card.dataset.group=String(group.credits);
      const text=make("div","goal-allocation-copy"),head=make("div","goal-allocation-title"),credit=make("strong","",String(group.credits).split(".")[0]),fraction=String(group.credits).split(".")[1];if(fraction)credit.append(make("small","",`.${fraction}`));head.append(credit,make("span","","学分"),make("span","goal-group-count",`${group.courses.length} 门`));text.append(head);
      const distribution=new Map();for(const c of group.courses){const value=c.grading==="passFail"?"合格":calculation?fmt(d.assignments[c.id]):"待测算";distribution.set(value,(distribution.get(value)||0)+1);}
      const parts=make("p","goal-distribution");[...distribution].sort((a,b)=>Number(b[0])-Number(a[0])).forEach(([v,count])=>{const p=make("span");p.append(make("b","",v),document.createTextNode(`${v==="合格"?"":" 绩点"} × ${count} 门`));parts.append(p);});const names=make("div","goal-group-targets");for(const c of group.courses){const row=make("p","goal-group-course-target");row.dataset.targetCourse=c.id;row.append(make("span","",c.title),make("strong","",targetText(c)));names.append(row);}text.append(parts,names);
      const handle=action("",()=>{},"goal-drag-handle");handle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg>';handle.setAttribute("aria-label",`调整 ${group.credits} 学分组的优先级`);handle.setAttribute("aria-describedby","goal-drag-instruction");handle.title="拖动，或用上下方向键调整";
      handle.addEventListener("keydown",e=>{if(!["ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();const cards=[...list.querySelectorAll(".goal-allocation-card")],i=cards.indexOf(card),j=i+(e.key==="ArrowUp"?-1:1);if(j<0||j>=cards.length)return;cards.splice(i,1);cards.splice(j,0,card);d.groups=cards.map(c=>c.dataset.group);changed();list.querySelector(`[data-group="${group.credits}"] .goal-drag-handle`)?.focus({preventScroll:true});});
      let drag=null;
      handle.addEventListener("pointerdown",e=>{if(e.button!==0)return;e.preventDefault();drag={id:e.pointerId,y:e.clientY,moved:false,target:null,after:false};handle.setPointerCapture(e.pointerId);card.classList.add("is-dragging");});
      handle.addEventListener("pointermove",e=>{
        if(!drag)return;e.preventDefault();if(Math.abs(e.clientY-drag.y)>5)drag.moved=true;
        card.style.transform=`translateY(${e.clientY-drag.y}px)`;
        const candidates=[...list.querySelectorAll(".goal-allocation-card")];candidates.forEach(c=>c.classList.remove("drop-before","drop-after"));
        const other=candidates.find(el=>el!==card&&e.clientY>=el.getBoundingClientRect().top&&e.clientY<=el.getBoundingClientRect().bottom);
        if(other){const r=other.getBoundingClientRect();drag.target=other;drag.after=e.clientY>=r.top+r.height/2;other.classList.add(drag.after?"drop-after":"drop-before");}
        const region=scroll.getBoundingClientRect();if(e.clientY<region.top+35)scroll.scrollTop-=12;else if(e.clientY>region.bottom-35)scroll.scrollTop+=12;
      });
      const end=()=>{if(!drag)return;const move=drag;drag=null;card.classList.remove("is-dragging");card.style.transform="";if(move.moved&&move.target)list.insertBefore(card,move.after?move.target.nextSibling:move.target);d.groups=[...list.querySelectorAll(".goal-allocation-card")].map(c=>c.dataset.group);changed();};handle.addEventListener("pointerup",end);handle.addEventListener("pointercancel",end);handle.addEventListener("lostpointercapture",end);
      card.append(text,handle);list.append(card);
    }
    const help=make("span","sr-only","三横杠可拖动，聚焦后也可按上、下方向键调整优先级。");help.id="goal-drag-instruction";list.append(help);
  }
  function finalize(){if(!calculate())return;d.phase="courses";dirty=true;if(!persist())return;render();scroll.scrollTop=0;title.focus?.({preventScroll:true});}
  function renderPlan(){
    const head=make("div","goal-plan-meta");head.append(make("span","",`${types[d.type]}目标 ${fmt(d.target)}`),make("span","",`底线 ${fmt(d.floor)} · 重要 ≥ ${fmt(d.threshold)}`));body.append(head);
    const status=make("p","goal-status-copy",warning?"":statusText());body.append(status);
    const note=make("p","goal-instruction","右侧直接调目标；同学分课程可交换。改变不会自动重分配其他课。"),list=make("div","goal-course-list");body.append(note,list);
    if(!data?.courses)return;
    for(const c of data.courses){
      const row=make("section","goal-course-row");row.dataset.goalCourse=c.id;const copy=make("div","goal-course-copy"),name=make("h2","",c.title),meta=make("p","goal-course-meta",`${Number.isFinite(c.credits)?`${c.credits} 学分`:"学分待确认"} · ${c.major===true?"主修":c.major===false?"非主修":"归属待确认"}${["major","weighted"].includes(d.type)&&c.major===false?" · 不计所选均绩":""}`),flag=make("span","goal-important");copy.append(name,meta,flag);
      const tools=make("div","goal-course-tools"),edit=action("课程设置",e=>editCourse(c,e.currentTarget),"goal-text-button");
      const value=make("div","goal-course-value");value.append(make("span","goal-target-caption","目标绩点"));if(!calculation)value.append(make("span","","待确认"));else if(c.grading==="passFail")value.append(make("strong","","合格"),make("span","","不计绩点"));else{
        const choose=select(`${c.title}目标绩点`,G.limits(c,d.floor).map(b=>[b.value,String(b.value)]),d.assignments[c.id],v=>{d.assignments[c.id]=Number(v);dirty=true;calculate();persist();updateCourseLabels();});choose.classList.add("goal-target-select");choose.querySelector("select").dataset.goalValue=c.id;value.append(choose,make("span","goal-score-band"));
      }
      const peers=data.courses.filter(p=>p.id!==c.id&&p.credits===c.credits&&p.grading!=="passFail");if(calculation&&c.grading!=="passFail"&&peers.length)tools.append(action("交换目标",e=>swapCourse(c,peers,e.currentTarget),"goal-text-button"));tools.append(edit);row.append(copy,value,tools);list.append(row);
    }
    updateCourseLabels();
    if(store.applied)body.append(action("停用已保存的提醒",removeApplied,"goal-stop"));
  }
  function updateCourseLabels(){if(!data)return;for(const c of data.courses){const row=body.querySelector(`[data-goal-course="${c.id}"]`);if(!row)continue;const value=d.assignments[c.id],important=c.grading!=="passFail"&&value>=d.threshold;row.querySelector(".goal-important").textContent=important?"重要课 · 作业提前安排":"";const band=row.querySelector(".goal-score-band");if(band)band.textContent=G.bands(c.grading).find(b=>b.value===value)?.label||"";row.classList.toggle("is-important",important);}}
  function swapCourse(c,peers,origin){openHomeworkSheet("交换课程目标",origin);homeworkBody.append(make("p","goal-instruction","同学分课程可换着承担目标；倍率、主修归属不同时，预计均绩也会重新计算。"));for(const p of peers){const b=action(`${p.title} · ${fmt(d.assignments[p.id])}`,()=>{const first=d.assignments[c.id],second=d.assignments[p.id];if(!G.limits(c,d.floor).some(v=>v.value===second)||!G.limits(p,d.floor).some(v=>v.value===first)){announce("两门课的制式或上下限不同，不能直接交换。");return;}d.assignments[c.id]=second;d.assignments[p.id]=first;dirty=true;closeHomeworkSheet();calculate();persist();render();},"goal-swap-choice");homeworkBody.append(b);}}
  function editCourse(c,origin){
    openHomeworkSheet(c.title,origin);const form=make("form","goal-course-form");let values={credits:c.credits,grading:c.grading,major:c.major,core:c.core,minimum:c.minimum??null,maximum:c.maximum??null};
    const creditField=numeric("学分（仅用于目标测算）",c.credits,v=>values.credits=v,{min:0,max:30,step:.5});creditField.querySelector("input").placeholder="按教务信息填写真实学分";form.append(creditField,select("目标成绩制式",[["percent","百分制"],["fiveLevel","五级制"],["passFail","合格 / 不合格"]],values.grading,v=>values.grading=v),select("主修归属",[["unknown","待确认"],["yes","主修"],["no","非主修"]],c.major===true?"yes":c.major===false?"no":"unknown",v=>values.major=v==="yes"?true:v==="no"?false:null));
    const check=make("label","goal-check"),core=make("input");core.type="checkbox";core.checked=Boolean(c.core);core.addEventListener("change",()=>values.core=core.checked);check.append(core,document.createTextNode("保研核心课（只在加权均绩中 ×1.2）"));form.append(check);
    const limits=make("section","goal-range"),rangeHeading=make("div","goal-range-heading"),lowText=make("span"),highText=make("span"),track=make("div","goal-range-track"),ticks=make("div","goal-range-ticks"),estimate=make("p","goal-range-estimate");rangeHeading.append(lowText,highText);limits.append(rangeHeading,track,ticks,estimate);for(let n=0;n<=5;n++)ticks.append(make("span","",String(n)));
    const lower=make("input"),upper=make("input");for(const [field,label] of [[lower,"最低预期绩点"],[upper,"最高预期绩点"]]){field.type="range";field.min="0";field.max="5";field.step="0.1";field.setAttribute("aria-label",label);track.append(field);}
    values.minimum=c.minimum??d.floor;values.maximum=c.maximum??G.bands(c.grading).at(-1)?.value??5;
    function rangeChanged(which,value){const max=G.bands(values.grading).at(-1)?.value??5;if(which==="minimum")values.minimum=Math.min(values.maximum,Math.max(d.floor,value));else values.maximum=Math.max(values.minimum,Math.min(max,value));drawRange();}
    function drawRange(){limits.hidden=values.grading==="passFail";lower.value=values.minimum;upper.value=values.maximum;lower.setAttribute("aria-valuetext",fmt(values.minimum));upper.setAttribute("aria-valuetext",fmt(values.maximum));lowText.textContent=`最低 ${fmt(values.minimum)}`;highText.textContent=`最高 ${fmt(values.maximum)}`;track.style.setProperty("--range-start",`${values.minimum*20}%`);track.style.setProperty("--range-end",`${values.maximum*20}%`);try{const value=G.preferred({...c,...values},d.floor);estimate.textContent=`预计按 ${fmt(value)} 测算 · 全局保底 ${fmt(d.floor)}`;}catch(e){estimate.textContent=e.message;}}
    lower.addEventListener("input",()=>rangeChanged("minimum",Number(lower.value)));upper.addEventListener("input",()=>rangeChanged("maximum",Number(upper.value)));
    let rangeDrag=null;const dragValue=e=>Math.round(Math.max(0,Math.min(5,(e.clientX-track.getBoundingClientRect().left)/track.clientWidth*5))*10)/10;
    track.addEventListener("pointerdown",e=>{if(e.target.matches("input"))return;e.preventDefault();const value=dragValue(e);rangeDrag=Math.abs(value-values.minimum)<=Math.abs(value-values.maximum)?"minimum":"maximum";track.setPointerCapture(e.pointerId);rangeChanged(rangeDrag,value);});track.addEventListener("pointermove",e=>{if(rangeDrag)rangeChanged(rangeDrag,dragValue(e));});for(const type of ["pointerup","pointercancel"])track.addEventListener(type,()=>rangeDrag=null);
    form.querySelector('select[aria-label="目标成绩制式"]').addEventListener("change",()=>{const max=G.bands(values.grading).at(-1)?.value??5;values.maximum=Math.min(max,values.maximum);values.minimum=Math.min(values.minimum,values.maximum);drawRange();});drawRange();form.append(limits,make("p","goal-field-help","调整两端选预期区间，按中间档测算；只改这一门，其他课程保持原目标。"));
    const feedback=make("p","goal-error"),save=make("button","goal-primary","保存课程设置");save.type="submit";form.append(feedback,save);form.addEventListener("submit",e=>{e.preventDefault();try{const effective={...c,...values};if(!Number.isFinite(effective.credits)||effective.credits<0||effective.credits>30)throw new Error("请填写这门课的真实学分");if(effective.minimum!==null&&effective.minimum<d.floor)throw new Error("这门课的最低绩点不能低于全局底线");G.limits(effective,d.floor);d.meta[c.id]={...d.meta[c.id],...values};if(effective.grading!=="passFail")d.assignments[c.id]=G.preferred(effective,d.floor);dirty=true;closeHomeworkSheet();calculate();persist();render();}catch(problem){feedback.textContent=problem.message;}});homeworkBody.append(form);
  }
  function apply(){
    if(!calculate())return;
    const before=store.applied;store.applied={termId:d.termId,type:d.type,threshold:d.threshold,target:d.target,floor:d.floor,source:d.source,coreMultiplier:d.coreMultiplier,assignments:clone(d.assignments),courses:data.courses.map(c=>({...c,important:c.grading!=="passFail"&&d.assignments[c.id]>=d.threshold})),savedAt:new Date().toISOString()};
    if(!persist()){store.applied=before;return;}dirty=false;sync();announce(calculation.reached?"课程目标已保存，重要课提醒已更新":"方案已保存；当前预计仍低于目标");render();
  }
  function removeApplied(){openHomeworkSheet("停用课程目标提醒？",document.activeElement);homeworkBody.append(make("p","goal-instruction","保留目标草稿，停用上课和作业优先提醒。已挂出的作业不会取下，手动日期不会改变。"),action("确认停用",()=>{const old=store.applied;store.applied=null;if(!persist()){store.applied=old;return;}closeHomeworkSheet();sync();render();},"goal-primary"));}
  function queueOptions(){const a=store.applied;if(!a)return {};const t=FolioCourses.semesters.find(t=>t.id===a.termId),parts=t?.calendar?.periods||[],start=parts.map(p=>p.start).sort()[0],end=parts.map(p=>p.end).sort().at(-1);return {importantCourses:a.courses.filter(c=>c.important).map(c=>({id:c.id,title:c.title,termId:a.termId,start,end,requireTerm:!start||!end,allowTitle:a.courses.filter(p=>p.title===c.title).length===1}))};}
  function label(termId,id){const r=G.reminder(store,termId,id);return r?`目标 ${fmt(r.value)} · 这节课认真听`:null;}
  function sync(){commit();document.dispatchEvent(new Event("folio-goals-change"));}
  window.FolioGoalUI={queueOptions,label,courseTarget:(termId,id)=>{const a=store.applied;if(a?.termId!==termId)return null;const c=a.courses.find(c=>c.id===id),value=a.assignments[id];return c&&Number.isFinite(value)?{value,important:!!c.important}:null;},reminder:(termId,id)=>G.reminder(store,termId,id)};
  window.FolioGoalUI.overview=()=>{
    if(!localStorage.getItem(KEY))return null;
    const oldData=data;
    try{const model=makeInput(),result=d.phase==="setup"&&!Object.keys(d.assignments||{}).length?G.allocate(model):G.evaluate(model,G.preserveAssignments(model,d.assignments));
      return {target:d.target,projected:result.projected,type:d.type,label:types[d.type],termId:d.termId,example:d.source!=="academic",draft:dirty||!store.applied};
    }catch{return {target:d.target,projected:null,type:d.type,label:types[d.type],termId:d.termId,example:d.source!=="academic",draft:true};}
    finally{data=oldData;}
  };
  document.addEventListener("preview-screen-change",e=>{if(e.detail.screen==="goals")render();});
  document.addEventListener("folio-grade-visibility-change",()=>{if(currentScreen==="goals")render();});
  document.addEventListener("folio-school-change",()=>{if(currentScreen==="goals")render();});
  function checkMounts(){const count=homeworkState.items.filter(i=>i.mountedOn&&!i.completed).length,clock=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());FolioQueue.advance(homeworkState.items,homeworkState.today,clock);if(homeworkState.items.filter(i=>i.mountedOn&&!i.completed).length!==count)commit();}
  setInterval(checkMounts,60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkMounts();});
  render();if(store.applied)sync();
})();
