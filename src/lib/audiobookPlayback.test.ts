import { describe, expect, it } from 'vitest';
import { audiobookFromRow, audiobookHref, audiobookQueue } from './audiobookPlayback';

describe('audiobookPlayback', () => {
  it('rewrites list rows into a playable queue', () => {
    const ab = audiobookFromRow({
      id: 'ab1',
      title: 'Project Hail Mary',
      narrator: 'Ray Porter',
      files: [
        { id: 'f1', title: 'Part 1', stream_url: '/stream/audiobooks/f1' },
        { id: 'f2', title: 'Part 2', stream_url: '/stream/audiobooks/f2' },
      ],
    });
    const queue = audiobookQueue(ab, audiobookHref(ab.id));
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({
      id: 'f1',
      src: '/stream/audiobooks/f1',
      href: '/audiobooks/ab1',
      artistName: 'Ray Porter',
      mediaType: 'audiobook',
    });
  });

  it('falls back to the top-level stream URL when files are missing', () => {
    const queue = audiobookQueue(
      {
        id: 'ab1',
        title: 'Dune',
        stream_url: '/stream/audiobooks/f9',
      },
      '/audiobooks/ab1',
    );
    expect(queue).toEqual([
      {
        id: 'ab1',
        src: '/stream/audiobooks/f9',
        title: 'Dune',
        artistName: undefined,
        href: '/audiobooks/ab1',
        mediaType: 'audiobook',
      },
    ]);
  });
});
