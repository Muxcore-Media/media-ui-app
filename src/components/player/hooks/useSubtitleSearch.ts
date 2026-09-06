import { useCallback, useState } from 'react';
import {
  downloadSubtitle,
  searchSubtitles,
  type PlaybackSubtitleTrack,
  type SubtitleSearchParams,
  type SubtitleSearchResult,
} from '../../../api/client';

export type SubtitleSearchStatus = 'idle' | 'searching' | 'done' | 'unavailable' | 'error';

export type SubtitleSearchState = {
  status: SubtitleSearchStatus;
  results: SubtitleSearchResult[];
  error: string | null;
  /** ID of the subtitle currently being downloaded (null when idle). */
  downloadingId: string | null;
  /** ID of the most-recently successfully downloaded subtitle. */
  downloadedId: string | null;
};

const INITIAL_STATE: SubtitleSearchState = {
  status: 'idle',
  results: [],
  error: null,
  downloadingId: null,
  downloadedId: null,
};

/** True when an HTTP error message suggests the media-subtitles module is absent/unhealthy. */
function isUnavailableError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('service unavailable') ||
    msg.includes('unavailable') ||
    msg.includes('not found') ||
    msg.includes('404')
  );
}

export function useSubtitleSearch() {
  const [state, setState] = useState<SubtitleSearchState>(INITIAL_STATE);

  const search = useCallback(async (params: SubtitleSearchParams) => {
    setState({ status: 'searching', results: [], error: null, downloadingId: null, downloadedId: null });
    try {
      const data = await searchSubtitles(params);
      if (!data.available) {
        setState((s) => ({ ...s, status: 'unavailable' }));
        return;
      }
      setState((s) => ({ ...s, status: 'done', results: data.results ?? [] }));
    } catch (err) {
      if (isUnavailableError(err)) {
        setState((s) => ({ ...s, status: 'unavailable' }));
      } else {
        setState((s) => ({
          ...s,
          status: 'error',
          error: 'Could not reach subtitle service. Try again later.',
        }));
      }
    }
  }, []);

  const download = useCallback(
    async (id: string, provider: string): Promise<PlaybackSubtitleTrack | null> => {
      setState((s) => ({ ...s, downloadingId: id }));
      try {
        const data = await downloadSubtitle(id, provider);
        setState((s) => ({ ...s, downloadingId: null, downloadedId: id }));
        return {
          id: `dl-${id}`,
          label: data.label,
          language: data.language,
          srclang: data.language,
          src: data.track_url,
        };
      } catch {
        setState((s) => ({
          ...s,
          downloadingId: null,
          error: 'Could not download subtitle. Try a different result.',
        }));
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, search, download, reset };
}
