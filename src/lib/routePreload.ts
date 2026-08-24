/** Lazy detail chunks (mirrors App.tsx) — prefetch on PosterCard hover/focus. */
const loadDiscoverDetail = () => import('../pages/DiscoverDetail')

const detailPreloaders = {
  movie: () => import('../pages/MovieDetail'),
  tv: () => import('../pages/TVShowDetail'),
  discover: loadDiscoverDetail,
  external: loadDiscoverDetail,
} as const

export type PosterDetailType = keyof typeof detailPreloaders

export function prefetchPosterDetailRoute(type: PosterDetailType): void {
  void detailPreloaders[type]()
}
