import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-[var(--accent)] text-black'
      : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
  }`

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="shrink-0 text-lg font-bold tracking-tight">
            MuxCore <span className="text-[var(--accent)]">Media</span>
          </NavLink>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/search" className={linkClass}>
              Search
            </NavLink>
            <NavLink to="/movies" className={linkClass}>
              Movies
            </NavLink>
            <NavLink to="/tv" className={linkClass}>
              TV
            </NavLink>
            <NavLink to="/music" className={linkClass}>
              Music
            </NavLink>
            <NavLink to="/musicvideos" className={linkClass}>
              Music Videos
            </NavLink>
            <NavLink to="/mixed" className={linkClass}>
              Mixed
            </NavLink>
            <NavLink to="/homevideos" className={linkClass}>
              Home Videos
            </NavLink>
            <NavLink to="/books" className={linkClass}>
              Books
            </NavLink>
            <NavLink to="/comics" className={linkClass}>
              Comics
            </NavLink>
            <NavLink to="/audiobooks" className={linkClass}>
              Audiobooks
            </NavLink>
            <NavLink to="/favorites" className={linkClass}>
              Favorites
            </NavLink>
            <NavLink to="/collections" className={linkClass}>
              Collections
            </NavLink>
            <NavLink to="/studios" className={linkClass}>
              Studios
            </NavLink>
            <NavLink to="/upcoming" className={linkClass}>
              Upcoming
            </NavLink>
            <NavLink to="/playlists" className={linkClass}>
              Playlists
            </NavLink>
            <NavLink to="/queue" className={linkClass}>
              Queue
            </NavLink>
            <NavLink to="/livetv" className={linkClass}>
              Live TV
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              Settings
            </NavLink>
          </nav>
          <a
            href="/logout"
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            Logout
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
