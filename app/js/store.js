// store.js — the earned set: saved in localStorage, exported to a file,
// imported back from one. Nothing leaves the browser unless the reader
// presses Export. The stored value is a plain JSON array of trophy names.

export const STORAGE_KEY = 'leonida-ledger-earned-v1';

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((name) => typeof name === 'string'));
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
  } catch {
    // A full or blocked localStorage must not break the checklist.
  }
}

/** Clears the saved progress entirely (the Reset button's job). */
export function clearEarned() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // A blocked localStorage must not break the reset.
  }
}

export function exportEarned(earned) {
  const payload = {
    app: 'Leonida Ledger — GTA VI trophy tracker',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(url);
}

/** Reads an imported file and returns the earned names it holds, or throws. */
export async function readImportedFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('not a progress file');
  return names.filter((name) => typeof name === 'string');
}

/** Keeps only names that belong to the official list. */
export function keepKnownNames(names, trophies) {
  const known = new Set(trophies.map((t) => t.name));
  return new Set(names.filter((name) => known.has(name)));
}
