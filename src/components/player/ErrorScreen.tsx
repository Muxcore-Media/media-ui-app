import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'

type Props = {
  message: string
  href: string
  onRetry?: () => void
}

export default function ErrorScreen({ message, href, onRetry }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--player-bg)] text-[var(--text-secondary)]">
      <div className="space-y-4 text-center">
        <p>{message}</p>
        <div className="flex items-center justify-center gap-4">
          <Link to={href} className="text-[var(--accent-color)] hover:underline">
            Go back
          </Link>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 text-[var(--accent-color)] hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
