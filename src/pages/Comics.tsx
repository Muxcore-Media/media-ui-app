import { useCallback } from 'react';
import { api } from '../api/client';
import { AddArtistField } from '../components/media/AddArtistField';
import LibrarySection from './LibrarySection';

export default function Comics() {
  const load = useCallback(() => api.listComics(), []);
  return (
    <LibrarySection
      title="Comics"
      description="Browse comic series."
      load={load}
      primaryLabel={(row) => String(row.title || row.name || row.id)}
      secondaryLabel={(row) => String(row.publisher ?? '')}
      emptyReadyMessage="Add a series or scan your comics library to get started."
      rowHref={(row) => `/comics/${encodeURIComponent(row.id)}`}
      addSlot={(reload) => (
        <AddArtistField
          nameLabel="Series title"
          submitLabel="Add series"
          testId="add-series"
          placeholder="Saga"
          onAdd={async ({ name }) => {
            await api.addComicSeries({ title: name });
            await reload();
          }}
        />
      )}
    />
  );
}
