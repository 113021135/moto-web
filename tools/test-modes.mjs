// Exercise Showroom / Explore / Ride in headless Chrome and screenshot each step.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , url, outDir, width = '1440', height = '900', mobile = '0'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${outDir}/profile`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9334/json')).json(); break; } catch { await sleep(250); } }
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
const key = (type, code, keyName, vk) => send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: vk });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: mobile === '1' });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await send('Page.navigate', { url });
await sleep(6500);
await shot('01-showroom');
await js(`document.querySelector('.mode[data-mode=explore]').click(); 1`); await sleep(1500); await shot('02-explore');
await js(`document.querySelector('.hotspot[data-part=engine]').click(); 1`); await sleep(1500); await shot('03-engine');
console.log('card:', await js(`document.getElementById('part-name').textContent`));
await js(`document.querySelector('.part-btn[data-part=engine]').click(); document.getElementById('explode-btn').click(); 1`); await sleep(2200); await shot('04-explode');
await js(`document.getElementById('explode-btn').click(); document.getElementById('xray-btn').click(); 1`); await sleep(1800); await shot('05-xray');
await js(`document.querySelector('.mode[data-mode=ride]').click(); 1`); await sleep(1200);
await key('keyDown', 'ArrowUp', 'ArrowUp', 38); await sleep(1500);
await key('keyDown', 'ArrowLeft', 'ArrowLeft', 37); await sleep(900); await shot('06-ride-turn');
console.log('speed:', await js(`document.getElementById('ride-speed').textContent`));
await key('keyUp', 'ArrowLeft', 'ArrowLeft', 37); await key('keyUp', 'ArrowUp', 'ArrowUp', 38);
await js(`document.querySelector('.mode[data-mode=showroom]').click(); 1`); await sleep(1500); await shot('07-back');
console.log('scrollY after ride keys:', await js('scrollY'), 'hScroll:', await js('document.documentElement.scrollWidth > innerWidth'));
console.log(logs.length ? logs.join('\n') : 'NO CONSOLE ERRORS');
ws.close(); chrome.kill(); process.exit(0);
