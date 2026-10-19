/* 固定 16×16 像素数据；透明格为 null，课程卡片统一显示为 24×24。 */
(function(root) {
  "use strict";
  const SIZE=16,DISPLAY_SIZE=24,STORAGE_KEY="folio-pixel-avatar-v1";
  function picture(id,name,paint) {
    const pixels=Array(SIZE*SIZE).fill(null);
    const rect=(x,y,w,h,color)=>{for(let row=y;row<y+h;row++) for(let col=x;col<x+w;col++) pixels[row*SIZE+col]=color;};
    paint(rect);
    return Object.freeze({id,name,size:SIZE,pixels:Object.freeze(pixels)});
  }
  const ink="#37352F",paper="#F1E6CF",orange="#C97963",gray="#B0AEA5";
  const presets=Object.freeze([
    picture("book","小书本",r=>{
      // 仅参考书本造型，全部笔画落在标准 16×16 整格内。
      const cover="#A85E47",fold="#D1B58D",ribbon="#983C2E";
      r(0,2,16,10,cover);r(1,1,14,12,cover);
      r(2,0,5,1,cover);r(8,0,7,1,cover);
      r(1,2,14,9,paper);r(2,1,12,1,paper);
      r(7,1,1,10,fold);r(8,1,1,10,"#E2CCAA");
      r(1,11,14,1,"#D6CCB8");r(7,11,1,1,fold);
      r(2,3,4,1,"#B99A72");r(2,5,4,1,"#B99A72");r(2,7,3,1,"#B99A72");
      // 书签从右页下沿垂出，最后一格留燕尾缺口。
      r(11,11,3,4,ribbon);r(11,15,1,1,ribbon);r(13,15,1,1,ribbon);
    }),
    picture("cat","小猫",r=>{r(4,3,3,3,orange);r(9,3,3,3,orange);r(4,6,8,7,orange);r(5,7,2,2,ink);r(9,7,2,2,ink);r(4,13,3,2,orange);r(9,13,3,2,orange);r(12,10,2,3,orange);}),
    picture("rabbit","小兔",r=>{r(4,1,3,5,gray);r(9,1,3,5,gray);r(3,6,10,7,gray);r(4,8,2,2,ink);r(10,8,2,2,ink);r(4,13,3,2,gray);r(9,13,3,2,gray);}),
    picture("bear","小熊",r=>{r(3,2,3,3,"#B88A62");r(10,2,3,3,"#B88A62");r(3,5,10,8,"#B88A62");r(5,6,2,2,ink);r(9,6,2,2,ink);r(6,9,4,2,paper);r(4,13,3,2,"#B88A62");r(9,13,3,2,"#B88A62");}),
    picture("football","小足球",r=>{r(5,1,6,14,paper);r(3,3,10,10,paper);r(1,5,14,6,paper);r(6,6,4,4,ink);r(5,1,3,2,ink);r(11,3,2,3,ink);r(1,7,2,3,ink);r(5,13,3,2,ink);r(12,10,2,2,ink);}),
  ]);
  function clone(avatar) {return {...avatar,pixels:[...avatar.pixels]};}
  function blank() {return {id:"custom",name:"自定义",size:SIZE,pixels:Array(SIZE*SIZE).fill(null)};}
  function normalize(value) {
    if(!value||value.size!==SIZE||!Array.isArray(value.pixels)||value.pixels.length!==SIZE*SIZE
      ||value.pixels.some(color=>color!==null&&(typeof color!=="string"||!/^#[0-9a-f]{6}$/i.test(color)))) return null;
    return {id:typeof value.id==="string" ? value.id : "custom",name:typeof value.name==="string" ? value.name.slice(0,30) : "自定义",size:SIZE,
      pixels:value.pixels.map(color=>color?.toUpperCase()||null)};
  }
  function read(raw) {
    try {const saved=JSON.parse(raw);if(saved?.version===1) {const active=normalize(saved.active);if(active) return {version:1,active,custom:normalize(saved.custom)};}} catch {}
    return {version:1,active:clone(presets[0]),custom:null};
  }
  function svg(avatar) {
    const ns="http://www.w3.org/2000/svg",image=document.createElementNS(ns,"svg");
    image.setAttribute("viewBox",`0 0 ${SIZE} ${SIZE}`);image.setAttribute("aria-hidden","true");
    image.style.stroke="none";image.style.shapeRendering="crispEdges";
    avatar.pixels.forEach((color,index)=>{if(!color) return;const cell=document.createElementNS(ns,"rect");
      cell.setAttribute("x",String(index%SIZE));cell.setAttribute("y",String(Math.floor(index/SIZE)));
      cell.setAttribute("width","1");cell.setAttribute("height","1");cell.setAttribute("fill",color);image.append(cell);});
    return image;
  }
  const api={SIZE,DISPLAY_SIZE,STORAGE_KEY,presets,clone,blank,normalize,read,svg};
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  else root.FolioPixels=api;
})(typeof globalThis==="undefined" ? this : globalThis);
