import type { ActivityRecord } from '../types';
import { requestStatusLabel, requestStatusTone, type RequestStatusTone } from './acquisition';
import { upgradeDetailHref } from './upgrades';

export function activityStatusLabel(rec: Pick<ActivityRecord, 'status' | 'status_label'>): string {
  const label = (rec.status_label || '').trim();
  if (label) return label;
  return requestStatusLabel(rec.status);
}

export function activityStatusTone(status: string): RequestStatusTone {
  return requestStatusTone(status);
}

export function activityDetailHref(item: { item_type?: string; item_id?: string }): string | null {
  if (!item.item_id || !item.item_type) return null;
  return upgradeDetailHref({ item_type: item.item_type, item_id: item.item_id });
}

/** True when a failed import can be retried from Downloads. */
export function activityCanRetryImport(status: string): boolean {
  return status.trim().toLowerCase() === 'import_failed';
}

/** True when a stalled or failed grab should search again. */
export function activityCanSearchAgain(status: string): boolean {
  switch (status.trim().toLowerCase()) {
    case 'stalled':
    case 'failed':
      return true;
    default:
      return false;
  }
}

export function splitActivity(items: ActivityRecord[]): {
  attention: ActivityRecord[];
  active: ActivityRecord[];
  recent: ActivityRecord[];
} {
  const attention: ActivityRecord[] = [];
  const active: ActivityRecord[] = [];
  const recent: ActivityRecord[] = [];
  for (const rec of items) {
    const st = rec.status.trim().toLowerCase();
    if (rec.stuck || rec.warning || st === 'import_failed' || st === 'stalled' || st === 'failed') {
      attention.push(rec);
      continue;
    }
    if (st === 'downloading' || st === 'queued' || st === 'grabbing') {
      active.push(rec);
      continue;
    }
    recent.push(rec);
  }
  return { attention, active, recent };
}
