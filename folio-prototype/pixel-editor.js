/* 浏览器本地编辑：草稿和已应用形象分开，返回不会覆盖已保存的图案。 */
const pixelScreen=document.getElementById("pixel-screen"),pixelCanvas=document.getElementById("pixel-canvas");
const pixelContext=pixelCanvas.getContext("2d"),pixelBack=document.getElementById("pixel-back");
previewScreens.pixel=pixelScreen;screenNames.pixel="像素形象";screenFocusTargets.pixel=pixelBack;
let pixelSaved;
try {pixelSaved=FolioPixels.read(localStorage.getItem(FolioPixels.STORAGE_KEY));} catch {pixelSaved=FolioPixels.read(null);}
window.FolioAvatar={active:pixelSaved.active};
let pixelDraft=FolioPixels.clone(pixelSaved.active),pixelColor="#C97963",pixelTool="pencil";
let pixelUndo=[],pixelRedo=[],pixelPointer=null,pixelLast=null,pixelCursor={x:0,y:0};
let pixelReturn="settings",pixelPrevious="home";
const pixelFeedback=document.getElementById("pixel-feedback");
const pixelColors=["#C97963","#D97757","#D4A359","#8A9C71","#6A9BCC","#7F83AE","#B88A62","#B0AEA5","#37352F","#F1E6CF","#FFFFFF","#B84A39"];
function pixelRenderCanvas() {
  pixelContext.clearRect(0,0,256,256);
  for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
    pixelContext.fillStyle=pixelDraft.pixels[y*16+x]||((x+y)%2 ? "#F5F3ED" : "#FFFFFF");
    pixelContext.fillRect(x*16,y*16,16,16);
  }
  pixelContext.strokeStyle="#E5E2D8";pixelContext.lineWidth=.5;pixelContext.beginPath();
  for(let i=0;i<=16;i++) {pixelContext.moveTo(i*16,0);pixelContext.lineTo(i*16,256);pixelContext.moveTo(0,i*16);pixelContext.lineTo(256,i*16);}
  pixelContext.stroke();
  if(document.activeElement===pixelCanvas) {pixelContext.strokeStyle="#37352F";pixelContext.lineWidth=1.5;pixelContext.strokeRect(pixelCursor.x*16+1,pixelCursor.y*16+1,14,14);}
}
function pixelRender() {
  pixelRenderCanvas();
  document.getElementById("pixel-miniature").replaceChildren(FolioPixels.svg(pixelDraft));
  document.getElementById("pixel-name").textContent=pixelDraft.name;
  document.getElementById("pixel-undo").disabled=!pixelUndo.length;
  document.getElementById("pixel-redo").disabled=!pixelRedo.length;
  document.getElementById("pixel-apply").disabled=!pixelDraft.pixels.some(Boolean);
  document.querySelectorAll("[data-pixel-preset]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.pixelPreset===pixelDraft.id)));
}
function pixelCheckpoint() {pixelUndo.push(FolioPixels.clone(pixelDraft));if(pixelUndo.length>50) pixelUndo.shift();pixelRedo=[];}
function pixelChoose(avatar) {pixelCheckpoint();pixelDraft=FolioPixels.clone(avatar);pixelFeedback.textContent="可以继续修改，满意后点击应用。";pixelRender();}
function pixelSetTool(tool) {
  pixelTool=tool;
  document.getElementById("pixel-pencil").setAttribute("aria-pressed",String(tool==="pencil"));
  document.getElementById("pixel-eraser").setAttribute("aria-pressed",String(tool==="eraser"));
}
function pixelSetColor(color) {
  if(!/^#[0-9a-f]{6}$/i.test(color)) return false;
  pixelColor=color.toUpperCase();pixelSetTool("pencil");
  document.getElementById("pixel-color").value=pixelColor;
  document.getElementById("pixel-hex").value=pixelColor;
  document.querySelectorAll("[data-pixel-color]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.pixelColor===pixelColor)));
  pixelFeedback.textContent="拖动画笔可连续绘制；透明格不会遮住课程卡片。";return true;
}
function pixelPaint(x,y) {
  const color=pixelTool==="eraser" ? null : pixelColor,index=y*16+x;
  if(pixelDraft.pixels[index]===color) return;
  pixelDraft.pixels[index]=color;pixelDraft.id="custom";pixelDraft.name="自定义";
}
function pixelLine(from,to) {
  let x=from.x,y=from.y,dx=Math.abs(to.x-x),dy=-Math.abs(to.y-y),sx=x<to.x ? 1 : -1,sy=y<to.y ? 1 : -1,error=dx+dy;
  while(true) {pixelPaint(x,y);if(x===to.x&&y===to.y) break;const twice=2*error;if(twice>=dy) {error+=dy;x+=sx;}if(twice<=dx) {error+=dx;y+=sy;}}
}
function pixelCell(event) {
  const bounds=pixelCanvas.getBoundingClientRect(),x=Math.floor((event.clientX-bounds.left)/bounds.width*16),y=Math.floor((event.clientY-bounds.top)/bounds.height*16);
  return x>=0&&x<16&&y>=0&&y<16 ? {x,y} : null;
}
pixelCanvas.addEventListener("pointerdown",event=>{
  if(event.button!==0||pixelPointer!==null) return;
  const cell=pixelCell(event);if(!cell) return;
  event.preventDefault();pixelCanvas.focus({preventScroll:true});pixelCheckpoint();
  pixelPointer=event.pointerId;pixelCanvas.setPointerCapture(event.pointerId);pixelLast=cell;pixelCursor=cell;pixelPaint(cell.x,cell.y);pixelRender();
});
pixelCanvas.addEventListener("pointermove",event=>{
  if(event.pointerId!==pixelPointer) return;
  const cell=pixelCell(event);if(!cell) {pixelLast=null;return;}
  pixelLine(pixelLast||cell,cell);pixelLast=cell;pixelCursor=cell;pixelRender();
});
function pixelEndStroke(event) {if(event.pointerId!==pixelPointer) return;pixelPointer=null;pixelLast=null;}
pixelCanvas.addEventListener("pointerup",pixelEndStroke);pixelCanvas.addEventListener("pointercancel",pixelEndStroke);pixelCanvas.addEventListener("lostpointercapture",pixelEndStroke);
pixelCanvas.addEventListener("focus",pixelRenderCanvas);pixelCanvas.addEventListener("blur",pixelRenderCanvas);
pixelCanvas.addEventListener("keydown",event=>{
  const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(move) {event.preventDefault();pixelCursor={x:Math.max(0,Math.min(15,pixelCursor.x+move[0])),y:Math.max(0,Math.min(15,pixelCursor.y+move[1]))};pixelRenderCanvas();}
  else if(event.key===" "||event.key==="Enter") {event.preventDefault();pixelCheckpoint();pixelPaint(pixelCursor.x,pixelCursor.y);pixelRender();}
});
FolioPixels.presets.forEach(preset=>{
  const button=action("",()=>pixelChoose(preset),"pixel-preset");button.dataset.pixelPreset=preset.id;button.setAttribute("aria-label",`选择${preset.name}预设`);
  button.append(FolioPixels.svg(preset),make("span","",preset.name));document.getElementById("pixel-presets").append(button);
});
const pixelCustom=action("",()=>pixelChoose(pixelSaved.custom||FolioPixels.blank()),"pixel-preset");
pixelCustom.dataset.pixelPreset="custom";pixelCustom.setAttribute("aria-label","选择自定义形象");
pixelCustom.append(make("span","pixel-custom-symbol","+"),make("span","","自定义"));document.getElementById("pixel-presets").append(pixelCustom);
pixelColors.forEach(color=>{
  const button=action("",()=>pixelSetColor(color),"pixel-swatch");button.dataset.pixelColor=color;button.setAttribute("aria-label",`画笔颜色 ${color}`);
  const circle=make("span");circle.style.backgroundColor=color;button.append(circle);document.getElementById("pixel-palette").append(button);
});
document.getElementById("pixel-color").addEventListener("input",event=>pixelSetColor(event.target.value));
document.getElementById("pixel-hex").addEventListener("input",event=>{if(/^#[0-9a-f]{6}$/i.test(event.target.value)) pixelSetColor(event.target.value);});
document.getElementById("pixel-hex").addEventListener("change",event=>{if(!pixelSetColor(event.target.value)) {pixelFeedback.textContent="请输入六位色值，例如 #D97757。";event.target.value=pixelColor;}});
document.getElementById("pixel-pencil").addEventListener("click",()=>pixelSetTool("pencil"));
document.getElementById("pixel-eraser").addEventListener("click",()=>pixelSetTool("eraser"));
document.getElementById("pixel-clear").addEventListener("click",()=>pixelChoose(FolioPixels.blank()));
document.getElementById("pixel-undo").addEventListener("click",()=>{if(!pixelUndo.length) return;pixelRedo.push(FolioPixels.clone(pixelDraft));pixelDraft=pixelUndo.pop();pixelRender();});
document.getElementById("pixel-redo").addEventListener("click",()=>{if(!pixelRedo.length) return;pixelUndo.push(FolioPixels.clone(pixelDraft));pixelDraft=pixelRedo.pop();pixelRender();});
pixelBack.addEventListener("click",()=>goBack(pixelReturn));
document.getElementById("pixel-apply").addEventListener("click",()=>{
  if(!pixelDraft.pixels.some(Boolean)) return;
  const active=FolioPixels.normalize(pixelDraft),saved={version:1,active,custom:active.id==="custom" ? FolioPixels.clone(active) : pixelSaved.custom};
  try {localStorage.setItem(FolioPixels.STORAGE_KEY,JSON.stringify(saved));} catch {pixelFeedback.textContent="保存失败，请检查浏览器的本地存储空间。";return;}
  pixelSaved=saved;window.FolioAvatar.active=active;
  document.dispatchEvent(new CustomEvent("folio-avatar-change"));showPreviewScreen(pixelReturn);
});
document.addEventListener("preview-screen-change",event=>{
  if(event.detail.screen==="pixel") {
    pixelReturn=pixelPrevious==="calendar" ? "calendar" : "settings";
    pixelDraft=FolioPixels.clone(pixelSaved.active);pixelUndo=[];pixelRedo=[];pixelPointer=null;pixelLast=null;
    pixelFeedback.textContent="选择预设，或直接画一个自己的形象。";pixelRender();pixelScreen.querySelector(".pixel-scroll").scrollTop=0;
  }
  pixelPrevious=event.detail.screen;
});
document.addEventListener("keydown",event=>{if(currentScreen==="pixel"&&event.key==="Escape") {event.preventDefault();showPreviewScreen(pixelReturn);}},true);
document.addEventListener("folio-avatar-change",()=>calendarAgenda.querySelectorAll(".has-course-progress").forEach(renderCalendarPet));
pixelSetColor(pixelColor);pixelRender();

/* Adjust horizontal lane spacing only; the avatar stays 24px and height is unchanged. */
(()=>{
  const key='folio-course-lane-gap-v1';let gap=18;
  try{const stored=Number(localStorage.getItem(key));if(Number.isInteger(stored)&&stored>=18&&stored<=28)gap=stored;}catch{}
  const box=make('section','progress-spacing-setting'),label=make('label','progress-spacing-label','路线间距'),value=make('output'),slider=make('input'),sample=make('div','progress-spacing-sample'),copy=make('span','','上课进度'),art=make('span','progress-spacing-art'),reset=make('button','progress-spacing-reset','恢复默认');
  label.htmlFor='progress-lane-gap';slider.id='progress-lane-gap';slider.type='range';slider.min='18';slider.max='28';slider.step='1';slider.value=String(gap);slider.setAttribute('aria-label','进度路线横向间距');value.htmlFor=slider.id;reset.type='button';
  label.append(value);sample.append(copy,art);box.append(label,sample,slider,reset);pixelScreen.querySelector('.pixel-scroll').prepend(box);
  function apply(next){gap=Math.max(18,Math.min(28,Math.round(next)));document.documentElement.style.setProperty('--width-course-pet',(gap*2+28)+'px');slider.value=String(gap);value.textContent=gap+'px';FolioSnakeProgress.render(art,.24,'#A7BCA8',{periods:2,duration:95});}
  function save(){try{localStorage.setItem(key,String(gap));}catch{announce('路线间距未保存，本次预览仍保留。');}}
  slider.addEventListener('input',()=>apply(Number(slider.value)));slider.addEventListener('change',save);reset.onclick=()=>{apply(18);save();};
  document.addEventListener('preview-screen-change',event=>{if(event.detail.screen==='pixel')requestAnimationFrame(()=>apply(gap));});document.addEventListener('folio-avatar-change',()=>apply(gap));
  window.FolioCourseProgress=Object.freeze({get gap(){return gap;}});apply(gap);
})();
