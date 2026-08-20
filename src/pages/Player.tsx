import { Link, useSearchParams } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'
import type { MediaKind } from '../lib/userdata'

export default function Player() {
  const [params] = useSearchParams()
  const src = params.get('src') || ''
  const title = params.get('title') || 'Playback'
  const id = params.get('id') || undefined
  const kind = (params.get('kind') as MediaKind) || 'movie'
  const poster = params.get('poster') || undefined
  const back = params.get('back') || (kind === 'tv' ? '/tv' : '/movies')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        <Link to={back} className="text-sm text-[var(--accent)]">
          Back
        </Link>
      </div>
      <VideoPlayer
        src={src}
        title={title}
        mediaId={id}
        mediaKind={kind}
        posterUrl={poster}
        href={back}
      />
    </div>
  )
}
