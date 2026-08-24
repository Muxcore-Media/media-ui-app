import { useState } from 'react'
import {
  ChevronsLeft,
  ChevronsRight,
  MonitorPlay,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { formatTime } from '../../lib/player/format'
import SeekBar from './SeekBar'
import SettingsMenu from './SettingsMenu'
import type { PlaybackChapter, PlaybackSegment } from '../../api/client'
import type { AspectMode, PlayerTrackInfo, QualityOption } from '../../lib/player/types'
import type { UserPreferences } from '../../lib/userdata'
import type { TrickplayFrame } from './hooks/useTrickplay'

type Props = {
  visible: boolean
  playing: boolean
  onTogglePlay: () => void
  absoluteCurrent: number
  durationSec: number
  bufferedAheadSec: number
  segments: PlaybackSegment[]
  chapters?: PlaybackChapter[]
  onSeekAbsolute: (sec: number) => void
  onSeekRelative: (deltaSec: number) => void
  trickplayFrameAt?: (seconds: number) => TrickplayFrame | null
  trickplayEnabled: boolean
  volume: number
  muted: boolean
  onVolume: (v: number) => void
  onMuted: (m: boolean) => void
  playMode: string
  theaterMode: boolean
  onToggleTheater: () => void
  pipSupported: boolean
  pipActive: boolean
  onTogglePiP: () => void
  fullscreen: boolean
  onToggleFullscreen: () => void

  quality: string
  qualityOptions: QualityOption[]
  onQuality: (id: string) => void
  transcoderAvailable: boolean
  audioTracks: PlayerTrackInfo[]
  audioIdx: number
  onAudio: (idx: number) => void
  textTracks: PlayerTrackInfo[]
  pictureSubtitleTracks?: PlayerTrackInfo[]
  textIdx: number
  onText: (idx: number) => void
  rate: number
  onRate: (r: number) => void
  subtitlePrefs: UserPreferences['subtitles']
  onSubtitlePrefs: (patch: Partial<UserPreferences['subtitles']>) => void
  onSettingsOpenChange?: (open: boolean) => void
  aspectMode: AspectMode
  onAspectMode: (mode: AspectMode) => void
  /** Previous/next chapter navigation (container chapters, else intro/outro segment boundaries). */
  onPrevMarker?: () => void
  onNextMarker?: () => void
}

export default function ControlsBar(props: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const VolumeIcon = props.muted || props.volume === 0 ? VolumeX : props.volume < 0.5 ? Volume1 : Volume2

  function toggleSettings() {
    setSettingsOpen((o) => {
      props.onSettingsOpenChange?.(!o)
      return !o
    })
  }

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--player-bar-bottom-from)] via-[var(--player-bar-bottom-via)] to-transparent px-4 pb-5 pt-16 transition-opacity duration-300 sm:px-6 ${props.visible ? 'opacity-100' : 'opacity-0'}`}
      data-testid="player-osd-overlay"
    >
      <div className="pointer-events-auto space-y-2" data-testid="player-osd">
        <SeekBar
          currentSec={props.absoluteCurrent}
          durationSec={props.durationSec}
          bufferedAheadSec={props.bufferedAheadSec}
          segments={props.segments}
          chapters={props.chapters}
          onSeek={props.onSeekAbsolute}
          trickplayFrameAt={props.trickplayFrameAt}
          trickplayEnabled={props.trickplayEnabled}
        />

        <div className="flex flex-wrap items-center gap-2 text-[var(--player-fg)] sm:gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)]"
            onClick={props.onTogglePlay}
            aria-label={props.playing ? 'Pause' : 'Play'}
          >
            {props.playing ? (
              <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            )}
          </button>

          {props.onPrevMarker ? (
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)] sm:flex"
              onClick={props.onPrevMarker}
              aria-label="Previous chapter"
            >
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)]"
            onClick={() => props.onSeekRelative(-10)}
            aria-label="Back 10 seconds"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)]"
            onClick={() => props.onSeekRelative(10)}
            aria-label="Forward 10 seconds"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
          </button>

          {props.onNextMarker ? (
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)] sm:flex"
              onClick={props.onNextMarker}
              aria-label="Next chapter"
            >
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}

          <span className="text-xs font-medium tabular-nums text-[var(--player-fg)]" data-testid="player-time">
            {formatTime(props.absoluteCurrent)} / {formatTime(props.durationSec)}
          </span>

          <label className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={props.muted ? 'Unmute' : 'Mute'}
              onClick={() => props.onMuted(!props.muted)}
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)]"
            >
              <VolumeIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={props.muted ? 0 : props.volume}
              onChange={(e) => {
                props.onMuted(false)
                props.onVolume(Number(e.target.value))
              }}
              className="hidden w-20 accent-[var(--accent-color)] sm:block"
              aria-label="Volume"
            />
          </label>

          <span className="ml-auto flex items-center gap-1">
            {props.playMode === 'transcode' ? (
              <span className="hidden text-[11px] text-[var(--player-fg-subtle)] sm:inline" data-testid="player-mode">
                Transcoding
              </span>
            ) : (
              <span data-testid="player-mode" className="sr-only">
                Direct play
              </span>
            )}

            <button
              type="button"
              aria-label="Theater mode"
              aria-pressed={props.theaterMode}
              className={`hidden h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)] sm:flex ${props.theaterMode ? 'text-[var(--accent-color)]' : ''}`}
              onClick={props.onToggleTheater}
            >
              <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label="Settings"
                aria-expanded={settingsOpen}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)] ${settingsOpen ? 'text-[var(--accent-color)]' : ''}`}
                onClick={toggleSettings}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
              {settingsOpen ? (
                <SettingsMenu
                  onClose={() => {
                    setSettingsOpen(false)
                    props.onSettingsOpenChange?.(false)
                  }}
                  playMode={props.playMode}
                  transcoderAvailable={props.transcoderAvailable}
                  quality={props.quality}
                  qualityOptions={props.qualityOptions}
                  onQuality={props.onQuality}
                  audioTracks={props.audioTracks}
                  audioIdx={props.audioIdx}
                  onAudio={props.onAudio}
                  textTracks={props.textTracks}
                  pictureSubtitleTracks={props.pictureSubtitleTracks}
                  textIdx={props.textIdx}
                  onText={props.onText}
                  rate={props.rate}
                  onRate={props.onRate}
                  subtitlePrefs={props.subtitlePrefs}
                  onSubtitlePrefs={props.onSubtitlePrefs}
                  aspectMode={props.aspectMode}
                  onAspectMode={props.onAspectMode}
                />
              ) : null}
            </div>

            {props.pipSupported && (
              <button
                type="button"
                aria-label="Picture in picture"
                aria-pressed={props.pipActive}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)] ${props.pipActive ? 'text-[var(--accent-color)]' : ''}`}
                onClick={props.onTogglePiP}
              >
                <PictureInPicture2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              aria-label={props.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)]"
              onClick={props.onToggleFullscreen}
            >
              {props.fullscreen ? (
                <Minimize className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
