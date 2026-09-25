import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { validTopicKeys } from '../data/roadmap'
import { cleanProgress, parseBackup, safeProgress } from '../domain/backup'
import { localDay, metrics, toggleFeedback, type Feedback } from '../domain/progress'
import type { ProgressData } from '../types/progress'

type ProgressStore = ProgressData & {
  toggleTopic: (key: string) => void
  importBackup: (input: unknown) => void
}

function legacyProgress(): ProgressData {
  try {
    const saved = localStorage.getItem('orbit-roadmap-v1')
    return saved ? cleanProgress(JSON.parse(saved)) : { done: {}, days: [] }
  } catch {
    return { done: {}, days: [] }
  }
}

export const useProgress = create<ProgressStore>()(
  persist(
    set => ({
      ...legacyProgress(),
      toggleTopic: (key) => {
        if (!validTopicKeys.has(key)) return
        set((state) => {
          const done = { ...state.done }
          const days = [...state.days]
          if (done[key]) delete done[key]
          else {
            done[key] = true
            const today = localDay()
            if (!days.includes(today)) days.push(today)
          }
          return { done, days }
        })
      },
      importBackup: input => set(parseBackup(input)),
    }),
    {
      name: 'orbit-roadmap-react-v1',
      version: 2,
      migrate: persisted => safeProgress(persisted),
      merge: (persisted, current) => ({ ...current, ...(safeProgress(persisted) ?? {}) }),
      partialize: state => ({ done: state.done, days: state.days }),
    },
  ),
)

export function useMetrics() {
  const done = useProgress(state => state.done)
  const days = useProgress(state => state.days)
  return useMemo(() => metrics(done, days), [done, days])
}

export function useToggleTopic(notify: (feedback: Feedback) => void) {
  const done = useProgress(state => state.done)
  const toggleTopic = useProgress(state => state.toggleTopic)
  return (key: string) => {
    notify(toggleFeedback(done, key))
    toggleTopic(key)
  }
}
