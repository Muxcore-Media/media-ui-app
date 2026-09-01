import { tmdbImageUrl } from '../../lib/tmdbImages';
import type { DiscoverCastMember } from '../../types';

type Props = {
  cast: DiscoverCastMember[];
  headingId?: string;
  testId?: string;
};

/** Cast grid shared by discover and library detail pages. */
export default function CastSection({ cast, headingId = 'cast-heading', testId = 'detail-cast' }: Props) {
  if (!cast.length) return null;

  return (
    <section className="space-y-3" data-testid={testId} aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold text-[var(--text-primary)]">
        Cast
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {cast.map((member) => (
          <li
            key={`${member.id}-${member.name}`}
            className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
          >
            <div className="aspect-[2/3] bg-[var(--bg-elevated-2)]">
              {member.profilePath ? (
                <img
                  src={tmdbImageUrl(member.profilePath, 'w185')}
                  alt={member.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--text-tertiary)]">
                  {member.name}
                </div>
              )}
            </div>
            <div className="space-y-0.5 p-2">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{member.name}</p>
              {member.character ? (
                <p className="truncate text-xs text-[var(--text-tertiary)]">{member.character}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
