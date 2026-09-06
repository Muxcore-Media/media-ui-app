import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ToastVariant = 'success' | 'info';

export type ToastItem = {
  id: string;
  title: string;
  body?: string;
  variant?: ToastVariant;
  /** React Router href to navigate to when the action button is clicked. */
  href?: string;
  actionLabel?: string;
  durationMs?: number;
};

type ToastContextValue = {
  addToast: (item: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 8000;

function ToastCard({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => onRemove(toast.id), [onRemove, toast.id]);

  useEffect(() => {
    const ms = toast.durationMs ?? DEFAULT_DURATION_MS;
    timerRef.current = setTimeout(dismiss, ms);
    return () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [dismiss, toast.durationMs]);

  const handleAction = () => {
    dismiss();
    if (toast.href) navigate(toast.href);
  };

  const isSuccess = (toast.variant ?? 'success') === 'success';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="ready-toast"
      className={cn(
        'toast-card flex w-[clamp(280px,90vw,380px)] items-start gap-3',
        'rounded-[var(--radius-lg)] border border-[var(--border-subtle)]',
        'bg-[var(--bg-elevated)] px-4 py-3 shadow-lg',
      )}
    >
      <CheckCircle
        aria-hidden
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0',
          isSuccess ? 'text-[var(--success)]' : 'text-[var(--accent-color)]',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
        {toast.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">{toast.body}</p>
        )}
        {toast.href && (
          <button
            type="button"
            onClick={handleAction}
            className="mt-1.5 text-xs font-medium text-[var(--accent-color)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
          >
            {toast.actionLabel ?? 'View'}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={dismiss}
        className={cn(
          'mt-0.5 shrink-0 rounded p-0.5',
          'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
        )}
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

let _toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${++_toastIdCounter}`;
    setToasts((prev) => [...prev, { ...item, id }].slice(-MAX_VISIBLE));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Fixed stack anchored bottom-right; above player OSD z-index */}
      <div
        aria-label="Notifications"
        className="fixed bottom-6 right-4 z-[9000] flex flex-col-reverse gap-2 sm:right-6"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
