/* Cut-paper companions, independent of any future evaluation algorithm. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const labels={lamp:'台灯',bird:'折纸小鸟',flower:'小花',whale:'小鲸鱼'};
  function el(parent,tag,attrs={}){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));parent.append(n);return n}
  function paper(p,d,color,attrs={}){return el(p,'path',{d,fill:color,...attrs})}
  function lamp(p,mood){
    const active=mood==='happy',low=mood==='sad';
    const head=el(p,'g',{transform:`translate(29 ${low?31:active?20:25}) rotate(${low?38:active?-13:12})`});
    paper(head,active?'M-12 8L10 7 23 39Q-2 44-27 36Z':low?'M-12 8L10 8 14 23Q0 27-18 24Z':'M-12 8L10 8 19 30Q-1 35-22 30Z','#e6c57b',{opacity:active?.55:low?.2:.35});
    paper(p,`M42 59L50 41 34 ${low?32:active?21:26} 38 ${low?28:active?17:22} 57 40 48 60Z`,'#83907a');
    el(p,'circle',{cx:53,cy:40,r:3.5,fill:'#b7bea4'});
    // The broad, slightly uneven shade and the solid light patch read as cut paper.
    paper(head,'M-7-9L6-10 17 7Q1 10-18 7Z','#c47f5e');
    paper(head,'M-18 7Q0 3 17 7L16 10Q0 12-17 10Z','#d7a17b');
    paper(head,'M-6-8L-10 4-2 4 1-9Z','#d99d76');
    paper(p,'M32 59Q46 56 60 59L63 64 28 64Z','#a4aa8d');
    paper(p,'M30 64H62L61 66 31 66Z','#8c947a');
  }
  function bird(p,mood){
    const active=mood==='happy',low=mood==='sad';
    paper(p,'M18 48L4 36 27 39Z','#c8b484');
    paper(p,'M16 44L37 31 53 44 35 57Z','#d3a873');
    paper(p,active?'M33 43L7 8 47 29Z':low?'M34 48L15 31 47 43Z':'M33 46L12 23 47 37Z','#c98564');
    paper(p,active?'M33 43L20 16 47 29Z':low?'M34 48L27 35 47 43Z':'M33 46L26 28 47 37Z','#dda583');
    paper(p,low?'M43 45L44 32 58 36 50 45Z':active?'M42 45L47 20 59 23 52 43Z':'M42 45L47 28 60 31 52 43Z','#dcc39a');
    paper(p,low?'M44 32L58 36 61 43 51 40Z':active?'M47 20L59 23 66 30 52 27Z':'M47 28L60 31 65 38 52 35Z','#b78660');
    el(p,'circle',{cx:low?55:56,cy:low?37:active?25:33,r:1.05,fill:'#776748'});
    paper(p,'M31 55L29 63 32 63 35 56Z M42 53L43 62 46 62 45 52Z','#a58c63');
    paper(p,'M26 63H36V65H25Z M40 62H49V64H40Z','#b8a27d');
  }
  function flower(p,mood){
    const active=mood==='happy',low=mood==='sad',x=low?27:active?35:32,y=low?37:active?26:31;
    paper(p,`M36 64Q40 46 ${x-1} ${y+4}L${x+2} ${y+3}Q43 47 40 64Z`,'#879673');
    paper(p,'M38 52Q19 55 19 43Q32 41 38 52Z','#a6b393');
    paper(p,'M39 46Q50 33 59 39Q57 51 39 49Z','#95a783');
    const head=el(p,'g',{transform:`translate(${x} ${y}) rotate(${low?55:active?-7:18}) scale(${active?.86:low?.61:.72} ${active?.86:low?.73:.84})`});
    for(let i=0;i<5;i++)paper(head,'M-3-2Q-16-10-9-21L0-24Q14-20 9-8L3-1Z',i%2?'#d49b73':'#c78060',{transform:`rotate(${i*72})`});
    paper(head,'M-8-5L-2-9 7-6 10 1 4 8-5 8-10 1Z','#e6bd70');
    paper(head,'M-2-3L3-4 5 1 0 4-4 1Z','#cba35e');
  }
  function whale(p,mood){
    if(mood==='happy'){
      paper(p,'M28 30Q29 16 25 9L28 7Q34 18 31 30Z','#8aaeb3');
      paper(p,'M27 14Q20 7 14 12L12 10Q19 1 29 10Z','#a3c1c1');
      paper(p,'M29 12Q35 1 43 6L44 9Q37 6 31 16Z','#8aaeb3');
      paper(p,'M12 14Q7 18 11 21Q16 20 12 14Z M43 11Q39 15 43 18Q48 16 43 11Z M31 2Q28 5 31 7Q34 6 31 2Z','#aac7c7');
    }else if(mood==='waiting'){
      paper(p,'M28 30Q29 23 26 21L28 19Q33 24 31 30Z','#8aaeb3');
      paper(p,'M29 25Q34 19 38 23L38 25Q34 24 31 28Z','#aac7c7');
    }
    paper(p,'M50 44Q57 43 62 35L65 36 63 45 69 48Q64 54 56 50Z','#739799');
    paper(p,'M12 45Q10 33 23 30Q42 26 52 38L58 47Q53 58 36 61Q16 63 12 45Z','#8faeb0');
    paper(p,'M14 49Q32 61 56 48Q50 59 35 61Q20 63 14 49Z','#c4d5cd');
    paper(p,'M32 46Q38 46 43 52L36 56Q32 52 32 46Z','#789a9b');
    el(p,'circle',{cx:20,cy:41,r:1.5,fill:'#536f6c'});
    paper(p,'M12 47Q18 50 23 47','none',{stroke:'#73918b','stroke-width':1.5,'stroke-linecap':'round'});
  }
  function render(parent,style='lamp',mood='happy'){
    const kind=Object.hasOwn(labels,style)?style:'lamp';parent.replaceChildren();
    ({lamp,bird,flower,whale})[kind](parent,['happy','waiting','sad'].includes(mood)?mood:'happy');
    parent.setAttribute('role','img');parent.setAttribute('aria-label',labels[kind]+'：'+({happy:'舒展',waiting:'停滞',sad:'低落'}[mood]||'舒展'));
  }
  window.FolioCompanion={render,labels};
})();
