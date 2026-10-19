/* 页面内日期选择，不调用浏览器原生弹出窗口。 */
const FolioDate = (() => {
  function create(initial, onSelect, {clearable = false, fallback = "2026-10-14"} = {}) {
    let selected = initial;
    let month = (initial || fallback).slice(0,7);
    const root = document.createElement("div"); root.className = "date-calendar";
    root.setAttribute("role", "group"); root.setAttribute("aria-label", "日期选择器");
    const node = (tag, text, className) => { const element = document.createElement(tag); if (text) element.textContent = text; if (className) element.className = className; return element; };
    function button(text, name, handler, className) {
      const control = node("button",text,className); control.type = "button"; control.setAttribute("aria-label", name); control.addEventListener("click", handler); return control;
    }
    function render(focusNavigation) {
      root.replaceChildren();
      const start = new Date(`${month}-01T00:00:00Z`);
      const year = start.getUTCFullYear(), number = start.getUTCMonth();
      const header = node("div", null, "calendar-month");
      const change = offset => {
        const date = new Date(Date.UTC(year,number+offset,1)); month = date.toISOString().slice(0,7); render(offset);
      };
      const previous = button("‹", "上个月", () => change(-1), "calendar-nav");
      const next = button("›", "下个月", () => change(1), "calendar-nav");
      header.append(previous,node("p",`${year} 年 ${number+1} 月`),next);
      const week = node("div",null,"calendar-week");
      ["一","二","三","四","五","六","日"].forEach(day => week.append(node("span",day)));
      const grid = node("div",null,"calendar-days");
      const offset = (start.getUTCDay()+6)%7;
      const total = new Date(Date.UTC(year,number+1,0)).getUTCDate();
      for (let cell=0;cell<Math.ceil((offset+total)/7)*7;cell++) {
        const day = cell-offset+1;
        if (day<1 || day>total) { grid.append(node("span",null,"calendar-blank")); continue; }
        const iso = `${month}-${String(day).padStart(2,"0")}`;
        const control = button(String(day),`${year}年${number+1}月${day}日`,() => { selected=iso; onSelect(iso); },"calendar-day");
        control.setAttribute("aria-pressed",String(iso===selected)); grid.append(control);
      }
      root.append(header,week,grid);
      if (clearable) root.append(button("清除日期","清除日期",() => { selected=""; onSelect(""); },"text-action"));
      if (focusNavigation) (focusNavigation<0 ? previous : next).focus({preventScroll:true});
    }
    render();
    return {element:root, setValue(value) {selected=value; month=(value||fallback).slice(0,7); render();}};
  }
  return {create};
})();
