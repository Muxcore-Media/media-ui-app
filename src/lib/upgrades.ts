import type { CutoffItem } from '../types';

/** How far a title is below the quality-profile cutoff. Larger = more urgent. */
export function cutoffScoreGap(item: Pick<CutoffItem, 'current_score' | 'cutoff_score'>): number {
  return (item.cutoff_score ?? 0) - (item.current_score ?? 0);
}

/** Detail page that already hosts interactive search, with search=1 to start it. */
export function upgradeDetailHref(item: Pick<CutoffItem, 'item_type' | 'item_id'>): string | null {
  const id = item.item_id?.trim();
  if (!id) return null;
  switch (item.item_type.trim().toLowerCase()) {
    case 'tv':
    case 'show':
    case 'series':
      return `/tv/${encodeURIComponent(id)}?search=1`;
    case 'movie':
    case 'movies':
      return `/movies/${encodeURIComponent(id)}?search=1`;
    default:
      return null;
  }
}

export function upgradeKindLabel(itemType: string): string {
  switch (itemType.trim().toLowerCase()) {
    case 'tv':
    case 'show':
    case 'series':
      return 'TV Show';
    default:
      return 'Movie';
  }
}
