import { FormEvent, useEffect, useRef, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export default function HeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const onSearchPage = location.pathname === '/search';
  const urlQ = new URLSearchParams(location.search).get('q') || '';

  const [q, setQ] = useState(onSearchPage ? urlQ : '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (onSearchPage) setQ(urlQ);
  }, [onSearchPage, urlQ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function goSearch(next?: string) {
    const trimmed = (next ?? q).trim();
    const params = new URLSearchParams(onSearchPage ? location.search : '');
    if (trimmed.length >= MIN_CHARS) params.set('q', trimmed);
    else params.delete('q');
    const qs = params.toString();
    navigate(qs ? `/search?${qs}` : '/search');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    goSearch();
  }

  function onInputChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed.length >= MIN_CHARS || (onSearchPage && trimmed.length === 0)) {
        goSearch(trimmed);
      }
    }, DEBOUNCE_MS);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn('relative min-w-0 flex-1 max-w-md', className)}
      role="search"
      data-testid="header-search"
    >
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
        aria-hidden="true"
      />
      <input
        value={q}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Search library…"
        aria-label="Search"
        data-testid="header-search-input"
        className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 py-1.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-color)] focus:bg-[var(--bg-elevated)]"
      />
    </form>
  );
}
