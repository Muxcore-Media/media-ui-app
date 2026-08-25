import { useEffect, useRef, useState } from 'react';
import { fetchTrickplaySprite, type TrickplayManifest } from '../../../api/client';

export type TrickplayFrame = {
  url: string;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  cols: number;
  rows: number;
};

/**
 * Lazily fetches a scrubbing-preview sprite sheet for the given source once
 * a duration is known, then exposes a lookup for the tile covering a given
 * seek-bar time (Jellyfin/Plex-style trickplay hover preview).
 */
export function useTrickplay(opts: {
  src: string | undefined;
  durationSec: number;
  enabled: boolean;
}) {
  const [manifest, setManifest] = useState<TrickplayManifest | null>(null);
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!opts.enabled || !opts.src || !(opts.durationSec > 0)) return;
    const key = `${opts.src}|${Math.round(opts.durationSec)}`;
    if (requestedRef.current === key) return;
    requestedRef.current = key;
    let cancelled = false;
    void fetchTrickplaySprite(opts.src, opts.durationSec).then((m) => {
      if (!cancelled) setManifest(m);
    });
    return () => {
      cancelled = true;
    };
  }, [opts.enabled, opts.src, opts.durationSec]);

  useEffect(() => {
    return () => {
      if (manifest?.url) URL.revokeObjectURL(manifest.url);
    };
  }, [manifest]);

  function frameAt(seconds: number): TrickplayFrame | null {
    if (!manifest) return null;
    const idx = Math.min(
      manifest.count - 1,
      Math.max(0, Math.round(seconds / manifest.intervalSeconds)),
    );
    const col = idx % manifest.cols;
    const row = Math.floor(idx / manifest.cols);
    return {
      url: manifest.url,
      sx: col,
      sy: row,
      sw: manifest.cols,
      sh: manifest.rows,
      cols: manifest.cols,
      rows: manifest.rows,
    };
  }

  return { manifest, frameAt, ready: manifest != null };
}
