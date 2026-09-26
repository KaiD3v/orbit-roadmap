import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { areasWithChallenge, validTopicKeys } from '../data/roadmap'
import { cleanProgress, parseBackup, safeProgress } from '../domain/backup'
import { localDay, metrics, toggleChallengeFeedback, toggleFeedback, type Feedback } from '../domain/progress'
import { answerReview as answerReviewData } from '../domain/review'
import { combineProgress, newTopicsCount } from '../domain/share'
import type { ProgressData } from '../types/progress'

type ProgressStore = ProgressData & {
  toggleTopic: (key: string) => void
  toggleChallenge: (areaId: string) => void
  importBackup: (input: unknown) => void
  mergeProgress: (incoming: ProgressData) => number
  answerReview: (topicId: string, remembered: boolean) => void
}

const emptyProgress = (): ProgressData => ({ done: {}, days: [], challenges: {}, doneAt: {}, reviews: {} })

function legacyProgress(): ProgressData {
  try {
    const saved = localStorage.getItem('orbit-roadmap-v1')
    return saved ? cleanProgress(JSON.parse(saved)) : emptyProgress()
  } catch {
    return emptyProgress()
  }
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...legacyProgress(),
      toggleTopic: (key) => {
        if (!validTopicKeys.has(key)) return
        set((state) => {
          const done = { ...state.done }
          const days = [...state.days]
          const doneAt = { ...state.doneAt }
          const reviews = { ...state.reviews }
          if (done[key]) {
            delete done[key]
            delete doneAt[key]
            delete reviews[key]
          } else {
            done[key] = true
            const today = localDay()
            doneAt[key] = today
            if (!days.includes(today)) days.push(today)
          }
          return { done, days, doneAt, reviews }
        })
      },
      toggleChallenge: (areaId) => {
        if (!areasWithChallenge.has(areaId)) return
        set((state) => {
          const challenges = { ...state.challenges }
          const days = [...state.days]
          if (challenges[areaId]) delete challenges[areaId]
          else {
            const today = localDay()
            challenges[areaId] = today
            if (!days.includes(today)) days.push(today)
          }
          return { challenges, days }
        })
      },
      importBackup: input => set(parseBackup(input)),
      mergeProgress: (incoming) => {
        const added = newTopicsCount(get().done, incoming.done)
        set(state => combineProgress(state, incoming))
        return added
      },
      answerReview: (topicId, remembered) => set(state => answerReviewData(state, topicId, remembered, localDay())),
    }),
    {
      name: 'orbit-roadmap-react-v1',
      version: 4,
      migrate: persisted => safeProgress(persisted),
      merge: (persisted, current) => ({ ...current, ...(safeProgress(persisted) ?? {}) }),
      partialize: (state) => {
        const { done, days, challenges, doneAt, reviews } = state
        return { done, days, challenges, doneAt, reviews }
      },
    },
  ),
)

export function useMetrics() {
  const done = useProgress(state => state.done)
  const days = useProgress(state => state.days)
  const challenges = useProgress(state => state.challenges)
  return useMemo(() => metrics(done, days, challenges), [done, days, challenges])
}

export function useToggleTopic(notify: (feedback: Feedback) => void) {
  const done = useProgress(state => state.done)
  const toggleTopic = useProgress(state => state.toggleTopic)
  return (key: string) => {
    notify(toggleFeedback(done, key))
    toggleTopic(key)
  }
}

export function useToggleChallenge(notify: (feedback: Feedback) => void) {
  const challenges = useProgress(state => state.challenges)
  const toggleChallenge = useProgress(state => state.toggleChallenge)
  return (areaId: string) => {
    notify(toggleChallengeFeedback(challenges, areaId))
    toggleChallenge(areaId)
  }
}
