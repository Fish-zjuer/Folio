/* Metadata only: keep the approved reference geometry inert and unchanged. */
(()=>{'use strict';
 function tag(root,motif,m,combo=false){
  const assign=(selector,rows,key='id')=>[...root.querySelectorAll(selector)].forEach((n,i)=>{const r=rows[i];if(r){n.dataset.studyPick=JSON.stringify(key==='date'?{date:r.date}:{id:String(r[key]??r.courseId??r.termId??'')});}});
  if(combo){
   const svg=root.querySelector('svg');if(!svg)return;
   if(motif==='plant')assign('svg > rect',(m.plantTasks||m.pending).slice(0,3));
   if(motif==='courseSquares')assign('svg > rect[fill-opacity="0.22"]',m.courseProgress.slice(0,4));
   if(motif==='mosaic')assign('svg > rect',m.cards.slice(0,48));
   if(motif==='reviewBlocks')assign('svg > rect',m.reviewDue.slice(0,6));
   if(motif==='domino')assign('svg > g',m.exams.slice(0,4));
   if(motif==='trend')assign('svg > circle',(m.academic.series||[]).filter(v=>Number.isFinite(v.gpa)).slice(-5));
   if(motif==='focusBars')assign('svg > rect',m.focusDays,'date');
   if(motif==='moons')assign('svg > circle[r="5.2"]',m.nights,'date');
   if(motif==='deadline')assign('svg > rect',m.deadlines.slice(0,4));
   if(motif==='quadrant')assign('svg > circle',(m.quadrantTasks||m.pending).slice(0,6));
   if(motif==='gradeRings')assign('svg > circle[stroke-opacity]',(m.academic.termCourseGrades||[]).slice(-4).reverse());
   if(motif==='agenda')assign('svg > rect',Array.from({length:12},(_,i)=>FolioStudyMenuCore.agenda(m,m.today).find(c=>parseInt(c.start)*60+Number(c.start.slice(3))<(i+9)*60&&parseInt(c.end)*60+Number(c.end.slice(3))>(i+8)*60)||{}));
  }else{
   const sel={plant:'[data-ref="tri"] button',books:'[data-ref="sp"] g',mosaic:'[data-ref="mz"] i',domino:'[data-ref="dm"] > g',quadrant:'.card svg > circle',deadline:'.card svg > rect',week:'[data-ref="wk"] > *',agenda:'[data-ref="hours"] i'};
   const data={plant:(m.plantTasks||m.pending).slice(0,3),books:m.courseProgress,mosaic:m.cards,domino:m.exams,quadrant:m.quadrantTasks||m.pending,deadline:m.deadlines,week:Array.from({length:42},(_,i)=>m.focusDays[i%7]),agenda:Array.from({length:16},(_,i)=>FolioStudyMenuCore.agenda(m,m.today).find(c=>parseInt(c.start)*60+Number(c.start.slice(3))<(i+8)*60&&parseInt(c.end)*60+Number(c.end.slice(3))>(i+7)*60)||{})};
   if(motif==='curve')assign('.rv i',m.reviewDue.slice(0,6));
   if(motif==='moons')assign('[data-ref="mn"] > circle:not(:first-child)',m.nights,'date');
   if(sel[motif])assign(sel[motif],data[motif],motif==='week'?'date':'id');
  }
 }
 function pick(root,event,motif){
  const selection={motif};
  // Keyboard activation selects the view, never an arbitrary chart cell.
  if(!event||event.detail===0)return selection;
  let best=null,area=Infinity;
  for(const n of root.querySelectorAll('[data-study-pick]')){const r=n.getBoundingClientRect();if(r.width&&r.height&&event.clientX>=r.left-3&&event.clientX<=r.right+3&&event.clientY>=r.top-3&&event.clientY<=r.bottom+3&&r.width*r.height<=area){best=n;area=r.width*r.height;}}
  if(best)try{Object.assign(selection,JSON.parse(best.dataset.studyPick));}catch{}
  if(motif==='quadrant'&&!selection.id){const svg=root.querySelector('svg'),r=svg?.getBoundingClientRect();if(r)selection.group=`${event.clientY<r.top+r.height/2?1:0}${event.clientX>=r.left+r.width/2?1:0}`;}
  if(motif==='rings'){const r=(root.querySelector('[data-ref="rg"]')||root.querySelector('svg'))?.getBoundingClientRect();if(r){const distance=Math.hypot((event.clientX-r.left-r.width/2)/r.width,(event.clientY-r.top-r.height/2)/r.height);selection.ring=distance>.32?'focus':distance>.21?'tasks':'review';}}
  return selection;
 }
 window.FolioStudyMenuHit=Object.freeze({tag,pick});
})();
