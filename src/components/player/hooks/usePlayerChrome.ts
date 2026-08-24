import { useCallback, useEffect, useRef, useState } from 'react'

export type UsePlayerChromeOptions = {
  containerRef: React.RefObject<HTMLDivElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  initialTheaterMode: boolean
  /** Auto-hide is suspended while true (menus open, paused with mouse idle handling elsewhere). */
  keepControlsVisible: boolean
}

/** Fullscreen, theater mode, Picture-in-Picture, and the auto-hiding control
 * chrome timer shared by the top bar / bottom bar / center overlay. */
export function usePlayerChrome({ containerRef, videoRef, initialTheaterMode, keepControlsVisible }: UsePlayerChromeOptions) {
  const [fullscreen, setFullscreen] = useState(false)
  const [theaterMode, setTheaterMode] = useState(initialTheaterMode)
  const [pipActive, setPipActive] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<number | null>(null)

  useEffect(() => {
    setPipSupported(Boolean(document.pictureInPictureEnabled))
  }, [])

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onEnter = () => setPipActive(true)
    const onLeave = () => setPipActive(false)
    el.addEventListener('enterpictureinpicture', onEnter)
    el.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      el.removeEventListener('enterpictureinpicture', onEnter)
      el.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [videoRef])

  const bumpControls = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    if (keepControlsVisible) return
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3500)
  }, [keepControlsVisible])

  useEffect(() => {
    bumpControls()
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [bumpControls])

  useEffect(() => {
    if (keepControlsVisible) {
      setShowControls(true)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [keepControlsVisible])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen?.()
  }, [containerRef])

  const toggleTheater = useCallback(() => setTheaterMode((t) => !t), [])

  const togglePiP = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (document.pictureInPictureElement) void document.exitPictureInPicture()
    else void el.requestPictureInPicture?.().catch(() => {})
  }, [videoRef])

  return {
    fullscreen,
    theaterMode,
    setTheaterMode,
    pipActive,
    pipSupported,
    showControls,
    bumpControls,
    toggleFullscreen,
    toggleTheater,
    togglePiP,
  }
}
