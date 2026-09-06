import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { PinGateDialog } from '../components/parental/PinGateDialog';
import { RestrictedOverlay } from '../components/parental/RestrictedOverlay';
import { getParentalState, ratingExceedsMax } from '../lib/parental';
import type { MediaKind } from '../lib/userdata';

export default function Player() {
  const [params] = useSearchParams();
  const src = params.get('src') || '';
  const title = params.get('title') || 'Playback';
  const id = params.get('id') || undefined;
  const kind = (params.get('kind') as MediaKind) || 'movie';
  const poster = params.get('poster') || undefined;
  const back = params.get('back') || (kind === 'episode' || kind === 'tv' ? '/tv' : '/movies');
  const showId = params.get('showId') || undefined;
  const season = params.get('season');
  const episode = params.get('episode');
  const startOver = params.get('restart') === '1';
  const contentRating = params.get('content_rating') || undefined;

  const [pinOpen, setPinOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const parentalState = getParentalState();
  const effectiveCeiling = parentalState.kidsMode && !parentalState.maxRating
    ? 'PG'
    : parentalState.maxRating;
  const isRestricted = !unlocked && Boolean(contentRating) &&
    ratingExceedsMax(contentRating, effectiveCeiling);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  if (isRestricted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <RestrictedOverlay
          contentRating={contentRating}
          maxRating={effectiveCeiling}
          onUnlock={() => {
            if (!parentalState.pinEnabled || !parentalState.pinHash) {
              setUnlocked(true);
            } else {
              setPinOpen(true);
            }
          }}
          onBack={() => { window.history.back(); }}
        />
        {pinOpen && (
          <PinGateDialog
            pinHash={parentalState.pinHash}
            onSuccess={() => { setPinOpen(false); setUnlocked(true); }}
            onCancel={() => setPinOpen(false)}
            actionLabel={`Unlock "${title}"`}
          />
        )}
      </div>
    );
  }

  return (
    <VideoPlayer
      src={src}
      title={title}
      mediaId={id}
      mediaKind={kind}
      posterUrl={poster}
      href={back}
      showId={showId}
      seasonNumber={season ? Number(season) : undefined}
      episodeNumber={episode ? Number(episode) : undefined}
      startOver={startOver}
    />
  );
}
