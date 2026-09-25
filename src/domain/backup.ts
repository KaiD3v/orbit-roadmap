import { legacyTopicKeys, validTopicKeys } from '../data/roadmap'
import type { Done, ProgressBackup, ProgressData } from '../types/progress'

export const isDay = (day: unknown): day is string => {
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

export const safeProgress = (input: unknown): ProgressData | undefined => {
  try {
    return cleanProgress(input)
  } catch {
    return undefined
  }
}

export const createBackup = (data: ProgressData): ProgressBackup => ({ version: 2, ...cleanProgress(data) })

export function parseBackup(input: unknown): ProgressData {
  if (!input || typeof input !== 'object' || ![1, 2].includes((input as Record<string, unknown>).version as number)) throw new Error('Arquivo inválido')
  return cleanProgress(input)
}
