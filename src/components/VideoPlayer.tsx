import { useCallback, useEffect, useRef, useState } from 'react'
import { resolvePlayback } from '../api/client'
import { getPreferences, getProgress, upsertProgress, type MediaKind } from '../lib/userdata'

type Props = {
  src: string
  title?: string
  mediaId?: string
  mediaKind?: MediaKind
  posterUrl?: string
  href?: string
  subtitleTracks?: { label: string; src: string; srclang?: string; default?: boolean }[]
}

type TrackInfo = { id: string; label: string; kind: 'audio' | 'text'; index: number }

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export default function VideoPlayer({
  src,
  title,
  mediaId,
  mediaKind = 'movie',
  posterUrl,
  href,
  subtitleTracks = [],
}: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefs = getPreferences()
  const [playSrc, setPlaySrc] = useState(src)
  const [playMode, setPlayMode] = useState('direct')
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<number | null>(null)
  const [audioTracks, setAudioTracks] = useState<TrackInfo[]>([])
  const [textTracks, setTextTracks] = useState<TrackInfo[]>([])
  const [audioIdx, setAudioIdx] = useState(0)
  const [textIdx, setTextIdx] = useState(-1)
  const [rate, setRate] = useState(1)
  const resumeEnabled = prefs.playback.rememberPosition

  useEffect(() => {
    if (!src) {
      setPlaySrc('')
      return
    }
    let cancelled = false
    setLoading(true)
    resolvePlayback(src)
      .then((res) => {
        if (cancelled) return
        setPlaySrc(res.stream_url || src)
        setPlayMode(res.mode || 'direct')
      })
      .catch(() => {
        if (!cancelled) {
          setPlaySrc(src)
          setPlayMode('direct')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [src])

  const bumpControls = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || !playSrc) return
    el.load()
    if (resumeEnabled && mediaId) {
      const saved = getProgress(mediaId)
      if (saved && saved.positionSec > 5) {
        const onMeta = () => {
          el.currentTime = Math.min(saved.positionSec, Math.max(0, el.duration - 2))
          el.removeEventListener('loadedmetadata', onMeta)
        }
        el.addEventListener('loadedmetadata', onMeta)
      }
    }
    if (prefs.playback.skipIntroSec > 0) {
      const skip = () => {
        if (el.currentTime < 1 && prefs.playback.skipIntroSec < el.duration) {
          el.currentTime = prefs.playback.skipIntroSec
        }
        el.removeEventListener('playing', skip)
      }
      el.addEventListener('playing', skip)
    }
  }, [playSrc, mediaId, resumeEnabled, prefs.playback.skipIntroSec])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMeta = () => setDuration(el.duration || 0)
    const onTime = () => setCurrent(el.currentTime || 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [playSrc])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const refreshTracks = () => {
      const audio: TrackInfo[] = []
      const anyEl = el as HTMLVideoElement & { audioTracks?: { length: number; [i: number]: { label?: string; language?: string; enabled: boolean } } }
      if (anyEl.audioTracks && anyEl.audioTracks.length > 0) {
        for (let i = 0; i < anyEl.audioTracks.length; i++) {
          const t = anyEl.audioTracks[i]
          audio.push({
            id: `a${i}`,
            label: t.label || t.language || `Audio ${i + 1}`,
            kind: 'audio',
            index: i,
          })
        }
      } else {
        audio.push({ id: 'a0', label: 'Default', kind: 'audio', index: 0 })
      }
      const texts: TrackInfo[] = []
      for (let i = 0; i < el.textTracks.length; i++) {
        const t = el.textTracks[i]
        texts.push({
          id: `t${i}`,
          label: t.label || t.language || `Subtitle ${i + 1}`,
          kind: 'text',
          index: i,
        })
      }
      setAudioTracks(audio)
      setTextTracks(texts)
      if (prefs.subtitles.enabled && texts.length > 0) {
        const pref = prefs.subtitles.language.toLowerCase()
        const match = texts.findIndex((t) => t.label.toLowerCase().includes(pref))
        setTextIdx((cur) => (cur >= 0 ? cur : match >= 0 ? match : 0))
      }
    }
    el.addEventListener('loadedmetadata', refreshTracks)
    refreshTracks()
    return () => el.removeEventListener('loadedmetadata', refreshTracks)
  }, [playSrc, prefs.subtitles.enabled, prefs.subtitles.language])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anyEl = el as HTMLVideoElement & { audioTracks?: { length: number; [i: number]: { enabled: boolean } } }
    if (anyEl.audioTracks) {
      for (let i = 0; i < anyEl.audioTracks.length; i++) {
        anyEl.audioTracks[i].enabled = i === audioIdx
      }
    }
  }, [audioIdx])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    for (let i = 0; i < el.textTracks.length; i++) {
      el.textTracks[i].mode = i === textIdx ? 'showing' : 'disabled'
    }
  }, [textIdx])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.playbackRate = rate
  }, [rate])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.volume = volume
    el.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const el = ref.current
    if (!el || !mediaId || !resumeEnabled) return

    const persist = () => {
      if (!Number.isFinite(el.currentTime)) return
      upsertProgress({
        id: mediaId,
        kind: mediaKind,
        title: title || 'Playback',
        poster_url: posterUrl,
        href: href || '/',
        stream_url: src,
        positionSec: el.currentTime,
        durationSec: Number.isFinite(el.duration) ? el.duration : 0,
      })
    }

    const onTime = () => {
      if (Math.floor(el.currentTime) % 5 === 0) persist()
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('pause', persist)
    el.addEventListener('ended', persist)
    window.addEventListener('beforeunload', persist)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('pause', persist)
      el.removeEventListener('ended', persist)
      window.removeEventListener('beforeunload', persist)
      persist()
    }
  }, [playSrc, src, mediaId, mediaKind, title, posterUrl, href, resumeEnabled])

  useEffect(() => {
    if (!prefs.controls.enableKeyboardShortcuts) return
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current
      if (!el) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (el.paused) void el.play()
        else el.pause()
      } else if (e.code === 'ArrowRight') {
        el.currentTime = Math.min(el.duration || el.currentTime + 10, el.currentTime + 10)
      } else if (e.code === 'ArrowLeft') {
        el.currentTime = Math.max(0, el.currentTime - 10)
      } else if (e.code === 'KeyF') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void containerRef.current?.requestFullscreen?.()
      } else if (e.code === 'KeyM') {
        setMuted((m) => !m)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prefs.controls.enableKeyboardShortcuts])

  const togglePlay = () => {
    const el = ref.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }

  const seek = (value: number) => {
    const el = ref.current
    if (!el || !Number.isFinite(value)) return
    el.currentTime = value
    setCurrent(value)
  }

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-[var(--border)] bg-black text-[var(--muted)]">
        No stream available
      </div>
    )
  }

  const sizeClass =
    prefs.subtitles.textSize === 'sm' ? 'text-sm' : prefs.subtitles.textSize === 'lg' ? 'text-lg' : 'text-base'

  return (
    <div className="space-y-3" data-testid="video-player">
      <div
        ref={containerRef}
        className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-black"
        onMouseMove={bumpControls}
        onMouseLeave={() => setShowControls(true)}
      >
        {loading ? (
          <div className="flex aspect-video items-center justify-center text-sm text-[var(--muted)]">Loading stream…</div>
        ) : (
          <video
            ref={ref}
            className="aspect-video w-full"
            playsInline
            preload="metadata"
            title={title}
            src={playSrc}
            data-playback-mode={playMode}
            data-subtitle-size={prefs.subtitles.textSize}
            onClick={togglePlay}
          >
            {subtitleTracks.map((t) => (
              <track
                key={t.src + t.label}
                kind="subtitles"
                src={t.src}
                srcLang={t.srclang || prefs.subtitles.language}
                label={t.label}
                default={Boolean(t.default)}
              />
            ))}
            {prefs.subtitles.enabled && subtitleTracks.length === 0 ? (
              <track kind="captions" label={prefs.subtitles.language} />
            ) : null}
          </video>
        )}

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-10 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}
          data-testid="player-osd-overlay"
        >
          <div className="pointer-events-auto space-y-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(current, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label="Seek"
              data-testid="player-seek"
            />
            <div className="flex flex-wrap items-center gap-3 text-xs text-white">
              <button type="button" className="font-semibold" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? 'Pause' : 'Play'}
              </button>
              <span data-testid="player-time">
                {formatTime(current)} / {formatTime(duration)}
              </span>
              <label className="flex items-center gap-1">
                <span className="text-white/70">Vol</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setMuted(false)
                    setVolume(Number(e.target.value))
                  }}
                  className="w-20 accent-[var(--accent)]"
                  aria-label="Volume"
                />
              </label>
              <button
                type="button"
                className="ml-auto rounded border border-white/30 px-2 py-0.5"
                onClick={() => void containerRef.current?.requestFullscreen?.()}
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 ${sizeClass}`}
        data-testid="player-osd"
      >
        <label className="space-y-1 text-xs">
          <span className="text-[var(--muted)]">Audio</span>
          <select
            className="block rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
            value={audioIdx}
            onChange={(e) => setAudioIdx(Number(e.target.value))}
          >
            {audioTracks.map((t) => (
              <option key={t.id} value={t.index}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-[var(--muted)]">Subtitles</span>
          <select
            className="block rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
            value={textIdx}
            onChange={(e) => setTextIdx(Number(e.target.value))}
          >
            <option value={-1}>Off</option>
            {textTracks.map((t) => (
              <option key={t.id} value={t.index}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-[var(--muted)]">Speed</span>
          <select
            className="block rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          >
            {[0.75, 1, 1.25, 1.5, 2].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
        {prefs.playback.skipIntroSec > 0 && (
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-semibold"
            onClick={() => {
              const el = ref.current
              if (el) el.currentTime = prefs.playback.skipIntroSec
            }}
          >
            Skip intro
          </button>
        )}
        <span className="text-xs text-[var(--muted)]" data-testid="player-mode">
          {playMode === 'transcode' ? 'Transcode' : 'Direct play'}
        </span>
      </div>
    </div>
  )
}
