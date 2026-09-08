import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emitPlaybackSession } from './playback-session';

export type NowPlayingTrack = {
  id: string;
  src: string;
  title: string;
  artistName?: string;
  href?: string;
  mediaType?: string;
};

export function nowPlayingMediaType(track: Pick<NowPlayingTrack, 'href' | 'mediaType'>): string {
  if (track.mediaType?.trim()) return track.mediaType.trim();
  if ((track.href || '').includes('/audiobook')) return 'audiobook';
  return 'music';
}

type NowPlayingContextValue = {
  track: NowPlayingTrack | null;
  queue: NowPlayingTrack[];
  playing: boolean;
  play: (track: NowPlayingTrack, queue?: NowPlayingTrack[]) => void;
  pause: () => void;
  toggle: (track: NowPlayingTrack, queue?: NowPlayingTrack[]) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
};

const NowPlayingContext = createContext<NowPlayingContextValue | null>(null);

export function useNowPlaying(): NowPlayingContextValue {
  const ctx = useContext(NowPlayingContext);
  if (!ctx) throw new Error('useNowPlaying must be used within a NowPlayingProvider');
  return ctx;
}

/** Optional hook for surfaces that render outside the provider in tests. */
export function useNowPlayingOptional(): NowPlayingContextValue | null {
  return useContext(NowPlayingContext);
}

export function NowPlayingProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [queue, setQueue] = useState<NowPlayingTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const lastSession = useRef<{ id: string; mediaType: string } | null>(null);

  useEffect(() => {
    if (!track) {
      const prev = lastSession.current;
      lastSession.current = null;
      if (prev) {
        void emitPlaybackSession({
          eventType: 'stopped',
          mediaId: prev.id,
          mediaType: prev.mediaType,
        });
      }
      return;
    }
    const mediaType = nowPlayingMediaType(track);
    lastSession.current = { id: track.id, mediaType };
    void emitPlaybackSession({
      eventType: playing ? 'started' : 'progress',
      mediaId: track.id,
      title: track.title,
      mediaType,
      isPaused: !playing,
    });
  }, [track, playing]);

  const play = useCallback((next: NowPlayingTrack, nextQueue?: NowPlayingTrack[]) => {
    setTrack(next);
    if (nextQueue) setQueue(nextQueue);
    setPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setTrack(null);
    setQueue([]);
  }, []);

  const next = useCallback(() => {
    setTrack((current) => {
      if (!current) return current;
      const idx = queue.findIndex((t) => t.id === current.id);
      const nxt = idx >= 0 ? queue[idx + 1] : undefined;
      if (!nxt) return current;
      setPlaying(true);
      return nxt;
    });
  }, [queue]);

  const prev = useCallback(() => {
    setTrack((current) => {
      if (!current) return current;
      const idx = queue.findIndex((t) => t.id === current.id);
      const nxt = idx > 0 ? queue[idx - 1] : undefined;
      if (!nxt) return current;
      setPlaying(true);
      return nxt;
    });
  }, [queue]);

  const toggle = useCallback((nextTrack: NowPlayingTrack, nextQueue?: NowPlayingTrack[]) => {
    setTrack((current) => {
      if (current?.id === nextTrack.id && current.src === nextTrack.src) {
        setPlaying((on) => !on);
        return current;
      }
      if (nextQueue) setQueue(nextQueue);
      setPlaying(true);
      return nextTrack;
    });
  }, []);

  const value = useMemo(
    () => ({ track, queue, playing, play, pause, toggle, next, prev, stop }),
    [track, queue, playing, play, pause, toggle, next, prev, stop],
  );

  return <NowPlayingContext.Provider value={value}>{children}</NowPlayingContext.Provider>;
}
