// views.js — renders every screen of the guide: the checklist with its
// detail pane, the roadmap to the platinum, the missables page, and the
// sources page. All text comes from trophies.json; nothing is invented here.

import { GRADE_LABELS, GRADE_LETTERS, KIND_LABELS, countByGrade, hiddenCount, isMissable, missableLabel, targetText } from './data.js';
import { filterTrophies, spoilerMasked } from './filters.js';

// The roadmap is our own order, built from the official descriptions:
// the story first, then the stranger strands, then the collectibles and
// the map, then the activities, then the money and mayhem clean-up, and
// 100% completion last — the platinum pops after all of them.
export const ROADMAP_STAGES = [
  {
    title: '1 · Play the story',
    note: 'Chapters 1 to 4, the final mission, and the six named story missions. These come in order as you play; nothing here needs a detour.',
    ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
  {
    title: '2 · Stranger strands and side finales',
    note: 'The stranger chains and their final missions. Start them early: reports say their windows are tied to story progress, so do not leave them all for the post-game.',
    ids: [22, 23, 24, 25, 26, 27, 29],
  },
  {
    title: '3 · Collectibles and the map',
    note: 'The long counts: cards, WAiNK spots, meditation spots, vehicles, areas and garages. Grab them as you pass them instead of hunting them all at the end.',
    ids: [28, 30, 31, 35, 42, 54, 55],
  },
  {
    title: '4 · Activities and challenges',
    note: 'Stunts, the shooting range, races, drone races, fishing, the arcade, bowling and the 50 challenges. One try of each activity type also earns Master of None.',
    ids: [15, 16, 17, 18, 19, 20, 21, 32, 36, 46, 51],
  },
  {
    title: '5 · Money, mayhem and clean-up',
    note: 'Robberies, wanted-level escapes, the cryptic moment trophies and the two money trophies. Most of these can be done any time in the open world.',
    ids: [33, 34, 37, 38, 39, 40, 41, 43, 44, 45, 47, 48, 49, 50, 52, 53],
  },
  {
    title: '6 · The last two',
    note: '100% completion, then the platinum. A Long Road is the gold that sits behind everything else; Vice Got a Price! pops the moment it is earned.',
    ids: [14, 1],
  },
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

export function updateProgress(trophies, earned) {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('earnedCount').textContent = String(done);
  document.getElementById('totalCount').textContent = String(total);
  document.getElementById('earnedPct').textContent = `${pct}%`;
  document.getElementById('progressFill').style.width = `${pct}%`;
}

export function updateCounters(trophies, earned) {
  const byGrade = countByGrade(trophies);
  const earnedByGrade = countByGrade(trophies.filter((t) => earned.has(t.name)));
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map(
    (grade) => `${GRADE_LABELS[grade]} ${earnedByGrade[grade]}/${byGrade[grade]}`,
  );
  document.getElementById('counters').innerHTML = '';
  const strong = el('strong', null, `${earned.size} of ${trophies.length} earned`);
  const rest = el('span', null, ` — ${parts.join(' · ')} · ${hiddenCount(trophies)} hidden on PlayStation until earned`);
  document.getElementById('counters').append(strong, rest);
}

export function renderChecklist(state, onSelect, onToggle) {
  const list = document.getElementById('trophyList');
  const shown = filterTrophies(state.trophies, state.filters);
  list.replaceChildren();
  document.getElementById('emptyNote').hidden = shown.length !== 0 || state.filters.kind === 'online';
  if (state.filters.kind === 'online') {
    const note = el('li', 'empty-note', 'The official list holds no online-only trophy: all 55 are earned in single-player. Nothing is hidden here — the Online filter is empty on purpose.');
    list.append(note);
  }
  for (const trophy of shown) {
    const earned = state.earned.has(trophy.name);
    const masked = spoilerMasked(trophy, state.filters);
    const row = el('li', `trophy-row${earned ? ' is-earned' : ''}${state.selectedId === trophy.id ? ' is-selected' : ''}`);
    row.dataset.id = String(trophy.id);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned;
    box.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : trophy.name} as earned`);
    box.addEventListener('change', (event) => {
      event.stopPropagation();
      onToggle(trophy);
    });
    row.append(box);

    const medal = el('span', `medal ${trophy.grade}`, GRADE_LETTERS[trophy.grade]);
    medal.title = GRADE_LABELS[trophy.grade];
    row.append(medal);

    const body = el('div');
    body.append(el('p', 'trophy-name', masked ? 'Hidden trophy' : trophy.name));
    body.append(el('p', 'trophy-desc', masked
      ? 'Hidden on PlayStation until earned. Earn it to reveal it, or turn the spoiler setting off.'
      : trophy.description));
    const tags = el('div', 'trophy-tags');
    tags.append(el('span', 'tag', KIND_LABELS[trophy.kind] ?? trophy.kind));
    if (trophy.hidden) tags.append(el('span', 'tag hidden-tag', 'Hidden on PSN'));
    if (isMissable(trophy)) tags.append(el('span', 'tag missable', missableLabel(trophy)));
    const target = targetText(trophy);
    if (target) tags.append(el('span', 'tag target', target));
    body.append(tags);
    row.append(body);

    row.append(el('span', 'tag', earned ? 'Earned ✓' : GRADE_LABELS[trophy.grade]));
    // A click on the checkbox itself must reach only the checkbox: if the
    // row handler re-rendered first, the checkbox's change event would fire
    // on a detached node and the tick would be lost.
    row.addEventListener('click', (event) => {
      if (event.target === box) return;
      onSelect(trophy);
    });
    list.append(row);
  }
}

export function renderDetail(state, onToggle) {
  const panel = document.getElementById('detailPanel');
  panel.replaceChildren();
  const trophy = state.trophies.find((t) => t.id === state.selectedId);
  if (!trophy) {
    panel.append(el('p', 'detail-empty', 'Pick a trophy from the list to read its guide, its sources, and when it can be missed.'));
    return;
  }
  const earned = state.earned.has(trophy.name);
  const masked = spoilerMasked(trophy, state.filters);
  panel.append(el('h2', null, masked ? 'Hidden trophy' : trophy.name));
  const gradeLine = el('p', 'grade-line');
  gradeLine.append(el('span', `medal ${trophy.grade}`, GRADE_LETTERS[trophy.grade]));
  gradeLine.append(document.createTextNode(`${GRADE_LABELS[trophy.grade]} · ${trophy.hidden ? 'Hidden on PlayStation until earned' : 'Shown on PlayStation'}`));
  panel.append(gradeLine);

  panel.append(el('h3', null, 'Official description'));
  panel.append(el('p', 'official-desc', masked
    ? 'Hidden on PlayStation until earned. Earn it to reveal it, or turn the spoiler setting off.'
    : trophy.description));

  panel.append(el('h3', null, 'Guide — our own words'));
  panel.append(el('p', null, masked
    ? 'Hidden until this trophy is earned — the guide names the mission it belongs to, so it stays hidden with the trophy.'
    : trophy.guide));

  if (isMissable(trophy)) {
    panel.append(el('h3', null, 'Can it be missed?'));
    panel.append(el('p', 'missable-note', missableNoteText(trophy)));
  }

  panel.append(el('h3', null, 'Sources'));
  const sources = el('ul', 'source-list');
  for (const key of trophy.sources) {
    const source = state.sources[key];
    if (!source) continue;
    const item = el('li');
    if (source.url) {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.label;
      item.append(link);
    } else {
      item.textContent = source.label;
    }
    sources.append(item);
  }
  const ownNote = el('li', null, 'Our own advice, from the official description — not yet checked in the game.');
  sources.append(ownNote);
  panel.append(sources);

  const button = el('button', `earn-toggle${earned ? ' earned' : ''}`, earned ? '✓ Earned — tap to unmark' : 'Mark as earned');
  button.type = 'button';
  button.addEventListener('click', () => onToggle(trophy));
  panel.append(button);
}

function missableNoteText(trophy) {
  if (trophy.missable === 'possible') {
    return 'Possibly missable: other guides (GTABase and PowerPyx, via EGamers.io) flag this as the one trophy that may be missable, so do it as you find the spots instead of saving it for the end.';
  }
  if (trophy.missable === 'story-window') {
    return 'Story window: reports (TechWiser, via CryptoGames) say the stranger-mission chains have windows tied to story progress. Do this strand when it appears rather than leaving it for after the story.';
  }
  return 'Story moment: this trophy is tied to one named mission. Earn it while you are in the mission — whether missions can be replayed afterwards is not confirmed yet.';
}

export function renderRoadmap(state, onSelect) {
  const page = document.getElementById('roadmapPage');
  page.replaceChildren();
  page.append(el('h2', null, 'Roadmap to the platinum'));
  page.append(el('p', 'lede', 'Six stages, built from the official descriptions: the story first, then the stranger strands, then the collectibles, then the activities, then the money and mayhem clean-up — and 100% completion last. Tap any trophy to open its guide.'));
  for (const stage of ROADMAP_STAGES) {
    const box = el('div', 'stage');
    const earnedInStage = stage.ids.filter((id) => {
      const trophy = state.trophies.find((t) => t.id === id);
      return trophy && state.earned.has(trophy.name);
    }).length;
    const heading = el('h3', null, `${stage.title} `);
    heading.append(el('span', 'stage-count', `— ${earnedInStage}/${stage.ids.length} earned`));
    box.append(heading);
    box.append(el('p', null, stage.note));
    const chips = el('ul', 'stage-trophies');
    for (const id of stage.ids) {
      const trophy = state.trophies.find((t) => t.id === id);
      if (!trophy) continue;
      const chip = el('li', state.earned.has(trophy.name) ? 'is-earned' : null);
      chip.append(el('span', 'mini-grade', GRADE_LETTERS[trophy.grade]));
      chip.append(document.createTextNode(trophy.name));
      chip.addEventListener('click', () => onSelect(trophy));
      chips.append(chip);
    }
    box.append(chips);
    page.append(box);
  }
}

export function renderMissables(state, onSelect) {
  const page = document.getElementById('missablesPage');
  page.replaceChildren();
  page.append(el('h2', null, 'Missable trophies'));
  page.append(el('p', 'lede', 'No complete verified missable list exists yet — the game is days old. What follows is built from the official descriptions plus the two reports that name a risk, and it says which is which. When in doubt, do the thing when it appears.'));
  const groups = [
    {
      title: 'Possibly missable — one trophy',
      note: 'GTABase and PowerPyx (reported by EGamers.io) flag this as the only trophy that may be missable. Clear its spots as you find them.',
      level: 'possible',
    },
    {
      title: 'Story windows — five stranger finales',
      note: 'TechWiser (reported by CryptoGames) says the stranger-mission chains have windows tied to story progress. Do each strand when it appears.',
      level: 'story-window',
    },
    {
      title: 'Story moments — seven named missions',
      note: 'These trophies are tied to one named mission each. The official descriptions give no extra objective, so the risk is only that a mission cannot be replayed — which is not confirmed yet.',
      level: 'story-moment',
    },
  ];
  for (const group of groups) {
    const box = el('div', 'missable-group');
    box.append(el('h3', null, group.title));
    box.append(el('p', null, group.note));
    const chips = el('ul', 'stage-trophies');
    for (const trophy of state.trophies.filter((t) => t.missable === group.level)) {
      const chip = el('li', state.earned.has(trophy.name) ? 'is-earned' : null);
      chip.append(el('span', 'mini-grade', GRADE_LETTERS[trophy.grade]));
      chip.append(document.createTextNode(`${trophy.name} — ${missableLabel(trophy)}`));
      chip.addEventListener('click', () => onSelect(trophy));
      chips.append(chip);
    }
    box.append(chips);
    page.append(box);
  }
}

export function renderAbout(state) {
  const page = document.getElementById('aboutPage');
  page.replaceChildren();
  page.classList.add('about-page');
  page.append(el('h2', null, 'Sources & honesty'));
  page.append(el('p', 'lede', 'A guide to a game that came out days ago cannot pretend to be verified. This page says where every fact comes from, and what we have not checked.'));
  page.append(el('h3', null, 'Where the list comes from'));
  const list = el('ul');
  for (const key of Object.keys(state.sources)) {
    const source = state.sources[key];
    const item = el('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = source.label;
    item.append(link);
    list.append(item);
  }
  page.append(list);
  page.append(el('h3', null, 'What is verified, and what is not'));
  const honest = el('ul');
  honest.append(el('li', null, 'Verified: all 55 names, descriptions and grades match the official list on Exophase and PSNProfiles, which agree on every one; the hidden 28 match the hidden lists published by Beebom and Insider Gaming.'));
  honest.append(el('li', null, 'Counts (42 Shooting Range challenges, 14 drone-race locations, 18 meditation spots, 100 WAiNK locations, 52 areas, 9 gangs, 8 garages, 9 activity types) are the PSN counts PSNProfiles tracks.'));
  honest.append(el('li', null, 'Not yet checked in the game: every guide step. The guides are our own advice from the official descriptions, and they say so wherever a place or a step is not pinned down.'));
  honest.append(el('li', null, 'Missables: one trophy is reported as possibly missable (Positive Mental Attitude, per GTABase and PowerPyx), and the stranger chains are reported to have story-tied windows (per TechWiser). No complete verified missable list exists yet.'));
  page.append(honest);
  page.append(el('h3', null, 'Offline, by design'));
  page.append(el('p', null, 'This guide is plain static files. It loads its trophy data from its own folder and makes no network request at run time, so it works with the network off and can be hosted anywhere.'));
}
