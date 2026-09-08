/**
 * Derives the "Upcoming / On The Air" home rail.
 *
 * Prefers GET /api/calendar (TV air dates + movie releases). Falls back to
 * per-show detail fetches when automation/calendar is unavailable so existing
 * libraries still populate the shelf.
 *
 * - Applies parental filter via show/movie content ratings.
 * - Deduplicates against `excludeIds` (show, movie, or episode id).
 * - Soft-hides on hard failure (empty rows).
 */

import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { applyParentalFilter } from '../lib/parental';
import type { CalendarItem, Episode, Movie, TVShow } from '../types';

export type UpcomingEpisodeRow = {
  kind: 'tv' | 'movie';
  show: TVShow;
  episode: Episode;
  /** ISO date string slice (YYYY-MM-DD) */
  air: string;
};

const SHELF_CAP = 12;
/** Days before today to include recently-aired (potentially unwatched) episodes. */
const LOOK_BACK_DAYS = 7;
/** Days ahead of today to show upcoming episodes. */
const LOOK_AHEAD_DAYS = 30;
/** Max shows to fetch detail for — bounds the number of BFF requests on Home. */
const MAX_DETAIL_FETCHES = 20;

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function emptyShow(id: string, title: string, poster = ''): TVShow {
  return {
    id,
    title,
    year: 0,
    overview: '',
    vote_average: 0,
    genres: [],
    poster_url: poster,
    has_file: false,
    stream_url: '',
    created_at: '',
  };
}

function emptyEpisode(id: string, title: string, air: string, season = 0, episode = 0, hasFile = false): Episode {
  return {
    id,
    season_number: season,
    episode_number: episode,
    title,
    overview: '',
    runtime: 0,
    has_file: hasFile,
    stream_url: '',
    air_date: air,
  };
}

function rowsFromCalendar(
  items: CalendarItem[],
  shows: TVShow[],
  movies: Movie[],
  excludeIds: ReadonlySet<string>,
): UpcomingEpisodeRow[] {
  const showById = new Map(shows.map((s) => [s.id, s]));
  const movieById = new Map(movies.map((m) => [m.id, m]));
  const out: UpcomingEpisodeRow[] = [];
  for (const it of items) {
    const kind = it.kind === 'movie' ? 'movie' : 'tv';
    if (excludeIds.has(it.id) || excludeIds.has(it.parent_id)) continue;
    if (kind === 'movie') {
      const movie = movieById.get(it.parent_id) || movieById.get(it.id);
      const host = emptyShow(it.parent_id || it.id, it.title, movie?.poster_url || '');
      host.content_rating = it.content_rating || movie?.content_rating;
      host.has_file = it.has_file ?? movie?.has_file ?? false;
      host.stream_url = movie?.stream_url || '';
      out.push({
        kind: 'movie',
        show: host,
        episode: emptyEpisode(it.id, it.subtitle || 'Release', it.date, 0, 0, host.has_file),
        air: it.date.slice(0, 10),
      });
      continue;
    }
    const base = showById.get(it.parent_id);
    const show = base
      ? { ...base, content_rating: it.content_rating || base.content_rating }
      : emptyShow(it.parent_id, it.title);
    if (!base) {
      show.content_rating = it.content_rating;
    }
    out.push({
      kind: 'tv',
      show,
      episode: emptyEpisode(
        it.id,
        it.subtitle || '',
        it.date,
        it.season_number || 0,
        it.episode_number || 0,
        it.has_file ?? false,
      ),
      air: it.date.slice(0, 10),
    });
  }
  return applyParentalFilter(
    out.map((r) => ({ ...r, content_rating: r.show.content_rating })),
  ).map(({ content_rating: _ignored, ...row }) => row);
}

function rowsFromShows(detailedShows: TVShow[], excludeIds: ReadonlySet<string>): UpcomingEpisodeRow[] {
  const now = Date.now();
  const earliest = now - LOOK_BACK_DAYS * 24 * 60 * 60 * 1000;
  const latest = now + LOOK_AHEAD_DAYS * 24 * 60 * 60 * 1000;
  const out: UpcomingEpisodeRow[] = [];
  for (const show of applyParentalFilter(detailedShows)) {
    if (excludeIds.has(show.id)) continue;
    for (const season of show.seasons ?? []) {
      for (const ep of season.episodes ?? []) {
        if (!ep.air_date) continue;
        if (excludeIds.has(ep.id)) continue;
        const t = Date.parse(ep.air_date);
        if (!Number.isFinite(t) || t < earliest || t > latest) continue;
        out.push({ kind: 'tv', show, episode: ep, air: ep.air_date });
      }
    }
  }
  return out;
}

export function useUpcomingEpisodes(
  allShows: TVShow[],
  excludeIds: ReadonlySet<string>,
  allMovies: Movie[] = [],
): { rows: UpcomingEpisodeRow[]; loading: boolean } {
  const [rows, setRows] = useState<UpcomingEpisodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const showIds = useMemo(() => allShows.map((s) => s.id).join(','), [allShows]);
  const movieIds = useMemo(() => allMovies.map((m) => m.id).join(','), [allMovies]);
  const excludeKey = useMemo(() => [...excludeIds].sort().join(','), [excludeIds]);

  useEffect(() => {
    if (allShows.length === 0 && allMovies.length === 0) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const start = isoOffset(-LOOK_BACK_DAYS);
        const end = isoOffset(LOOK_AHEAD_DAYS);
        try {
          const cal = await api.listCalendar({ start, end });
          if (cancelled) return;
          if (cal.available !== false) {
            const rated = (cal.items || []).map((it) => {
              if (it.content_rating) return it;
              if (it.kind === 'movie') {
                const movie = allMovies.find((m) => m.id === it.parent_id || m.id === it.id);
                return { ...it, content_rating: movie?.content_rating };
              }
              const show = allShows.find((s) => s.id === it.parent_id);
              return { ...it, content_rating: show?.content_rating };
            });
            const mapped = rowsFromCalendar(rated, allShows, allMovies, excludeIds)
              .sort((a, b) => a.air.localeCompare(b.air))
              .slice(0, SHELF_CAP);
            setRows(mapped);
            return;
          }
        } catch {
          // Calendar unavailable — walk show details.
        }

        const slice = allShows.slice(0, MAX_DETAIL_FETCHES);
        const detailed: TVShow[] = [];
        for (const s of slice) {
          if (cancelled) return;
          try {
            detailed.push((await api.getTVShow(s.id)) ?? s);
          } catch {
            detailed.push(s);
          }
        }
        if (cancelled) return;
        setRows(
          rowsFromShows(detailed, excludeIds)
            .sort((a, b) => a.air.localeCompare(b.air))
            .slice(0, SHELF_CAP),
        );
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIds, movieIds, excludeKey]);

  return { rows, loading };
}
