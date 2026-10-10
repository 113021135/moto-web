// Service bay in headless Chrome: lift two tools (mouse + keyboard), tick all six T-CLOCS checks, untick one, header at 900px.
// node tools/test-service.mjs <url> <outDir> [width] [height] [mobile 0|1]   (RM=reduce to test reduced motion)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , url, outDir, width = '1440', height = '900', mobile = '0'] = process.argv;
mkdirSync(outDir, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9337', `--user-data-dir=${outDir}/profile`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9337/json')).json(); break; } catch { await sleep(250); } }
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
const shot = async (n, clip) => writeFileSync(`${outDir}/${n}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png', ...(clip && { clip: { ...clip, scale: 1 } }) })).result.data, 'base64'));
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const key = async (k, code = k, kc = 0) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: kc, ...(k === 'Enter' && { text: String.fromCharCode(13) }) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: kc });
};
const settle = async (n = 8) => { for (let q = 0; q < n; q++) { await js('1'); await sleep(120); } }; // headless paints frames only while CDP is busy
const click = async (sel) => {
  const r = JSON.parse(await js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); const b = e.getBoundingClientRect(); if (b.top < 80 || b.bottom > innerHeight) e.scrollIntoView({ block: 'center' }); return JSON.stringify(e.getBoundingClientRect()); })()`)); // only on-screen clicks land
  await mouse('mousePressed', r.x + r.width / 2, r.y + r.height / 2);
  await mouse('mouseReleased', r.x + r.width / 2, r.y + r.height / 2);
};
// Walk down in small steps so scroll triggers fire like a real scroll
const goTo = async (sel, offset = 90) => {
  const to = await js(`Math.round(document.querySelector('${sel}').getBoundingClientRect().top + scrollY - ${offset})`);
  const from = await js('scrollY');
  for (let k = 1; k <= 10; k++) { await js(`window.scrollTo(0, ${Math.round(from + ((to - from) * k) / 10)}); 1`); await sleep(60); }
  await settle();
};
const state = () => js(`[...document.querySelectorAll('.sv-tool')].map((b) => b.dataset.tool + '=' + b.getAttribute('aria-pressed')).join(' ') + ' | ticket: ' + document.getElementById('sv-name').textContent + ' / ' + document.querySelectorAll('#sv-body dd, #sv-body li').length + ' lines'`);

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: mobile === '1' });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: process.env.RM || 'no-preference' }] });
await send('Page.navigate', { url });
await sleep(6500);

await goTo('#sv-tools');
await shot('sv-1-wall');
console.log('start:', await state());

// Tool 1 by mouse, tool 2 (oil can) by keyboard
await click('.sv-tool[data-tool="gauge"]');
await settle(10);
console.log('gauge clicked:', await state(), 'lift y:', await js(`Math.round(gsap.getProperty('.sv-tool[data-tool="gauge"] .sv-art', 'y'))`));
await goTo('#sv-tools');
await shot('sv-2-tool-gauge');
await js(`document.querySelector('.sv-tool[data-tool="oil"]').focus(); 1`);
await key('Enter', 'Enter', 13);
await settle(10);
console.log('oil by Enter:', await state(), 'gauge back y:', await js(`Math.round(gsap.getProperty('.sv-tool[data-tool="gauge"] .sv-art', 'y'))`));
await shot('sv-3-tool-oil'); // phone: the ticket scrolled into view
await goTo('#sv-tools');
await shot('sv-3b-tool-oil-board');

// T-CLOCS: five by mouse, the last by Space
await goTo('#sv-check');
const n = await js(`document.querySelectorAll('.sv-row').length`);
for (let i = 1; i < n; i++) await click(`.sv-row:nth-child(${i}) strong`);
await js(`document.querySelector('.sv-row:nth-child(${n}) input').focus(); 1`);
await key(' ', 'Space', 32);
await settle(12);
const stampInfo = () => js(`(() => { const s = document.getElementById('sv-stamp'); return 'count: ' + document.getElementById('sv-count').textContent + ' | stamp opacity ' + getComputedStyle(s).opacity + ' ' + getComputedStyle(s).visibility; })()`);
console.log('all ticked:', await stampInfo());
await goTo('#sv-stamp', 500);
console.log('viewport:', await js('innerWidth + "/" + document.documentElement.scrollWidth'));
await shot('sv-4-stamp');
await click('.sv-row:nth-child(2) strong');
await settle(10);
console.log('one unticked:', await stampInfo());

// Touch targets and overflow
console.log('min target h:', await js(`Math.min(...[...document.querySelectorAll('.sv-tool, .sv-row')].map((e) => Math.round(e.getBoundingClientRect().height)))`),
  'hScroll:', await js('document.documentElement.scrollWidth > innerWidth'));

// Header at 900px wide (desktop only): nav must fit between the wordmark and the buttons
if (mobile !== '1') {
  for (const w of [761, 900, 941, 1100, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
    await js('window.scrollTo(0, document.documentElement.scrollHeight * 0.3); 1');
    await settle(10);
    console.log(`header ${w}:`, await js(`(() => { const n = document.getElementById('site-nav'), a = [...n.querySelectorAll('a')], wm = document.querySelector('.wordmark').getBoundingClientRect(), act = document.querySelector('.nav-actions').getBoundingClientRect(); const vis = getComputedStyle(n).visibility !== 'hidden' && getComputedStyle(document.getElementById('menu-toggle')).display === 'none'; return vis ? 'nav inline, fits=' + (a[0].getBoundingClientRect().left >= wm.right && a.at(-1).getBoundingClientRect().right <= act.left && act.right <= innerWidth && a.every((x) => x.getBoundingClientRect().height < 40)) : 'menu button'; })()`));
    await shot(`sv-5-header-${w}`, { x: 0, y: await js('scrollY'), width: w, height: 110 }); // clip is in page coordinates
  }
}
console.log(logs.length ? logs.join('\n') : 'NO CONSOLE ERRORS');
ws.close(); chrome.kill(); process.exit(0);
