import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { legacyTopicKeys, validTopicKeys } from '../data/roadmap'
import type { Done, ProgressBackup, ProgressData } from '../types/progress'

type ProgressStore = ProgressData & {
  toggleTopic: (key: string) => void
  importBackup: (input: unknown) => void
}

const isDay = (day: unknown): day is string => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const date = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(day)
}

export function cleanProgress(input: unknown): ProgressData {
  if (!input || typeof input !== 'object') throw new Error('Arquivo inválido')
  const value = input as Record<string, unknown>
  if (!value.done || typeof value.done !== 'object' || Array.isArray(value.done) || !Array.isArray(value.days)) throw new Error('Arquivo inválido')
  return {
    done: Object.fromEntries(Object.entries(value.done).flatMap(([key, checked]) => {
      const stableKey = validTopicKeys.has(key) ? key : legacyTopicKeys.get(key)
      return checked === true && stableKey ? [[stableKey, true]] : []
    })) as Done,
    days: [...new Set(value.days.filter(isDay))],
  }
}

const emptyProgress = (): ProgressData => ({ done: {}, days: [] })
const safeProgress = (input: unknown): ProgressData | undefined => {
  try { return cleanProgress(input) } catch { return undefined }
}

export const createBackup = (done: Done, days: string[]): ProgressBackup => ({ version: 2, ...cleanProgress({ done, days }) })

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
        if (!input || typeof input !== 'object' || ![1, 2].includes((input as Record<string, unknown>).version as number)) throw new Error('Arquivo inválido')
        set(cleanProgress(input))
      },
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
