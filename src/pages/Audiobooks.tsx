import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Audiobooks() {
  const load = useCallback(() => api.listAudiobooks(), [])
  return (
    <LibrarySection
      title="Audiobooks"
      description="Titles from media-audiobooks via mediauiprox GET /api/audiobooks."
      load={load}
      primaryLabel={(row) => row.title || row.name || row.id}
      secondaryLabel={(row) =>
        [row.narrator, row.asin].filter(Boolean).join(' · ') || row.path || ''
      }
      emptyReadyMessage="No audiobooks in the library yet. Scan a library root in media-audiobooks."
    />
  )
}
