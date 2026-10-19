/* 设置子页的静态样例与表单弹层。所有输入和提交均禁用。 */
const mappingScreen = document.getElementById("mapping-screen");
previewScreens.mapping = mappingScreen;
screenNames.mapping = "课程代码映射";
screenFocusTargets.mapping = mappingScreen.querySelector("[data-back-settings]");

previewScreens.ecard = document.getElementById("ecard-screen");
screenNames.ecard = "校园卡付款码";
screenFocusTargets.ecard = previewScreens.ecard.querySelector("[data-back-settings]");

previewScreens.about = document.getElementById("about-screen");
screenNames.about = "关于与致谢";
screenFocusTargets.about = previewScreens.about.querySelector("[data-back-settings]");
document.getElementById("settings-about").addEventListener("click", () => showPreviewScreen("about"));

document.querySelectorAll("[data-back-settings]").forEach((button) => {
  button.addEventListener("click", () => goBack("settings"));
});

const sheetLayer = document.getElementById("preview-sheet-layer");
const sheetClose = document.getElementById("sheet-close");
const sheetCancel = document.getElementById("sheet-cancel");
let sheetOrigin = null;
let previewCloseTimer=null;

function openPreviewSheet({ title, fields, submit = "保存" }, origin) {
  clearTimeout(previewCloseTimer);sheetLayer.classList.remove("is-closing");
  sheetOrigin = origin;
  const container = document.getElementById("preview-sheet-fields");
  container.replaceChildren();
  document.getElementById("preview-sheet-title").textContent = title;
  document.getElementById("sheet-submit").textContent = submit;
  fields.forEach((field, index) => {
    const label = document.createElement("label");
    label.className = "preview-field";
    const caption = document.createElement("span");
    caption.textContent = field.label;
    const input = document.createElement("input");
    input.id = `preview-field-${index}`;
    input.type = field.type || "text";
    input.disabled = true;
    input.placeholder = field.placeholder || "";
    input.value = field.value || "";
    label.htmlFor = input.id;
    label.append(caption, input);
    container.append(label);
  });
  previewScreens[currentScreen].inert = true;
  sheetLayer.hidden = false;
  sheetClose.focus({ preventScroll: true });
}

function closePreviewSheet(immediate=false) {
  clearTimeout(previewCloseTimer);if(sheetLayer.hidden)return;
  const finish=()=>{
  sheetLayer.hidden = true;
  sheetLayer.classList.remove("is-closing");
  previewScreens[currentScreen].inert = false;
  if (sheetOrigin && sheetOrigin.isConnected) sheetOrigin.focus({ preventScroll: true });
  };
  if(immediate===true||matchMedia("(prefers-reduced-motion: reduce)").matches)finish();else{sheetLayer.classList.add("is-closing");previewCloseTimer=setTimeout(finish,180);}
}
document.addEventListener("preview-screen-change",()=>closePreviewSheet(true));

document.getElementById("sheet-shade").addEventListener("click", closePreviewSheet);
sheetClose.addEventListener("click", closePreviewSheet);
sheetCancel.addEventListener("click", closePreviewSheet);

// 在捕获阶段处理 Esc，避免同时关闭弹层并退出其父页面。
document.addEventListener("keydown", (event) => {
  if (sheetLayer.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closePreviewSheet();
  } else if (event.key === "Tab") {
    const next = document.activeElement === sheetClose ? sheetCancel : sheetClose;
    event.preventDefault();
    next.focus();
  }
}, true);

const loginPreview = document.getElementById("preview-login");
loginPreview.addEventListener("click", () => openPreviewSheet({
  title: "统一身份认证登录",
  submit: "登录",
  fields: [
    { label: "学号", placeholder: "统一身份认证学号" },
    { label: "密码", type: "password", placeholder: "统一身份认证密码" },
  ],
}, loginPreview));

const addMapping = document.getElementById("add-mapping");
addMapping.addEventListener("click", () => openPreviewSheet({
  title: "添加新的映射关系",
  fields: [
    { label: "原课号", placeholder: "原课程代码" },
    { label: "新课号", placeholder: "新课程代码" },
    { label: "备注名", placeholder: "便于辨认的课程名称" },
  ],
}, addMapping));
