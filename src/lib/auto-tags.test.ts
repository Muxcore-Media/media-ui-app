import { describe, expect, it } from 'vitest';
import { autoTagClassifyLabel, autoTagRuleLabel, normalizeAutoTagCatalog, normalizeAutoTagClassify } from './auto-tags';

describe('auto-tags', () => {
  it('normalizes media-tagging catalogs', () => {
    const catalog = normalizeAutoTagCatalog({
      available: true,
      tags: [{ id: 't1', name: 'Kids', category: 'audience' }],
      rules: [{ id: 'r1', tag_id: 't1', field: 'title', match: 'contains', pattern: 'Paw Patrol', enabled: true }],
    });
    expect(catalog.available).toBe(true);
    expect(autoTagRuleLabel(catalog.rules[0], catalog.tags)).toBe('Kids when title contains “Paw Patrol” · on');
    const applied = normalizeAutoTagClassify({
      media_id: 'm1',
      tags: [{ id: 't1', name: 'Kids' }],
      matched_rule_ids: ['r1'],
    });
    expect(autoTagClassifyLabel(applied)).toBe('Applied Kids');
  });
});
