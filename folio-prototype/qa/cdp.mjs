import fs from 'node:fs';

const targetUrl = process.argv[2] || 'http://127.0.0.1:4191/index.html';
const expression = process.argv[3] || '';
const shotPath = process.argv[4] || '';
const width = Number(process.argv[5] || 448);
const height = Number(process.argv[6] || 900);

const list = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = list.find(t => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map();
ws.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); }
};
function send(method, params = {}) {
  const messageId = ++id;
  return new Promise((resolve, reject) => { pending.set(messageId, { resolve, reject }); ws.send(JSON.stringify({ id: messageId, method, params })); });
}
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: targetUrl });
await new Promise(r => setTimeout(r, 1800));
await send('Emulation.clearDeviceMetricsOverride');
console.log('METRICS', JSON.stringify(await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })));
await send('Runtime.evaluate', { expression: `document.documentElement.style.width='${width}px';document.body.style.width='${width}px';const p=document.querySelector('.preview');if(p)p.style.width='${width}px';` });
await new Promise(r => setTimeout(r, 150));
await new Promise(r => setTimeout(r, 200));
if (expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) console.error('EVAL ERROR', JSON.stringify(result.exceptionDetails));
  else console.log('EVAL', JSON.stringify(result.result?.value));
  await new Promise(r => setTimeout(r, 500));
}
if (shotPath) {
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log('SHOT', shotPath);
}
ws.close();
