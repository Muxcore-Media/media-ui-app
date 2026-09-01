import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import MediaCard from '../MediaCard';
import { Shelf, ShelfItem } from './Shelf';
import type { Movie, TVShow } from '../../types';

type Props = {
  kind: 'movie' | 'tv';
  genres: string[];
  excludeId: string;
  title?: string;
};

/** Same-genre library shelf (fixture-safe; no live TMDB extras). */
export default function MoreLikeThisShelf({
  kind,
  genres,
  excludeId,
  title = 'More like this',
}: Props) {
  const [items, setItems] = useState<Array<Movie | TVShow>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res =
          kind === 'movie' ? await api.listMovies(1, 48) : await api.listTVShows(1, 48);
        if (cancelled) return;
        const genreSet = new Set(genres.map((g) => g.toLowerCase()));
        const matched = res.items.filter((item) => {
          if (item.id === excludeId) return false;
          if (!item.has_file) return false;
          if (genreSet.size === 0) return true;
          return item.genres.some((g) => genreSet.has(g.toLowerCase()));
        });
        setItems(matched.slice(0, 12));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, genres, excludeId]);

  if (!items.length) return null;

  return (
    <Shelf title={title}>
      {items.map((item) => (
        <ShelfItem key={item.id}>
          <MediaCard item={item} type={kind} />
        </ShelfItem>
      ))}
    </Shelf>
  );
}
