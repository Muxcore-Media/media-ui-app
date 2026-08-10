import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Music() {
  const load = useCallback(() => api.listMusic(), [])
  return (
    <LibrarySection
      title="Music"
      description="Artist library from media-music via mediauiprox GET /api/music."
      load={load}
      primaryLabel={(row) => row.name || row.title || row.id}
      secondaryLabel={(row) => row.path || ''}
      emptyReadyMessage="No artists in the music library yet. Scan a library root in media-music."
    />
  )
}
