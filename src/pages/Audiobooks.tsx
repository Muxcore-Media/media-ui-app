import { useCallback } from 'react'
import { api } from '../api/client'
import LibrarySection from './LibrarySection'

export default function Audiobooks() {
  const load = useCallback(() => api.listAudiobooks(), [])
  return (
    <LibrarySection
      title="Audiobooks"
      description="Listen to audiobooks from your library."
      load={load}
      primaryLabel={(row) => row.title || row.name || row.id}
      secondaryLabel={(row) => [row.narrator, row.asin].filter(Boolean).join(' · ')}
      emptyReadyMessage="No audiobooks in your library yet."
    />
  )
}
