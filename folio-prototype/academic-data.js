/* 与课程 ID 对齐的虚构学业样例；不复制参考截图的私人分数。 */
const FolioAcademicDemo=(()=>{
  const grade=(id,termId,courseId,title,credits,original,reportedFive,major)=>{const grading=reportedFive==null?"pending":/^\d/.test(original)?"percent":"fiveLevel",points=FolioAcademic.gradePoints(original,grading);return {id,termId,courseId,title,credits,original,reportedFive,major,score:FolioAcademic.percentScore(original,grading),...points,core:false,grading,earned:points.five!==null&&points.five>0};};
  const demo={version:3,grades:[
    grade("grade-linear","2026-spring","linear","线性代数",3,"88",4.2,true,88),
    grade("grade-programming","2026-spring","programming","程序设计",3,"优秀",4.5,false,90),
    grade("grade-math","2026-autumn","math","微积分",5.5,"待录",null,true,null),
    grade("grade-physics","2026-autumn","physics","大学物理",4,"待录",null,true,null),
    grade("grade-data","2026-autumn","data","数据结构",3,"待录",null,true,null),
    {...grade("grade-swim","2026-spring","swim-test","水测",null,"合格",null,false,null),grading:"passFail",gpaIncluded:false,earned:null},
  ],practiceVersion:1,practice:[
    {id:"second",title:"第二课堂",points:6,detailsAvailable:true,items:[
      {id:"p-reading",title:"校园阅读分享",points:1.5,approved:true,status:"审核通过",type:"文化活动",quality:"文化素养",role:"分享人",remark:"围绕阅读主题完成分享与交流。",start:"2026-09-20T14:00",end:"2026-09-20T16:00",updatedAt:"2026-09-23T10:00"},
      {id:"p-volunteer",title:"图书馆志愿服务",points:2.5,approved:true,status:"审核通过",type:"志愿服务",quality:"社会责任",role:"志愿者",remark:"协助图书整理与读者服务。",start:"2026-10-08T09:00",end:"2026-10-08T12:00",updatedAt:"2026-10-10T10:00"},
      {id:"p-culture",title:"校园文化节",points:2,approved:true,status:"审核通过",type:"文化活动",quality:"文化素养",role:"参与者",remark:null,start:"2026-09-27T13:30",end:"2026-09-27T17:00",updatedAt:"2026-09-30T09:00"},
      {id:"p-lecture",title:"人文讲座：城市与记忆",points:0.5,approved:false,status:"待审核",type:"学术讲座",quality:"人文素养",role:"听众",remark:"记录已提交，等待审核。",start:"2026-10-14T18:30",end:"2026-10-14T20:00",updatedAt:"2026-10-15T09:00"}
    ]},
    {id:"third",title:"第三课堂",points:2,detailsAvailable:true,items:[
      {id:"p-research",title:"学生科研训练",points:2,approved:true,status:"审核通过",type:"科研训练",quality:"创新能力",role:"项目成员",remark:"完成阶段研究与成果汇报。",start:"2026-09-15T14:00",end:"2026-09-15T17:00",updatedAt:"2026-10-09T15:00"},
      {id:"p-innovation",title:"创新实践交流",points:1,approved:false,status:"未通过",type:"创新实践",quality:"创新能力",role:"参与者",remark:"参与证明需要补充，本条尚未计入。",start:"2026-10-05T14:00",end:"2026-10-05T16:00",updatedAt:"2026-10-11T10:00"}
    ]},
    {id:"fourth",title:"第四课堂",points:1,detailsAvailable:true,items:[
      {id:"p-community",title:"社区社会实践",points:1,approved:true,status:"审核通过",type:"社会实践",quality:"社会责任",role:"实践队员",remark:"参与社区调研与服务。",start:"2026-09-12T09:00",end:"2026-09-12T16:00",updatedAt:"2026-09-18T10:00"},
      {id:"p-labor",title:"校园劳动实践",points:null,approved:false,status:"待审核",type:"劳动实践",quality:"劳动素养",role:"参与者",remark:"记点待确认。",start:"2026-10-13T14:00",end:"2026-10-13T16:00",updatedAt:"2026-10-14T11:00"}
    ]}
  ]};
  if(window.FolioApp?.native){const modules=FolioNative.cache().modules;demo.version="live-v1";demo.practiceVersion="live-v1";demo.grades=modules.grades?.data||[];demo.practice=modules.practice?.data||[];}
  return demo;
})();
