// Scroll the "On the lift" tour in headless Chrome: screenshot steps 1, 4 and 8, then back to the hero.
// node tools/test-lift.mjs <url> <outDir> [width] [height] [mobile 0|1]   (STEPS=1,4,8 to pick steps)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , url, outDir, width = '1440', height = '900', mobile = '0'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${outDir}/profile`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9335/json')).json(); break; } catch { await sleep(250); } }
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
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: mobile === '1' });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: process.env.RM || 'no-preference' }] });
await send('Page.navigate', { url });
await sleep(6500);
const state = () => js(`JSON.stringify({ mode: document.getElementById('ride').dataset.mode, part: document.getElementById('part-name').textContent, rail: document.getElementById('lift-rail').classList.contains('is-on') })`);
for (const n of (process.env.STEPS || '1,4,8').split(',').map(Number)) {
  // walk there in small steps so the scroll triggers fire like a real scroll
  const to = await js(`(() => { const s = document.querySelectorAll('.lift-step')[${n - 1}]; return Math.round(s.getBoundingClientRect().top + scrollY + s.offsetHeight / 2 - innerHeight / 2); })()`);
  const from = await js('scrollY');
  for (let k = 1; k <= 10; k++) { await js(`window.scrollTo(0, ${Math.round(from + ((to - from) * k) / 10)}); 1`); await sleep(60); }
  await sleep(+(process.env.WAIT || 1800));
  await shot(`lift-step-${n}`);
  console.log(`step ${n}:`, await state());
}
await js('window.scrollTo(0, 0); 1');
await sleep(1800);
await shot('lift-back-to-hero');
console.log('back at top:', await state(), 'hScroll:', await js('document.documentElement.scrollWidth > innerWidth'));
console.log(logs.length ? logs.join('\n') : 'NO CONSOLE ERRORS');
ws.close(); chrome.kill(); process.exit(0);
