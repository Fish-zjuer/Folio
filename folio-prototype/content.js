/* 示例文案、菜单与静态设置。不读取真实数据；作业交互在 homework.js。 */
const folioCopy = Object.freeze({
  appName: "Folio",
  greeting: "下午好",
  nextClass: "下一节课：30 分钟后",
  classroom: "东 1－302",
  placeholder: "与 Folio 对话…",
  model: "AI 助手",
});

document.querySelectorAll("[data-copy]").forEach((element) => {
  const value = folioCopy[element.dataset.copy];
  if (typeof value === "string") element.textContent = value;
});

document.title = `${folioCopy.appName} · 首页`;
document.querySelector(".course-strip").setAttribute(
  "aria-label",
  `${folioCopy.nextClass}，${folioCopy.classroom}（示例，仅视觉预览）`,
);

// source 是对应的 Flutter 源码入口，供后续移植核对，不显示在产品界面里。
const folioNavigation = Object.freeze({
  primary: [
    { id: "workbench", label: "工作台", icon: "grid", source: "Folio 自定义 2×2 工作台" },
    { id: "calendar", label: "日程", icon: "calendar", source: "lib/page/calendar/calendar_view.dart" },
    { id: "tasks", label: "待办", icon: "check", source: "lib/page/task/task_view.dart" },
    { id: "scholar", label: "学业", icon: "graduation", source: "lib/page/scholar/scholar_view.dart" },
  ],
  study: [
    { id: "courses", label: "课程", icon: "book", source: "lib/page/scholar/course_list/course_list_view.dart" },
    { id: "exams", label: "考试", icon: "clipboard", source: "lib/page/scholar/exam_list/exam_list_view.dart" },
    { id: "grades", label: "成绩", icon: "chart", source: "lib/page/scholar/grade_detail/grade_detail_view.dart" },
    { id: "goals", label: "目标", icon: "star", source: "Folio 目标均绩与课程分配" },
    { id: "homework", label: "作业", icon: "pencil", source: "lib/page/scholar/scholar_view.dart" },
  ],
});

const folioIcons = Object.freeze({
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M13 14h2M7 17h2"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m7.5 12 3 3 6-6"/>',
  graduation: '<path d="m2 9 10-5 10 5-10 5-10-5ZM6 11v6c4 3 8 3 12 0v-6M22 9v7"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M15 9v12M3 15h18"/>',
  book: '<path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1ZM12 6v14"/>',
  clipboard: '<rect x="5" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1.5"/><path d="M9 12h6M9 16h4"/>',
  chart: '<path d="M4 4v16h16M9 16v-4M14 16V8M19 16V5"/>',
  pencil: '<path d="m4 16 11-11a2.8 2.8 0 0 1 4 4L8 20l-5 1 1-5ZM13 7l4 4"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  rest: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8ZM16 9h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2"/>',
  sliders: '<path d="M5 3v5M5 12v9M12 3v10M12 17v4M19 3v2M19 9v12"/><circle cx="5" cy="10" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="19" cy="7" r="2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M20 10a8 8 0 0 0-14-4L3 9M3 4v5h5M4 14a8 8 0 0 0 14 4l3-3M21 20v-5h-5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9 21h6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  moon: '<path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h18M17 12h4v5h-4a2.5 2.5 0 0 1 0-5Z"/>',
  code: '<path d="m7 7-5 5 5 5M17 7l5 5-5 5M14 3l-4 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/>',
});

// 数值来自原仓库 DatabaseHelper 的默认值；仅用于静态视觉展示。
const folioSettings = Object.freeze([
  { title: "教务与提醒", items: [
    { title: "重修绩点计算", icon: "chart", segments: ["取首次", "取最高"], selected: 1 },
    { title: "隐藏成绩与绩点", icon: "eye", subtitle: "所有学期 · 包含已揭晓成绩", on: false, setting: "hide-grades" },
    { title: "自定义课程代码映射", icon: "code", screen: "mapping" },
    { title: "推送成绩变动", icon: "bell", on: true },
    { title: "作业临期提示", icon: "clipboard", subtitle: "App 内 · 截止前两天", on: true },
  ] },
  { title: "日程与课表", items: [
    { title: "课表导出选项", icon: "grid", subtitle: "选择学期与考试" },
    { title: "导出为 iCal 文件", icon: "download" },
  ] },
  { title: "外观与工具", items: [
    { title: "颜色模式", icon: "moon", subtitle: "跟随系统" },
    { title: "进度形象", icon: "pencil", subtitle: "预设或自己画", screen: "pixel" },
    { title: "校园卡付款码", icon: "wallet", screen: "ecard" },
  ] },
  { title: "诊断与测试", items: [
    { title: "测试日志", icon: "code", subtitle: "查看、复制或导出脱敏 TXT" },
  ] },
  { title: "关于", items: [
    { title: "关于 Folio", icon: "info", subtitle: "基于 Celechron", screen: "about" },
    { title: "服务条款", icon: "shield" },
    { title: "原项目网站", icon: "book" },
  ] },
]);

function renderSettings() {
  const container = document.getElementById("settings-groups");
  folioSettings.forEach((group, groupIndex) => {
    const section = document.createElement("section");
    section.className = "settings-section";
    const title = document.createElement("h2");
    title.className = "settings-section-title";
    title.id = `settings-section-${groupIndex}`;
    title.textContent = group.title;
    section.setAttribute("aria-labelledby", title.id);
    const list = document.createElement("ul");
    list.className = "settings-group";
    group.items.forEach((entry) => {
      const item = document.createElement("li");
      const row = document.createElement(entry.segments ? "div" : "button");
      if (!entry.segments) { row.type = "button"; row.disabled = !entry.screen && !entry.setting; }
      row.className = "setting-row";
      const value = typeof entry.on === "boolean" ? (entry.on ? "开启" : "关闭") : entry.segments ? entry.segments[entry.selected] : entry.value || entry.subtitle || "";
      row.setAttribute("aria-label", `${entry.title}${value ? `，${value}` : ""}${entry.screen ? "，查看页面" : "（视觉示例）"}`);
      if (entry.segments) row.setAttribute("aria-label",entry.title);
      if (entry.screen) row.addEventListener("click", () => showPreviewScreen(entry.screen));
      if (entry.setting) {
        row.dataset.setting = entry.setting;
        row.setAttribute("role", "switch");
        row.setAttribute("aria-label", entry.title);
        row.setAttribute("aria-checked", "false");
        row.addEventListener("click", () => document.dispatchEvent(new Event("folio-toggle-grade-privacy")));
      }
      row.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${folioIcons[entry.icon]}</svg>`;
      const label = document.createElement("span");
      label.className = "setting-label";
      const name = document.createElement("span");
      name.className = "setting-title";
      name.textContent = entry.title;
      label.append(name);
      if (entry.subtitle) {
        const subtitle = document.createElement("span");
        subtitle.className = "setting-subtitle";
        subtitle.textContent = entry.subtitle;
        label.append(subtitle);
      }
      row.append(label);
      if (typeof entry.on === "boolean") {
        const toggle = document.createElement("span");
        toggle.className = `setting-switch${entry.on ? " is-on" : ""}`;
        toggle.setAttribute("aria-hidden", "true");
        row.append(toggle);
      } else if (entry.segments) {
        const segments = document.createElement("span");
        segments.className = "setting-segments";
        segments.setAttribute("role", "group");
        segments.setAttribute("aria-label", entry.title);
        entry.segments.forEach((text, index) => {
          const option = document.createElement("button");
          option.type = "button";
          option.dataset.retakeMode = index === 0 ? "first" : "highest";
          option.textContent = text;
          if (index === entry.selected) option.className = "is-selected";
          option.addEventListener("click", () => document.dispatchEvent(new CustomEvent("folio-retake-change", { detail: { mode: option.dataset.retakeMode } })));
          segments.append(option);
        });
        row.append(segments);
      } else if (entry.value) {
        const valueElement = document.createElement("span");
        valueElement.className = "setting-value";
        valueElement.textContent = entry.value;
        row.append(valueElement);
      }
      item.append(row);
      list.append(item);
    });
    section.append(title, list);
    container.append(section);
  });
}

function renderMenu(containerId, entries) {
  const container = document.getElementById(containerId);
  entries.forEach((entry) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const available = ["workbench", "calendar", "homework", "tasks", "courses", "exams", "scholar", "grades", "goals"].includes(entry.id);
    button.disabled = !available;
    button.className = "menu-entry";
    button.dataset.feature = entry.id;
    button.setAttribute("aria-label", available ? `打开${entry.label}页` : `${entry.label}（功能页待制作）`);
    if (available) button.addEventListener("click", () => showPreviewScreen(entry.id));
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${folioIcons[entry.icon]}</svg>`;
    const label = document.createElement("span");
    label.textContent = entry.label;
    button.append(label);
    item.append(button);
    container.append(item);
  });
}

renderMenu("primary-menu", folioNavigation.primary);
renderMenu("study-menu", folioNavigation.study);
renderSettings();

const homeScreen = document.getElementById("home-screen");
const functionMenu = document.getElementById("function-menu");
const openMenu = document.getElementById("open-menu");
const closeMenu = document.getElementById("close-menu");
const newChat = document.getElementById("new-chat");
const settingsScreen = document.getElementById("settings-screen");
const openSettings = document.getElementById("open-settings");
const settingsMenu = document.getElementById("settings-menu");
const previewScreens = { home: homeScreen, menu: functionMenu, settings: settingsScreen };
const screenNames = { home: "首页", menu: "功能菜单", settings: "设置" };
const screenFocusTargets = { home: openMenu, menu: closeMenu, settings: settingsMenu };
let currentScreen = "home";
const screenHistory = [];

function showPreviewScreen(screen, options = {}) {
  if (!previewScreens[screen]) return;
  const previous = currentScreen;
  if (screen === "home") screenHistory.length = 0;
  else if (!options.back && !options.rail && screen !== previous && previous) {
    const ancestor = screenHistory.lastIndexOf(screen);
    if (ancestor >= 0) screenHistory.splice(ancestor);
    else screenHistory.push(previous);
  }
  if (options.focus === false) document.activeElement?.blur();
  Object.entries(previewScreens).forEach(([key, view]) => { view.hidden = key !== screen; });
  currentScreen = screen;
  openMenu.setAttribute("aria-expanded", String(screen === "menu"));
  document.title = `${folioCopy.appName} · ${screenNames[screen]}`;
  document.querySelector(".phone").setAttribute("aria-label", screenNames[screen]);
  const focusTarget = screenFocusTargets[screen];
  if (options.focus !== false) focusTarget?.focus({ preventScroll: true });
  document.dispatchEvent(new CustomEvent("preview-screen-change", {detail: {screen, focus: options.focus !== false}}));
}

function goBack(fallback = "menu") {
  const target = screenHistory.pop() || (currentScreen === "menu" ? "home" : fallback);
  showPreviewScreen(target, { back: true });
}

openMenu.addEventListener("click", () => showPreviewScreen("menu"));
closeMenu.addEventListener("click", () => showPreviewScreen("home"));
newChat.addEventListener("click", () => showPreviewScreen("home"));
openSettings.addEventListener("click", () => showPreviewScreen("settings"));
settingsMenu.addEventListener("click", () => goBack("menu"));
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented) return;
  if (event.key === "Escape" && currentScreen !== "home") {
    goBack("menu");
  }
});
