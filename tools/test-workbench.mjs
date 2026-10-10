// Workbench demos in headless Chrome: turn the crank 180°, shift to 3rd, hold the brake, big bump. Screenshots each.
// node tools/test-workbench.mjs <url> <outDir> [width] [height] [mobile 0|1]   (RM=reduce to test reduced motion)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , url, outDir, width = '1440', height = '900', mobile = '0'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${outDir}/profile`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9336/json')).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const logs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(`[console.${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') logs.push('[exception] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') logs.push('[log] ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (n) => writeFileSync(`${outDir}/${n}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const key = async (k, code = k, kc = 0) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: kc });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc });
};
const KEYS = { ArrowRight: 39, ArrowLeft: 37, End: 35, Home: 36 };
const card = (d) => js(`(() => { const c = document.getElementById('wb-card-${d}'); return [c.querySelector('.wb-tag').textContent, c.querySelector('h3').textContent].join(' | '); })()`);

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: mobile === '1' });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: process.env.RM || 'no-preference' }] });
await send('Page.navigate', { url });
await sleep(6500);

// Walk down to the tabs in small steps so scroll triggers fire like a real scroll
const goTo = async () => {
  const to = await js(`Math.round(document.getElementById('wb-tabs').getBoundingClientRect().top + scrollY - 100)`);
  const from = await js('scrollY');
  for (let k = 1; k <= 10; k++) { await js(`window.scrollTo(0, ${Math.round(from + ((to - from) * k) / 10)}); 1`); await sleep(60); }
  await sleep(900);
};
await goTo();
await shot('wb-1-engine-start');

// 1. Engine: drag the crank pin 180° clockwise around the crank centre
const c = JSON.parse(await js(`JSON.stringify((() => { const r = document.querySelector('#wb-crank circle').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, s: r.width / 108 }; })())`));
const R = 38 * c.s;
await mouse('mousePressed', c.x, c.y - R);
for (let k = 1; k <= 18; k++) { const a = (Math.PI * k) / 18; await mouse('mouseMoved', c.x + R * Math.sin(a), c.y - R * Math.cos(a)); await sleep(40); }
await sleep(200);
await mouse('mouseReleased', c.x, c.y + R);
await sleep(1200);
await shot('wb-2-engine-180');
console.log('engine after drag:', await card('engine'), await js(`document.getElementById('wb-angle').textContent`));
await js(`document.getElementById('wb-engine').focus(); 1`);
await sleep(300);
await js("gsap.getProperty('#wb-crank', 'rotation')"); // wakes headless frames; without it the keys race the throw tween
for (let k = 0; k < 12; k++) await key('ArrowRight', 'ArrowRight', 39); // +180° by keyboard
// headless paints frames only while CDP is busy: poll until the key turn has finished (fixed polls sometimes read it mid-tween, ~200°)
for (let q = 0; q < 60 && await js("gsap.getTweensOf('#wb-crank').length"); q++) await sleep(100);
console.log('engine after 12x ArrowRight:', await card('engine'), await js(`document.getElementById('wb-angle').textContent`));
await shot('wb-3-engine-power');

// 2. Gearbox: arrow key on the tab list, then shift from N up to 3rd with the keyboard
await js(`document.getElementById('wb-tab-engine').focus(); 1`);
await key('ArrowRight', 'ArrowRight', KEYS.ArrowRight);
await sleep(300);
console.log('tab after ArrowRight:', await js(`document.activeElement.id + ' selected=' + document.activeElement.getAttribute('aria-selected')`));
await js(`document.getElementById('wb-gear').focus(); 1`);
await key('ArrowRight', 'ArrowRight', KEYS.ArrowRight);
await key('ArrowRight', 'ArrowRight', KEYS.ArrowRight);
await goTo();
await sleep(600);
await shot('wb-4-gear-3');
console.log('gearbox:', await card('gearbox'), 'valuetext:', await js(`document.getElementById('wb-gear').getAttribute('aria-valuetext')`));

// 3. Brakes: hold the button with the mouse
await js(`document.getElementById('wb-tab-gearbox').focus(); 1`);
await key('ArrowRight', 'ArrowRight', KEYS.ArrowRight);
await goTo();
const b = JSON.parse(await js(`JSON.stringify(document.getElementById('wb-brake-btn').getBoundingClientRect())`));
await mouse('mousePressed', b.x + b.width / 2, b.y + b.height / 2);
await sleep(900);
await shot('wb-5-brake-hold');
console.log('brakes holding:', await card('brakes'));
await sleep(4500);
console.log('brakes later:', await card('brakes'));
await mouse('mouseReleased', b.x + b.width / 2, b.y + b.height / 2);
await sleep(400);
await shot('wb-6-brake-release');
console.log('brakes released:', await card('brakes'), 'pressed:', await js(`document.getElementById('wb-brake-btn').getAttribute('aria-pressed')`));

// 4. Suspension: End on the tab list, then End on the slider (big bump)
await js(`document.getElementById('wb-tab-brakes').focus(); 1`);
await key('End', 'End', KEYS.End);
await goTo();
await js(`document.getElementById('wb-bump').focus(); 1`);
await key('End', 'End', KEYS.End);
await sleep(250);
await shot('wb-7-bump-jolt');
await sleep(1800);
await shot('wb-8-bump-settled');
console.log('suspension:', await card('suspension'), 'value:', await js(`document.getElementById('wb-bump').value`));
console.log('hScroll:', await js('document.documentElement.scrollWidth > innerWidth'));
console.log(logs.length ? logs.join('\n') : 'NO CONSOLE ERRORS');
ws.close(); chrome.kill(); process.exit(0);
