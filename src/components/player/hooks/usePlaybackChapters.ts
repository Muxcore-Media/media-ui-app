import { useEffect, useMemo, useState } from 'react'
import { fetchPlaybackChapters, type PlaybackChapter } from '../../../api/client'

export type UsePlaybackChaptersOptions = {
  src: string | undefined
  durationSec?: number
}

/** Chapter markers from GET /api/playback/chapters (embedded, scene-detected, or interval-generated). */
export function usePlaybackChapters({ src, durationSec }: UsePlaybackChaptersOptions) {
  const [chapters, setChapters] = useState<PlaybackChapter[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setChapters([])
    setLoaded(false)
    if (!src) return
    let cancelled = false
    void fetchPlaybackChapters(src, durationSec)
      .then((res) => {
        if (cancelled) return
        setChapters(res.chapters || [])
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [src, durationSec])

  const ordered = useMemo(
    () => [...chapters].sort((a, b) => a.start_seconds - b.start_seconds),
    [chapters],
  )

  function activeChapterAt(absoluteSeconds: number): PlaybackChapter | null {
    for (const ch of ordered) {
      if (absoluteSeconds >= ch.start_seconds && absoluteSeconds < ch.end_seconds) return ch
    }
    return null
  }

  function nextChapterAfter(absoluteSeconds: number): number | null {
    for (const ch of ordered) {
      if (ch.start_seconds > absoluteSeconds + 0.5) return ch.start_seconds
    }
    return null
  }

  function prevChapterBefore(absoluteSeconds: number): number | null {
    for (let i = ordered.length - 1; i >= 0; i--) {
      const ch = ordered[i]
      if (ch.start_seconds < absoluteSeconds - 0.5) return ch.start_seconds
    }
    return null
  }

  return { chapters: ordered, loaded, activeChapterAt, nextChapterAfter, prevChapterBefore }
}
