(()=>{
 'use strict';
 const catalog=[
  {id:'pressure',name:'每日压力',file:'daily-pressure.html',description:'整月色块，提前看轻重。'},
  {id:'day',name:'一日日程',file:'day-schedule.html',description:'把眼前的安排放在中间。'},
  {id:'gaps',name:'可用空档',file:'free-gaps.html',description:'留给自己的一整段时间。'},
  {id:'usage',name:'手机使用',file:'phone-usage.html',description:'一周时长，和一个小伙伴。'},
  {id:'focus',name:'专注搭建',file:'focus.html',description:'专注一会儿，留下一间小屋。'},
  {id:'mountain',name:'像素挖山',file:'pixel-mountain.html',description:'课时少一点，山也小一点。'},
  {id:'recall',name:'记忆提醒',file:'recall.html',description:'接触间隔粗样，AI问答待接。'},
  {id:'news',name:'资讯剪报',file:'news.html',description:'几则新鲜事；来源尚未定。'},
  {id:'books',name:'课本堆',file:'book-stack.html',description:'学期负担的另一种造型。',optional:true},
  {id:'finals',name:'期末与目标',file:'finals.html',description:'可选的考试与目标总览。',optional:true},
  {id:'deadlines',name:'截止倒计时',file:'deadlines.html',description:'暂留候选，尚未决定采用。',optional:true}
 ];
 const names=['左上','右上','左下','右下'],KEY='folio-design-widget-layout-v1',known=new Map(catalog.map(c=>[c.id,c]));let layout=[null,null,null,null],active=0;
 try{const stored=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(stored)&&stored.length===4)layout=stored.map(id=>known.has(id)?id:null)}catch{}
 function frame(item){const f=document.createElement('iframe');f.className='widget-frame';f.title=item.name+'样稿预览';f.setAttribute('aria-hidden','true');f.tabIndex=-1;f.loading='lazy';f.addEventListener('load',()=>f.classList.add('ready'));f.src=item.file+'?embed=1';return f}
 const slots=names.map((name,i)=>{const wrap=document.createElement('div'),b=document.createElement('button'),meta=document.createElement('div'),label=document.createElement('span'),remove=document.createElement('button');wrap.className='slot';b.className='slot-button';b.type='button';meta.className='slot-meta';label.className='slot-label';label.textContent=name;remove.className='slot-remove';remove.type='button';remove.textContent='移除';remove.setAttribute('aria-label','移除'+name+'组件');b.onclick=()=>{active=i;render();message('已选'+name+'，再点组件放入。')};remove.onclick=()=>{layout[i]=null;active=i;save();render();message(name+'已留空。')};meta.append(label,remove);wrap.append(b,meta);document.querySelector('#layout-slots').append(wrap);return{b,label,remove,id:undefined}});
 const pickButtons=new Map();for(const item of catalog){const article=document.createElement('article'),pick=document.createElement('button'),heading=document.createElement('div'),name=document.createElement('span'),view=document.createElement('a'),description=document.createElement('p');article.className='widget-item';pick.className='widget-pick';pick.type='button';pick.setAttribute('aria-label','将'+item.name+'放入所选位置');pick.append(frame(item));heading.className='widget-item-heading';name.className='widget-name';name.textContent=item.name;view.className='widget-view';view.textContent='↗';view.href=item.file;view.setAttribute('aria-label','打开'+item.name+'独立样稿');description.className='widget-description';description.textContent=item.description;heading.append(name,view);article.append(pick,heading,description);pick.onclick=()=>{layout[active]=item.id;save();render();message(item.name+'已放入'+names[active]+'。')};document.querySelector(item.optional?'#optional-library':'#widget-library').append(article);pickButtons.set(item.id,pick)}
 function message(text){document.querySelector('#layout-status').textContent=text}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(layout))}catch{message('当前浏览器无法保存，预览仍可操作。')}}
 function render(){slots.forEach((slot,i)=>{const item=known.get(layout[i]);slot.b.setAttribute('aria-pressed',String(i===active));slot.b.setAttribute('aria-label',names[i]+(item?'，'+item.name:'，留空')+'，点击选择此位置');slot.b.classList.toggle('filled',!!item);slot.remove.disabled=!item;if(slot.id!==layout[i]){slot.b.replaceChildren();if(item)slot.b.append(frame(item));else{const plus=document.createElement('span');plus.className='slot-plus';plus.textContent='+';plus.setAttribute('aria-hidden','true');slot.b.append(plus)}slot.id=layout[i]}});for(const[id,b]of pickButtons)b.classList.toggle('is-installed',layout.includes(id));document.querySelector('#layout-count').textContent=layout.filter(Boolean).length+' / 4';const clear=document.querySelector('#clear-active');clear.disabled=!layout[active];clear.setAttribute('aria-label','将'+names[active]+'留空')}
 document.querySelector('#clear-active').onclick=()=>{layout[active]=null;save();render();message(names[active]+'已留空。')};
 render();message('当前选择'+names[active]+'。');
})();
