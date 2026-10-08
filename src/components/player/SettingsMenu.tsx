import { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Gauge,
  Languages,
  Loader2,
  Maximize2,
  Search,
  SkipForward,
  Subtitles as SubtitlesIcon,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ASPECT_MODE_OPTIONS,
  type AspectMode,
  type PlayerTrackInfo,
  type QualityOption,
} from '../../lib/player/types';
import { formatAudioTrackLabel, formatSubtitleTrackLabel } from '../../lib/player/tracks';
import { formatTime, languageDisplayName } from '../../lib/player/format';
import { skipPointsSummary } from '../../lib/playback-segments';
import type { UserPreferences } from '../../lib/userdata';
import type { PlaybackSegment, SubtitleSearchResult } from '../../api/client';
import {
  formatSubtitleOffset,
  SUBTITLE_OFFSET_STEP_MS,
  SUBTITLE_TEXT_COLORS,
} from '../../lib/subtitle-offset';
import {
  formatAudioOffset,
  AUDIO_OFFSET_STEP_MS,
} from '../../lib/audio-offset';

export type SubtitleSearchMenuProps = {
  status: 'idle' | 'searching' | 'done' | 'unavailable' | 'error';
  results: SubtitleSearchResult[];
  error: string | null;
  downloadingId: string | null;
  downloadedId: string | null;
  /** The BFF refused downloads for this role: keep the explanation, drop the entry point. */
  denied?: boolean;
  onSearch: () => void;
  onDownload: (id: string, provider: string) => void;
};

type Panel =
  | 'root'
  | 'quality'
  | 'audio'
  | 'subtitles'
  | 'subtitle-appearance'
  | 'subtitle-find'
  | 'speed'
  | 'aspect'
  | 'skip-points';

export type SkipPointsEditor = {
  currentSec: number;
  durationSec: number;
  segments: PlaybackSegment[];
  busy: boolean;
  error: string | null;
  onMarkIntroEnd: () => void;
  onMarkOutroStart: () => void;
  onClear: () => void;
};

type Props = {
  onClose: () => void;
  playMode: string;
  transcoderAvailable: boolean;
  quality: string;
  qualityOptions: QualityOption[];
  onQuality: (id: string) => void;
  audioTracks: PlayerTrackInfo[];
  audioIdx: number;
  onAudio: (idx: number) => void;
  textTracks: PlayerTrackInfo[];
  pictureSubtitleTracks?: PlayerTrackInfo[];
  burnedSubtitleStreamIndex?: number;
  textIdx: number;
  onText: (idx: number) => void;
  onPicture?: (streamIndex: number) => void;
  rate: number;
  onRate: (rate: number) => void;
  subtitlePrefs: UserPreferences['subtitles'];
  onSubtitlePrefs: (patch: Partial<UserPreferences['subtitles']>) => void;
  audioOffsetMs: number;
  onAudioOffset: (ms: number) => void;
  aspectMode: AspectMode;
  onAspectMode: (mode: AspectMode) => void;
  subtitleSearch?: SubtitleSearchMenuProps;
  skipPoints?: SkipPointsEditor;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function trackLabel(t: PlayerTrackInfo): string {
  if (t.kind === 'audio') return formatAudioTrackLabel(t);
  return formatSubtitleTrackLabel(t) || languageDisplayName(t.language) || t.label;
}

export default function SettingsMenu(props: Props) {
  const [panel, setPanel] = useState<Panel>('root');
  const {
    onClose,
    playMode,
    transcoderAvailable,
    quality,
    qualityOptions,
    onQuality,
    audioTracks,
    audioIdx,
    onAudio,
    textTracks,
    pictureSubtitleTracks = [],
    burnedSubtitleStreamIndex = -1,
    textIdx,
    onText,
    onPicture,
    rate,
    onRate,
    subtitlePrefs,
    onSubtitlePrefs,
    audioOffsetMs,
    onAudioOffset,
    aspectMode,
    onAspectMode,
    subtitleSearch,
    skipPoints,
  } = props;

  const activeQualityLabel = qualityOptions.find((q) => q.id === quality)?.label || 'Original';
  const activeSubtitleLabel =
    textIdx === -1
      ? 'Off'
      : trackLabel(textTracks[textIdx] ?? ({ label: 'On' } as PlayerTrackInfo));

  function handleBack() {
    if (panel === 'subtitle-find') setPanel('subtitles');
    else setPanel('root');
  }

  return (
    <div
      className="absolute bottom-full right-0 mb-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--player-chip-border)] bg-[var(--player-panel-bg)] shadow-2xl backdrop-blur-md"
      data-testid="player-settings-menu"
    >
      <div className="flex items-center gap-2 border-b border-[var(--player-chip-border)] px-3 py-2">
        {panel !== 'root' ? (
          <button
            type="button"
            aria-label="Back"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--player-fg-muted)] hover:bg-[var(--player-chip-hover)]"
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <h2 className="flex-1 text-sm font-semibold text-[var(--player-fg)]">
          {panel === 'root' && 'Settings'}
          {panel === 'quality' && 'Quality'}
          {panel === 'audio' && 'Audio'}
          {panel === 'subtitles' && 'Subtitles'}
          {panel === 'subtitle-appearance' && 'Subtitle appearance'}
          {panel === 'subtitle-find' && 'Find subtitles'}
          {panel === 'speed' && 'Playback speed'}
          {panel === 'aspect' && 'Aspect ratio'}
          {panel === 'skip-points' && 'Skip points'}
        </h2>
        <button
          type="button"
          aria-label="Close settings"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--player-fg-muted)] hover:bg-[var(--player-chip-hover)]"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-1.5">
        {panel === 'root' && (
          <ul className="space-y-0.5 text-sm">
            <RootRow
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
              label="Quality"
              value={`${activeQualityLabel}${playMode === 'transcode' ? ' · Transcoding' : ' · Direct play'}`}
              onClick={() => setPanel('quality')}
              disabled={!transcoderAvailable && qualityOptions.length <= 1}
            />
            <RootRow
              icon={<Languages className="h-4 w-4" aria-hidden="true" />}
              label="Audio"
              value={
                (audioOffsetMs ?? 0) === 0
                  ? trackLabel(audioTracks[audioIdx] ?? ({ label: 'Default' } as PlayerTrackInfo))
                  : `${trackLabel(audioTracks[audioIdx] ?? ({ label: 'Default' } as PlayerTrackInfo))} · ${formatAudioOffset(audioOffsetMs)}`
              }
              onClick={() => setPanel('audio')}
            />
            <RootRow
              icon={<SubtitlesIcon className="h-4 w-4" aria-hidden="true" />}
              label="Subtitles"
              value={activeSubtitleLabel}
              onClick={() => setPanel('subtitles')}
            />
            <RootRow
              icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
              label="Speed"
              value={`${rate}×`}
              onClick={() => setPanel('speed')}
            />
            <RootRow
              icon={<Maximize2 className="h-4 w-4" aria-hidden="true" />}
              label="Aspect ratio"
              value={ASPECT_MODE_OPTIONS.find((a) => a.id === aspectMode)?.label || 'Fit'}
              onClick={() => setPanel('aspect')}
            />
            {skipPoints ? (
              <RootRow
                icon={<SkipForward className="h-4 w-4" aria-hidden="true" />}
                label="Skip points"
                value={skipPointsSummary(skipPoints.segments)}
                onClick={() => setPanel('skip-points')}
              />
            ) : null}
          </ul>
        )}

        {panel === 'quality' && (
          <ul className="space-y-0.5 text-sm">
            {qualityOptions.map((q) => (
              <OptionRow
                key={q.id}
                label={q.label}
                active={q.id === quality}
                onClick={() => onQuality(q.id)}
              />
            ))}
          </ul>
        )}

        {panel === 'audio' && (
          <>
            <ul className="space-y-0.5 text-sm">
              {audioTracks.map((t) => (
                <OptionRow
                  key={t.id}
                  label={trackLabel(t)}
                  active={t.index === audioIdx}
                  onClick={() => onAudio(t.index)}
                />
              ))}
            </ul>
            <div className="mt-2 border-t border-[var(--player-chip-border)] px-2.5 pt-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Sync offset
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--player-chip-border)] px-2 py-1.5 text-xs hover:bg-[var(--player-chip-hover)]"
                  aria-label="Shift audio earlier"
                  onClick={() => onAudioOffset((audioOffsetMs ?? 0) - AUDIO_OFFSET_STEP_MS)}
                >
                  −
                </button>
                <input
                  type="range"
                  min={-10000}
                  max={10000}
                  step={50}
                  value={audioOffsetMs ?? 0}
                  onChange={(e) => onAudioOffset(Number(e.target.value))}
                  className="min-w-0 flex-1 accent-[var(--accent-color)]"
                  aria-label="Audio sync offset"
                  data-testid="audio-offset-slider"
                />
                <button
                  type="button"
                  className="rounded-lg border border-[var(--player-chip-border)] px-2 py-1.5 text-xs hover:bg-[var(--player-chip-hover)]"
                  aria-label="Shift audio later"
                  onClick={() => onAudioOffset((audioOffsetMs ?? 0) + AUDIO_OFFSET_STEP_MS)}
                >
                  +
                </button>
              </div>
              <p className="mt-1 text-center text-xs text-[var(--player-fg-subtle)]" data-testid="audio-offset-value">
                {(audioOffsetMs ?? 0) === 0 ? 'In sync' : formatAudioOffset(audioOffsetMs)}
                {' · [ / ]'}
              </p>
            </div>
          </>
        )}

        {panel === 'subtitles' && (
          <>
            <ul className="space-y-0.5 text-sm">
              <OptionRow
                label="Off"
                active={textIdx === -1 && burnedSubtitleStreamIndex < 0}
                onClick={() => {
                  onPicture?.(-1);
                  onText(-1);
                }}
              />
              {textTracks.map((t) => (
                <OptionRow
                  key={t.id}
                  label={trackLabel(t)}
                  active={t.index === textIdx && burnedSubtitleStreamIndex < 0}
                  onClick={() => {
                    onPicture?.(-1);
                    onText(t.index);
                  }}
                />
              ))}
            </ul>
            {pictureSubtitleTracks.length > 0 ? (
              <div className="mt-2 border-t border-[var(--player-chip-border)] pt-2">
                <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                  Image subtitles
                </p>
                <ul className="space-y-0.5 text-sm">
                  {pictureSubtitleTracks.map((t) =>
                    transcoderAvailable && t.streamIndex != null && t.streamIndex >= 0 ? (
                      <OptionRow
                        key={t.id}
                        label={`${trackLabel(t)} · Burn-in`}
                        active={t.streamIndex === burnedSubtitleStreamIndex}
                        onClick={() => onPicture?.(t.streamIndex ?? -1)}
                      />
                    ) : (
                      <li key={t.id}>
                        <div
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[var(--player-fg-subtle)] opacity-60"
                          title="Connect the transcoder to burn PGS/VobSub into the video"
                        >
                          <span className="flex h-4 w-4 shrink-0" />
                          <span>{trackLabel(t)}</span>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--accent-text)] hover:bg-[var(--player-chip-hover)]"
              onClick={() => setPanel('subtitle-appearance')}
            >
              Appearance…
            </button>
            {subtitleSearch && !subtitleSearch.denied ? (
              <button
                type="button"
                data-testid="subtitle-find-online-btn"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--accent-text)] hover:bg-[var(--player-chip-hover)]"
                onClick={() => {
                  subtitleSearch.onSearch();
                  setPanel('subtitle-find');
                }}
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  Find online…
                </span>
              </button>
            ) : null}
          </>
        )}

        {panel === 'subtitle-appearance' && (
          <div className="space-y-4 px-2 py-1 text-sm text-[var(--player-fg)]">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Color
              </label>
              <div className="flex flex-wrap gap-1.5" data-testid="subtitle-text-colors">
                {SUBTITLE_TEXT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    aria-label={`Subtitle color ${c.label}`}
                    aria-pressed={(subtitlePrefs.textColor || '#ffffff').toLowerCase() === c.hex}
                    className={`h-7 w-7 rounded-full border-2 ${
                      (subtitlePrefs.textColor || '#ffffff').toLowerCase() === c.hex
                        ? 'border-[var(--accent-color)]'
                        : 'border-[var(--player-chip-border)]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => onSubtitlePrefs({ textColor: c.hex })}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Size
              </label>
              <div className="flex gap-1.5">
                {(['sm', 'md', 'lg'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize ${
                      subtitlePrefs.textSize === sz
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-text)]'
                        : 'border-[var(--player-chip-border)] hover:bg-[var(--player-chip-hover)]'
                    }`}
                    onClick={() => onSubtitlePrefs({ textSize: sz })}
                  >
                    {sz === 'sm' ? 'Small' : sz === 'md' ? 'Medium' : 'Large'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Background opacity
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={subtitlePrefs.backgroundOpacity}
                onChange={(e) => onSubtitlePrefs({ backgroundOpacity: Number(e.target.value) })}
                className="w-full accent-[var(--accent-color)]"
                aria-label="Subtitle background opacity"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Edge style
              </label>
              <div className="flex gap-1.5">
                {(['none', 'drop-shadow', 'outline'] as const).map((edge) => (
                  <button
                    key={edge}
                    type="button"
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize ${
                      subtitlePrefs.edgeStyle === edge
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-text)]'
                        : 'border-[var(--player-chip-border)] hover:bg-[var(--player-chip-hover)]'
                    }`}
                    onClick={() => onSubtitlePrefs({ edgeStyle: edge })}
                  >
                    {edge === 'drop-shadow' ? 'Shadow' : edge}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Position
              </label>
              <div className="flex gap-1.5">
                {(['bottom', 'top'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs capitalize ${
                      subtitlePrefs.verticalPosition === pos
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-text)]'
                        : 'border-[var(--player-chip-border)] hover:bg-[var(--player-chip-hover)]'
                    }`}
                    onClick={() => onSubtitlePrefs({ verticalPosition: pos })}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Sync offset
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[var(--player-chip-border)] px-2 py-1.5 text-xs hover:bg-[var(--player-chip-hover)]"
                  aria-label="Shift subtitles earlier"
                  onClick={() =>
                    onSubtitlePrefs({ offsetMs: (subtitlePrefs.offsetMs ?? 0) - SUBTITLE_OFFSET_STEP_MS })
                  }
                >
                  −
                </button>
                <input
                  type="range"
                  min={-10000}
                  max={10000}
                  step={50}
                  value={subtitlePrefs.offsetMs ?? 0}
                  onChange={(e) => onSubtitlePrefs({ offsetMs: Number(e.target.value) })}
                  className="min-w-0 flex-1 accent-[var(--accent-color)]"
                  aria-label="Subtitle sync offset"
                  data-testid="subtitle-offset-slider"
                />
                <button
                  type="button"
                  className="rounded-lg border border-[var(--player-chip-border)] px-2 py-1.5 text-xs hover:bg-[var(--player-chip-hover)]"
                  aria-label="Shift subtitles later"
                  onClick={() =>
                    onSubtitlePrefs({ offsetMs: (subtitlePrefs.offsetMs ?? 0) + SUBTITLE_OFFSET_STEP_MS })
                  }
                >
                  +
                </button>
              </div>
              <p className="mt-1 text-center text-xs text-[var(--player-fg-subtle)]" data-testid="subtitle-offset-value">
                {(subtitlePrefs.offsetMs ?? 0) === 0 ? 'In sync' : formatSubtitleOffset(subtitlePrefs.offsetMs)}
                {' · G / H'}
              </p>
            </div>
          </div>
        )}

        {panel === 'speed' && (
          <ul className="space-y-0.5 text-sm">
            {SPEEDS.map((s) => (
              <OptionRow
                key={s}
                label={`${s}×${s === 1 ? ' (Normal)' : ''}`}
                active={s === rate}
                onClick={() => onRate(s)}
              />
            ))}
          </ul>
        )}

        {panel === 'aspect' && (
          <ul className="space-y-0.5 text-sm">
            {ASPECT_MODE_OPTIONS.map((a) => (
              <OptionRow
                key={a.id}
                label={a.label}
                active={a.id === aspectMode}
                onClick={() => onAspectMode(a.id)}
              />
            ))}
          </ul>
        )}

        {panel === 'subtitle-find' && (
          <SubtitleFindPanel search={subtitleSearch} />
        )}

        {panel === 'skip-points' && skipPoints ? <SkipPointsPanel editor={skipPoints} /> : null}
      </div>
    </div>
  );
}

function RootRow({
  icon,
  label,
  value,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--player-chip-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="text-[var(--player-fg-muted)]">{icon}</span>
        <span className="flex-1 text-[var(--player-fg)]">{label}</span>
        <span className="max-w-[8.5rem] truncate text-xs text-[var(--player-fg-subtle)]">
          {value}
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-[var(--player-fg-subtle)]"
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

function OptionRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--player-chip-hover)]"
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {active ? (
            <Check className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
          ) : null}
        </span>
        <span className={active ? 'text-[var(--accent-text)]' : 'text-[var(--player-fg)]'}>
          {label}
        </span>
      </button>
    </li>
  );
}

function SubtitleFindPanel({ search }: { search: SubtitleSearchMenuProps | undefined }) {
  if (!search) return null;

  const busy = search.downloadingId !== null;

  if (search.status === 'searching') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-5 text-sm text-[var(--player-fg-muted)]"
        data-testid="subtitle-find-searching"
      >
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        <span>Searching…</span>
      </div>
    );
  }

  if (search.status === 'unavailable') {
    return (
      <p
        className="px-3 py-5 text-center text-xs text-[var(--player-fg-subtle)]"
        data-testid="subtitle-find-unavailable"
      >
        Subtitle search is not available.
      </p>
    );
  }

  if (search.status === 'error') {
    return (
      <p
        className="px-3 py-5 text-center text-xs text-[var(--player-fg-subtle)]"
        data-testid="subtitle-find-error"
      >
        {search.error ?? 'Could not reach subtitle service.'}
      </p>
    );
  }

  if (search.status === 'done' && search.results.length === 0) {
    return (
      <p
        className="px-3 py-5 text-center text-xs text-[var(--player-fg-subtle)]"
        data-testid="subtitle-find-empty"
      >
        No results found. Try a different subtitle language in Settings.
      </p>
    );
  }

  if (search.status === 'done' && search.results.length > 0) {
    return (
      <ul className="space-y-0.5 py-1 text-sm" data-testid="subtitle-find-results">
        {search.results.map((r) => {
          const isDownloading = search.downloadingId === r.id;
          const isDownloaded = search.downloadedId === r.id;
          return (
            <li key={`${r.provider}:${r.id}`}>
              <button
                type="button"
                disabled={busy}
                aria-label={`Download ${r.title} (${r.language.toUpperCase()})`}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--player-chip-hover)] disabled:cursor-wait disabled:opacity-70"
                onClick={() => search.onDownload(r.id, r.provider)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[var(--player-fg)]">{r.title}</span>
                  <span className="block text-[10px] text-[var(--player-fg-subtle)]">
                    {r.language.toUpperCase()}
                    {' · '}
                    {r.format.toUpperCase()}
                    {r.release ? ` · ${r.release}` : ''}
                  </span>
                </span>
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--player-fg-muted)]" aria-hidden="true" />
                  ) : isDownloaded ? (
                    <Check className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-[var(--player-fg-muted)]" aria-hidden="true" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return null;
}

function SkipPointsPanel({ editor }: { editor: SkipPointsEditor }) {
  const canMarkIntro = editor.currentSec > 0.25 && !editor.busy;
  const canMarkOutro = editor.durationSec > editor.currentSec + 0.25 && !editor.busy;
  const canClear = editor.segments.length > 0 && !editor.busy;

  return (
    <div className="space-y-3 px-2 py-1 text-sm text-[var(--player-fg)]" data-testid="player-skip-points">
      <p className="text-xs text-[var(--player-fg-subtle)]">
        Position {formatTime(editor.currentSec)}
        {editor.durationSec > 0 ? ` / ${formatTime(editor.durationSec)}` : ''}
      </p>
      <p className="text-xs text-[var(--player-fg-muted)]" data-testid="player-skip-points-summary">
        {skipPointsSummary(editor.segments)}
      </p>
      <div className="space-y-1.5">
        <button
          type="button"
          disabled={!canMarkIntro}
          data-testid="player-mark-intro"
          className="w-full rounded-lg border border-[var(--player-chip-border)] px-3 py-2 text-left hover:bg-[var(--player-chip-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={editor.onMarkIntroEnd}
        >
          Intro ends here
        </button>
        <button
          type="button"
          disabled={!canMarkOutro}
          data-testid="player-mark-outro"
          className="w-full rounded-lg border border-[var(--player-chip-border)] px-3 py-2 text-left hover:bg-[var(--player-chip-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={editor.onMarkOutroStart}
        >
          Outro starts here
        </button>
        <button
          type="button"
          disabled={!canClear}
          data-testid="player-clear-skip-points"
          className="w-full rounded-lg px-3 py-2 text-left text-[var(--accent-text)] hover:bg-[var(--player-chip-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={editor.onClear}
        >
          Clear skip points
        </button>
      </div>
      {editor.error ? (
        <p className="text-xs text-red-400" data-testid="player-skip-points-error">
          {editor.error}
        </p>
      ) : null}
    </div>
  );
}
