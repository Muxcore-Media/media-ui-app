import { Outlet } from 'react-router-dom';
import { useNowPlayingOptional } from '../lib/nowPlaying';
import Nav from './layout/Nav';
import NowPlayingBar from './media/NowPlayingBar';
import { ErrorBoundary } from './ui/ErrorBoundary';

export default function Layout() {
  const nowPlaying = useNowPlayingOptional();
  const docked = Boolean(nowPlaying?.track);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <main
        className={`mx-auto min-w-0 max-w-[1920px] px-4 py-6 sm:px-6 lg:px-10 ${
          docked ? 'pb-44 lg:pb-28' : 'pb-24 lg:pb-6'
        }`}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <NowPlayingBar />
    </div>
  );
}
