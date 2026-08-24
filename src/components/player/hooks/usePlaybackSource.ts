import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchPlaybackSubtitles,
  friendlyPlaybackError,
  resolvePlayback,
  type PlaybackSubtitleTrack,
} from '../../../api/client'
import { QUALITY_OPTIONS } from '../../../lib/player/types'

export type PlaybackSourceState = {
  loading: boolean
  error: string | null
  playSrc: string
  playMode: 'direct' | 'transcode' | string
  remoteTracks: PlaybackSubtitleTrack[]
  transcoderAvailable: boolean
  /** Wall-clock seconds the current transcode stream's t=0 maps to (seek offset tracking). */
  transcodeOffsetSec: number
  retryCount: number
  maxBitrateMbps: string
  trickplayEnabled: boolean
  /** ffprobe container stream index used for the active transcode audio track. */
  audioStreamIndex: number
}

const INITIAL_STATE: PlaybackSourceState = {
  loading: false,
  error: null,
  playSrc: '',
  playMode: 'direct',
  remoteTracks: [],
  transcoderAvailable: false,
  transcodeOffsetSec: 0,
  retryCount: 0,
  maxBitrateMbps: '',
  trickplayEnabled: false,
  audioStreamIndex: -1,
}

function appendQuery(url: string, key: string, value: string | number) {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
}

/**
 * Resolves a raw media src into a playable URL (direct or transcode-proxied),
 * loads sidecar subtitle tracks, and supports:
 *  - manual quality overrides (forces a transcode at a capped height)
 *  - seeking mid-transcode (restarts the ffmpeg pipe at a new offset, since a
 *    live-piped fragmented-mp4 has no server-side random access once sent)
 *  - audio stream selection during transcode (ffmpeg -map)
 *  - automatic retry with backoff on resolve failure
 */
export function usePlaybackSource(src: string) {
  const [state, setState] = useState<PlaybackSourceState>(INITIAL_STATE)
  const qualityRef = useRef<string>('auto')
  const audioStreamIndexRef = useRef(-1)
  const retryTimerRef = useRef<number | null>(null)

  const load = useCallback(
    async (opts?: { seekToSec?: number; quality?: string; audioStreamIndex?: number }) => {
      if (!src) {
        setState(INITIAL_STATE)
        return
      }
      if (opts?.quality !== undefined) qualityRef.current = opts.quality
      if (opts?.audioStreamIndex !== undefined) audioStreamIndexRef.current = opts.audioStreamIndex
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const [resolved, subs] = await Promise.all([
          resolvePlayback(src),
          fetchPlaybackSubtitles(src).catch(() => ({ tracks: [] as PlaybackSubtitleTrack[] })),
        ])
        let streamUrl = resolved.stream_url || src
        let mode = resolved.mode || 'direct'
        let offset = 0

        const quality = qualityRef.current
        const qualityOpt = QUALITY_OPTIONS.find((q) => q.id === quality)
        const forceTranscode = quality !== 'auto' && qualityOpt?.maxHeight && resolved.transcoder_available

        if (forceTranscode && qualityOpt?.maxHeight) {
          streamUrl = `/stream/transcode?src=${encodeURIComponent(src)}&max_height=${qualityOpt.maxHeight}`
          mode = 'transcode'
        }

        if (mode === 'transcode') {
          if (audioStreamIndexRef.current >= 0) {
            streamUrl = appendQuery(streamUrl, 'audio_index', audioStreamIndexRef.current)
          }
          if (opts?.seekToSec != null && opts.seekToSec > 0) {
            streamUrl = appendQuery(streamUrl, 'start', opts.seekToSec.toFixed(2))
            offset = opts.seekToSec
          }
        }

        setState({
          loading: false,
          error: null,
          playSrc: streamUrl,
          playMode: mode,
          remoteTracks: subs.tracks ?? [],
          transcoderAvailable: Boolean(resolved.transcoder_available),
          transcodeOffsetSec: offset,
          retryCount: 0,
          maxBitrateMbps: resolved.max_bitrate_mbps || '',
          trickplayEnabled: Boolean(resolved.trickplay_enabled),
          audioStreamIndex: audioStreamIndexRef.current,
        })
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: friendlyPlaybackError(err),
          playSrc: '',
          remoteTracks: [],
        }))
      }
    },
    [src],
  )

  useEffect(() => {
    audioStreamIndexRef.current = -1
    void load()
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  /** True if the seek was handled by restarting the transcode at a new offset. */
  const seekWithinTranscode = useCallback(
    (absoluteSeconds: number) => {
      if (state.playMode !== 'transcode') return false
      void load({ seekToSec: absoluteSeconds })
      return true
    },
    [state.playMode, load],
  )

  const setQuality = useCallback(
    (quality: string) => {
      void load({ quality })
    },
    [load],
  )

  const setAudioStreamIndex = useCallback(
    (streamIndex: number, seekToSec?: number) => {
      void load({ audioStreamIndex: streamIndex, seekToSec })
    },
    [load],
  )

  const retry = useCallback(() => {
    setState((s) => ({ ...s, retryCount: s.retryCount + 1 }))
    void load()
  }, [load])

  /** Schedules an automatic retry with exponential backoff (network stall / resolve failure recovery). */
  const scheduleRetry = useCallback(
    (attempt: number) => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
      const delayMs = Math.min(1000 * 2 ** attempt, 15000)
      retryTimerRef.current = window.setTimeout(() => void load(), delayMs)
    },
    [load],
  )

  return {
    ...state,
    quality: qualityRef.current,
    seekWithinTranscode,
    setQuality,
    setAudioStreamIndex,
    retry,
    scheduleRetry,
  }
}
