/* Bounded, explicit AI calls. No tools, broad context reads, hidden data or direct mutation. */
(()=>{'use strict';const F=FolioStudyAIFormat;let running=null;
 async function create(kind,input,meta={},signal){if(running)throw Error('已有学习AI请求在进行');const messages=F.request(kind,input),controller=new AbortController();const abort=()=>controller.abort();if(signal?.aborted)throw new DOMException('已停止','AbortError');signal?.addEventListener('abort',abort,{once:true});running=controller;
  try{await FolioStudyStore.ready;const config=await FolioNative.call('config.get');if(!config.hasKey||!config.baseUrl||!config.model)throw Error('请先配置可用模型');const model=config.model,effort=FolioModelProfile.effort(config,model,config.reasoning||'auto'),body={model,messages,stream:false,max_tokens:2400};if(effort!=='auto')body.reasoning_effort=effort;
   const response=await FolioAgentRuntime.provider(body,controller.signal);if(controller.signal.aborted)throw new DOMException('已停止','AbortError');const message=response.choices?.[0]?.message;if(message?.tool_calls?.length)throw Error('学习请求不允许工具调用，未执行');const payload=F.validate(kind,F.parse(message?.content),input.material||'');const draft={id:crypto.randomUUID(),type:kind,payload,termId:meta.termId||'',courseId:meta.courseId||'',taskId:meta.taskId||null,cardId:meta.cardId||null,cardSignature:meta.cardSignature||null,model,usage:FolioAgent.usage(response.usage)};await FolioStudyStore.save('draft',draft);return draft;
  }finally{signal?.removeEventListener('abort',abort);running=null;}
 }
 window.FolioStudyAI=Object.freeze({create,cancel(){running?.abort();},busy:()=>!!running});
})();
