import { youtubeEmbedUrl } from '../../lib/tmdbImages';
import type { DiscoverTrailer } from '../../types';

interface Props {
  trailer: DiscoverTrailer | null | undefined;
  /** Used for the iframe title and section heading label fallback. */
  titleLabel: string;
  headingId?: string;
}

/**
 * Renders an inline YouTube embed for a trailer sourced from DiscoverDetail.
 * Returns null (renders nothing) when `trailer.youtubeKey` is absent.
 */
export default function TrailerSection({
  trailer,
  titleLabel,
  headingId = 'trailer-heading',
}: Props) {
  if (!trailer?.youtubeKey) return null;

  const iframeTitle = trailer.name || `${titleLabel} trailer`;

  return (
    <section
      className="space-y-3"
      aria-labelledby={headingId}
      data-testid="trailer-section"
    >
      <h2
        id={headingId}
        className="text-lg font-semibold text-[var(--text-primary)]"
      >
        Trailer
      </h2>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--player-bg)] shadow-xl">
        <div className="relative aspect-video w-full">
          <iframe
            title={iframeTitle}
            src={youtubeEmbedUrl(trailer.youtubeKey)}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      {trailer.name ? (
        <p className="text-sm text-[var(--text-secondary)]">{trailer.name}</p>
      ) : null}
    </section>
  );
}
