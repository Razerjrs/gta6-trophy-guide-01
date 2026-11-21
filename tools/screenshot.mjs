// screenshot.mjs — takes the entry's four screenshots with headless Chrome
// over CDP (Node 22's built-in WebSocket). Headless Chrome blocks localhost
// navigation in this sandbox, so the guide is opened via file:// with
// --allow-file-access-from-files, and progress (13 of 55 earned) is seeded
// into localStorage before the page's scripts run. Run from the repo root:
//   node tools/screenshot.mjs
// Writes screenshots/1-checklist.jpg … 4-spoilers.jpg, each 1280x800 JPEG.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9222;
const WIDTH = 1280;
const HEIGHT = 800;
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

// Thirteen earned trophies, a spread across the story, activities and
// collectibles, so the counters read mid-progress (13/55).
const SEEDED_IDS = [2, 3, 4, 8, 15, 16, 19, 21, 33, 35, 42, 44, 46];

const doc = JSON.parse(readFileSync(join(appDir, 'data/trophies.json'), 'utf8'));
const seededNames = doc.trophies.filter((t) => SEEDED_IDS.includes(t.id)).map((t) => t.name);
const seedScript = `localStorage.setItem('leonida-ledger-earned-v1', ${JSON.stringify(JSON.stringify(seededNames))});`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function httpJson(path, method = 'GET') {
  const response = await fetch(`http://127.0.0.1:${PORT}${path}`, { method });
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}`);
  return response.json();
}

async function waitForChrome() {
  for (let i = 0; i < 50; i++) {
    try {
      await httpJson('/json/version');
      return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error('Chrome did not start its DevTools endpoint');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const consoleErrors = [];
    ws.onopen = () => resolve({
      ws,
      consoleErrors,
      send(method, params = {}) {
        const id = nextId++;
        return new Promise((res, rej) => {
          pending.set(id, { res, rej });
          ws.send(JSON.stringify({ id, method, params }));
        });
      },
    });
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rej(new Error(`${message.error.message}`));
        else res(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(`exception: ${message.params.exceptionDetails.text} ${message.params.exceptionDetails.exception?.description ?? ''}`);
      } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        consoleErrors.push(`console.error: ${message.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      }
    };
  });
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(`evaluate failed: ${result.exceptionDetails.text}`);
  return result.result.value;
}

async function waitFor(session, expression, label) {
  for (let i = 0; i < 60; i++) {
    if (await evaluate(session, expression)) return;
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function capture(session, file, quality) {
  const shot = await session.send('Page.captureScreenshot', { format: 'jpeg', quality });
  const bytes = Buffer.from(shot.data, 'base64');
  writeFileSync(join(shotsDir, file), bytes);
  console.log(`${file}: ${bytes.length} bytes`);
  if (bytes.length > 262144) throw new Error(`${file} is over the 256 KiB gate limit`);
}

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--allow-file-access-from-files',
    '--no-sandbox',
    '--window-size=1280,800',
    '--hide-scrollbars',
    '--hatch-webgl-allowed-domains-file=/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt',
    '--hatch-webgl-allowed-domains-sha256=8097045f0459c96c4cdc76e3a1af4e0f43f640b4b59c43d6db35e3641c0264c6',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitForChrome();
    const target = await httpJson(`/json/new?file://${appDir}/index.html`, 'PUT');
    const session = await connect(target.webSocketDebuggerUrl);
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });
    await session.send('Page.navigate', { url: `file://${appDir}/index.html` });
    await waitFor(session, `document.querySelectorAll('.trophy-row').length === 55`, '55 checklist rows');

    // Shot 1 (cover): the checklist with a guide open beside it — Positive
    // Mental Attitude, the possibly-missable trophy, shows its guide, its
    // missable note and its sources in the detail pane.
    await evaluate(session, `document.querySelector('[data-id="28"]').click()`);
    await sleep(400);
    await evaluate(session, `window.scrollTo(0, 0)`);
    await sleep(200);
    await capture(session, '1-checklist.jpg', 80);

    // Shot 2: the roadmap to the platinum.
    await session.send('Page.navigate', { url: `file://${appDir}/index.html#/roadmap` });
    await waitFor(session, `document.querySelectorAll('.stage').length === 6`, 'roadmap stages');
    await evaluate(session, `window.scrollTo(0, 0)`);
    await sleep(300);
    await capture(session, '2-roadmap.jpg', 80);

    // Shot 3: the missables page.
    await session.send('Page.navigate', { url: `file://${appDir}/index.html#/missables` });
    await waitFor(session, `document.querySelectorAll('.missable-group').length === 3`, 'missable groups');
    await evaluate(session, `window.scrollTo(0, 0)`);
    await sleep(300);
    await capture(session, '3-missables.jpg', 80);

    // Shot 4: the spoiler setting at work — story trophies hidden until earned.
    // The toggle is on and an unearned hidden trophy is selected, so both the
    // list and the detail pane show the masked state.
    await session.send('Page.navigate', { url: `file://${appDir}/index.html` });
    await waitFor(session, `document.querySelectorAll('.trophy-row').length === 55`, '55 checklist rows');
    await evaluate(session, `document.getElementById('spoilerToggle').click()`);
    await sleep(300);
    await evaluate(session, `document.querySelector('[data-id="5"]').click()`);
    await sleep(400);
    await evaluate(session, `window.scrollTo(0, 0)`);
    await sleep(200);
    await capture(session, '4-spoilers.jpg', 80);

    const errors = session.consoleErrors;
    console.log(errors.length === 0 ? 'console errors: none' : `console errors:\n${errors.join('\n')}`);
    session.ws.close();
    if (errors.length > 0) process.exitCode = 1;
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
