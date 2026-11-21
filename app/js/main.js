// main.js — boots Leonida Ledger: loads the trophy list, wires the tabs,
// the filters, the spoiler setting and export/import, and keeps the URL
// hash in step with the view so a link opens the same screen.

import { loadTrophies } from './data.js';
import { DEFAULT_FILTERS } from './filters.js';
import { exportEarned, clearEarned, keepKnownNames, loadEarned, readImportedFile, saveEarned } from './store.js';
import { renderAbout, renderChecklist, renderDetail, renderMissables, renderRoadmap, updateCounters, updateProgress } from './views.js';

export const SPOILER_KEY = 'leonida-ledger-spoilers-v1';

const state = {
  trophies: [],
  sources: {},
  note: '',
  earned: loadEarned(),
  filters: { ...DEFAULT_FILTERS, earned: loadEarned() },
  selectedId: null,
  view: 'checklist',
};

function showView(view) {
  state.view = view;
  const pages = { checklist: null, roadmap: 'roadmapPage', missables: 'missablesPage', about: 'aboutPage' };
  document.querySelector('.layout').style.display = view === 'checklist' ? '' : 'none';
  document.getElementById('controls').style.display = view === 'checklist' ? '' : 'none';
  for (const [name, id] of Object.entries(pages)) {
    if (id) document.getElementById(id).hidden = name !== view;
  }
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.view === view);
  }
  if (view === 'roadmap') renderRoadmap(state, selectTrophy);
  if (view === 'missables') renderMissables(state, selectTrophy);
  if (view === 'about') renderAbout(state);
}

function renderAll() {
  state.filters.earned = state.earned;
  updateProgress(state.trophies, state.earned);
  updateCounters(state.trophies, state.earned);
  renderChecklist(state, selectTrophy, toggleEarned);
  renderDetail(state, toggleEarned);
  if (state.view === 'roadmap') renderRoadmap(state, selectTrophy);
  if (state.view === 'missables') renderMissables(state, selectTrophy);
}

function selectTrophy(trophy) {
  state.selectedId = trophy.id;
  showView('checklist');
  location.hash = `#/trophy/${trophy.id}`;
  renderAll();
  document.getElementById('detailPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleEarned(trophy) {
  if (state.earned.has(trophy.name)) state.earned.delete(trophy.name);
  else state.earned.add(trophy.name);
  saveEarned(state.earned);
  renderAll();
}

function readHash() {
  const match = location.hash.match(/^#\/trophy\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    if (state.trophies.some((t) => t.id === id)) state.selectedId = id;
  }
  const viewMatch = location.hash.match(/^#\/(roadmap|missables|about)$/);
  if (viewMatch) showView(viewMatch[1]);
}

function wireControls() {
  document.getElementById('search').addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderAll();
  });
  for (const chip of document.querySelectorAll('#kindChips .chip')) {
    chip.addEventListener('click', () => {
      state.filters.kind = chip.dataset.kind;
      for (const other of document.querySelectorAll('#kindChips .chip')) {
        other.classList.toggle('is-active', other === chip);
      }
      renderAll();
    });
  }
  document.getElementById('gradeFilter').addEventListener('change', (event) => {
    state.filters.grade = event.target.value;
    renderAll();
  });
  document.getElementById('statusFilter').addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderAll();
  });
  document.getElementById('spoilerToggle').addEventListener('change', (event) => {
    state.filters.hideSpoilers = event.target.checked;
    try {
      localStorage.setItem(SPOILER_KEY, event.target.checked ? '1' : '0');
    } catch {
      // A blocked localStorage must not break the toggle.
    }
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', () => exportEarned(state.earned));
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const names = await readImportedFile(file);
      state.earned = keepKnownNames(names, state.trophies);
      saveEarned(state.earned);
      renderAll();
    } catch {
      alert('That file is not a Leonida Ledger progress export.');
    }
    event.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies? This cannot be undone.')) {
      state.earned = new Set();
      clearEarned();
      renderAll();
    }
  });
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => {
      showView(tab.dataset.view);
      location.hash = tab.dataset.view === 'checklist' ? '' : `#/${tab.dataset.view}`;
    });
  }
  window.addEventListener('hashchange', readHash);
}

async function boot() {
  const doc = await loadTrophies();
  state.trophies = doc.trophies;
  state.sources = doc.sources ?? {};
  state.note = doc.note ?? '';
  state.earned = keepKnownNames([...state.earned], state.trophies);
  state.filters.earned = state.earned;
  try {
    state.filters.hideSpoilers = localStorage.getItem(SPOILER_KEY) === '1';
    document.getElementById('spoilerToggle').checked = state.filters.hideSpoilers;
  } catch {
    // A blocked localStorage must not break the boot.
  }
  wireControls();
  readHash();
  showView(state.view);
  renderAll();
}

boot().catch((error) => {
  document.getElementById('trophyList').innerHTML = '';
  const note = document.createElement('p');
  note.className = 'empty-note';
  note.textContent = `The trophy list did not load: ${error.message}`;
  document.getElementById('trophyList').append(note);
});
