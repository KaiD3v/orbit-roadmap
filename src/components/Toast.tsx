import { useEffect } from 'react'

export function Toast({ message, onHide }: { message: string, onHide: (message: string) => void }) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => onHide(''), 2500)
    return () => window.clearTimeout(timer)
  }, [message, onHide])
  return <div className={`toast ${message ? 'show' : ''}`} role="status" aria-live="polite">{message}</div>
}
