import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Comics() {
  const load = useCallback(() => api.listComics(), [])
  return (
    <LibrarySection
      title="Comics"
      description="Series library from media-comics via mediauiprox GET /api/comics."
      load={load}
      primaryLabel={(row) => row.title || row.name || row.id}
      secondaryLabel={(row) => row.publisher || row.path || ''}
      emptyReadyMessage="No series in the comics library yet. Scan a library root in media-comics."
    />
  )
}
