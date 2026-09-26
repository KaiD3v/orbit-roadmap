import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { areasWithChallenge, validResourceKeys, validTopicKeys } from '../data/roadmap'
import { cleanProgress, NOTE_MAX, parseBackup, safeProgress } from '../domain/backup'
import { localDay, metrics, toggleChallengeFeedback, toggleFeedback, weekProgress, type Feedback } from '../domain/progress'
import { normalizeResourceUrl } from '../domain/resources'
import { answerReview as answerReviewData } from '../domain/review'
import { combineProgress, newTopicsCount } from '../domain/share'
import type { ProgressData } from '../types/progress'

type ProgressStore = ProgressData & {
  toggleTopic: (key: string) => void
  toggleChallenge: (areaId: string) => void
  importBackup: (input: unknown) => void
  mergeProgress: (incoming: ProgressData) => number
  answerReview: (topicId: string, remembered: boolean) => void
  setNote: (topicId: string, text: string) => void
  toggleResourceRead: (url: string) => void
}

const emptyProgress = (): ProgressData => (
  { done: {}, days: [], challenges: {}, doneAt: {}, reviews: {}, notes: {}, resourcesRead: {} }
)

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
      // B03: nota curta por tópico. Não registra dia de estudo — anotar não é estudar.
      setNote: (topicId, text) => {
        if (!validTopicKeys.has(topicId)) return
        set((state) => {
          const notes = { ...state.notes }
          const trimmed = text.trim().slice(0, NOTE_MAX)
          if (trimmed) notes[topicId] = trimmed
          else delete notes[topicId]
          return { notes }
        })
      },
      // B06: marcar/desmarcar material como lido. Também não registra dia de estudo, mesma lógica da
      // nota: ler um material é estudar, mas o XP de material já é contado à parte (materialXp).
      toggleResourceRead: (url) => {
        const key = normalizeResourceUrl(url)
        if (!validResourceKeys.has(key)) return
        set((state) => {
          const resourcesRead = { ...state.resourcesRead }
          if (resourcesRead[key]) delete resourcesRead[key]
          else resourcesRead[key] = localDay()
          return { resourcesRead }
        })
      },
    }),
    {
      name: 'orbit-roadmap-react-v1',
      version: 6,
      migrate: persisted => safeProgress(persisted),
      merge: (persisted, current) => ({ ...current, ...(safeProgress(persisted) ?? {}) }),
      partialize: (state) => {
        const { done, days, challenges, doneAt, reviews, notes, resourcesRead } = state
        return { done, days, challenges, doneAt, reviews, notes, resourcesRead }
      },
    },
  ),
)

export function useMetrics() {
  const done = useProgress(state => state.done)
  const days = useProgress(state => state.days)
  const challenges = useProgress(state => state.challenges)
  const resourcesRead = useProgress(state => state.resourcesRead)
  return useMemo(() => metrics(done, days, challenges, resourcesRead), [done, days, challenges, resourcesRead])
}

// Meta semanal (B02): "3 de 5 nesta semana", ao lado da sequência no card "Seu próximo passo".
export function useWeek() {
  const doneAt = useProgress(state => state.doneAt)
  const challenges = useProgress(state => state.challenges)
  return useMemo(() => weekProgress(doneAt, challenges, localDay()), [doneAt, challenges])
}

export function useToggleTopic(notify: (feedback: Feedback) => void) {
  const done = useProgress(state => state.done)
  const doneAt = useProgress(state => state.doneAt)
  const challenges = useProgress(state => state.challenges)
  const toggleTopic = useProgress(state => state.toggleTopic)
  return (key: string) => {
    const today = localDay()
    // Meta da semana antes/depois deste tópico, só para o aviso de transição (nunca ao recarregar).
    const before = weekProgress(doneAt, challenges, today)
    const after = done[key] ? before : weekProgress({ ...doneAt, [key]: today }, challenges, today)
    notify(toggleFeedback(done, key, { before: before.done, after: after.done, goal: before.goal }))
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
