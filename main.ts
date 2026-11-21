// Leonida Ledger — a GTA 6 trophy guide and tracker, handed in for
// make.fun's gta6-trophy-guide-01 bounty (Node 22, standard library only).
//
// The entry is plain static files: app/ is the guide itself (index.html,
// its CSS and ES modules, and app/data/trophies.json with all 55 official
// trophies and a cited guide to each), and screenshots/ holds four real
// renders of it in a browser. This program copies both folders into the
// output directory and writes dossier.json with the vendored make.fun
// library, the summary the judge reads. vendor/makefun-frontend.ts is the
// kit's copy, unchanged — the scorer rebuilds the dossier with its own
// copy and compares the two byte for byte.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the dossier's bytes; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files and
// directories in app/ or 48 MiB of app files — app/ counts beside /output's
// own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
console.log(`Leonida Ledger handed in: app/ + screenshots/ copied to ${outDir}, dossier.json written.`);
