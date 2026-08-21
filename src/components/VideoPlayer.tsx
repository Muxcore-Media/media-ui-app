import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Captions,
  ListVideo,
  Maximize,
  Minimize,
  PictureInPicture2,
  Play,
  Pause,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { api, fetchPlaybackSubtitles, resolvePlayback, type PlaybackSubtitleTrack } from '../api/client'
import PlayerEpisodeDrawer from './player/PlayerEpisodeDrawer'
import { buildEpisodePlayerHref } from '../lib/playHref'
import { getPreferences, getProgress, nextEpisodeAfter, upsertProgress, type MediaKind } from '../lib/userdata'
import type { TVShow } from '../types'
import Spinner from './Spinner'

type Props = {
  src: string
  title?: string
  mediaId?: string
  mediaKind?: MediaKind
  posterUrl?: string
  href?: string
  showId?: string
  seasonNumber?: number
  episodeNumber?: number
  subtitleTracks?: { label: string; src: string; srclang?: string; language?: string; default?: boolean }[]
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

const overlaySelectClass =
  'max-w-[7rem] truncate rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-[var(--accent-color)]'

export default function VideoPlayer({
  src,
  title,
  mediaId,
  mediaKind = 'movie',
  posterUrl,
  href = '/',
  showId,
  seasonNumber,
  episodeNumber,
  subtitleTracks = [],
}: Props) {
  const navigate = useNavigate()
  const ref = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefs = getPreferences()
  const [playSrc, setPlaySrc] = useState(src)
  const [playMode, setPlayMode] = useState('direct')
  const [loading, setLoading] = useState(false)
  const [remoteTracks, setRemoteTracks] = useState<PlaybackSubtitleTrack[]>([])
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
  const [buffering, setBuffering] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showData, setShowData] = useState<TVShow | null>(null)
  const [upNextHref, setUpNextHref] = useState<string | null>(null)
  const [upNextTitle, setUpNextTitle] = useState<string | null>(null)
  const resumeEnabled = prefs.playback.rememberPosition

  useEffect(() => {
    setPipSupported(Boolean(document.pictureInPictureEnabled))
  }, [])

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

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
    if (!src) {
      setPlaySrc('')
      setRemoteTracks([])
      return
    }
    let cancelled = false
    setLoading(true)
    setPlaying(false)
    setBuffering(false)
    setCurrent(0)
    setDuration(0)
    Promise.all([
      resolvePlayback(src),
      fetchPlaybackSubtitles(src).catch(() => ({ tracks: [] as PlaybackSubtitleTrack[] })),
    ])
      .then(([res, subs]) => {
        if (cancelled) return
        setPlaySrc(res.stream_url || src)
        setPlayMode(res.mode || 'direct')
        setRemoteTracks(subs.tracks ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setPlaySrc(src)
          setPlayMode('direct')
          setRemoteTracks([])
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
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3500)
  }, [])

  useEffect(() => {
    bumpControls()
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [bumpControls])

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
    const refreshTracks = () => {
      const audio: TrackInfo[] = []
      const anyEl = el as HTMLVideoElement & {
        audioTracks?: { length: number; [i: number]: { label?: string; language?: string; enabled: boolean } }
      }
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
        if (t.kind === 'metadata') continue
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
    const onMeta = () => setDuration(el.duration || 0)
    const onTime = () => {
      setCurrent(el.currentTime || 0)
      setPlaying(!el.paused)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => {
      setPlaying(true)
      setBuffering(false)
    }
    const onCanPlay = () => setBuffering(false)
    const trackList = el.textTracks as TextTrackList & {
      addEventListener?: (type: string, listener: () => void) => void
      removeEventListener?: (type: string, listener: () => void) => void
    }
    trackList.addEventListener?.('addtrack', refreshTracks)
    el.addEventListener('loadedmetadata', refreshTracks)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onPlaying)
    el.addEventListener('canplay', onCanPlay)
    refreshTracks()
    return () => {
      trackList.removeEventListener?.('addtrack', refreshTracks)
      el.removeEventListener('loadedmetadata', refreshTracks)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('canplay', onCanPlay)
    }
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

  const handleEnded = useCallback(() => {
    if (mediaKind !== 'episode' || !showData || !mediaId) return
    const next = nextEpisodeAfter(showData, mediaId)
    if (!next) return
    const nextHref = buildEpisodePlayerHref(showData, next)
    if (!nextHref) return
    const code = `S${String(next.season_number).padStart(2, '0')}E${String(next.episode_number).padStart(2, '0')}`
    setUpNextTitle(next.title ? `${code} · ${next.title}` : code)
    setUpNextHref(nextHref)
    if (prefs.playback.autoplayNext) {
      window.setTimeout(() => navigate(nextHref), 4500)
    }
  }, [mediaKind, showData, mediaId, prefs.playback.autoplayNext, navigate])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('ended', handleEnded)
    return () => el.removeEventListener('ended', handleEnded)
  }, [handleEnded, playSrc])

  useEffect(() => {
    setUpNextHref(null)
    setUpNextTitle(null)
  }, [playSrc, mediaId])

  useEffect(() => {
    if (!prefs.controls.enableKeyboardShortcuts) return
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current
      if (!el) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (drawerOpen && e.code === 'Escape') {
        setDrawerOpen(false)
        return
      }
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
      } else if (e.code === 'KeyE' && showId) {
        setDrawerOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prefs.controls.enableKeyboardShortcuts, drawerOpen, showId])

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-[var(--text-secondary)]">
        <div className="space-y-4 text-center">
          <p>This title isn&apos;t available to play.</p>
          <Link to={href} className="text-[var(--accent-color)] hover:underline">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const metaLine =
    mediaKind === 'episode' && seasonNumber != null && episodeNumber != null
      ? `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`
      : null

  const captionTracks: {
    label: string
    src: string
    srclang?: string
    language?: string
    default?: boolean
  }[] = [...subtitleTracks, ...remoteTracks]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      data-testid="video-player"
      onMouseMove={bumpControls}
      onTouchStart={bumpControls}
    >
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-white/70">
            <Spinner className="h-8 w-8 text-[var(--accent-color)]" />
            Loading…
          </div>
        ) : (
          <video
            ref={ref}
            className="h-full w-full object-contain"
            playsInline
            preload="metadata"
            title={title}
            src={playSrc}
            data-playback-mode={playMode}
            data-subtitle-size={prefs.subtitles.textSize}
            onClick={togglePlay}
          >
            {captionTracks.map((t) => (
              <track
                key={t.src + t.label}
                kind="subtitles"
                src={t.src}
                srcLang={t.srclang || t.language || prefs.subtitles.language}
                label={t.label}
                default={
                  Boolean(t.default) ||
                  (prefs.subtitles.enabled &&
                    (t.srclang || t.language || '').toLowerCase() === prefs.subtitles.language.toLowerCase())
                }
              />
            ))}
          </video>
        )}

        {!loading && buffering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
            <Spinner className="h-12 w-12 text-white" />
          </div>
        )}

        {!loading && !playing && !buffering && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              togglePlay()
            }}
            aria-label="Play"
            className={`absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-black shadow-2xl">
              <Play className="h-9 w-9 fill-current" aria-hidden="true" />
            </span>
          </button>
        )}

        <div
          className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/35 to-transparent px-4 pb-10 pt-4 transition-opacity duration-300 sm:px-6 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          data-testid="player-top-bar"
        >
          <div className="pointer-events-auto flex items-center gap-3">
            <Link
              to={href}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h1>
              {metaLine ? <p className="text-xs text-white/60">{metaLine}</p> : null}
            </div>
            {showId && showData ? (
              <button
                type="button"
                aria-label="Episodes"
                aria-expanded={drawerOpen}
                className="flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 text-sm text-white transition hover:bg-white/10"
                onClick={() => setDrawerOpen((open) => !open)}
              >
                <ListVideo className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Episodes</span>
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent px-4 pb-5 pt-16 transition-opacity duration-300 sm:px-6 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          data-testid="player-osd-overlay"
        >
          <div className="pointer-events-auto space-y-3" data-testid="player-osd">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(current, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full accent-[var(--accent-color)]"
              aria-label="Seek"
              data-testid="player-seek"
            />
            <div className="flex flex-wrap items-center gap-2 text-white sm:gap-3">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/15"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                )}
              </button>

              {prefs.playback.skipIntroSec > 0 && current < prefs.playback.skipIntroSec && (
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/15"
                  aria-label="Skip intro"
                  onClick={() => {
                    const el = ref.current
                    if (el) el.currentTime = prefs.playback.skipIntroSec
                  }}
                >
                  <SkipForward className="h-5 w-5" aria-hidden="true" />
                </button>
              )}

              <span className="text-xs font-medium tabular-nums text-white/90" data-testid="player-time">
                {formatTime(current)} / {formatTime(duration)}
              </span>

              <label className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  onClick={() => setMuted((m) => !m)}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/15"
                >
                  <VolumeIcon className="h-4 w-4" aria-hidden="true" />
                </button>
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
                  className="hidden w-20 accent-[var(--accent-color)] sm:block"
                  aria-label="Volume"
                />
              </label>

              <select
                className={overlaySelectClass}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                aria-label="Playback speed"
              >
                {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1 text-xs text-white/70">
                <Captions className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <select
                  className={overlaySelectClass}
                  value={textIdx}
                  onChange={(e) => setTextIdx(Number(e.target.value))}
                  aria-label="Subtitles"
                >
                  <option value={-1}>Off</option>
                  {textTracks.map((t) => (
                    <option key={t.id} value={t.index}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              {audioTracks.length > 1 ? (
                <select
                  className={overlaySelectClass}
                  value={audioIdx}
                  onChange={(e) => setAudioIdx(Number(e.target.value))}
                  aria-label="Audio track"
                >
                  {audioTracks.map((t) => (
                    <option key={t.id} value={t.index}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : null}

              <span className="ml-auto flex items-center gap-1">
                {playMode === 'transcode' ? (
                  <span className="hidden text-[11px] text-white/50 sm:inline" data-testid="player-mode">
                    Optimizing quality
                  </span>
                ) : (
                  <span data-testid="player-mode" className="sr-only" />
                )}
                {pipSupported && (
                  <button
                    type="button"
                    aria-label="Picture in picture"
                    className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/15"
                    onClick={() => void ref.current?.requestPictureInPicture?.()}
                  >
                    <PictureInPicture2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/15"
                  onClick={() => {
                    if (document.fullscreenElement) void document.exitFullscreen()
                    else void containerRef.current?.requestFullscreen?.()
                  }}
                >
                  {fullscreen ? (
                    <Minimize className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Maximize className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </div>
          </div>
        </div>

        {upNextHref && upNextTitle ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-white/15 bg-black/80 px-4 py-3 shadow-2xl backdrop-blur">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Up next</p>
                <p className="truncate text-sm text-white">{upNextTitle}</p>
              </div>
              <button
                type="button"
                className="rounded-full bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-black"
                onClick={() => navigate(upNextHref)}
              >
                Play
              </button>
            </div>
          </div>
        ) : null}

        {drawerOpen && showData ? (
          <PlayerEpisodeDrawer
            show={showData}
            currentEpisodeId={mediaId}
            onClose={() => setDrawerOpen(false)}
            onPick={(nextHref) => {
              setDrawerOpen(false)
              navigate(nextHref)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
