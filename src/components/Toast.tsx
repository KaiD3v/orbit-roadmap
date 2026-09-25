import { useEffect, type CSSProperties } from 'react'
import type { Feedback } from '../domain/progress'

const BIG_KINDS = new Set(['level', 'phase'])
const PARTICLES = Array.from({ length: 8 }, (_, i) => i)

export function Toast({ message, onHide }: {
  message: Feedback | null
  onHide: (feedback: Feedback | null) => void
}) {
  useEffect(() => {
    if (!message) return
    const duration = BIG_KINDS.has(message.kind) ? 4000 : 2500
    const timer = window.setTimeout(() => onHide(null), duration)
    return () => window.clearTimeout(timer)
  }, [message, onHide])

  const kind = message?.kind ?? 'topic'
  const big = BIG_KINDS.has(kind)
  return (
    <div
      className={`toast toast-${kind} ${big ? 'toast-big' : ''} ${message ? 'show' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message?.kind === 'area' && <span className="toast-icon" aria-hidden="true">✓</span>}
      {message?.message}
      {big && message && (
        <span className="toast-particles" aria-hidden="true">
          {PARTICLES.map(i => <span style={{ '--i': i } as CSSProperties} key={i} />)}
        </span>
      )}
    </div>
  )
}
