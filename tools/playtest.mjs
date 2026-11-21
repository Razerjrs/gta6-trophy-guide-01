// playtest.mjs — drives the built guide in headless Chrome over CDP and
// checks the interactive paths the screenshots do not show: the kind
// filters, the search box, the grade filter, the spoiler mask, the roadmap
// and missables pages, and that export/import wiring exists without errors.
// Run from the repo root:  node tools/playtest.mjs
// Exits non-zero on the first failed check.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9223;
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const appDir = join(repoRoot, 'app');

const doc = JSON.parse(readFileSync(join(appDir, 'data/trophies.json'), 'utf8'));
const SEEDED_IDS = [2, 3, 4, 8, 15, 16, 19, 21, 33, 35, 42, 44, 46];
const seededNames = doc.trophies.filter((t) => SEEDED_IDS.includes(t.id)).map((t) => t.name);
const seedScript = `localStorage.setItem('leonida-ledger-earned-v1', ${JSON.stringify(JSON.stringify(seededNames))});`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failures = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
  if (!ok) failures += 1;
}

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
  throw new Error('Chrome did not start');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const consoleErrors = [];
    ws.onopen = () => resolve({
      ws, consoleErrors,
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
        if (message.error) rej(new Error(message.error.message));
        else res(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(`exception: ${message.params.exceptionDetails.text}`);
      } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        consoleErrors.push(`console.error: ${message.params.args.map((a) => a.value ?? '').join(' ')}`);
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

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--allow-file-access-from-files',
    '--no-sandbox',
    '--window-size=1280,800',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitForChrome();
    const target = await httpJson(`/json/new?file://${appDir}/index.html`, 'PUT');
    const session = await connect(target.webSocketDebuggerUrl);
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript });
    await session.send('Page.navigate', { url: `file://${appDir}/index.html` });
    await waitFor(session, `document.querySelectorAll('.trophy-row').length === 55`, '55 rows');

    check('checklist rows', await evaluate(session, `document.querySelectorAll('.trophy-row').length`), 55);
    check('counters line', await evaluate(session, `document.getElementById('counters').textContent.includes('13 of 55 earned')`), true);
    check('progress bar', await evaluate(session, `document.getElementById('progressFill').style.width`), '24%');
    check('earned checkboxes', await evaluate(session, `document.querySelectorAll('.trophy-row input:checked').length`), 13);

    // Kind filter: Missable shows the 13 flagged trophies (1 possible + 5 windows + 7 moments).
    await evaluate(session, `document.querySelector('[data-kind="missable"]').click()`);
    await sleep(300);
    check('missable filter rows', await evaluate(session, `document.querySelectorAll('.trophy-row').length`), 13);
    await evaluate(session, `document.querySelector('[data-kind="all"]').click()`);
    await sleep(300);

    // Search: "bowling" finds the bowling alley and the melee drive-by.
    await evaluate(session, `document.getElementById('search').value = 'bowling'; document.getElementById('search').dispatchEvent(new Event('input', { bubbles: true }));`);
    await sleep(300);
    check('search bowling rows', await evaluate(session, `document.querySelectorAll('.trophy-row').length`), 2);
    await evaluate(session, `document.getElementById('search').value = ''; document.getElementById('search').dispatchEvent(new Event('input', { bubbles: true }));`);
    await sleep(300);

    // Grade filter: silver shows 6.
    await evaluate(session, `document.getElementById('gradeFilter').value = 'silver'; document.getElementById('gradeFilter').dispatchEvent(new Event('change', { bubbles: true }));`);
    await sleep(300);
    check('silver filter rows', await evaluate(session, `document.querySelectorAll('.trophy-row').length`), 6);
    await evaluate(session, `document.getElementById('gradeFilter').value = 'all'; document.getElementById('gradeFilter').dispatchEvent(new Event('change', { bubbles: true }));`);
    await sleep(300);

    // Spoiler setting: an unearned story trophy is masked in list and pane.
    await evaluate(session, `document.getElementById('spoilerToggle').click()`);
    await sleep(300);
    check('masked name in list', await evaluate(session, `document.querySelector('[data-id="5"] .trophy-name').textContent`), 'Hidden trophy');
    await evaluate(session, `document.querySelector('[data-id="5"]').click()`);
    await sleep(300);
    check('masked name in pane', await evaluate(session, `document.querySelector('#detailPanel h2').textContent`), 'Hidden trophy');
    check('masked guide in pane', await evaluate(session, `document.querySelector('#detailPanel').textContent.includes('Hidden until this trophy is earned')`), true);
    await evaluate(session, `document.getElementById('spoilerToggle').click()`);
    await sleep(300);

    // Toggling earned updates the counters and persists to localStorage.
    await evaluate(session, `document.querySelector('[data-id="5"] input').click()`);
    await sleep(300);
    check('counters after tick', await evaluate(session, `document.getElementById('counters').textContent.includes('14 of 55 earned')`), true);
    check('localStorage saved', await evaluate(session, `JSON.parse(localStorage.getItem('leonida-ledger-earned-v1')).length`), 14);

    // Roadmap and missables pages render their stages and groups.
    await evaluate(session, `document.querySelector('[data-view="roadmap"]').click()`);
    await sleep(300);
    check('roadmap stages', await evaluate(session, `document.querySelectorAll('.stage').length`), 6);
    check('roadmap chips total', await evaluate(session, `document.querySelectorAll('.stage-trophies li').length`), 55);
    await evaluate(session, `document.querySelector('[data-view="missables"]').click()`);
    await sleep(300);
    check('missable groups', await evaluate(session, `document.querySelectorAll('.missable-group').length`), 3);

    // Export/import controls exist and the about page lists the sources.
    await evaluate(session, `document.querySelector('[data-view="about"]').click()`);
    await sleep(300);
    check('about source links', await evaluate(session, `document.querySelectorAll('#aboutPage a').length`), 5);
    check('export button present', await evaluate(session, `document.getElementById('exportBtn') !== null`), true);
    check('import input present', await evaluate(session, `document.getElementById('importFile') !== null`), true);

    check('console errors', session.consoleErrors.length, 0);
    if (session.consoleErrors.length > 0) console.log(session.consoleErrors.join('\n'));
    session.ws.close();
  } finally {
    chrome.kill();
  }
  console.log(failures === 0 ? 'PLAY-TEST: ALL PASS' : `PLAY-TEST: ${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
