import { useRelated } from '../../hooks/useRelated';
import PosterCard from './PosterCard';
import { Shelf, ShelfItem } from './Shelf';
import { ShelfSkeleton } from '../ui/Skeleton';

type Props = {
  kind: 'movie' | 'tv';
  tmdbId: number | undefined;
  title?: string;
  limit?: number;
};

/**
 * Related-titles horizontal shelf backed by the media-graph module
 * (umbrella#90).  Renders nothing when:
 *  - The media-graph capability is unavailable (available=false).
 *  - The graph returns no neighbors for this title.
 *  - A fetch error occurs (soft-empty, never breaks the detail page).
 *
 * Parental filter is applied via useRelated before items reach this component.
 */
export default function RelatedShelf({
  kind,
  tmdbId,
  title = 'Related Titles',
  limit = 12,
}: Props) {
  const { items, loading, available } = useRelated(kind, tmdbId, limit);

  // If the module isn't configured or has no related items, hide the rail.
  if (!available) return null;

  if (loading) {
    return <ShelfSkeleton count={6} />;
  }

  if (!items.length) return null;

  return (
    <Shelf title={title} testId="related-shelf">
      {items.map((item) => (
        <ShelfItem key={`${item.mediaType}:${item.id}`}>
          <PosterCard item={item} type="external" />
        </ShelfItem>
      ))}
    </Shelf>
  );
}
