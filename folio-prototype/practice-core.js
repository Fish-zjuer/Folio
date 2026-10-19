/* 实践明细投影；平台累计值与项目合计分开保留。 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.FolioPractice=api;})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  const counted=item=>item.approved===true&&item.deleted!==true&&Number.isFinite(item.points)&&item.points>=0;
  function project(record){
    const available=record.detailsAvailable===true&&Array.isArray(record.items),stamp=item=>Date.parse(item.updatedAt||item.start||"")||0;
    const items=available?record.items.filter(item=>item&&item.deleted!==true).slice().sort((a,b)=>stamp(b)-stamp(a)):[];
    const included=items.filter(counted),excluded=items.filter(item=>!counted(item));
    return {available,included,excluded,total:Number.isFinite(record.points)?record.points:null,itemTotal:available?included.reduce((sum,item)=>sum+item.points,0):null};
  }
  const format=value=>Number.isFinite(value)?String(Math.round(value*100)/100):"—";
  return {counted,project,format};
});
