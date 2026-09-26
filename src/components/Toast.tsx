import { useEffect, useState, type CSSProperties } from 'react'
import type { Feedback } from '../domain/progress'
import type { ShareCardData } from '../domain/shareCard'
import type { Notification } from '../store/progress'

const BIG_KINDS = new Set(['level', 'phase', 'challenge'])
const PARTICLES = Array.from({ length: 8 }, (_, i) => i)

export function Toast({ message, onHide, onShare }: {
  message: Notification | null
  onHide: (feedback: Feedback | null) => void
  onShare: (data: ShareCardData) => void
}) {
  // Com um botão dentro, o toast não pode sumir enquanto a pessoa mira o clique (foco ou hover).
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (!message || paused) return
    const duration = BIG_KINDS.has(message.kind) ? 4000 : 2500
    const timer = window.setTimeout(() => onHide(null), duration)
    return () => window.clearTimeout(timer)
  }, [message, onHide, paused])

  const kind = message?.kind ?? 'topic'
  const big = BIG_KINDS.has(kind)
  const share = message?.share
  return (
    <div
      className={`toast toast-${kind} ${big ? 'toast-big' : ''} ${message ? 'show' : ''}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {message?.kind === 'area' && <span className="toast-icon" aria-hidden="true">✓</span>}
      {message?.message}
      {share && (
        <button
          className="toast-share"
          type="button"
          onClick={() => {
            onShare(share)
            onHide(null)
          }}
        >
          Compartilhar
        </button>
      )}
      {big && message && (
        <span className="toast-particles" aria-hidden="true">
          {PARTICLES.map(i => <span style={{ '--i': i } as CSSProperties} key={i} />)}
        </span>
      )}
    </div>
  )
}
