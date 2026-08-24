import type { PlaybackAnalysisAudio, PlaybackAnalysisSubtitle } from '../../api/client'
import type { PlayerTrackInfo } from './types'

export function audioTracksFromAnalysis(audio: PlaybackAnalysisAudio[]): PlayerTrackInfo[] {
  return audio.map((a, i) => ({
    id: `probe-a-${a.index}`,
    label: a.label || `Audio ${i + 1}`,
    kind: 'audio' as const,
    index: i,
    streamIndex: a.index,
    language: a.language,
    codec: a.codec,
    channels: a.channels,
    channelLayout: a.channel_layout,
  }))
}

export function subtitleTracksFromAnalysis(subs: PlaybackAnalysisSubtitle[]): PlayerTrackInfo[] {
  return subs.map((s, i) => ({
    id: `probe-s-${s.index}`,
    label: s.label || `Subtitle ${i + 1}`,
    kind: 'text' as const,
    index: i,
    streamIndex: s.index,
    language: s.language,
    codec: s.codec,
    pictureBased: s.picture_based,
    textBased: s.text_based,
    forced: s.forced,
    hearingImpaired: s.hearing_impaired,
  }))
}

/** Prefer ffprobe labels when available; fall back to browser-reported tracks. */
export function mergeAudioTracks(native: PlayerTrackInfo[], probe: PlayerTrackInfo[]): PlayerTrackInfo[] {
  if (probe.length > 0) return probe
  return native
}

export function mergeTextTracks(native: PlayerTrackInfo[], probe: PlayerTrackInfo[]): PlayerTrackInfo[] {
  if (probe.length > 0) return probe
  return native
}

export function formatAudioTrackLabel(t: PlayerTrackInfo): string {
  const parts: string[] = []
  if (t.language) parts.push(t.language.toUpperCase())
  if (t.channelLayout) parts.push(t.channelLayout)
  else if (t.channels === 6) parts.push('5.1')
  else if (t.channels === 2) parts.push('Stereo')
  if (t.codec) parts.push(t.codec.toUpperCase())
  if (parts.length === 0) return t.label
  return parts.join(' · ')
}

export function formatSubtitleTrackLabel(t: PlayerTrackInfo): string {
  const parts: string[] = []
  if (t.language) parts.push(t.language.toUpperCase())
  if (t.forced) parts.push('Forced')
  if (t.hearingImpaired) parts.push('SDH')
  if (t.codec) parts.push(t.codec.toUpperCase())
  if (parts.length === 0) return t.label
  return parts.join(' · ')
}
