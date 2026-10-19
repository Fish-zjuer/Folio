/* 本地对话状态。没有模型调用；待确认操作与真实待办写入分开。 */
(function(root) {
  "use strict";
  const defaults = () => ({version:1, activeId:null, conversations:[], settings:{provider:"unconnected",model:"auto",reasoning:"auto"}});
  const id = () => typeof crypto!=="undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function conversation(state) { return state.conversations.find(c=>c.id===state.activeId) || null; }
  function create(state) {
    const c={id:id(),title:"新对话",createdAt:new Date().toISOString(),messages:[],text:"",attachments:[],proposals:[]};
    state.conversations.unshift(c);state.activeId=c.id;return c;
  }
  function send(state,live=false) {
    const c=conversation(state),text=c?.text.trim();
    if (!c || (!text && !c.attachments.length)) return null;
    const message={id:id(),role:"user",text,attachments:c.attachments,createdAt:new Date().toISOString(),settings:{...state.settings}};
    c.messages.push(message);c.text="";c.attachments=[];
    if(c.messages.length===1)c.title=(text || message.attachments[0].name).slice(0,32);
    // 不伪造模型输出、图片识别或 usage；此条是本地流程说明。
    if(!live)c.messages.push({id:id(),role:"assistant",text:"当前为本地流程预览。连接模型后，Folio 才能回答或读取图片内容。",createdAt:new Date().toISOString(),prototype:true,usage:null,replyTo:message.id});
    return message;
  }
  function propose(c,messageId) {
    const existing=c.proposals.find(p=>p.messageId===messageId && p.status==="pending");
    if(existing)return existing;
    const p={id:id(),messageId,status:"pending",fields:{title:"",body:"",kind:"todo",deadline:"",clock:"",queued:false},createdAt:new Date().toISOString()};
    c.proposals.push(p);return p;
  }
  function pending(state) { return state.conversations.flatMap(c=>c.proposals.filter(p=>p.status==="pending").map(p=>({conversation:c,proposal:p}))); }
  function archivePreview(state){
    let changed=false;
    for(const c of state.conversations){if(c.messages.some(m=>m.prototype)){c.legacyPreview=true;changed=true;}for(const p of c.proposals)if(!p.operation&&p.status==="pending"){p.status="archived";changed=true;}}
    const current=conversation(state);
    if(current?.legacyPreview&&!current.messages.some(m=>m.role==="assistant"&&!m.prototype)&&!current.proposals.some(p=>p.operation&&p.status==="pending")){
      const text=current.text,attachments=current.attachments;current.text="";current.attachments=[];const fresh=create(state);fresh.text=text;fresh.attachments=attachments;changed=true;
    }
    return changed;
  }
  function toTodo(p) {
    const f=p.fields;
    return {id:`chat-${p.id}`,title:f.title.trim(),body:f.body,kind:f.kind,course:f.kind==="homework"?"自定义":"",source:"personal",important:false,urgent:false,
      timeMode:"deadline",deadline:f.deadline,deadlineClock:f.clock || null,repeat:{kind:"none",interval:1,weekdays:[],until:null},reminderMinutes:null,queued:Boolean(f.queued),completed:false,mountDate:null,mountedOn:null};
  }
  const api={defaults,id,conversation,create,send,propose,pending,toTodo,archivePreview};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.FolioChat=api;
})(typeof globalThis==="undefined"?this:globalThis);
