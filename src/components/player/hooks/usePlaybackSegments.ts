import { useEffect, useMemo, useState } from 'react'
import { fetchPlaybackSegments, type PlaybackSegment } from '../../../api/client'

export type UsePlaybackSegmentsOptions = {
  mediaId: string | undefined
  durationSec: number
  /** Legacy client-side fallback (Settings → Playback → "Skip intro seconds"). */
  legacyIntroSkipSec: number
}

/**
 * Intro/outro/credits/recap skip segments for the current title, backed by
 * the media-intro-outro module. Falls back to a synthesized intro segment
 * from the legacy client preference when the backend has no data yet.
 */
export function usePlaybackSegments({ mediaId, durationSec, legacyIntroSkipSec }: UsePlaybackSegmentsOptions) {
  const [segments, setSegments] = useState<PlaybackSegment[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSegments([])
    setLoaded(false)
    if (!mediaId || !(durationSec > 0)) return
    let cancelled = false
    void fetchPlaybackSegments(mediaId, durationSec)
      .then((res) => {
        if (cancelled) return
        setSegments(res.segments || [])
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [mediaId, durationSec])

  const effectiveSegments = useMemo<PlaybackSegment[]>(() => {
    if (segments.length > 0) return segments
    if (loaded && legacyIntroSkipSec > 0 && durationSec > legacyIntroSkipSec) {
      return [
        {
          kind: 'intro',
          start_seconds: 0,
          end_seconds: legacyIntroSkipSec,
          confidence: 1,
          source: 'user-preference',
        },
      ]
    }
    return []
  }, [segments, loaded, legacyIntroSkipSec, durationSec])

  function activeSegmentAt(absoluteSeconds: number): PlaybackSegment | null {
    for (const seg of effectiveSegments) {
      if (absoluteSeconds >= seg.start_seconds && absoluteSeconds < seg.end_seconds) return seg
    }
    return null
  }

  /** Next/previous segment boundary from a position, for chapter-style nav. */
  function nextBoundaryAfter(absoluteSeconds: number): number | null {
    const ordered = [...effectiveSegments].sort((a, b) => a.start_seconds - b.start_seconds)
    for (const seg of ordered) {
      if (seg.start_seconds > absoluteSeconds + 0.5) return seg.start_seconds
    }
    return null
  }

  function prevBoundaryBefore(absoluteSeconds: number): number | null {
    const ordered = [...effectiveSegments].sort((a, b) => b.start_seconds - a.start_seconds)
    for (const seg of ordered) {
      if (seg.start_seconds < absoluteSeconds - 0.5) return seg.start_seconds
    }
    return null
  }

  return { segments: effectiveSegments, loaded, activeSegmentAt, nextBoundaryAfter, prevBoundaryBefore }
}
