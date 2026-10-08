import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { signOut } from '../../api/client';
import { cn } from '../../lib/cn';
import { useCapabilities } from '../../lib/capabilities';
import { useRestrictedEntryPoints } from '../../lib/restricted-routes';
import {
  mobileMoreMenuItems,
  showDesktopMoreMenu,
  showMobileMoreMenu,
  visibleOverflowNav,
  visiblePrimaryNav,
  type NavItem,
} from '../../lib/nav-catalog';
import HeaderSearch from './HeaderSearch';

const PRIMARY_ICONS: Record<string, React.ReactNode> = {
  '/': <LayoutGrid className="h-4 w-4" aria-hidden="true" />,
  '/movies': <Film className="h-4 w-4" aria-hidden="true" />,
  '/tv': <Tv className="h-4 w-4" aria-hidden="true" />,
  '/music': <Music2 className="h-4 w-4" aria-hidden="true" />,
  '/books': <BookOpen className="h-4 w-4" aria-hidden="true" />,
  '/comics': <Clapperboard className="h-4 w-4" aria-hidden="true" />,
  '/audiobooks': <Baby className="h-4 w-4" aria-hidden="true" />,
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
    isActive
      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
  );

function withIcons(items: NavItem[]): (NavItem & { icon?: React.ReactNode })[] {
  return items.map((item) => ({ ...item, icon: PRIMARY_ICONS[item.to] }));
}

export default function Nav() {
  const { caps } = useCapabilities();
  // Entry points the BFF already refused with parental.restricted_route (cosmetic; ADR-0031).
  const restricted = useRestrictedEntryPoints();
  const primary = withIcons(visiblePrimaryNav(caps, restricted));
  const mobileMenuItems = mobileMoreMenuItems(caps, restricted);
  const showDesktopMore = showDesktopMoreMenu(caps, restricted);
  const showMobileMore = showMobileMoreMenu(caps, restricted);

  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreInitialFocus = useRef<'first' | 'last'>('first');
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (moreOpen) {
      const items = moreMenuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
      items?.[moreInitialFocus.current === 'last' ? items.length - 1 : 0]?.focus();
    }
  }, [moreOpen]);

  useEffect(() => {
    if (mobileOpen) mobileMenuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    if (!moreOpen && !mobileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreOpen && moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (moreOpen) {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
      if (mobileOpen) {
        setMobileOpen(false);
        mobileButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen, mobileOpen]);

  function onMoreMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      // Continue the normal tab sequence from the trigger when leaving the menu.
      setMoreOpen(false);
      moreButtonRef.current?.focus();
      return;
    }
    const items = Array.from(moreMenuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') || []);
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === ' ' && current >= 0) {
      event.preventDefault();
      items[current].click();
      return;
    }
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % items.length
      : event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length
      : null;
    if (next !== null) {
      event.preventDefault();
      items[next].focus();
    }
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 transition-colors duration-300',
          scrolled
            ? 'border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)] backdrop-blur-md'
            : 'border-b border-transparent bg-gradient-to-b from-[var(--scrim-strong)] to-transparent',
        )}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-[1920px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <NavLink
            to="/"
            className="shrink-0 text-lg font-bold tracking-tight"
            aria-label="MuxCore Media home"
          >
            MuxCore <span className="text-[var(--accent-text)]">Media</span>
          </NavLink>

          <nav
            className="hidden min-w-0 flex-1 items-center gap-1 lg:flex"
            aria-label="Primary navigation"
          >
            <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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
                  ref={moreButtonRef}
                  type="button"
                  onClick={() => {
                    moreInitialFocus.current = 'first';
                    setMoreOpen((v) => !v);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      moreInitialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
                      setMoreOpen(true);
                    }
                  }}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  aria-controls="desktop-more-menu"
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
                    ref={moreMenuRef}
                    id="desktop-more-menu"
                    role="menu"
                    aria-label="More navigation"
                    onKeyDown={onMoreMenuKeyDown}
                    className="absolute left-0 top-full z-50 mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 shadow-xl"
                  >
                    {visibleOverflowNav(caps, restricted).map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        tabIndex={-1}
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'block rounded-[var(--radius-sm)] px-3 py-2 text-sm transition',
                            isActive
                              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
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

          {!restricted.has('/search') && (
            <HeaderSearch className="hidden min-w-[6rem] flex-1 sm:flex lg:max-w-sm" />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <NavLink
              to="/favorites"
              aria-label="Favorites"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                )
              }
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Favorites</span>
            </NavLink>
            <NavLink
              to="/settings"
              aria-label="Settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                )
              }
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </NavLink>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
                showMobileMore ? 'hidden sm:flex' : 'flex',
              )}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {showMobileMore && mobileOpen && (
        <nav
          ref={mobileMenuRef}
          id="mobile-more-menu"
          aria-label="More navigation"
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
                    isActive
                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                      : 'text-[var(--text-secondary)]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-secondary)]"
            >
              Logout
            </button>
          </div>
        </nav>
      )}

      <MobileTabBar
        moreButtonRef={mobileButtonRef}
        open={mobileOpen}
        onToggleMore={() => setMobileOpen((v) => !v)}
        showMore={showMobileMore}
        hidden={restricted}
      />
    </>
  );
}

const MOBILE_TABS: { to: string; label: string; icon: React.ReactNode; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true, icon: <HomeIcon className="h-5 w-5" aria-hidden="true" /> },
  { to: '/search', label: 'Search', icon: <Search className="h-5 w-5" aria-hidden="true" /> },
  { to: '/movies', label: 'Library', icon: <Library className="h-5 w-5" aria-hidden="true" /> },
];

/** Bottom tab bar for thumb reach on small screens (AGENTS.md §4.1): Home/Search/Library/More. */
function MobileTabBar({
  moreButtonRef,
  open,
  onToggleMore,
  showMore,
  hidden,
}: {
  moreButtonRef: RefObject<HTMLButtonElement>;
  open: boolean;
  onToggleMore: () => void;
  showMore: boolean;
  hidden: ReadonlySet<string>;
}) {
  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-overlay)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {MOBILE_TABS.filter((item) => !hidden.has(item.to)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
              isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text-secondary)]',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
      {showMore && (
        <button
          ref={moreButtonRef}
          type="button"
          onClick={onToggleMore}
          aria-expanded={open}
          aria-controls="mobile-more-menu"
          aria-label={open ? 'Close menu' : 'More'}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
            open ? 'text-[var(--accent-text)]' : 'text-[var(--text-secondary)]',
          )}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          )}
          More
        </button>
      )}
    </nav>
  );
}
