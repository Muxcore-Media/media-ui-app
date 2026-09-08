import { describe, expect, it } from 'vitest';
import { namingTemplateLabel, normalizeNamingTemplates } from './naming-templates';

describe('naming templates', () => {
  it('normalizes household template rows', () => {
    const next = normalizeNamingTemplates({
      available: true,
      templates: [
        {
          id: 'movie_tpl',
          name: 'Default Movie',
          media_type: 'movie',
          pattern: '{Title} ({Year})',
          is_default: true,
        },
        { id: '' },
      ],
    });
    expect(next.templates).toHaveLength(1);
    expect(next.templates[0].isDefault).toBe(true);
    expect(namingTemplateLabel(next.templates[0])).toBe('Default Movie (movie · default)');
  });

  it('soft-fails when rename is down', () => {
    expect(normalizeNamingTemplates({ available: false, templates: [] })).toEqual({
      available: false,
      templates: [],
    });
  });
});
