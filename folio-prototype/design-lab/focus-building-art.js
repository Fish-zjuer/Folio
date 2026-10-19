/* Paper-and-wood building blocks, drawn natively so every construction stage stays sharp. */
(() => {
  'use strict';const NS='http://www.w3.org/2000/svg';
  function el(p,tag,attrs={}){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));p.append(n);return n}
  function piece(p,d,fill,attrs={}){return el(p,'path',{d,fill,...attrs})}
  function draw(svg,minutes=0,variant=0,animate=false){svg.replaceChildren();const palettes=[['#bf795b','#d2946c','#e0b879'],['#7d997f','#9aad8d','#d7bf85'],['#7e9eaa','#9eb8bc','#ddc18d']],p=palettes[variant%3];
    // Floor, spare blocks and paper sun are part of the little desk scene.
    piece(svg,'M22 184L171 171 221 188 75 204Z','#d0c5a7');piece(svg,'M22 180L171 167 221 184 75 199Z','#e9ddbd');
    piece(svg,'M27 151l19-5 9 8-18 5Z','#d8b782');piece(svg,'M27 151l10 8v15l-10-7Z','#bc9b6b');piece(svg,'M37 159l18-5v15l-18 5Z','#e3c794');
    piece(svg,'M36 136l17-4 8 7-17 5Z','#a5b09a');piece(svg,'M36 136l8 8v12l-8-6Z','#8c9a80');piece(svg,'M44 144l17-5v12l-17 5Z','#b5bfa6');
    const sun=el(svg,'g',{fill:'none',stroke:'#cabb95','stroke-width':1.8,'stroke-linecap':'round'});el(sun,'path',{d:'M31 93a10 10 0 0 1 20 0M26 93h-5m35 0h5M41 77v-5m-12 9-3-3m27 3 3-3'});
    const steps=[];function stage(draw){const g=el(svg,'g',{'class':'building-piece'});steps.push(g);draw(g)}
    stage(g=>{piece(g,'M67 170l88-1 32-13 1 11-33 15-88-1Z','#bba77f');piece(g,'M67 167l88-1 32-13-90 1Z','#ded0a9')});
    stage(g=>{piece(g,'M153 101l30-16v68l-29 15Z','#c6a472');piece(g,'M157 105l23-12v15l-23 12Z','#d3b583');piece(g,'M157 125l23-12v15l-23 12Z','#cfaf7b')});
    for(let row=0;row<3;row++)stage(g=>{const y=146-row*23;for(let col=0;col<3;col++){const x=70+col*28;piece(g,`M${x} ${y}L${x+26} ${y-.6} ${x+26} ${y+21} ${x} ${y+21.5}Z`,[p[2],'#e7c68d','#dcb57a'][(row+col)%3])}});
    stage(g=>{piece(g,'M106 132Q117 126 127 132L127 168 106 168Z','#9a9e7b');piece(g,'M110 134h13v34h-13Z','#899474');el(g,'circle',{cx:119,cy:151,r:1.4,fill:'#e7d7a8'})});
    stage(g=>{piece(g,'M78 116l19-1 1 19-20 1Z','#f6e7bf');piece(g,'M81 119h13v12H81Z','#8faeb0');piece(g,'M87 119h2v12h-2Z','#e9d9b5')});
    stage(g=>{piece(g,'M132 115l18 1v19l-19-1Z','#f6e7bf');piece(g,'M135 119h12v12h-12Z','#9bb5b3');piece(g,'M140 119h2v12h-2Z','#e9d9b5')});
    stage(g=>{piece(g,'M111 59l29-14 57 45-28 15Z',p[1]);piece(g,'M140 45l57 45-7 3-52-42Z',p[0])});
    stage(g=>{piece(g,'M60 107l52-49 57 47-7 7-50-40-44 41Z',p[0]);piece(g,'M71 101l41-37 44 37Z',p[0]);piece(g,'M93 89l19-18 21 18Z',p[1]);piece(g,'M109 85l7-1v11h-7Z','#e8c69a')});
    stage(g=>{piece(g,'M157 67V44l11-3v35Z','#a97256');piece(g,'M168 41l7 5v35l-7-5Z','#c28b67');piece(g,'M154 42l13-4 12 7-13 4Z','#c89b77')});
    stage(g=>{piece(g,'M103 169l29-1 5 6-30 2Z','#d1bf95');piece(g,'M109 176l30-2 6 5-31 3Z','#e0cfa5');piece(g,'M184 168q-16-21-17-7 2 8 17 7Z','#879d78');piece(g,'M184 168q-4-24 7-17 6 8-7 17Z','#a2b18a');piece(g,'M184 169q7-17 15-9-2 8-15 9Z','#8ba17c');piece(g,'M177 169h18l-3 10-11-1Z','#c48b69');el(g,'circle',{cx:190,cy:151,r:3,fill:'#d6af6e'})});
    const amount=Math.max(0,Math.min(12,Math.floor(minutes/45*12)));steps.forEach((g,i)=>{g.style.display=i<amount?'':'none';if(animate&&i===amount-1)g.classList.add('just-added')});
    // A small stack of marks also makes incomplete construction readable at a glance.
    for(let i=0;i<12;i++)piece(svg,`M${25+i*16} 219l11-.5v4l-11 .7Z`,i<amount?p[0]:'#d5cbb4');
  }
  window.FolioBuildingArt={draw};
})();
