import fs from 'node:fs';
const debug='http://127.0.0.1:9224';
const target=await(await fetch(debug+'/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let seq=0;const waiting=new Map(),errors=[],extensionErrors=[],checks=[],geometry=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;(d.url?.startsWith('chrome-extension://')?extensionErrors:errors).push(d);}if(m.id){const p=waiting.get(m.id);waiting.delete(m.id);m.error?p?.reject(Error(JSON.stringify(m.error))):p?.resolve(m.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(new URL(name,import.meta.url),Buffer.from(r.data,'base64'));};
const families={dorm:['roommate-1','roommate-2','desk'],study:['control','ai'],people:['friend-1','friend-2'],life:['keys','trip'],ideas:['book','weekend']};
try {
  await send('Page.enable');await send('Runtime.enable');
  for(const width of [390,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:720,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:'http://127.0.0.1:4215/design-lab/relationship-network.html?v=radial1'});await pause(450);
    await run(`localStorage.removeItem('folio-relationship-lab-v1');location.reload()`);await pause(1200);
    for(const [id,children] of Object.entries(families)){
      await run(`document.querySelector('[data-id="${id}"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);await pause(1300);
      const result=await run(`(()=>{
        const circle=id=>{const r=document.querySelector('[data-id="'+id+'"] .body').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,l:r.left,r:r.right,t:r.top,b:r.bottom}};
        const p=circle('${id}'),center=circle('self'),kids=${JSON.stringify(children)}.map(circle),axis={x:p.x-center.x,y:p.y-center.y};
        const cos=v=>(v.x*axis.x+v.y*axis.y)/(Math.hypot(v.x,v.y)*Math.hypot(axis.x,axis.y));
        const mean={x:kids.reduce((s,k)=>s+k.x-p.x,0)/kids.length,y:kids.reduce((s,k)=>s+k.y-p.y,0)/kids.length};
        const bottom=document.querySelector('#inspector').getBoundingClientRect().top;
        return {parent:p,center,kids,mean,cos:cos(mean),each:kids.map(k=>cos({x:k.x-p.x,y:k.y-p.y})),fit:[p,...kids].every(k=>k.l>=12&&k.r<=innerWidth-12&&k.t>=136&&k.b<=bottom-6)};
      })()`);
      geometry.push({width,id,...result});
      check(`${width} ${id}: children follow outward radial direction`,result.cos>.85&&result.each.every(c=>c>.18));
      check(`${width} ${id}: family fits between header and note sheet`,result.fit);
      if(width===390&&['dorm','life','people'].includes(id))await shot(`relationship-network-radial-${id}.png`);
      if(width===320&&id==='dorm')await shot('relationship-network-radial-320.png');
    }
    await run(`document.querySelector('[data-id="self"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);await pause(1200);
    check(`${width} self: children surround center rather than all sit above it`,await run(`(()=>{const p=document.querySelector('[data-id="self"] .body').getBoundingClientRect(),x=p.x+p.width/2,y=p.y+p.height/2;const points=['dorm','study','people','life','ideas'].map(id=>{const r=document.querySelector('[data-id="'+id+'"] .body').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});return points.some(k=>k.x<x)&&points.some(k=>k.x>x)&&points.some(k=>k.y<y)&&points.some(k=>k.y>y)})()`));
  }
  check('no page exceptions',errors.length===0);
  console.log(JSON.stringify({checks,errors,extensionErrors},null,2));
} finally {fs.writeFileSync(new URL('relationship-network-radial-report.json',import.meta.url),JSON.stringify({checks,geometry,errors,extensionErrors},null,2));ws.close();await fetch(debug+'/json/close/'+target.id);}
