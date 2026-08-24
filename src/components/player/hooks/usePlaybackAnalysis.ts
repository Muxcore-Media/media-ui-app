import { useEffect, useState } from 'react'
import { fetchPlaybackAnalysis, type PlaybackAnalysis } from '../../../api/client'

export function usePlaybackAnalysis(src: string | undefined) {
  const [analysis, setAnalysis] = useState<PlaybackAnalysis | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setAnalysis(null)
    setLoaded(false)
    if (!src) return
    let cancelled = false
    void fetchPlaybackAnalysis(src)
      .then((res) => {
        if (cancelled) return
        setAnalysis(res.enabled ? res : null)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [src])

  return { analysis, loaded }
}
