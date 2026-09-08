import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '../../lib/player/format';

type Props = {
  src: string;
  title: string;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onEnded?: () => void;
};

/** Custom audio bar (play/pause, seek, time, volume) — matches video OSD conventions. */
export default function AudioPlayerBar({ src, title, playing, onPlayingChange, onEnded }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      const pending = el.play();
      if (pending && typeof pending.catch === 'function') {
        void pending.catch(() => onPlayingChange(false));
      }
    } else {
      el.pause();
    }
  }, [playing, src, onPlayingChange]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
      data-testid="audio-player-bar"
      aria-label={`Now playing ${title}`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => {
          onPlayingChange(false);
          onEnded?.();
        }}
      />
      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] transition hover:opacity-90"
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          onClick={() => onPlayingChange(!playing)}
        >
          {playing ? (
            <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
          )}
        </button>
        <span className="text-xs tabular-nums text-[var(--text-secondary)]">
          {formatTime(current)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.5}
          value={Math.min(current, duration || 0)}
          onChange={(e) => {
            const next = Number(e.target.value);
            setCurrent(next);
            if (audioRef.current) audioRef.current.currentTime = next;
          }}
          className="min-w-[8rem] flex-1 accent-[var(--accent-color)]"
          aria-label="Seek"
        />
        <label className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={() => setMuted((m) => !m)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated-2)]"
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
              setMuted(false);
              setVolume(Number(e.target.value));
            }}
            className="w-20 accent-[var(--accent-color)]"
            aria-label="Volume"
          />
        </label>
      </div>
    </div>
  );
}
