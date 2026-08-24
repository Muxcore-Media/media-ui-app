import { useCallback, useRef, useState } from 'react'

export type GestureHandlers = {
  enabled: boolean
  togglePlay: () => void
  seekBy: (deltaSec: number) => void
  volumeBy: (delta: number) => void
  bumpControls: () => void
  showSeekBubble: (deltaSec: number) => void
}

const DOUBLE_TAP_MS = 320
const SWIPE_VOLUME_SENSITIVITY = 1 / 220 // full 0..1 volume range over ~220px
const SWIPE_BRIGHTNESS_SENSITIVITY = 1.2 / 220

/**
 * Touch/gesture controls for the mobile player surface, matching common
 * mobile-player conventions (YouTube/Plex/Jellyfin mobile web):
 *  - single tap: toggle control visibility
 *  - double tap left/right third: seek -10s/+10s with a brief "+10s" bubble
 *  - vertical swipe on the right half: volume
 *  - vertical swipe on the left half: screen "brightness" (CSS filter on video)
 */
export function useGestures(h: GestureHandlers) {
  const [brightness, setBrightness] = useState(1)
  const lastTapRef = useRef<{ time: number; x: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; side: 'left' | 'right'; active: boolean } | null>(null)

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!h.enabled) return
      const touch = e.touches[0]
      const rect = e.currentTarget.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const side = x < rect.width / 2 ? 'left' : 'right'
      dragRef.current = { startX: touch.clientX, startY: touch.clientY, side, active: false }
    },
    [h.enabled],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!h.enabled || !dragRef.current) return
      const touch = e.touches[0]
      const dy = dragRef.current.startY - touch.clientY
      const dx = touch.clientX - dragRef.current.startX
      if (!dragRef.current.active && Math.abs(dy) < 12) return
      if (Math.abs(dx) > Math.abs(dy)) return // horizontal drag: ignore (avoid fighting the seek bar)
      dragRef.current.active = true
      if (dragRef.current.side === 'right') {
        h.volumeBy(dy * SWIPE_VOLUME_SENSITIVITY)
        dragRef.current.startY = touch.clientY
      } else {
        setBrightness((b) => Math.min(1.6, Math.max(0.4, b + dy * SWIPE_BRIGHTNESS_SENSITIVITY)))
        dragRef.current.startY = touch.clientY
      }
    },
    [h],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!h.enabled) return
      const wasDrag = dragRef.current?.active
      const rect = e.currentTarget.getBoundingClientRect()
      const touch = e.changedTouches[0]
      dragRef.current = null
      if (wasDrag || !touch) return

      const x = touch.clientX - rect.left
      const now = Date.now()
      const last = lastTapRef.current
      lastTapRef.current = { time: now, x }

      if (last && now - last.time < DOUBLE_TAP_MS && Math.abs(x - last.x) < 60) {
        lastTapRef.current = null
        const third = rect.width / 3
        if (x < third) {
          h.seekBy(-10)
          h.showSeekBubble(-10)
        } else if (x > third * 2) {
          h.seekBy(10)
          h.showSeekBubble(10)
        } else {
          h.togglePlay()
        }
        return
      }
      h.bumpControls()
    },
    [h],
  )

  return { onTouchStart, onTouchMove, onTouchEnd, brightness }
}
