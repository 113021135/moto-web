// Drive headless Chrome over CDP: collect console errors, scroll the page, take screenshots.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const [, , url, outDir, width = '1440', height = '900', mobile = '0'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${outDir}/profile`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', `--window-size=${width},${height}`, 'about:blank',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9333/json')).json(); break; } catch { await sleep(250); }
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    logs.push(`[console.${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') logs.push('[exception] ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') logs.push('[log] ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.result.data, 'base64'));
};

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: mobile === '1' });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: process.env.RM || 'no-preference' }] });
await send('Page.navigate', { url });
await sleep(6000);
await shot('01-hero');
// hold the rev button via JS events
await evalJS(`document.getElementById('rev-btn').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); 1`);
await sleep(1500);
await shot('02-rev');
await evalJS(`document.getElementById('rev-btn').dispatchEvent(new PointerEvent('pointerup', {bubbles:true})); document.querySelector('[data-paint=ocean]').click(); 1`);
await sleep(1200);
await shot('03-ocean');
const total = await evalJS('document.documentElement.scrollHeight');
const stepsAt = (process.env.STEPS || '0.12,0.3,0.42,0.5,0.58,0.66,0.8,1').split(',').map(Number);
let n = 4;
for (const f of stepsAt) {
  await evalJS(`window.scrollTo(0, ${Math.round(f * total)}); 1`);
  await sleep(1400);
  await shot(String(n++).padStart(2, '0') + '-scroll-' + Math.round(f * 100));
}
// filter chips and form
await evalJS(`document.querySelector('[data-filter=sport]').click(); 1`);
await evalJS(`document.getElementById('crew-btn').click(); 1`);
await sleep(800);
const info = await evalJS(`JSON.stringify({
  cards: document.querySelectorAll('.card').length,
  hiddenCards: document.querySelectorAll('.card.is-hidden').length,
  status: document.getElementById('form-status').textContent,
  canvas: !!document.querySelector('#bike-stage canvas'),
  noWebgl: document.getElementById('bike-stage').classList.contains('no-webgl'),
  loaderGone: !document.getElementById('loader'),
  hScroll: document.documentElement.scrollWidth > innerWidth,
  rpm: document.getElementById('rpm-num').textContent, road: (()=>{const r=document.querySelector('.road'); const cs=getComputedStyle(r); return [r.getBoundingClientRect().width, r.getBoundingClientRect().height, cs.width, cs.height, document.documentElement.className, r.style.transform]})()
})`);
console.log(info);
if (process.env.INTERACT) {
  await evalJS(`document.getElementById('garage').scrollIntoView(); 1`);
  await sleep(1500);
  const b = JSON.parse(await evalJS(`JSON.stringify(document.getElementById('strip-bike').getBoundingClientRect())`));
  const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  let x = b.x + 60, y = b.y + b.height / 2;
  await mouse('mousePressed', x, y);
  for (let i = 0; i < 8; i++) { x += 45; await mouse('mouseMoved', x, y); await sleep(16); }
  await mouse('mouseReleased', x, y);
  await sleep(250);
  await shot('20-throw');
  console.log('during throw speedo:', await evalJS(`document.getElementById('speedo').textContent`));
  await sleep(2000);
  console.log('after throw x:', await evalJS(`getComputedStyle(document.getElementById('strip-bike')).transform`));
  await evalJS(`window.scrollTo(0,0); 1`);
  await sleep(1500);
  const c = JSON.parse(await evalJS(`JSON.stringify(document.querySelector('#bike-stage canvas').getBoundingClientRect())`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: c.width * 0.68, y: c.height * 0.5, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c.width * 0.68, y: c.height * 0.5, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(500);
  await shot('21-wheelie');
}
console.log(logs.length ? logs.join('\n') : 'NO CONSOLE ERRORS');
ws.close();
chrome.kill();
process.exit(0);
