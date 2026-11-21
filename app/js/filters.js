// filters.js — which trophies the checklist shows, and how the spoiler
// setting hides story trophies until they are earned.

import { isMissable, isSpoiler } from './data.js';

export const DEFAULT_FILTERS = {
  search: '',
  kind: 'all',
  grade: 'all',
  status: 'all',
  hideSpoilers: false,
};

/** The official list has no online-only trophy: the Online kind is empty
    on purpose, and the view says so instead of pretending otherwise. */
export function searchMatches(trophy, needle) {
  if (!needle) return true;
  const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
  return haystack.includes(needle);
}

export function filterTrophies(trophies, filters) {
  const needle = filters.search.trim().toLowerCase();
  return trophies.filter((trophy) => {
    if (filters.kind === 'story' && trophy.kind !== 'story') return false;
    if (filters.kind === 'missable' && !isMissable(trophy)) return false;
    if (filters.kind === 'collectibles' && trophy.kind !== 'collectibles') return false;
    if (filters.kind === 'activities' && trophy.kind !== 'activities') return false;
    if (filters.kind === 'online') return false;
    if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
    if (filters.status === 'earned' && !filters.earned.has(trophy.name)) return false;
    if (filters.status === 'remaining' && filters.earned.has(trophy.name)) return false;
    return searchMatches(trophy, needle);
  });
}

/** With spoilers hidden, a story trophy the reader has not earned yet shows
    its grade and kind but not its name or description. */
export function spoilerMasked(trophy, filters) {
  return filters.hideSpoilers && isSpoiler(trophy) && !filters.earned.has(trophy.name);
}

export function kindCounts(trophies) {
  const counts = { story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const trophy of trophies) {
    if (trophy.kind === 'story') counts.story += 1;
    if (trophy.kind === 'collectibles') counts.collectibles += 1;
    if (trophy.kind === 'activities') counts.activities += 1;
    if (isMissable(trophy)) counts.missable += 1;
  }
  return counts;
}
