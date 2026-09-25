import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { validTopicKeys } from '../data/roadmap'
import type { Done } from '../domain/progress'

type ProgressData = { done: Done; days: string[] }
type ProgressStore = ProgressData & {
  toggleTopic: (key: string) => void
  importBackup: (input: unknown) => void
}

function cleanProgress(input: unknown): ProgressData {
  if (!input || typeof input !== 'object') throw new Error('Arquivo inválido')
  const value = input as Record<string, unknown>
  if (!value.done || typeof value.done !== 'object' || Array.isArray(value.done) || !Array.isArray(value.days)) throw new Error('Arquivo inválido')
  return {
    done: Object.fromEntries(Object.entries(value.done).filter(([key, checked]) => validTopicKeys.has(key) && checked === true)) as Done,
    days: [...new Set(value.days.filter((day): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))],
  }
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
      toggleTopic: key => {
        if (!validTopicKeys.has(key)) return
        set(state => {
          const done = { ...state.done }
          const days = [...state.days]
          if (done[key]) delete done[key]
          else {
            done[key] = true
            const date = new Date()
            const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            if (!days.includes(today)) days.push(today)
          }
          return { done, days }
        })
      },
      importBackup: input => {
        if (!input || typeof input !== 'object' || (input as Record<string, unknown>).version !== 1) throw new Error('Arquivo inválido')
        set(cleanProgress(input))
      },
    }),
    { name: 'orbit-roadmap-react-v1', partialize: state => ({ done: state.done, days: state.days }) },
  ),
)
