import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import CapabilitiesProvider from './components/CapabilitiesProvider';
import Layout from './components/Layout';
import { ErrorBanner } from './components/ui/ErrorBanner';
import { ToastProvider } from './components/ui/Toast';
import { NowPlayingProvider } from './lib/nowPlaying';
import { PosterGridSkeleton } from './components/media/PosterGrid';
import {
  DetailHeroSkeleton,
  FormPageSkeleton,
  HeroBannerSkeleton,
  LiveTVSkeleton,
  PlayerSkeleton,
  QueueListSkeleton,
  SettingsSkeleton,
  ShelfSkeleton,
} from './components/ui/Skeleton';
import { applyTheme, getPreferences, pullUserdataFromServer } from './lib/userdata';
import { featureEnabled, libraryEnabled, useCapabilities } from './lib/capabilities';
import { useReadyNotifications } from './lib/useReadyNotifications';

const Player = lazy(() => import('./pages/Player'));
const LiveTV = lazy(() => import('./pages/LiveTV'));
const Settings = lazy(() => import('./pages/Settings'));
const Discover = lazy(() => import('./pages/Discover'));
const DiscoverDetail = lazy(() => import('./pages/DiscoverDetail'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));
const TVShowDetail = lazy(() => import('./pages/TVShowDetail'));
const Movies = lazy(() => import('./pages/Movies'));
const TVShows = lazy(() => import('./pages/TVShows'));
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const WantToWatch = lazy(() => import('./pages/WantToWatch'));
const Collections = lazy(() => import('./pages/Collections'));
const Music = lazy(() => import('./pages/Music'));
const InProgress = lazy(() => import('./pages/InProgress'));
const Activity = lazy(() => import('./pages/Activity'));
const Issues = lazy(() => import('./pages/Issues'));
const Offline = lazy(() => import('./pages/Offline'));
const Sessions = lazy(() => import('./pages/Sessions'));
const WatchStats = lazy(() => import('./pages/WatchStats'));
const Blocklist = lazy(() => import('./pages/Blocklist'));
const Upcoming = lazy(() => import('./pages/Upcoming'));
const Missing = lazy(() => import('./pages/Missing'));
const Mixed = lazy(() => import('./pages/Mixed'));
const MusicVideos = lazy(() => import('./pages/MusicVideos'));
const HomeVideos = lazy(() => import('./pages/HomeVideos'));
const Studios = lazy(() => import('./pages/Studios'));
const Books = lazy(() => import('./pages/Books'));
const BookAuthor = lazy(() => import('./pages/BookAuthor'));
const Comics = lazy(() => import('./pages/Comics'));
const ComicSeries = lazy(() => import('./pages/ComicSeries'));
const Audiobooks = lazy(() => import('./pages/Audiobooks'));
const AudiobookDetail = lazy(() => import('./pages/AudiobookDetail'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Queue = lazy(() => import('./pages/Queue'));
const Playlists = lazy(() => import('./pages/Playlists'));
const QuickConnect = lazy(() => import('./pages/QuickConnect'));
const MusicArtist = lazy(() => import('./pages/MusicArtist'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const InviteJoin = lazy(() => import('./pages/InviteJoin'));
const PersonDetail = lazy(() => import('./pages/PersonDetail'));
const History = lazy(() => import('./pages/History'));
const GenreLanding = lazy(() => import('./pages/GenreLanding'));
const StudioLanding = lazy(() => import('./pages/StudioLanding'));
const NetworkLanding = lazy(() => import('./pages/NetworkLanding'));

function LazyLiveTV() {
  return (
    <Suspense fallback={<LiveTVSkeleton />}>
      <LiveTV />
    </Suspense>
  );
}

function LazySettings() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <Settings />
    </Suspense>
  );
}

function LazyDiscover() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <Discover />
    </Suspense>
  );
}

function LazyDiscoverDetail() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <DiscoverDetail />
    </Suspense>
  );
}

function LazyMovieDetail() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <MovieDetail />
    </Suspense>
  );
}

function LazyTVShowDetail() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <TVShowDetail />
    </Suspense>
  );
}

function LazyMovies() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <Movies />
    </Suspense>
  );
}

function LazyTVShows() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <TVShows />
    </Suspense>
  );
}

function LazyHome() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <HeroBannerSkeleton />
          <ShelfSkeleton />
          <ShelfSkeleton />
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}

function LazySearch() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={6} />}>
      <Search />
    </Suspense>
  );
}

function LazyWatchlist() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <Watchlist />
    </Suspense>
  );
}

function LazyCollections() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={6} />}>
      <Collections />
    </Suspense>
  );
}

function LazyMusic() {
  return (
    <Suspense fallback={<ShelfSkeleton count={4} />}>
      <Music />
    </Suspense>
  );
}

function LazyInProgress() {
  return (
    <Suspense fallback={<ShelfSkeleton count={4} />}>
      <InProgress />
    </Suspense>
  );
}

function LazyUpcoming() {
  return (
    <Suspense fallback={<ShelfSkeleton count={4} />}>
      <Upcoming />
    </Suspense>
  );
}

function LazyMissing() {
  return (
    <Suspense fallback={<ShelfSkeleton count={4} />}>
      <Missing />
    </Suspense>
  );
}

function LazyMixed() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <Mixed />
    </Suspense>
  );
}

function LazyMusicVideos() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <MusicVideos />
    </Suspense>
  );
}

function LazyHomeVideos() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <HomeVideos />
    </Suspense>
  );
}

function LazyStudios() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={9} />}>
      <Studios />
    </Suspense>
  );
}

function LazyBooks() {
  return (
    <Suspense fallback={<ShelfSkeleton count={4} />}>
      <Books />
    </Suspense>
  );
}

function LazyBookAuthor() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <BookAuthor />
    </Suspense>
  );
}

function LazyComics() {
  return (
    <Suspense fallback={<ShelfSkeleton count={4} />}>
      <Comics />
    </Suspense>
  );
}

function LazyComicSeries() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <ComicSeries />
    </Suspense>
  );
}

function LazyAudiobooks() {
  return (
    <Suspense fallback={<ShelfSkeleton count={4} />}>
      <Audiobooks />
    </Suspense>
  );
}

function LazyAudiobookDetail() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <AudiobookDetail />
    </Suspense>
  );
}

function LazyFavorites() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <Favorites />
    </Suspense>
  );
}

function LazyWantToWatch() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <WantToWatch />
    </Suspense>
  );
}

function LazyQueue() {
  return (
    <Suspense fallback={<QueueListSkeleton />}>
      <Queue />
    </Suspense>
  );
}

function LazyActivity() {
  return (
    <Suspense fallback={<QueueListSkeleton />}>
      <Activity />
    </Suspense>
  );
}

function LazyIssues() {
  return (
    <Suspense fallback={<QueueListSkeleton />}>
      <Issues />
    </Suspense>
  );
}

function LazyOffline() {
  return (
    <Suspense fallback={<QueueListSkeleton />}>
      <Offline />
    </Suspense>
  );
}

function LazySessions() {
  return (
    <Suspense fallback={<QueueListSkeleton />}>
      <Sessions />
    </Suspense>
  );
}

function LazyWatchStats() {
  return (
    <Suspense fallback={<QueueListSkeleton />}>
      <WatchStats />
    </Suspense>
  );
}

function LazyBlocklist() {
  return (
    <Suspense fallback={<QueueListSkeleton />}>
      <Blocklist />
    </Suspense>
  );
}

function LazyPlaylists() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={6} />}>
      <Playlists />
    </Suspense>
  );
}

function LazyQuickConnect() {
  return (
    <Suspense fallback={<FormPageSkeleton label="Loading Quick Connect" />}>
      <QuickConnect />
    </Suspense>
  );
}

function LazyMusicArtist() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <MusicArtist />
    </Suspense>
  );
}

function LazyForgotPassword() {
  return (
    <Suspense fallback={<FormPageSkeleton label="Loading forgot password" />}>
      <ForgotPassword />
    </Suspense>
  );
}

function LazyPersonDetail() {
  return (
    <Suspense fallback={<DetailHeroSkeleton />}>
      <PersonDetail />
    </Suspense>
  );
}

function LazyHistory() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <History />
    </Suspense>
  );
}

function LazyInviteJoin() {
  return (
    <Suspense fallback={<FormPageSkeleton label="Loading invite" />}>
      <InviteJoin />
    </Suspense>
  );
}

function LazyGenreLanding() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <GenreLanding />
    </Suspense>
  );
}

function LazyStudioLanding() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <StudioLanding />
    </Suspense>
  );
}

function LazyNetworkLanding() {
  return (
    <Suspense fallback={<PosterGridSkeleton count={12} />}>
      <NetworkLanding />
    </Suspense>
  );
}

/** Mounts the ready-to-watch polling hook when the request feature is enabled. */
function ReadyNotificationWatcher() {
  useReadyNotifications();
  return null;
}

function AppRoutes() {
  const { caps, loading, error, retry } = useCapabilities();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-secondary)]">
        Loading your library…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
        <ErrorBanner message={error} testId="capabilities-error" />
        <p className="text-sm text-[var(--text-secondary)]">
          We couldn&apos;t load which libraries and features are available. Check your connection
          and try again.
        </p>
        <button
          type="button"
          onClick={retry}
          className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {featureEnabled(caps, 'request') && <ReadyNotificationWatcher />}
      <Routes>
        <Route
          path="player"
        element={
          <Suspense fallback={<PlayerSkeleton />}>
            <Player />
          </Suspense>
        }
      />
      <Route path="invite/:token" element={<LazyInviteJoin />} />
      <Route element={<Layout />}>
        <Route index element={<LazyHome />} />
        <Route path="search" element={<LazySearch />} />
        {featureEnabled(caps, 'request') && <Route path="discover" element={<LazyDiscover />} />}
        {featureEnabled(caps, 'watchlist') && (
          <Route path="watchlist" element={<LazyWatchlist />} />
        )}
        {featureEnabled(caps, 'wantToWatch') && (
          <Route path="want-to-watch" element={<LazyWantToWatch />} />
        )}
        <Route path="discover/:type/:id" element={<LazyDiscoverDetail />} />
        <Route path="person/:id" element={<LazyPersonDetail />} />
        <Route path="genre/:name" element={<LazyGenreLanding />} />
        <Route path="studio/:name" element={<LazyStudioLanding />} />
        <Route path="network/:name" element={<LazyNetworkLanding />} />
        <Route path="favorites" element={<LazyFavorites />} />
        <Route path="history" element={<LazyHistory />} />
        {featureEnabled(caps, 'queue') && <Route path="queue" element={<LazyQueue />} />}
        {featureEnabled(caps, 'request') && <Route path="requests" element={<LazyInProgress />} />}
        {featureEnabled(caps, 'activity') && <Route path="activity" element={<LazyActivity />} />}
        {featureEnabled(caps, 'activity') && <Route path="blocklist" element={<LazyBlocklist />} />}
        {featureEnabled(caps, 'issues') && <Route path="issues" element={<LazyIssues />} />}
        {featureEnabled(caps, 'offline') && <Route path="offline" element={<LazyOffline />} />}
        {featureEnabled(caps, 'playbackMonitor') && (
          <Route path="sessions" element={<LazySessions />} />
        )}
        {featureEnabled(caps, 'playbackMonitor') && (
          <Route path="watch-stats" element={<LazyWatchStats />} />
        )}
        {featureEnabled(caps, 'collections') && (
          <Route path="collections" element={<LazyCollections />} />
        )}
        {featureEnabled(caps, 'upcoming') && <Route path="upcoming" element={<LazyUpcoming />} />}
        {featureEnabled(caps, 'upcoming') && <Route path="missing" element={<LazyMissing />} />}
        {featureEnabled(caps, 'playlists') && (
          <Route path="playlists" element={<LazyPlaylists />} />
        )}
        {featureEnabled(caps, 'livetv') && <Route path="livetv" element={<LazyLiveTV />} />}
        {featureEnabled(caps, 'quickconnect') && (
          <Route path="quickconnect" element={<LazyQuickConnect />} />
        )}
        <Route path="settings" element={<LazySettings />} />
        <Route path="settings/profile" element={<LazySettings />} />
        <Route path="settings/display" element={<LazySettings />} />
        <Route path="settings/home" element={<LazySettings />} />
        <Route path="settings/playback" element={<LazySettings />} />
        <Route path="settings/parental" element={<LazySettings />} />
        <Route path="settings/subtitles" element={<LazySettings />} />
        <Route path="settings/controls" element={<LazySettings />} />
        <Route path="settings/notifications" element={<LazySettings />} />
        {featureEnabled(caps, 'debrid') && (
          <Route path="settings/debrid" element={<LazySettings />} />
        )}
        <Route path="settings/requests" element={<LazySettings />} />
        <Route path="settings/acquisition" element={<LazySettings />} />
        <Route path="settings/quality" element={<LazySettings />} />
        <Route path="settings/delay" element={<LazySettings />} />
        <Route path="settings/libraries" element={<LazySettings />} />
        <Route path="settings/maintainer" element={<LazySettings />} />
        <Route path="settings/naming" element={<LazySettings />} />
        <Route path="settings/tags" element={<LazySettings />} />
        <Route path="settings/backups" element={<LazySettings />} />
        <Route path="settings/lists" element={<LazySettings />} />
        <Route path="settings/migrate" element={<LazySettings />} />
        <Route path="settings/users" element={<LazySettings />} />
        <Route path="settings/keys" element={<LazySettings />} />
        <Route path="settings/invites" element={<LazySettings />} />
        {featureEnabled(caps, 'studios') && <Route path="studios" element={<LazyStudios />} />}
        {libraryEnabled(caps, 'movies') && (
          <>
            <Route path="movies" element={<LazyMovies />} />
            <Route path="movies/:id" element={<LazyMovieDetail />} />
          </>
        )}
        {libraryEnabled(caps, 'tv') && (
          <>
            <Route path="tv" element={<LazyTVShows />} />
            <Route path="tv/:id" element={<LazyTVShowDetail />} />
          </>
        )}
        {libraryEnabled(caps, 'music') && (
          <>
            <Route path="music" element={<LazyMusic />} />
            <Route path="music/:id" element={<LazyMusicArtist />} />
          </>
        )}
        {libraryEnabled(caps, 'homevideos') && (
          <Route path="homevideos" element={<LazyHomeVideos />} />
        )}
        {featureEnabled(caps, 'mixed') && <Route path="mixed" element={<LazyMixed />} />}
        {libraryEnabled(caps, 'musicvideos') && (
          <Route path="musicvideos" element={<LazyMusicVideos />} />
        )}
        {libraryEnabled(caps, 'books') && (
          <>
            <Route path="books" element={<LazyBooks />} />
            <Route path="books/:id" element={<LazyBookAuthor />} />
          </>
        )}
        {libraryEnabled(caps, 'comics') && (
          <>
            <Route path="comics" element={<LazyComics />} />
            <Route path="comics/:id" element={<LazyComicSeries />} />
          </>
        )}
        {libraryEnabled(caps, 'audiobooks') && (
          <>
            <Route path="audiobooks" element={<LazyAudiobooks />} />
            <Route path="audiobooks/:id" element={<LazyAudiobookDetail />} />
          </>
        )}
        <Route path="forgot-password" element={<LazyForgotPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}

export default function App() {
  const [userdataSyncFailed, setUserdataSyncFailed] = useState(false);

  useEffect(() => {
    applyTheme(getPreferences().display.theme);
    void pullUserdataFromServer().then((ok) => {
      setUserdataSyncFailed(!ok);
      applyTheme(getPreferences().display.theme);
    });
  }, []);

  return (
    <CapabilitiesProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <NowPlayingProvider>
            {userdataSyncFailed && (
              <p
                role="status"
                data-testid="userdata-sync-warning"
                className="border-b border-[var(--danger-color)]/30 bg-[var(--bg-elevated)] px-4 py-2 text-center text-sm text-[var(--text-secondary)]"
              >
                Couldn&apos;t sync your progress — showing local data.
              </p>
            )}
            <AppRoutes />
          </NowPlayingProvider>
        </ToastProvider>
      </BrowserRouter>
    </CapabilitiesProvider>
  );
}
