// data.js — loads app/data/trophies.json and the small lookups the views share.
// The file holds no trophy facts of its own: every name, description, grade,
// hidden flag, count and guide comes from trophies.json.

export async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('trophies.json did not load');
  const doc = await response.json();
  return doc;
}

export const GRADE_LABELS = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

export const GRADE_LETTERS = {
  platinum: 'P',
  gold: 'G',
  silver: 'S',
  bronze: 'B',
};

export const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
  meta: 'Platinum',
};

export const MISSABLE_LABELS = {
  possible: 'Possibly missable',
  'story-window': 'Story window — do it when it appears',
  'story-moment': 'Story moment — earn it during the mission',
};

export function missableLabel(trophy) {
  return trophy.missable ? MISSABLE_LABELS[trophy.missable] : null;
}

export function isMissable(trophy) {
  return trophy.missable !== null && trophy.missable !== undefined;
}

/** A trophy counts as a spoiler when it is a story trophy or a hidden one. */
export function isSpoiler(trophy) {
  return trophy.kind === 'story' || trophy.hidden === true;
}

/** The target a trophy tracks, in words ("250 stunts", "$250,000"), or null. */
export function targetText(trophy) {
  if (trophy.target === null || trophy.target === undefined) return null;
  if (trophy.id === 52) return '$250,000 laundered';
  if (trophy.id === 53) return '$100,000 spent';
  return `Target: ${trophy.target.toLocaleString('en-US')}`;
}

export function countByGrade(trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) counts[t.grade] += 1;
  return counts;
}

/** How many of the list PlayStation hides until they are earned. */
export function hiddenCount(trophies) {
  return trophies.filter((t) => t.hidden).length;
}
