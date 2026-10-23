/* A bounded preference surface for AI. Never contains account or provider secrets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FolioPreferencesCore=api;})(globalThis,()=>{
 'use strict';const pageIds=['home','workbench','calendar','timetable','tasks','homework','courses','exams','scholar','grades','goals','learning','relationships','settings'];
 const labels={colorMode:'颜色模式',horizontalMode:'横向浏览',horizontalPages:'横向浏览页面',retakeMode:'重修绩点计算',hideGrades:'隐藏成绩与绩点',weekendLimit:'周末每天手动便签上限',queueWeights:'周一至周日便签分配比例'};
 function validate(args){if(!args||!Object.hasOwn(labels,args.key))throw Error('这个设置不允许由 AI 修改');const {key}=args;let value=args.value;
  if(key==='colorMode'&&!['system','light','dark'].includes(value)||key==='retakeMode'&&!['first','highest'].includes(value))throw Error('设置选项不正确');
  if(['horizontalMode','hideGrades'].includes(key)&&typeof value!=='boolean')throw Error('设置需要开关值');
  if(key==='weekendLimit'&&(!Number.isInteger(value)||value<1||value>12))throw Error('周末上限应为1至12');
  if(key==='horizontalPages'){if(!Array.isArray(value)||value.some(v=>!pageIds.includes(v)))throw Error('页面选项不正确');value=pageIds.filter(id=>id==='home'||value.includes(id));if(value.length<2)throw Error('横向浏览至少保留两页');}
  if(key==='queueWeights'){if(!Array.isArray(value)||value.length!==7||value.some(v=>!Number.isInteger(v)||v<0||v>100)||value.reduce((n,v)=>n+v,0)!==100)throw Error('需要7个非负整数百分比，合计100');value=[...value];}
  return {key,value};
 }
 return {labels,pageIds,validate};
});
