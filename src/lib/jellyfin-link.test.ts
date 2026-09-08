import { describe, expect, it } from 'vitest';
import { jellyfinLinkLabel, normalizeJellyfinLink } from './jellyfin-link';

describe('jellyfin-link', () => {
  it('normalizes a matched title link', () => {
    const link = normalizeJellyfinLink({
      available: true,
      matched: true,
      mux_id: 'mux-1',
      jellyfin_id: 'jf-99',
      match_reason: 'provider_id',
    });
    expect(link.linked).toBe(true);
    expect(link.jellyfinId).toBe('jf-99');
    expect(jellyfinLinkLabel(link)).toBe('Linked · provider_id');
  });

  it('marks an unlinked title', () => {
    const link = normalizeJellyfinLink({ available: true, linked: false, muxId: 'mux-1' });
    expect(link.linked).toBe(false);
    expect(jellyfinLinkLabel(link)).toBe('Not linked to Jellyfin');
  });
});
