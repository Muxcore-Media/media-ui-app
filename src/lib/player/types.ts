export type PlayerTrackInfo = {
  id: string
  label: string
  kind: 'audio' | 'text'
  index: number
  language?: string
  /** Container stream index from ffprobe (for transcode audio_index). */
  streamIndex?: number
  codec?: string
  channels?: number
  channelLayout?: string
  pictureBased?: boolean
  textBased?: boolean
  forced?: boolean
  hearingImpaired?: boolean
}

export type PlaybackMode = 'direct' | 'transcode' | string

export type QualityOption = {
  id: string
  label: string
  /** undefined = source/original resolution (direct play or unconstrained transcode) */
  maxHeight?: number
}

export const QUALITY_OPTIONS: QualityOption[] = [
  { id: 'auto', label: 'Original' },
  { id: '1080p', label: '1080p', maxHeight: 1080 },
  { id: '720p', label: '720p', maxHeight: 720 },
  { id: '480p', label: '480p', maxHeight: 480 },
  { id: '360p', label: '360p', maxHeight: 360 },
]

export type AspectMode = 'contain' | 'cover' | 'fill'

export const ASPECT_MODE_OPTIONS: { id: AspectMode; label: string }[] = [
  { id: 'contain', label: 'Fit' },
  { id: 'cover', label: 'Zoom' },
  { id: 'fill', label: 'Stretch' },
]

export type SubtitleCue = {
  startSec: number
  endSec: number
  html: string
}

export type StatsSnapshot = {
  resolutionWidth: number
  resolutionHeight: number
  mode: 'direct' | 'transcode'
  estimatedBitrateMbps: number | null
  targetBitrateMbps: number | null
  droppedFrames: number
  totalFrames: number
  bufferedAheadSec: number
  streamUrl: string | null
  playbackRate: number
}
