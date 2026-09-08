import { describe, expect, it } from 'vitest';
import { activityCanRetryImport, activityCanSearchAgain, activityStatusLabel, splitActivity } from './activity';

describe('activity helpers', () => {
  it('prefers API status labels', () => {
    expect(activityStatusLabel({ status: 'stalled', status_label: 'Stalled — no peers' })).toBe(
      'Stalled — no peers',
    );
  });

  it('groups stuck grabs ahead of completed history', () => {
    const grouped = splitActivity([
      { id: '1', title: 'A', status: 'completed' },
      { id: '2', title: 'B', status: 'import_failed', stuck: true, warning: true },
      { id: '3', title: 'C', status: 'downloading' },
    ]);
    expect(grouped.attention.map((r) => r.id)).toEqual(['2']);
    expect(grouped.active.map((r) => r.id)).toEqual(['3']);
    expect(grouped.recent.map((r) => r.id)).toEqual(['1']);
  });

  it('picks retry vs search-again from status', () => {
    expect(activityCanRetryImport('import_failed')).toBe(true);
    expect(activityCanRetryImport('failed')).toBe(false);
    expect(activityCanSearchAgain('failed')).toBe(true);
    expect(activityCanSearchAgain('stalled')).toBe(true);
    expect(activityCanSearchAgain('import_failed')).toBe(false);
  });
});
