import { useEffect, useState } from 'react';
import { parseVTT } from '../../../lib/player/vtt';
import { activeCues } from '../../../lib/player/vtt';
import type { SubtitleCue } from '../../../lib/player/types';

/**
 * Fetches and parses the active subtitle track's WebVTT source directly
 * (rather than relying on the browser's native TextTrack cue list), so the
 * custom overlay has full, uniform control over styling for every source
 * (sidecar or converted in-band track) and every browser.
 */
export function useSubtitleCues(activeSrc: string | null) {
  const [cues, setCues] = useState<SubtitleCue[]>([]);

  useEffect(() => {
    if (!activeSrc) {
      setCues([]);
      return;
    }
    let cancelled = false;
    fetch(activeSrc)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('subtitle fetch failed'))))
      .then((text) => {
        if (!cancelled) setCues(parseVTT(text));
      })
      .catch(() => {
        if (!cancelled) setCues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSrc]);

  function cuesAt(timeSec: number): SubtitleCue[] {
    return activeCues(cues, timeSec);
  }

  return { cues, cuesAt };
}
