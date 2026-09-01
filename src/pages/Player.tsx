import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
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
