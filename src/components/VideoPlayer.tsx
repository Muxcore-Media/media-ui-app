import { useEffect, useRef } from 'react'

export default function VideoPlayer({ src, title }: { src: string; title?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.load()
  }, [src])

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-[var(--border)] bg-black text-[var(--muted)]">
        No stream available
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-black">
      <video
        ref={ref}
        className="aspect-video w-full"
        controls
        playsInline
        preload="metadata"
        title={title}
        src={src}
      >
        <track kind="captions" />
      </video>
    </div>
  )
}
