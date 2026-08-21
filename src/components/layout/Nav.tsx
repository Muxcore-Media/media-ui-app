import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Baby,
  BookOpen,
  Clapperboard,
  Film,
  Heart,
  Home as HomeIcon,
  LayoutGrid,
  Library,
  LogOut,
  MoreHorizontal,
  Music2,
  Search,
  Settings,
  Tv,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useCapabilities } from '../../lib/capabilities'
import {
  mobileMoreMenuItems,
  showDesktopMoreMenu,
  showMobileMoreMenu,
  visibleOverflowNav,
  visiblePrimaryNav,
  type NavItem,
} from '../../lib/nav-catalog'
import HeaderSearch from './HeaderSearch'

const PRIMARY_ICONS: Record<string, React.ReactNode> = {
  '/': <LayoutGrid className="h-4 w-4" aria-hidden="true" />,
  '/movies': <Film className="h-4 w-4" aria-hidden="true" />,
  '/tv': <Tv className="h-4 w-4" aria-hidden="true" />,
  '/music': <Music2 className="h-4 w-4" aria-hidden="true" />,
  '/books': <BookOpen className="h-4 w-4" aria-hidden="true" />,
  '/comics': <Clapperboard className="h-4 w-4" aria-hidden="true" />,
  '/audiobooks': <Baby className="h-4 w-4" aria-hidden="true" />,
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
    isActive
      ? 'bg-[var(--accent-color)] text-black'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
  )

function withIcons(items: NavItem[]): (NavItem & { icon?: React.ReactNode })[] {
  return items.map((item) => ({ ...item, icon: PRIMARY_ICONS[item.to] }))
}

export default function Nav() {
  const { caps } = useCapabilities()
  const primary = withIcons(visiblePrimaryNav(caps))
  const mobileMenuItems = mobileMoreMenuItems(caps)
  const showDesktopMore = showDesktopMoreMenu(caps)
  const showMobileMore = showMobileMoreMenu(caps)

  const [scrolled, setScrolled] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMoreOpen(false)
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [moreOpen])

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 transition-colors duration-300',
          scrolled
            ? 'border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)] backdrop-blur-md'
            : 'border-b border-transparent bg-gradient-to-b from-black/70 to-transparent',
        )}
      >
        <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <NavLink to="/" className="shrink-0 text-lg font-bold tracking-tight">
            MuxCore <span className="text-[var(--accent-color)]">Media</span>
          </NavLink>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="Primary">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {primary.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>

            {showDesktopMore && (
              <div className="relative shrink-0" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition',
                    moreOpen
                      ? 'bg-[var(--bg-elevated-2)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  More
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 shadow-xl"
                  >
                    {visibleOverflowNav(caps).map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'block rounded-[var(--radius-sm)] px-3 py-2 text-sm transition',
                            isActive
                              ? 'bg-[var(--accent-color)] text-black'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <HeaderSearch className="hidden min-w-[6rem] flex-1 sm:flex lg:max-w-sm" />

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <NavLink
              to="/favorites"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-[var(--accent-color)] text-black'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                )
              }
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Favorites</span>
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-[var(--accent-color)] text-black'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                )
              }
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </NavLink>
            <a
              href="/logout"
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                showMobileMore ? 'hidden sm:flex' : 'flex',
              )}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </a>
          </div>
        </div>
      </header>

      {showMobileMore && mobileOpen && (
        <nav
          aria-label="More"
          className="fixed inset-x-0 bottom-16 z-40 max-h-[60vh] overflow-y-auto border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 shadow-2xl lg:hidden"
        >
          <div className="grid grid-cols-2 gap-1">
            {mobileMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : undefined}
                className={({ isActive }) =>
                  cn(
                    'rounded-[var(--radius-sm)] px-3 py-2 text-sm',
                    isActive ? 'bg-[var(--accent-color)] text-black' : 'text-[var(--text-secondary)]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a href="/logout" className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              Logout
            </a>
          </div>
        </nav>
      )}

      <MobileTabBar
        open={mobileOpen}
        onToggleMore={() => setMobileOpen((v) => !v)}
        showMore={showMobileMore}
      />
    </>
  )
}

const MOBILE_TABS: { to: string; label: string; icon: React.ReactNode; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true, icon: <HomeIcon className="h-5 w-5" aria-hidden="true" /> },
  { to: '/search', label: 'Search', icon: <Search className="h-5 w-5" aria-hidden="true" /> },
  { to: '/movies', label: 'Library', icon: <Library className="h-5 w-5" aria-hidden="true" /> },
]

/** Bottom tab bar for thumb reach on small screens (AGENTS.md §4.1): Home/Search/Library/More. */
function MobileTabBar({
  open,
  onToggleMore,
  showMore,
}: {
  open: boolean
  onToggleMore: () => void
  showMore: boolean
}) {
  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-overlay)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {MOBILE_TABS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
              isActive ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)]',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
      {showMore && (
        <button
          type="button"
          onClick={onToggleMore}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'More'}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
            open ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)]',
          )}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <MoreHorizontal className="h-5 w-5" aria-hidden="true" />}
          More
        </button>
      )}
    </nav>
  )
}
