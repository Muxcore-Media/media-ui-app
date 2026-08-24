import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../api/client'
import { buildEpisodePlayerHref } from '../../../lib/playHref'
import { nextEpisodeAfter, type MediaKind } from '../../../lib/userdata'
import type { TVShow } from '../../../types'

const COUNTDOWN_SECONDS = 15

export type UseUpNextOptions = {
  showId?: string
  mediaId?: string
  mediaKind: MediaKind
  autoplayEnabled: boolean
  onAdvance: (href: string) => void
}

/** Next-episode lookup + an "Up Next" countdown/cancel overlay, matching the
 * Netflix/Jellyfin/Plex convention of auto-advancing a few seconds before the
 * credits finish unless the user cancels. */
export function useUpNext({ showId, mediaId, mediaKind, autoplayEnabled, onAdvance }: UseUpNextOptions) {
  const [showData, setShowData] = useState<TVShow | null>(null)
  const [countdownActive, setCountdownActive] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const advancedRef = useRef(false)

  useEffect(() => {
    if (!showId) {
      setShowData(null)
      return
    }
    let cancelled = false
    void api.getTVShow(showId).then((show) => {
      if (!cancelled) setShowData(show)
    })
    return () => {
      cancelled = true
    }
  }, [showId])

  useEffect(() => {
    setCountdownActive(false)
    setSecondsLeft(COUNTDOWN_SECONDS)
    advancedRef.current = false
  }, [mediaId])

  const next = useMemo(() => {
    if (mediaKind !== 'episode' || !showData || !mediaId) return null
    const ep = nextEpisodeAfter(showData, mediaId)
    if (!ep) return null
    const href = buildEpisodePlayerHref(showData, ep)
    if (!href) return null
    const code = `S${String(ep.season_number).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}`
    return { href, title: ep.title ? `${code} · ${ep.title}` : code }
  }, [mediaKind, showData, mediaId])

  useEffect(() => {
    if (!countdownActive) return
    if (secondsLeft <= 0) {
      if (!advancedRef.current && next) {
        advancedRef.current = true
        onAdvance(next.href)
      }
      return
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [countdownActive, secondsLeft, next, onAdvance])

  /** Call when playback nears/reaches the end (or hits an outro/credits segment). */
  function trigger() {
    if (!next || advancedRef.current) return
    setCountdownActive(true)
    setSecondsLeft(autoplayEnabled ? COUNTDOWN_SECONDS : Infinity)
  }

  function cancel() {
    setCountdownActive(false)
    advancedRef.current = true
  }

  function playNow() {
    if (!next) return
    advancedRef.current = true
    onAdvance(next.href)
  }

  return {
    showData,
    next,
    countdownActive,
    secondsLeft: Number.isFinite(secondsLeft) ? secondsLeft : null,
    trigger,
    cancel,
    playNow,
  }
}
