import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

const DEFAULT_THRESHOLD = 24;
const DEFAULT_OVERSCAN = 4;
const DEFAULT_MAX_HEIGHT = 480;

type WindowRange = { start: number; end: number };

function useFixedWindow(count: number, rowHeight: number, overscan: number, enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<WindowRange>(() => ({
    start: 0,
    end: Math.min(count, 20),
  }));

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;
    const scrollTop = el.scrollTop;
    const viewport = el.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewport / rowHeight) + overscan * 2;
    const end = Math.min(count, start + visibleCount);
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [count, enabled, overscan, rowHeight]);

  useEffect(() => {
    if (!enabled) return;
    update();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [enabled, update]);

  useEffect(() => {
    if (!enabled) return;
    setRange({ start: 0, end: Math.min(count, 20) });
    const el = scrollRef.current;
    if (!el) return;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0 });
    } else {
      el.scrollTop = 0;
    }
  }, [count, enabled]);

  return { scrollRef, range, totalHeight: count * rowHeight };
}

export type FixedWindowListProps<T> = {
  items: T[];
  rowHeight: number;
  threshold?: number;
  overscan?: number;
  maxHeight?: number;
  className?: string;
  listClassName?: string;
  getKey: (item: T, index: number) => string;
  renderRow: (item: T, index: number) => ReactNode;
};

export function FixedWindowList<T>({
  items,
  rowHeight,
  threshold = DEFAULT_THRESHOLD,
  overscan = DEFAULT_OVERSCAN,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className,
  listClassName,
  getKey,
  renderRow,
}: FixedWindowListProps<T>) {
  const enabled = items.length >= threshold;
  const { scrollRef, range, totalHeight } = useFixedWindow(
    items.length,
    rowHeight,
    overscan,
    enabled,
  );

  if (!enabled) {
    return (
      <ul className={cn(listClassName, className)}>
        {items.map((item, index) => (
          <li
            key={getKey(item, index)}
            className="border-b border-[var(--border-subtle)] last:border-b-0"
          >
            {renderRow(item, index)}
          </li>
        ))}
      </ul>
    );
  }

  const visible = items.slice(range.start, range.end);

  return (
    <div
      ref={scrollRef}
      className={cn('overflow-y-auto overscroll-contain [contain:strict]', className)}
      style={{ maxHeight }}
    >
      <ul className="relative" style={{ height: totalHeight }}>
        {visible.map((item, offset) => {
          const index = range.start + offset;
          return (
            <li
              key={getKey(item, index)}
              className={cn(
                'absolute inset-x-0 overflow-hidden border-b border-[var(--border-subtle)]',
                listClassName,
              )}
              style={{
                top: index * rowHeight,
                height: rowHeight,
              }}
            >
              {renderRow(item, index)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
