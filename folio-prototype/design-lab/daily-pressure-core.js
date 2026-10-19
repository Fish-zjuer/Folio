(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioPressure=api})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const key=d=>d.toISOString().slice(0,10);
 function month(year,index){const first=new Date(Date.UTC(year,index,1)),offset=(first.getUTCDay()+6)%7,last=new Date(Date.UTC(year,index+1,0)).getUTCDate(),size=Math.ceil((offset+last)/7)*7;return Array.from({length:size},(_,i)=>{const d=new Date(Date.UTC(year,index,1-offset+i));return{key:key(d),day:d.getUTCDate(),weekday:(d.getUTCDay()+6)%7,inMonth:d.getUTCMonth()===index,year:d.getUTCFullYear()}})}
 function summary(items,date){const scheduled=items.filter(x=>x.date===date&&!x.completed),due=items.filter(x=>x.due===date&&!x.completed);const minutes=scheduled.reduce((s,x)=>s+(typeof x.minutes==='number'&&Number.isFinite(x.minutes)&&x.minutes>0?x.minutes:0),0);return{scheduled,due,minutes,unestimated:scheduled.filter(x=>!(typeof x.minutes==='number'&&Number.isFinite(x.minutes)&&x.minutes>0)),level:minutes===0?0:minutes<=180?1:minutes<=300?2:minutes<=420?3:4}}
 return{month,summary};
});
