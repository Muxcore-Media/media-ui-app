import { Outlet } from 'react-router-dom';
import Nav from './layout/Nav';
import { ErrorBoundary } from './ui/ErrorBoundary';

export default function Layout() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Nav />
      <main className="mx-auto min-w-0 max-w-[1920px] px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:pb-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
