(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const STORAGE = 'folio-relationship-lab-v1';
  let host=null;
  if(new URLSearchParams(location.search).get('app')==='1'){try{if(parent!==window&&parent.location.origin===location.origin)host=parent.FolioRelationships;}catch{}if(!host){document.body.textContent='请从 Folio 内打开关系网';return;}}
  let viewRevision=0,writing=false,recovery=null,paused=false,editingId=null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lightPalette = {
    root: {fill:'#34283e', text:'#faf6ee', edge:'#7c6a88'},
    plum: {fill:'#c6bad0', text:'#54445f', edge:'#a996b5'},
    sage: {fill:'#b9c6b3', text:'#4c6350', edge:'#9aa992'},
    clay: {fill:'#d9bba8', text:'#815943', edge:'#c5a28a'},
    blue: {fill:'#b7c8ca', text:'#4b6468', edge:'#96b1b6'},
    gold: {fill:'#dfcc9f', text:'#897044', edge:'#c5ad7f'}
  };
  const darkPalette={root:{fill:'#b8a2c9',text:'#241f2b',edge:'#897198'},plum:{fill:'#65556f',text:'#e1cfe9',edge:'#8f759d'},sage:{fill:'#465b49',text:'#c4d8bc',edge:'#718a70'},clay:{fill:'#745342',text:'#edd0b7',edge:'#a17d66'},blue:{fill:'#435c62',text:'#c0d8dc',edge:'#6c8e96'},gold:{fill:'#6f5e3e',text:'#ead6aa',edge:'#a18c60'}};
  let palette=lightPalette;
  const seed = () => [
    {id:'self',parent:null,name:'自己',tone:'root',note:'从自己开始，添加人、地点、物品或事情作为子节点。'},
    {id:'dorm',parent:'self',name:'寝室',tone:'plum',note:'东西放哪儿，和谁住在一起。'},
    {id:'study',parent:'self',name:'课程',tone:'sage',note:''},
    {id:'people',parent:'self',name:'朋友',tone:'clay',note:''},
    {id:'life',parent:'self',name:'生活',tone:'blue',note:''},
    {id:'ideas',parent:'self',name:'念头',tone:'gold',note:''},
    {id:'roommate-1',parent:'dorm',name:'室友 1',note:'上次借给他的转接头，周末拿回来。'},
    {id:'roommate-2',parent:'dorm',name:'室友 2',note:'喜欢冷萃，不加糖。'},
    {id:'desk',parent:'dorm',name:'桌子',note:'常用的东西都在这里。'},
    {id:'display',parent:'desk',name:'显示器',note:'HDMI 线放在桌后收纳盒。'},
    {id:'charger',parent:'desk',name:'充电器',note:'65W，平时放左侧抽屉。'},
    {id:'headphones',parent:'desk',name:'耳机',note:''},
    {id:'control',parent:'study',name:'现代控制',note:'下次见老师，问一下状态观测器。'},
    {id:'ai',parent:'study',name:'机器学习',note:''},
    {id:'lab',parent:'control',name:'实验',note:'先确认实验室开放时间。'},
    {id:'project',parent:'ai',name:'小组项目',note:'想用自己拍的照片做一个小数据集。'},
    {id:'friend-1',parent:'people',name:'老朋友',note:'他说最近在学吉他。'},
    {id:'friend-2',parent:'people',name:'小组同学',note:''},
    {id:'gift',parent:'friend-1',name:'礼物',note:'那本他提过的书，还没问清书名。'},
    {id:'keys',parent:'life',name:'钥匙',note:'备用钥匙放在蓝色的小盒子里。'},
    {id:'trip',parent:'life',name:'出门',note:''},
    {id:'bag',parent:'trip',name:'背包',note:'出门前记得带转接头。'},
    {id:'book',parent:'ideas',name:'想读的书',note:''},
    {id:'weekend',parent:'ideas',name:'周末',note:'找一个能安静坐一下午的地方。'}
  ].map(n => ({expanded:true,dx:0,dy:0,...n}));
  const svg = $('map'), scene = $('scene');
  let items = [], nodes = [], byId = new Map(), selected = null;
  let width = innerWidth, height = innerHeight, raf = 0, lastFrame = 0;
  let pointers = new Map(), gesture = null, dragging = null, pressed = null;
  let noteTimer, toastTimer, dialogMode = 'add', storageOK = true;
  let camera = {x:width/2,y:height*.48,s:width<650?.9:1.1};
  let aim = {...camera}, cameraVelocity = {x:0,y:0};
  let familyIds = new Set(), familyPacking = 1, familyLayout = null;
  const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
  const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const make = (tag,attrs={}) => {const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
  const children = id => nodes.filter(n => n.data.parent===id);
  const subtree = id => {const result=[];const visit=n=>{result.push(n);children(n.data.id).forEach(visit);};const root=byId.get(id);if(root)visit(root);return result;};
  const labelAmount = (n,s=camera.s) => smooth(...(n.depth===0?[.42,.78]:[.59+n.depth*.45,.86+n.depth*.5]),s);
  const naturalRadius = (n,s) => Math.min(n.depth?49:54,(n.depth?8:19)*s+(n.depth?25:20)*labelAmount(n,s));
  const screenRadius = n => naturalRadius(n,camera.s)*(familyIds.has(n.data.id)?familyPacking:1);
  let pendingSave=Promise.resolve();
  function persist(){const task=pendingSave.then(persistNow);pendingSave=task.catch(()=>false);return task;}
  async function persistNow() {
    if(host){writing=true;try{const s=await host.replace(structuredClone(items),viewRevision);viewRevision=s.revision;storageOK=true;$('save-state').textContent='已保存在此设备';return true;}catch(e){storageOK=false;recoverNote();hydrate();toast(e.message+'；这次修改未覆盖原记录');return false;}finally{writing=false;}}
    try {localStorage.setItem(STORAGE,JSON.stringify({version:1,nodes:items}));storageOK=true;}
    catch {storageOK=false;toast('浏览器没有保存成功，请先保留这个页面');}
    $('save-state').textContent=storageOK?'已保存在此浏览器':'未能保存，请勿关闭页面';
    return storageOK;
  }
  function recoverNote(){if(editingId&&$('node-note').value){recovery={id:editingId,text:$('node-note').value};$('recover-note').hidden=false;}}
  function hydrate(){const s=host.read();items=s.nodes;viewRevision=s.revision;if(selected&&!items.some(n=>n.id===selected)){selected=null;$('inspector').hidden=true;$('resume').hidden=true;$('breadcrumb').replaceChildren();}rebuild();if(selected&&byId.has(selected))updateInspector();wake();}
  function load() {
    try {
      const saved=JSON.parse(localStorage.getItem(STORAGE));
      if(saved?.version===1 && Array.isArray(saved.nodes) && saved.nodes.length<=250) {
        const ids=new Set(), list=saved.nodes;
        for(const n of list) {
          if(!n || typeof n.id!=='string' || ids.has(n.id) || typeof n.name!=='string' || !n.name.trim() || n.name.length>24 || typeof n.note!=='string' || n.note.length>3000)throw Error('Invalid node');
          ids.add(n.id);
        }
        if(list[0]?.id!=='self' || list[0].parent!==null)throw Error('Invalid root');
        for(const n of list) {
          let p=n,seen=new Set();
          while(p.parent!==null) {if(seen.has(p.id))throw Error('Cycle');seen.add(p.id);p=list.find(v=>v.id===p.parent);if(!p)throw Error('Missing parent');}
          n.dx=Number.isFinite(n.dx)?clamp(n.dx,-2500,2500):0;n.dy=Number.isFinite(n.dy)?clamp(n.dy,-2500,2500):0;
          n.fx=Number.isFinite(n.fx)?clamp(n.fx,-10000,10000):0;n.fy=Number.isFinite(n.fy)?clamp(n.fy,-10000,10000):0;
          n.expanded=n.expanded!==false;
        }
        return list;
      }
    } catch {toast('已打开示例；原来的本地记录未覆盖');}
    return seed();
  }
  function rebuild() {
    const old=byId;nodes=[];byId=new Map();$('threads').replaceChildren();$('circles').replaceChildren();
    function visit(data,depth,tone,component) {
      const prev=old.get(data.id),color=palette[data.tone]||palette[tone]||palette.plum;
      const n={data,depth,color,component,tone:data.tone||tone,x:prev?.x||0,y:prev?.y||0,vx:0,vy:0,tx:0,ty:0,vis:prev?.vis||0,label:0,r:10,press:1,edgeParent:data.parent,link:prev?.edgeParent===data.parent?(prev.link??1):0};
      const g=make('g',{class:'network-node',role:'button',tabindex:'-1','data-id':data.id,'aria-label':data.name});
      n.hit=make('circle',{fill:'transparent','pointer-events':'all'});
      n.halo=make('circle',{class:'halo'});n.circle=make('circle',{class:'body',fill:color.fill});
      n.text=make('text',{class:'node-label',fill:color.text});n.dot=make('circle',{class:'note-dot',fill:color.text});
      n.fold=make('text',{class:'fold-mark',fill:color.text});n.fold.textContent='+';
      const title=make('title');title.textContent=data.name;
      g.append(n.hit,n.halo,n.circle,n.text,n.dot,n.fold,title);n.el=g;$('circles').append(g);
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectNode(n);}});
      if(data.parent) {n.path=make('path',{class:'network-thread',stroke:color.edge});$('threads').append(n.path);}
      nodes.push(n);byId.set(data.id,n);
      for(const child of items.filter(v=>v.parent===data.id))visit(child,depth+1,n.tone,component);
    }
    for(const root of items.filter(n=>n.parent===null))visit(root,root.id==='self'?0:1,root.id==='self'?'root':'plum',root.id);
    layout();updateLooseList();
    for(const n of nodes)if(!old.has(n.data.id)){const p=byId.get(n.data.parent);n.x=p?.x||0;n.y=p?.y||0;}
    wake();
  }
  function layout() {
    function place(n,a,b,depth,ox,oy,baseX=0,baseY=0) {
      const angle=(a+b)/2, radius=depth*112;
      n.ax=baseX+(depth?Math.cos(angle)*radius:0);n.ay=baseY+(depth?Math.sin(angle)*radius:0);
      n.tx=n.ax+ox+(n.data.dx||0);n.ty=n.ay+oy+(n.data.dy||0);
      const kids=children(n.data.id),gap=Math.min(.12,(b-a)*.05),span=(b-a)/Math.max(1,kids.length);
      const carry=n.component==='self'?.7:1;
      kids.forEach((k,i)=>place(k,a+i*span+gap,b-(kids.length-i-1)*span-gap,depth+1,ox+(n.data.dx||0)*carry,oy+(n.data.dy||0)*carry,baseX,baseY));
    }
    // Keep branches in their own wedges, even when folded.
    for(const root of nodes.filter(n=>n.data.parent===null))place(root,-Math.PI*1.06,Math.PI*.94,0,0,0,root.data.id==='self'?0:root.data.fx||0,root.data.id==='self'?0:root.data.fy||0);
    // Keep the branch facing away from the graph's center. Fit the family as a
    // whole in the free map area instead of rotating every branch upwards.
    familyIds=new Set();familyPacking=1;
    if(width<650 && selected && !$('inspector').hidden){
      const parent=byId.get(selected),kids=children(selected),s=focusScale(parent),center=byId.get('self'),space=focusSpace();
      familyIds=new Set([parent.data.id,...kids.map(k=>k.data.id)]);
      const dx=parent.tx-center.tx,dy=parent.ty-center.ty;
      let ideal=Math.hypot(dx,dy)>.01?Math.atan2(dy,dx):0;
      if(dragging&&familyLayout?.id===parent.data.id)ideal=familyLayout.axis;
      const bounds=(points,packing)=>{
        let l=-naturalRadius(parent,s)*packing,r=-l,t=l,b=r;
        for(const p of points){const radius=naturalRadius(p.node,s)*packing;l=Math.min(l,p.x-radius);r=Math.max(r,p.x+radius);t=Math.min(t,p.y-radius);b=Math.max(b,p.y+radius);}
        return {l,r,t,b};
      };
      const points=(axis,packing)=>kids.map((k,i)=>{
        const row=Math.floor(i/3),count=Math.min(3,kids.length-row*3),slot=i%3;
        const angle=parent.data.id==='self'?-Math.PI*1.06+(i+.5)*Math.PI*2/kids.length:axis+(count===1?0:count===2?(slot-.5)*.92:(slot-1)*.88);
        const radius=(parent.data.id==='self'?118:118+row*89)*packing;
        return {node:k,x:Math.cos(angle)*radius+(k.data.dx||0)*s,y:Math.sin(angle)*radius+(k.data.dy||0)*s};
      });
      let best;
      for(const turn of (dragging?[0]:[0,-.16,.16,-.32,.32])){
        const axis=ideal+turn,box=bounds(points(axis,1),1);
        const packing=clamp(Math.min((space.r-space.l)/(box.r-box.l),(space.b-space.t)/(box.b-box.t),1),.6,1);
        const score=(1-packing)*2+Math.abs(turn)*.13;
        if(!best||score<best.score)best={axis,packing,score};
      }
      // A drag translates the whole independent subtree without changing its fan.
      familyPacking=dragging&&familyLayout?.id===parent.data.id?familyLayout.packing:best.packing;
      familyLayout={id:parent.data.id,axis:best.axis,packing:familyPacking};
      for(const p of points(best.axis,familyPacking)){
        const k=p.node,nx=parent.tx+p.x/s,ny=parent.ty+p.y/s;
        const dx=nx-k.tx,dy=ny-k.ty;k.tx=nx;k.ty=ny;
        const shift=n=>{for(const child of children(n.data.id)){child.tx+=dx;child.ty+=dy;shift(child);}};shift(k);
      }
    }else familyLayout=null;
  }
  function wake(){if(!raf && !document.hidden&&!paused)raf=requestAnimationFrame(frame);}
  function frame(now) {
    raf=0;const dt=clamp((now-lastFrame)/16.67,.25,2);lastFrame=now;let motion=0;
    const ease=reduced?1:1-Math.pow(.8,dt);
    for(const k of ['x','y','s']){const d=aim[k]-camera[k];camera[k]+=d*ease;motion+=Math.abs(d)*(k==='s'?100:1);}
    if(!gesture && !dragging && Math.hypot(cameraVelocity.x,cameraVelocity.y)>.06) {
      aim.x+=cameraVelocity.x*dt;aim.y+=cameraVelocity.y*dt;
      cameraVelocity.x*=Math.pow(.83,dt);cameraVelocity.y*=Math.pow(.83,dt);motion+=1;
    }
    for(const n of nodes) {
      n.label=labelAmount(n);const p=byId.get(n.data.parent);
      // A parent's name arrives first; its next generation follows a little later.
      const gate=p?smooth(.92+p.depth*.5,1.11+p.depth*.5,camera.s):1;
      const desired=!p?1:p.vis*(p.data.expanded?gate:0);
      const target=p&&n.depth===1?(p.data.expanded?1:0):desired;
      const vd=target-n.vis;n.vis+=vd*(reduced?1:1-Math.pow(.78,dt));motion+=Math.abs(vd)*8;
      const pd=(pressed===n ? .93 : 1)-n.press;n.press+=pd*(reduced?1:1-Math.pow(.65,dt));motion+=Math.abs(pd)*4;
      const ld=1-n.link;n.link+=ld*(reduced?1:.14);motion+=Math.abs(ld)*3;
      n.r=screenRadius(n)/camera.s;
      if(n.vis<.006 && p){n.x=p.x;n.y=p.y;n.vx=n.vy=0;continue;}
      if(n!==dragging) {
        n.vx+=(n.tx-n.x)*.021*dt;n.vy+=(n.ty-n.y)*.021*dt;
        n.vx*=Math.pow(.76,dt);n.vy*=Math.pow(.76,dt);
      }
    }
    const active=nodes.filter(n=>n.vis>.05);
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++) {
      const a=active[i],b=active[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.1,min=a.r+b.r+17/camera.s;
      if(d<min){const f=(min-d)*.025*dt,nx=dx/d||.7,ny=dy/d||.7;if(a!==dragging){a.vx-=nx*f;a.vy-=ny*f;}if(b!==dragging){b.vx+=nx*f;b.vy+=ny*f;}}
    }
    for(const n of active)if(n!==dragging) {
      if(reduced){n.x=n.tx;n.y=n.ty;n.vx=n.vy=0;}
      else{n.x+=n.vx*dt;n.y+=n.vy*dt;}
      motion+=Math.abs(n.vx)+Math.abs(n.vy);
    }
    render(now);
    if(motion>.12 || dragging)wake();
  }
  function render(now) {
    scene.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.s})`);
    $('zoom-value').value=Math.round(camera.s*100)+'%';
    for(const n of nodes) {
      const visible=n.vis>.012;
      n.el.style.display=visible?'':'none';
      n.el.setAttribute('tabindex',visible?'0':'-1');n.el.setAttribute('aria-expanded',String(n.data.expanded));
      if(!visible){if(n.path)n.path.style.display='none';continue;}
      const scale=n.vis*n.press,r=n.r;
      n.el.setAttribute('transform',`translate(${n.x.toFixed(2)} ${n.y.toFixed(2)}) scale(${scale})`);
      let emphasis=1;
      if(selected&&!$('inspector').hidden){
        const chosen=byId.get(selected);
        let ancestor=n;while(ancestor&&ancestor.data.id!==selected)ancestor=byId.get(ancestor.data.parent);
        const direct=n.data.id===selected||n.data.parent===selected;
        emphasis=direct ? 1 : (ancestor?.data.id===selected ? .52 : .27);
        if(chosen.data.parent===n.data.id)emphasis=.46;
      }
      n.el.style.opacity=String(Math.min(1,n.vis*1.5)*emphasis);
      n.hit.setAttribute('r',Math.max(r,17/camera.s));n.circle.setAttribute('r',r);n.halo.setAttribute('r',r+6/camera.s);n.halo.setAttribute('stroke-width',1/camera.s);
      const loose=n.data.id!=='self'&&n.data.parent===null;
      n.halo.style.opacity=selected===n.data.id?'.8':loose?'.55':'0';
      n.halo.setAttribute('stroke-dasharray',loose?`${3/camera.s} ${4/camera.s}`:'none');
      const label=n.label, fs=(n.depth?14:16)/camera.s*(familyIds.has(n.data.id)?Math.max(.85,familyPacking):1);
      n.text.setAttribute('font-size',fs);n.text.style.opacity=String(smooth(.18,.8,label));
      const name=n.data.name,chars=Array.from(name),split=chars.length>5?Math.ceil(chars.length/2):0;
      const lines=split?[chars.slice(0,split).join(''),chars.slice(split).join('')]:[name];
      const textKey=lines.join('|');
      if(n.text.dataset.lines!==textKey){n.text.replaceChildren();lines.forEach(t=>{const span=make('tspan',{x:0});span.textContent=t;n.text.append(span);});n.text.dataset.lines=textKey;}
      const size=fs*(chars.length>12?.7:chars.length>8?.84:1);n.text.setAttribute('font-size',size);
      Array.from(n.text.children).forEach((span,i)=>span.setAttribute('y',(i-(lines.length-1)/2)*size*1.35));
      const hasNote=!!n.data.note.trim();n.dot.setAttribute('r',1.7/camera.s);n.dot.setAttribute('cy',r-10/camera.s);n.dot.style.opacity=hasNote?String(label*.45):'0';
      n.fold.setAttribute('font-size',13/camera.s);n.fold.setAttribute('x',r*.7);n.fold.setAttribute('y',-r*.7);
      n.fold.style.opacity=!n.data.expanded&&children(n.data.id).length?String(label):'0';
      if(n.path) {
        const p=byId.get(n.data.parent),dx=n.x-p.x,dy=n.y-p.y,d=Math.hypot(dx,dy)||1;
        const ux=dx/d,uy=dy/d,startR=p.r+4/camera.s,endR=r*n.vis+4/camera.s;
        const reveal=smooth(0,.85,n.vis)*n.link,ex=p.x+dx*reveal,ey=p.y+dy*reveal;
        const bend=Math.min(30,d*.09)*(nodes.indexOf(n)%2?1:-1);
        n.path.style.display=d>startR+endR?'':'none';n.path.style.opacity=String(n.vis*.65*emphasis*n.link);
        n.path.setAttribute('stroke-width',1.15/camera.s);
        n.path.setAttribute('d',`M${p.x+ux*startR},${p.y+uy*startR} Q${(p.x+ex)/2-uy*bend},${(p.y+ey)/2+ux*bend} ${ex-ux*endR},${ey-uy*endR}`);
      }
    }
    $('zoom-out').disabled=camera.s<=.29;$('zoom-in').disabled=camera.s>=3.95;
    $('gesture-hint').style.opacity=selected?'0':'.9';
    $('hint-text').textContent=host&&items.length===1?'点「自己」添加子节点':camera.s<1.15?'放大查看节点名称':camera.s<1.8?'点按节点查看备注和子节点':'拖动节点可整体移动分支';
  }
  function world(x,y){return {x:(x-camera.x)/camera.s,y:(y-camera.y)/camera.s};}
  function zoomAt(s,x=width/2,y=height*.48) {
    cameraVelocity={x:0,y:0};const at=world(x,y);s=clamp(s,.28,4);
    aim={s,x:x-at.x*s,y:y-at.y*s};wake();
  }
  function focusScale(n){return Math.min(3.7,n.depth===0?1.48:n.depth===1?1.85:2.5+(n.depth-2)*.55);}
  function focusSpace(){return {l:22,r:width-22,t:host?74:145,b:Math.max(host?160:235,$('inspector').getBoundingClientRect().top-18)};}
  function focus(n,scale) {
    cameraVelocity={x:0,y:0};
    const s=scale||focusScale(n);
    if(width<650&&selected&&!$('inspector').hidden){
      layout();const space=focusSpace(),family=[n,...children(n.data.id)];
      let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
      for(const k of family){const radius=naturalRadius(k,s)*familyPacking;l=Math.min(l,k.tx*s-radius);r=Math.max(r,k.tx*s+radius);t=Math.min(t,k.ty*s-radius);b=Math.max(b,k.ty*s+radius);}
      aim={s,x:(space.l+space.r-l-r)/2,y:(space.t+space.b-t-b)/2};wake();return;
    }
    const x=width>=850&&selected? (width-300)*.5:width*.5;
    const y=width<650&&selected?Math.max(300,height*.415):height*.48;
    aim={s,x:x-n.tx*s,y:y-n.ty*s};wake();
  }
  async function selectNode(n) {
    await flushNote();n=byId.get(n?.data.id);if(!n)return;selected=n.data.id;$('inspector').hidden=false;$('resume').hidden=true;
    $('about').hidden=true;$('about-toggle').setAttribute('aria-expanded','false');
    updateInspector();layout();focus(n);wake();
  }
  function updateInspector() {
    const n=byId.get(selected);if(!n)return;
    editingId=selected;
    $('node-title').textContent=n.data.name;$('node-note').value=n.data.note;
    $('node-parent').textContent=n.data.parent?byId.get(n.data.parent).data.name+' /':n.data.id==='self'?'以自己为中心':'独立分支 · 可整体移动';
    $('node-swatch').style.background=n.color.fill;
    $('save-state').textContent=storageOK?(host?'已保存在此设备':'已保存在此浏览器'):'未能保存，请勿关闭页面';
    const kids=children(selected);$('fold').disabled=!kids.length;$('fold').textContent=n.data.expanded?'收起分支':'展开分支';
    $('branch-actions').hidden=selected==='self';$('detach').hidden=!n.data.parent;$('connect').hidden=!!n.data.parent;
    const count=subtree(selected).length-1;
    $('branch-help').textContent=n.data.parent?(count?`保留下面 ${count} 个子节点`:'保留当前节点及备注'):(count?`连同 ${count} 个子节点一起移动`:'选一个新的父节点');
    $('child-list').replaceChildren();
    for(const child of kids){const b=document.createElement('button');b.textContent=child.data.name;b.style.setProperty('--chip-color',child.color.fill);b.onclick=async()=>{await flushNote();n.data.expanded=true;if(await persist())selectNode(child);};$('child-list').append(b);}
    $('breadcrumb').replaceChildren();const path=[];let current=n;while(current){path.unshift(current);current=byId.get(current.data.parent);}
    path.forEach((p,i)=>{if(i){const sep=document.createElement('span');sep.textContent='／';$('breadcrumb').append(sep);}const b=document.createElement('button');b.textContent=p.data.name;b.onclick=()=>selectNode(p);$('breadcrumb').append(b);});
  }
  function updateLooseList(){
    const roots=nodes.filter(n=>n.data.id!=='self'&&n.data.parent===null);$('loose-list').replaceChildren();$('loose-list').hidden=!roots.length;
    for(const root of roots){const b=document.createElement('button'),dot=document.createElement('i'),label=document.createElement('span'),tag=document.createElement('small');
      b.dataset.loose=root.data.id;b.style.setProperty('--chip-color',root.color.fill);label.textContent=root.data.name;tag.textContent='独立';b.append(dot,label,tag);b.onclick=()=>selectNode(root);$('loose-list').append(b);
    }
  }
  async function detachSelected(){
    await flushNote();const n=byId.get(selected);if(!n?.data.parent||selected==='self')return;
    // Only the incoming edge is removed. Preserve every descendant and its state.
    const branch=subtree(selected),positions=new Map(branch.map(k=>[k.data.id,{x:k.x+15/camera.s,y:k.y}]));
    if(n.path&&!reduced){const ghost=n.path.cloneNode();$('thread-ghosts').append(ghost);const length=ghost.getTotalLength();ghost.style.strokeDasharray=String(length);ghost.animate([{opacity:.6,strokeDashoffset:0},{opacity:0,strokeDashoffset:length}],{duration:260,easing:'ease-out',fill:'forwards'}).finished.finally(()=>ghost.remove());}
    n.data.formerParent=n.data.parent;n.data.parent=null;n.data.tone=n.tone;
    n.data.fx=positions.get(selected).x;n.data.fy=positions.get(selected).y;
    for(const k of branch){k.data.dx=0;k.data.dy=0;}
    rebuild();
    // Rebase the subtree against its independent anchor without scattering it.
    for(const old of branch){const k=byId.get(old.data.id),position=positions.get(old.data.id);k.data.dx+=position.x-k.tx;k.data.dy+=position.y-k.ty;layout();}
    const free=byId.get(selected);free.press=.85;if(!await persist())return;updateInspector();focus(free);wake();toast('已脱离上级，所有子节点和备注均保留');
  }
  function canAttach(source,target){return source&&target&&source.data.id!=='self'&&source.data.parent===null&&!subtree(source.data.id).some(n=>n.data.id===target.data.id);}
  function parentPath(n){const names=[];let p=byId.get(n.data.parent);while(p){names.unshift(p.data.name);p=byId.get(p.data.parent);}return names.length?names.join(' / '):n.data.id==='self'?'关系网中心':'独立分支';}
  function showParents(){
    const source=byId.get(selected),query=$('parent-search').value.trim().toLocaleLowerCase();$('parent-options').replaceChildren();
    const choices=nodes.filter(n=>canAttach(source,n)&&(n.data.name+' '+parentPath(n)).toLocaleLowerCase().includes(query));
    choices.sort((a,b)=>Number(b.data.id===source.data.formerParent)-Number(a.data.id===source.data.formerParent));
    for(const target of choices){const b=document.createElement('button'),dot=document.createElement('i'),label=document.createElement('span'),name=document.createElement('strong'),path=document.createElement('small'),arrow=document.createElement('em');
      b.type='button';b.dataset.target=target.data.id;b.style.setProperty('--chip-color',target.color.fill);name.textContent=target.data.name;path.textContent=(target.data.id===source.data.formerParent?'原来的位置 · ':'')+parentPath(target);arrow.textContent='↗';label.append(name,path);b.append(dot,label,arrow);b.onclick=()=>attachTo(target.data.id);$('parent-options').append(b);
    }
    if(!choices.length){const p=document.createElement('p');p.textContent='未找到可连接的节点';$('parent-options').append(p);}
  }
  async function openConnect(){await flushNote();const source=byId.get(selected);if(!source||source.data.parent||source.data.id==='self')return;$('connect-context').textContent=`移动「${source.data.name}」及其所有子节点`;$('parent-search').value='';showParents();$('connect-dialog').showModal();}
  async function attachTo(id){
    const source=byId.get(selected),target=byId.get(id);if(!canAttach(source,target)){toast('不能连接到当前节点或其子节点');return;}
    const branch=subtree(selected);source.data.parent=id;delete source.data.fx;delete source.data.fy;delete source.data.formerParent;
    for(const n of branch){n.data.dx=0;n.data.dy=0;}
    // Adopt the new branch palette; content and folded states remain unchanged.
    if(target.data.id==='self')source.data.tone=source.tone;else delete source.data.tone;
    target.data.expanded=true;rebuild();const saved=await persist();$('connect-dialog').close();if(!saved)return;updateInspector();focus(byId.get(selected));wake();toast(`已将整条分支连接到「${target.data.name}」`);
  }
  async function flushNote(){clearTimeout(noteTimer);await pendingSave;if(!selected)return;const n=byId.get(selected);if(n&&n.data.note!==$('node-note').value){n.data.note=$('node-note').value;await persist();wake();}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
  async function closeInspector(){await flushNote();$('inspector').hidden=true;$('resume').hidden=!selected;layout();wake();}
  async function resetView(){await flushNote();selected=null;$('inspector').hidden=true;$('resume').hidden=true;$('breadcrumb').replaceChildren();layout();focus(nodes[0],width<650?.9:1.1);}
  async function openDialog(mode){
    await flushNote();
    const n=byId.get(selected);if(!n)return;
    if(mode==='add'&&items.length>=(host?host.read().capacity:250)){toast(host?(host.read().capacity>=2000?'已达到当前版本2000个节点上限':'容量已满，请到设置 → 关系网存储增加容量'):'试验页最多250个节点');return;}
    dialogMode=mode;$('dialog-context').textContent=mode==='add'?`上级节点：${n.data.name}`:`当前名称：${n.data.name}`;
    $('dialog-title').textContent=mode==='add'?'添加子节点':'重命名节点';$('dialog-submit').textContent=mode==='add'?'添加节点':'保存名称';
    $('node-name').value=mode==='rename'?n.data.name:'';$('dialog-error').textContent='';
    $('node-dialog').showModal();setTimeout(()=>$('node-name').focus(),80);
  }
  $('node-form').addEventListener('submit',async e=>{
    e.preventDefault();const name=$('node-name').value.trim(),parent=byId.get(selected);
    if(!name||!parent){$('dialog-error').textContent='请输入节点名称';return;}
    if(dialogMode==='rename'){parent.data.name=name;parent.el.setAttribute('aria-label',name);parent.el.querySelector('title').textContent=name;}
    else {
      const data={id:'n-'+(crypto.randomUUID?.()||Date.now().toString(36)),parent:selected,name,note:'',expanded:true,dx:0,dy:0};
      if(selected==='self')data.tone=['plum','sage','clay','blue','gold'][children(selected).length%5];
      items.push(data);parent.data.expanded=true;rebuild();selected=data.id;
      // New circles appear at the parent, then settle into their branch.
    }
    const saved=await persist();$('node-dialog').close();if(!saved)return;layout();updateLooseList();updateInspector();focus(byId.get(selected));wake();
  });
  $('node-note').addEventListener('input',()=>{$('save-state').textContent='正在保存…';clearTimeout(noteTimer);noteTimer=setTimeout(flushNote,350);});
  $('node-note').addEventListener('blur',flushNote);
  $('close-inspector').onclick=closeInspector;$('resume').onclick=()=>{selectNode(byId.get(selected));};
  $('home').onclick=resetView;$('zoom-in').onclick=()=>zoomAt(aim.s*1.3);$('zoom-out').onclick=()=>zoomAt(aim.s/1.3);
  $('add-child').onclick=()=>openDialog('add');$('rename').onclick=()=>openDialog('rename');$('dialog-cancel').onclick=()=>$('node-dialog').close();
  $('detach').onclick=detachSelected;$('connect').onclick=openConnect;$('connect-cancel').onclick=()=>$('connect-dialog').close();$('parent-search').addEventListener('input',showParents);
  $('fold').onclick=async()=>{await flushNote();const n=byId.get(selected);n.data.expanded=!n.data.expanded;if(!await persist())return;updateInspector();wake();};
  $('about-toggle').onclick=()=>{const open=$('about').hidden;$('about').hidden=!open;$('about-toggle').setAttribute('aria-expanded',String(open));};
  $('reset').onclick=async()=>{if(host)return;if(!confirm('仅重置这张试验网，清除在这里添加的节点和备注？'))return;await flushNote();items=seed();selected=null;rebuild();await persist();resetView();$('about').hidden=true;};
  svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(aim.s*Math.exp(-clamp(e.deltaY,-100,100)*.0028),e.clientX,e.clientY);},{passive:false});
  svg.addEventListener('pointerdown',e=>{
    if(e.button!==0&&e.pointerType==='mouse')return;
    flushNote();svg.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});cameraVelocity={x:0,y:0};
    if(pointers.size===2){dragging=null;pressed=null;const [a,b]=[...pointers.values()];gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),scale:camera.s,anchor:world((a.x+b.x)/2,(a.y+b.y)/2)};}
    else if(pointers.size===1){const n=byId.get(e.target.closest('[data-id]')?.dataset.id);pressed=n||null;gesture={type:n?'node':'pan',id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,startTime:performance.now(),moved:false,node:n,offset:n?{x:world(e.clientX,e.clientY).x-n.x,y:world(e.clientX,e.clientY).y-n.y}:null};aim={...camera};}
    wake();
  });
  svg.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
    if(gesture.type==='pinch'&&pointers.size>=2){
      const [a,b]=[...pointers.values()],s=clamp(gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(10,gesture.distance),.28,4);
      aim={s,x:(a.x+b.x)/2-gesture.anchor.x*s,y:(a.y+b.y)/2-gesture.anchor.y*s};wake();return;
    }
    if(e.pointerId!==gesture.id)return;
    if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>6)gesture.moved=true;
    if(gesture.moved){
      svg.classList.add('is-dragging');
      if(gesture.type==='node'){
        const n=gesture.node,p=world(e.clientX,e.clientY),nx=p.x-gesture.offset.x,ny=p.y-gesture.offset.y;
        n.data.dx=clamp((n.data.dx||0)+(nx-n.tx),-2500,2500);n.data.dy=clamp((n.data.dy||0)+(ny-n.ty),-2500,2500);
        n.vx=(nx-n.x)*.15;n.vy=(ny-n.y)*.15;n.x=nx;n.y=ny;dragging=n;layout();
      }else{
        const dx=e.clientX-gesture.lastX,dy=e.clientY-gesture.lastY;camera.x+=dx;camera.y+=dy;aim={...camera};cameraVelocity={x:dx*.45,y:dy*.45};
      }
    }
    gesture.lastX=e.clientX;gesture.lastY=e.clientY;wake();
  });
  function endPointer(e,cancelled=false){
    if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
    if(gesture?.type==='pinch'){
      // A remaining finger must lift before starting another gesture; no accidental tap after pinch.
      if(!pointers.size)gesture=null;
    }else if(gesture?.id===e.pointerId){
      if(!cancelled&&!gesture.moved){if(gesture.node)selectNode(gesture.node);else{closeInspector();$('about').hidden=true;}}
      if(dragging){persist();dragging=null;}
      if(cancelled)cameraVelocity={x:0,y:0};gesture=null;
    }
    pressed=null;svg.classList.remove('is-dragging');wake();
  }
  svg.addEventListener('pointerup',e=>endPointer(e));svg.addEventListener('pointercancel',e=>endPointer(e,true));
  svg.addEventListener('dblclick',e=>{if(!e.target.closest('[data-id]'))zoomAt(aim.s*1.45,e.clientX,e.clientY);});
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea')||$('node-dialog').open||$('connect-dialog').open)return;
    if(e.key==='Escape'){if(host&&$('inspector').hidden&&$('about').hidden){parent.FolioRelationshipUI?.back();return;}closeInspector();$('about').hidden=true;}else if(e.key==='+'||e.key==='=')zoomAt(aim.s*1.25);else if(e.key==='-')zoomAt(aim.s/1.25);else if(e.key==='0')resetView();
  });
  window.addEventListener('resize',()=>{const dx=(innerWidth-width)/2,dy=(innerHeight-height)*.48;width=innerWidth;height=innerHeight;camera.x+=dx;camera.y+=dy;aim.x+=dx;aim.y+=dy;layout();if(selected&&!$('inspector').hidden)focus(byId.get(selected));wake();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){flushNote();cancelAnimationFrame(raf);raf=0;}else{lastFrame=performance.now();wake();}});
  window.addEventListener('pagehide',flushNote);
  async function theme(dark){await flushNote();palette=dark?darkPalette:lightPalette;document.documentElement.dataset.theme=dark?'dark':'light';$('paper-dots').querySelector('circle').setAttribute('fill',dark?'#c0aabc':'#8e8578');rebuild();if(selected&&byId.has(selected))updateInspector();}
  window.FolioRelationshipView={flush:flushNote,theme,pause(){paused=true;flushNote();cancelAnimationFrame(raf);raf=0;},resume(){paused=false;wake();},back(){if($('connect-dialog').open){$('connect-dialog').close();return true;}if($('node-dialog').open){$('node-dialog').close();return true;}if(!$('inspector').hidden||!$('about').hidden){closeInspector();$('about').hidden=true;return true;}return false;}};
  if(host){
    document.documentElement.classList.add('embedded');
    $('reset').hidden=true;$('about').querySelector('small').textContent='自动保存在此设备，可通过离线同步迁移';
    const recoveryButton=document.createElement('button');recoveryButton.id='recover-note';recoveryButton.className='resume';recoveryButton.style.bottom='90px';recoveryButton.hidden=true;recoveryButton.textContent='找回未保存备注';$('network').append(recoveryButton);
    recoveryButton.onclick=async()=>{if(!recovery)return;if(!byId.has(recovery.id)){prompt('原节点已变化，这份未保存备注可以复制：',recovery.text);return;}if(!confirm('用这份未保存内容替换当前备注？'))return;const draft=recovery;await selectNode(byId.get(draft.id));$('node-note').value=draft.text;await flushNote();recovery=null;recoveryButton.hidden=true;};
    hydrate();host.subscribe(()=>{if(writing)return;clearTimeout(noteTimer);if(selected&&byId.get(selected)?.data.note!==$('node-note').value)recoverNote();hydrate();});
    host.addFlusher(flushNote);theme(parent.document.documentElement.dataset.theme==='dark');
    parent.document.addEventListener('folio-theme-change',e=>theme(e.detail.dark));
  }else{items=load();rebuild();}
})();
