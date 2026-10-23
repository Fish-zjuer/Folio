import fs from 'node:fs';
const origin='http://127.0.0.1:4215',debug='http://127.0.0.1:9224',url=origin+'/qa/learning-library.html?test=1';
const target=await(await fetch(debug+'/json/new?'+encodeURIComponent('about:blank'),{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let next=0;const pending=new Map(),errors=[],checks=[];
ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);if(m.id&&pending.has(m.id)){const [r,j]=pending.get(m.id);pending.delete(m.id);m.error?j(Error(JSON.stringify(m.error))):r(m.result);}};
const send=(method,params={})=>new Promise((r,j)=>{const id=++next;pending.set(id,[r,j]);ws.send(JSON.stringify({id,method,params}));});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function evalJS(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||JSON.stringify(result.exceptionDetails));return result.result.value;}
async function check(expression,label){if(!await evalJS(expression))throw Error(label);checks.push(label);}
async function shot(name){const result=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(new URL('./'+name,import.meta.url),Buffer.from(result.data,'base64'));}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url});await wait(1700);
 await evalJS('localStorage.clear()');await send('Page.reload');await wait(1400);await evalJS('(async()=>{await FolioLearning.ready;await FolioSchool.refresh("courses");})()');
 await check('!!FolioLearning && !!FolioPageRail','runtime loads');
 await evalJS(`FolioLearning.open();FolioLearning.edit(null,'journal');`);
 await check(`currentScreen==='learningEditor'&&document.querySelector('.chat-layer').hidden`,'diary uses a dedicated page, not a dismissible sheet');
 await evalJS(String.raw`const f=document.querySelector('.learning-editor-form');f.querySelector('input[type=text]').value='不能丢的日记';f.querySelector('textarea').value='第一行\n第二行：未确认前只保留草稿';f.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.learning-editor-screen').click();`);
 await wait(360);await check(`currentScreen==='learningEditor'&&FolioLearning.records().length===0&&JSON.parse(localStorage.getItem('folio-learning-drafts-v1')).items['new-journal'].fields.body.includes('第二行')`,'clicking blank space keeps writing; draft is not a confirmed record');
 await evalJS(`FolioNative.back()`);
 await check(`currentScreen==='learning'&&!!document.querySelector('.learning-draft-open')`,'system back retains an accessible draft');
 await send('Page.reload');await wait(1400);await evalJS(`FolioLearning.ready;FolioLearning.open();document.querySelector('.learning-draft-open').click()`);
 await check(`document.querySelector('.learning-editor-form textarea').value.includes('第二行')`,'draft survives reload and resumes');
 await evalJS(`FolioQA.failRecordWrite=true;document.querySelector('.learning-editor-form').requestSubmit()`);await wait(200);
 await check(`currentScreen==='learningEditor'&&FolioLearning.records().length===0&&document.querySelector('.learning-error').textContent.includes('写入失败')`,'failed native save keeps editor, text and pending draft');
 await evalJS(`document.querySelector('.learning-editor-form').requestSubmit()`);await wait(220);
 await check(`currentScreen==='learningEditor'&&FolioLearning.records().length===1&&document.querySelector('.learning-save').textContent==='已保存'`,'successful save stays in editor');
 await evalJS(String.raw`document.querySelector('.learning-editor-form textarea').value+='\n保存后继续写';document.querySelector('.learning-editor-form').dispatchEvent(new Event('input'));document.querySelector('.learning-editor-form').requestSubmit()`);await wait(220);
 await check(`FolioLearning.records().length===1&&FolioLearning.records()[0].body.includes('继续写')`,'continued writing updates the same diary without duplicate records');
 await shot('learning-editor-390.png');
 await evalJS(`FolioNative.back();window.MediaRecorder=class{static isTypeSupported(){return true;}constructor(){this.state='inactive';this.mimeType='audio/wav';}start(){this.state='recording';}stop(){this.state='inactive';const bytes=new ArrayBuffer(844),v=new DataView(bytes);const str=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,836,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,800,true);this.ondataavailable({data:new Blob([bytes],{type:this.mimeType})});this.onstop();}};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});FolioLearning.edit(null,'recording');document.querySelector('.learning-record-button').click();`);await wait(80);
 await evalJS('FolioNative.back()');await wait(180);
 await check(`currentScreen==='learningEditor'&&document.querySelector('.learning-record-button').textContent==='播放录音'`,'back during capture finishes audio and keeps editor');
 await evalJS('FolioNative.back()');await send('Page.reload');await wait(1400);await evalJS(`FolioLearning.open();[...document.querySelectorAll('.learning-draft-open')].find(b=>b.textContent.includes('录音')).click();`);
 await check(`document.querySelector('.learning-record-button').textContent==='播放录音'`,'recording draft and IndexedDB blob restore after reload');
 await evalJS(`document.querySelector('.learning-editor-form input[type=text]').value='可播放的课堂录音';document.querySelector('.learning-editor-form').dispatchEvent(new Event('input'));document.querySelector('.learning-editor-form').requestSubmit()`);await wait(200);
 await check(`FolioLearning.records().some(r=>r.audio?.size===844)`,'recording confirmation retains actual stored audio metadata');
 await evalJS(`FolioNative.back();document.querySelector('.learning-play').click()`);await wait(150);
 await check(`!document.querySelector('.learning-player').hidden&&document.querySelector('.learning-player audio').controls`,'library plays inline with seeking controls');
 // Only synthetic data is added to this isolated origin.
 await evalJS(`(async()=>{const c=FolioCourses.semesters.flatMap(t=>t.courses.map(c=>({courseId:c.id,termId:t.id})));for(let i=0;i<20;i++)await FolioLearning.applyProposal({id:'dense-'+i,operation:'create_learning',fields:{kind:'recording',date:'2026-10-'+(22-Math.floor(i/8)),title:'实验录音 '+i,body:i===3?'检索词：负反馈':'课堂重点',...(c[i%Math.max(1,c.length)]||{})}});FolioLearning.open();})()`);
 await evalJS(`document.querySelector('[data-kind=recording]').click();const q=document.querySelector('.learning-search');q.value='负反馈';q.dispatchEvent(new Event('input'));`);
 await check(`document.querySelectorAll('.learning-row').length===1&&document.querySelector('.learning-title').textContent==='实验录音 3'`,'keyword search locates recording content without opening each item');
 await evalJS(`document.querySelector('.learning-search').value='';document.querySelector('.learning-search').dispatchEvent(new Event('input'));document.querySelector('.learning-search-line button').click();document.querySelector('[aria-label=起始日期]').value='2026-10-22';document.querySelector('[aria-label=结束日期]').value='2026-10-22';document.querySelector('[aria-label=起始日期]').dispatchEvent(new Event('change'));`);
 await check(`document.querySelectorAll('.learning-row').length===9`,'date range filters without page transitions');
 await evalJS(`const select=document.querySelector('[aria-label=按课程筛选]');select.selectedIndex=1;select.dispatchEvent(new Event('change'));`);
 await check(`document.querySelectorAll('.learning-row').length>0&&document.querySelectorAll('.learning-row').length<9`,'course and date filters compose');
 await evalJS(`[...document.querySelectorAll('.learning-filters button')].find(b=>b.textContent==='清除筛选').click();document.querySelector('.learning-search-line button').click();document.querySelector('.learning-scroll').scrollTop=260;window.qaScroll=document.querySelector('.learning-scroll').scrollTop;document.querySelector('.learning-row-open').click();FolioNative.back();`);
 await check(`document.querySelector('.learning-scroll').scrollTop===qaScroll&&document.querySelector('[data-kind=recording]').getAttribute('aria-pressed')==='true'`,'return preserves list scroll and selected type');
 for(const [width,theme]of [[390,'light'],[320,'dark']]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await evalJS(`document.documentElement.dataset.theme='${theme}';document.querySelector('.learning-scroll').scrollTop=0;`);await wait(120);
  await shot('learning-library-'+width+'-'+theme+'.png');
  await check(`previewScreens.learning.scrollWidth<=${width}&&[...document.querySelectorAll('.learning-row')].filter(n=>{const r=n.getBoundingClientRect();return r.top<700&&r.bottom>220;}).length>=5`,'compact library fits '+width+'px '+theme);
  await evalJS(`FolioLearning.edit(null,'journal')`);
  await check(`previewScreens.learningEditor.scrollWidth<=${width}&&document.querySelector('.learning-editor-form textarea').getBoundingClientRect().height>=240`,'writing page fits '+width+'px '+theme);
  await evalJS('FolioNative.back()');
 }
 await evalJS(`FolioPageRail.setPages(['home','workbench','learning']);FolioPageRail.set(true);document.querySelector('[data-kind=recording]').click();document.querySelector('.rail-header-actions [aria-label="新建当前类型记录"]').click();`);
 await check(`currentScreen==='learningEditor'&&!document.querySelector('.phone').classList.contains('rail-active')&&document.querySelector('.learning-editor-screen h1').textContent==='录音'`,'horizontal navigation opens the right editor and leaves its header accessible');
 await evalJS(`FolioNative.back();FolioPageRail.set(false);document.querySelector('[data-kind=journal]').click();document.querySelector('.learning-row-open').click();document.querySelector('.learning-editor-form textarea').value='冲突时保留的文本';document.querySelector('.learning-editor-form').dispatchEvent(new Event('input'));`);
 await evalJS(`(async()=>{const r=FolioLearning.records().find(r=>r.kind==='journal');await FolioLearning.applyProposal({id:'conflict',operation:'update_learning',targetId:r.id,before:JSON.stringify(r),fields:{body:'另一处已保存的内容'}});document.querySelector('.learning-editor-form').requestSubmit();})()`);await wait(160);
 await check(`document.querySelector('.learning-error').textContent.includes('记录已变化')&&document.querySelector('.learning-editor-form textarea').value==='冲突时保留的文本'`,'stale diary draft does not overwrite a concurrent update');
 if(errors.length)throw Error(errors.join('\n'));checks.push('no uncaught runtime errors');
 const result={passed:checks.length,checks,limitations:['Synthetic audio events; no physical microphone, Android process kill or hardware FPS validation.']};fs.writeFileSync(new URL('./learning-library-report.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{ws.close();await fetch(debug+'/json/close/'+target.id);}
