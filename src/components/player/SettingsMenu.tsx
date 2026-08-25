import { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Languages,
  Maximize2,
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
import { languageDisplayName } from '../../lib/player/format';
import type { UserPreferences } from '../../lib/userdata';

type Panel =
  | 'root'
  | 'quality'
  | 'audio'
  | 'subtitles'
  | 'subtitle-appearance'
  | 'speed'
  | 'aspect';

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
  textIdx: number;
  onText: (idx: number) => void;
  rate: number;
  onRate: (rate: number) => void;
  subtitlePrefs: UserPreferences['subtitles'];
  onSubtitlePrefs: (patch: Partial<UserPreferences['subtitles']>) => void;
  aspectMode: AspectMode;
  onAspectMode: (mode: AspectMode) => void;
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
    textIdx,
    onText,
    rate,
    onRate,
    subtitlePrefs,
    onSubtitlePrefs,
    aspectMode,
    onAspectMode,
  } = props;

  const activeQualityLabel = qualityOptions.find((q) => q.id === quality)?.label || 'Original';
  const activeSubtitleLabel =
    textIdx === -1
      ? 'Off'
      : trackLabel(textTracks[textIdx] ?? ({ label: 'On' } as PlayerTrackInfo));

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
            onClick={() => setPanel('root')}
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
          {panel === 'speed' && 'Playback speed'}
          {panel === 'aspect' && 'Aspect ratio'}
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
              value={trackLabel(audioTracks[audioIdx] ?? ({ label: 'Default' } as PlayerTrackInfo))}
              onClick={() => setPanel('audio')}
              disabled={audioTracks.length <= 1}
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
        )}

        {panel === 'subtitles' && (
          <>
            <ul className="space-y-0.5 text-sm">
              <OptionRow label="Off" active={textIdx === -1} onClick={() => onText(-1)} />
              {textTracks.map((t) => (
                <OptionRow
                  key={t.id}
                  label={trackLabel(t)}
                  active={t.index === textIdx}
                  onClick={() => onText(t.index)}
                />
              ))}
            </ul>
            {pictureSubtitleTracks.length > 0 ? (
              <div className="mt-2 border-t border-[var(--player-chip-border)] pt-2">
                <p className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--player-fg-subtle)]">
                  Image subtitles
                </p>
                <ul className="space-y-0.5 text-sm">
                  {pictureSubtitleTracks.map((t) => (
                    <li key={t.id}>
                      <div
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[var(--player-fg-subtle)] opacity-60"
                        title="Burned into video during transcode — not available as text captions"
                      >
                        <span className="flex h-4 w-4 shrink-0" />
                        <span>{trackLabel(t)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--accent-color)] hover:bg-[var(--player-chip-hover)]"
              onClick={() => setPanel('subtitle-appearance')}
            >
              Appearance…
            </button>
          </>
        )}

        {panel === 'subtitle-appearance' && (
          <div className="space-y-4 px-2 py-1 text-sm text-[var(--player-fg)]">
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
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
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
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
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
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
                        : 'border-[var(--player-chip-border)] hover:bg-[var(--player-chip-hover)]'
                    }`}
                    onClick={() => onSubtitlePrefs({ verticalPosition: pos })}
                  >
                    {pos}
                  </button>
                ))}
              </div>
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
            <Check className="h-4 w-4 text-[var(--accent-color)]" aria-hidden="true" />
          ) : null}
        </span>
        <span className={active ? 'text-[var(--accent-color)]' : 'text-[var(--player-fg)]'}>
          {label}
        </span>
      </button>
    </li>
  );
}
