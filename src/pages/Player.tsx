import { Link, useSearchParams } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'

export default function Player() {
  const [params] = useSearchParams()
  const src = params.get('src') || ''
  const title = params.get('title') || 'Playback'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        <Link to="/movies" className="text-sm text-[var(--accent)]">
          Back
        </Link>
      </div>
      <VideoPlayer src={src} title={title} />
    </div>
  )
}
