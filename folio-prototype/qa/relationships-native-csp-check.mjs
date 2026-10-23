/* APK asset/CSP regression. Uses an owned CDP browser context, no real accounts or network services. */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const native=fileURLToPath(new URL('../../folio-android/',import.meta.url));
const versionName=fs.readFileSync(native+'AndroidManifest.xml','utf8').match(/android:versionName="([^"]+)"/)[1];
const apk=process.argv[2]||native+'dist/folio-'+versionName+'.apk';
const packed=JSON.parse(execFileSync('python',['-c',`import sys,zipfile,json,base64,re,pathlib
z=zipfile.ZipFile(sys.argv[1]);s=pathlib.Path(sys.argv[2]).read_text(encoding='utf-8');p=re.search(r'headers\\.put\\("Content-Security-Policy","([^\"]+)"\\)',s).group(1)
assert p.encode() in z.read('classes.dex'),'Native policy differs from APK'
print(json.dumps({'policy':p,'assets':{n[11:]:base64.b64encode(z.read(n)).decode() for n in z.namelist() if n.startswith('assets/www/')}}))`,apk,native+'src/app/folio/preview/MainActivity.java'],{maxBuffer:8*1024*1024,encoding:'utf8'}));
const debug='http://127.0.0.1:9224',origin='https://appassets.androidplatform.net',frameRule='frame-src '+origin+'/assets/relationship-view.html';
const version=await(await fetch(debug+'/json/version')).json(),socket=new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
let seq=0;const pending=new Map(),handlers=new Map(),checks=[],errors=[];
socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else handlers.get(m.sessionId)?.(m);};
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const fixture=fs.readFileSync(new URL('native-fixture.js',import.meta.url),'utf8');
async function launch(policy){
 const {browserContextId}=await send('Target.createBrowserContext');
 const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const pageErrors=[],requests=[];
 handlers.set(sessionId,m=>{
  if(m.method==='Runtime.exceptionThrown')pageErrors.push(m.params.exceptionDetails);
  if(m.method==='Fetch.requestPaused')void(async()=>{
   const {requestId,request}=m.params,u=new URL(request.url),path=decodeURIComponent(u.pathname.slice(8)),body=u.origin===origin&&u.pathname.startsWith('/assets/')?packed.assets[path]:null;
   requests.push(request.url);const ext=path.split('.').at(-1),mime={html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',woff2:'font/woff2'}[ext]||'application/octet-stream';
   await send('Fetch.fulfillRequest',{requestId,responseCode:body?200:403,responseHeaders:[{name:'Content-Type',value:mime},{name:'Content-Security-Policy',value:policy},{name:'X-Content-Type-Options',value:'nosniff'},{name:'Cache-Control',value:'no-cache'}],body:body||Buffer.from('Blocked').toString('base64')},sessionId);
  })().catch(e=>errors.push(String(e)));
 });
 await send('Page.enable',{},sessionId);await send('Page.bringToFront',{},sessionId);await send('Runtime.enable',{},sessionId);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaCsp=[];addEventListener('securitypolicyviolation',e=>qaCsp.push({directive:e.effectiveDirective,uri:e.blockedURI}));if(window.top===window){${fixture}\n}`},sessionId);
 await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]},sessionId);
 const run=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const check=async(name,expression)=>{const pass=!!await run(expression);checks.push({name,pass});if(!pass){console.log('DIAGNOSTIC',await run(`(()=>{const d=FolioRelationshipUI.frame.contentDocument;return {state:FolioRelationships.read(),error:FolioRelationships.error,dialog:d?.querySelector('#node-dialog')?.open,name:d?.querySelector('#node-name')?.value,toast:d?.querySelector('#toast')?.textContent,save:d?.querySelector('#save-state')?.textContent,dialogError:d?.querySelector('#dialog-error')?.textContent}})()`));throw Error(name);}};
 await send('Page.navigate',{url:origin+'/assets/index.html'},sessionId);await wait(1800);
 await run('FolioRelationshipUI.open()');await wait(1200);
 return {run,check,sessionId,pageErrors,requests,close:async()=>{handlers.delete(sessionId);await send('Target.disposeBrowserContext',{browserContextId});}};
}
let page;
try{
 checks.push({name:'policy in compiled APK matches native source and allows only the packaged relationship frame',pass:packed.policy.split('; ').includes(frameRule)});
 if(!checks.at(-1).pass)throw Error('Incorrect native frame allowlist');
 page=await launch(packed.policy.replace(frameRule,"frame-src 'none'"));
 await page.check('old Android policy reproduces the reported CSP frame rejection',`qaCsp.some(v=>v.directive==='frame-src'&&v.uri.includes('relationship-view.html'))`);
 await page.close();page=null;
 page=await launch(packed.policy);
 await page.check('packaged index loads and relation map initializes under native HTTPS origin',`currentScreen==='relationships'&&FolioRelationshipUI.frame.contentWindow.FolioRelationshipView&&FolioRelationshipUI.frame.contentDocument.querySelector('[data-id=self]')`);
 await page.check('relationship frame remains same origin and production starts with self only',`FolioRelationshipUI.frame.contentWindow.location.origin===location.origin&&FolioRelationships.read().nodes.length===1`);
 await page.check('allowed frame has no CSP violations',`qaCsp.length===0&&FolioRelationshipUI.frame.contentWindow.qaCsp.length===0`);
 await page.run(`(async()=>{const w=FolioRelationshipUI.frame.contentWindow,d=w.document;d.querySelector('[data-id=self]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await new Promise(r=>setTimeout(r,30));d.querySelector('#add-child').click();await new Promise(r=>setTimeout(r,30));d.querySelector('#node-name').value='APK策略测试';d.querySelector('#node-form').requestSubmit();await FolioRelationships.flush()})()`);await wait(400);
 await page.check('node creation persists through the packaged iframe and parent store',`FolioRelationships.read().nodes.some(n=>n.name==='APK策略测试')`);
 await page.run(`FolioTheme.set('dark')`);await wait(300);
 await page.check('embedded dark palette follows the host',`FolioRelationshipUI.frame.contentDocument.documentElement.dataset.theme==='dark'`);
 await page.run('location.reload()');await wait(1800);await page.run('FolioRelationshipUI.open()');await wait(800);
 await page.check('reload restores saved node under the native asset origin',`FolioRelationshipUI.frame.contentDocument.querySelectorAll('.network-node').length===2&&FolioRelationships.read().nodes.some(n=>n.name==='APK策略测试')`);
 const shot=await send('Page.captureScreenshot',{format:'png'},page.sessionId);fs.writeFileSync(new URL('relationships-native-csp.png',import.meta.url),Buffer.from(shot.data,'base64'));
 await page.run(`for(const src of ['https://example.invalid/foreign.html','https://appassets.androidplatform.net/assets/index.html']){const f=document.createElement('iframe');f.src=src;f.hidden=true;document.body.append(f)};fetch('https://example.invalid/blocked').catch(()=>{})`);await wait(400);
 await page.check('foreign iframe is still blocked',`qaCsp.some(v=>v.directive==='frame-src'&&v.uri.includes('example.invalid'))`);
 await page.check('unrelated same-origin iframe is still blocked',`qaCsp.some(v=>v.directive==='frame-src'&&v.uri.endsWith('/assets/index.html'))`);
 await page.check('direct web connections remain blocked',`qaCsp.some(v=>v.directive==='connect-src')`);
 checks.push({name:'all loaded app resources came from the APK and no foreign request escaped CSP',pass:page.requests.every(u=>u.startsWith(origin+'/assets/'))});
 checks.push({name:'no runtime exceptions with the corrected native policy',pass:page.pageErrors.length===0});
 errors.push(...page.pageErrors);if(checks.some(c=>!c.pass)||errors.length)throw Error('Native CSP regression failed');
 console.log(JSON.stringify({apk,checks,errors},null,2));
}finally{
 fs.writeFileSync(new URL('relationships-native-csp-report.json',import.meta.url),JSON.stringify({apk,checks,errors},null,2));
 if(page)await page.close();socket.close();
}
