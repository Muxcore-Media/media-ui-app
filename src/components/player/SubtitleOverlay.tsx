import type { SubtitleCue } from '../../lib/player/types';
import type { UserPreferences } from '../../lib/userdata';

type Props = {
  cues: SubtitleCue[];
  prefs: UserPreferences['subtitles'];
  /** Shifts the overlay up so it doesn't collide with the visible control bar. */
  controlsVisible: boolean;
};

const SIZE_CLASS: Record<UserPreferences['subtitles']['textSize'], string> = {
  sm: 'text-sm sm:text-base',
  md: 'text-base sm:text-xl',
  lg: 'text-lg sm:text-2xl',
};

function edgeStyleCss(edge: UserPreferences['subtitles']['edgeStyle']): React.CSSProperties {
  switch (edge) {
    case 'outline':
      return {
        textShadow:
          '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 6px rgba(0,0,0,0.6)',
      };
    case 'drop-shadow':
      return { textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)' };
    default:
      return {};
  }
}

/** Custom-rendered subtitle overlay, driven entirely by parsed WebVTT cues so
 * appearance (size, background, edge style, position) is fully user-configurable
 * instead of depending on the browser's native cue box. */
export default function SubtitleOverlay({ cues, prefs, controlsVisible }: Props) {
  if (cues.length === 0) return null;

  const bg =
    prefs.backgroundOpacity > 0
      ? `rgba(0,0,0,${Math.min(100, prefs.backgroundOpacity) / 100})`
      : 'transparent';

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center gap-1 px-4 text-center transition-[bottom,top] duration-200 ${
        prefs.verticalPosition === 'top' ? 'top-6' : controlsVisible ? 'bottom-28' : 'bottom-10'
      }`}
      data-testid="subtitle-overlay"
    >
      {cues.map((cue, i) => (
        <span
          key={`${cue.startSec}-${i}`}
          className={`max-w-3xl rounded px-2 py-1 font-medium leading-snug text-white ${SIZE_CLASS[prefs.textSize]}`}
          style={{ backgroundColor: bg, ...edgeStyleCss(prefs.edgeStyle) }}
          dangerouslySetInnerHTML={{ __html: cue.html }}
        />
      ))}
    </div>
  );
}
