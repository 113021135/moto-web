// Ride mode + coach in headless Chrome: throttle, shift, brake, lean, replay, log, leave. Screenshots each tip.
// node tools/test-ride.mjs <url> <outDir> [width] [height] [mobile 0|1]    (RM=reduce for reduced motion)
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
const KEYS = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, KeyE: 69, KeyQ: 81, KeyT: 84, Escape: 27 };
const keyName = (c) => (c.startsWith('Key') ? c.slice(3).toLowerCase() : c);
const down = (c) => send('Input.dispatchKeyEvent', { type: 'keyDown', code: c, key: keyName(c), windowsVirtualKeyCode: KEYS[c] });
const up = (c) => send('Input.dispatchKeyEvent', { type: 'keyUp', code: c, key: keyName(c), windowsVirtualKeyCode: KEYS[c] });
const tap = async (c) => { await down(c); await up(c); };
const state = () => js(`JSON.stringify({ mode: document.getElementById('ride').dataset.mode, tip: document.getElementById('coach-card').classList.contains('is-on') ? document.getElementById('coach-title').textContent : '-', gear: document.getElementById('hud-gear').textContent, speed: document.getElementById('ride-speed').textContent, log: document.getElementById('ride-log-count').textContent, coachHidden: document.getElementById('ride-coach').hidden })`);
const tip = () => js(`document.getElementById('coach-card').classList.contains('is-on') ? document.getElementById('coach-title').textContent : ''`);
// wait until a tip other than `prev` is showing
async function waitTip(prev, ms) {
  for (let t = 0; t < ms; t += 250) { const now = await tip(); if (now && now !== prev) return now; await sleep(250); }
  return '(none)';
}
// wait until the 6 s gap after the current tip has passed (its 7 s timer bar is nearly empty)
async function waitGap(ms = 30000) {
  for (let t = 0; t < ms; t += 250) { if ((await js(`parseFloat(document.getElementById('coach-timer').style.transform.slice(7)) || 0`)) < 0.2) return; await sleep(250); } // the gap opens at 1/7
}

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: mobile === '1' });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: process.env.RM || 'no-preference' }] });
await send('Page.navigate', { url });
await sleep(6500);
await js(`localStorage.removeItem('ride-log'); document.querySelector('.mode[data-mode=ride]').click(); 1`);
await sleep(1500);

await down('ArrowUp');
let t1 = await waitTip('', 15000);
await sleep(1200); await shot('r1-throttle');
console.log('1 throttle:', t1, await state());

await sleep(1500);
if (mobile === '1') await js(`document.querySelector('.pad-btn[data-shift="1"]').click(); 1`); else await tap('KeyE');
await waitGap();
let t2 = await waitTip(t1, 15000);
await sleep(900); await shot('r2-shift');
console.log('2 shift:', t2, await state());

await waitGap();
await up('ArrowUp'); await down('ArrowDown');
let t3 = await waitTip(t2, 10000);
await sleep(500); await shot('r3-brake');
console.log('3 brake:', t3, await state());
await up('ArrowDown');

await waitGap();
await down('ArrowUp'); await down('ArrowLeft');
let t4 = await waitTip(t3, 20000);
await sleep(900); await shot('r4-lean');
console.log('4 lean:', t4, await state());
await up('ArrowLeft'); await up('ArrowUp');

for (let t = 0; t < 30000 && (await tip()); t += 250) await sleep(250); // tip hides on its own
console.log('5 auto-hide:', await state());
await tap('KeyT'); await sleep(900);
console.log('6 replay T:', await state());
await js(`document.getElementById('ride-log-btn').click(); 1`); await sleep(600); await shot('r5-log');
console.log('7 log open:', await js(`document.getElementById('ride-log-btn').getAttribute('aria-expanded') + ' list hidden=' + document.getElementById('ride-log').hidden + ' saved=' + localStorage.getItem('ride-log')`));
await tap('Escape'); await sleep(600);
console.log('8 Escape 1 (dismiss tip):', await state());
await tap('Escape'); await sleep(1200);
console.log('9 Escape 2 (leave ride):', await state());
await js(`document.querySelector('.mode[data-mode=ride]').click(); 1`); await sleep(1500);
console.log('10 ride again (fresh):', await state());
for (let i = 0; i < 2; i++) { if (mobile === '1') await js(`document.querySelector('.pad-btn[data-shift="1"]').click(); 1`); else await tap('KeyE'); await sleep(400); }
if (mobile === '1') await js(`document.querySelector('.pad-btn[data-shift="-1"]').click(); 1`); else await tap('KeyQ');
await sleep(600);
console.log('11 shift up, up, down from N (expect gear 1):', await state());
console.log('hScroll:', await js('document.documentElement.scrollWidth > innerWidth'));
console.log(logs.length ? logs.join('\n') : 'NO CONSOLE ERRORS');
ws.close(); chrome.kill(); process.exit(0);
