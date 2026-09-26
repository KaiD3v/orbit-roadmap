import { areasWithChallenge, legacyTopicKeys, validTopicKeys } from '../data/roadmap'
import { localDay } from './progress'
import type { Challenges, Done, DoneAt, Notes, ProgressBackup, ProgressData, ReviewStep, Reviews } from '../types/progress'

// B03: nota curta por tópico. Não depende de o tópico estar concluído nem viaja no link (F02, `domain/share.ts`).
export const NOTE_MAX = 500

export const isDay = (day: unknown): day is string => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const date = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(day)
}

const isReviewStep = (step: unknown): step is ReviewStep => step === 0 || step === 1 || step === 2 || step === 3

// `today` só importa para a migração: tópico já concluído sem `doneAt` (esquemas anteriores ao v4) ganha
// essa data, nunca uma data real de conclusão (perdida). Assim ninguém recebe revisão no dia da migração.
export function cleanProgress(input: unknown, today: string = localDay()): ProgressData {
  if (!input || typeof input !== 'object') throw new Error('Arquivo inválido')
  const value = input as Record<string, unknown>
  if (!value.done || typeof value.done !== 'object' || Array.isArray(value.done) || !Array.isArray(value.days)) throw new Error('Arquivo inválido')
  const challenges = value.challenges && typeof value.challenges === 'object' && !Array.isArray(value.challenges) ? value.challenges : {}
  const doneAtInput = value.doneAt && typeof value.doneAt === 'object' && !Array.isArray(value.doneAt)
    ? value.doneAt as Record<string, unknown>
    : {}
  const reviewsInput = value.reviews && typeof value.reviews === 'object' && !Array.isArray(value.reviews)
    ? value.reviews as Record<string, unknown>
    : {}
  const notesInput = value.notes && typeof value.notes === 'object' && !Array.isArray(value.notes)
    ? value.notes as Record<string, unknown>
    : {}

  const done = Object.fromEntries(Object.entries(value.done).flatMap(([key, checked]) => {
    const stableKey = validTopicKeys.has(key) ? key : legacyTopicKeys.get(key)
    return checked === true && stableKey ? [[stableKey, true]] : []
  })) as Done

  const doneAt = Object.fromEntries(Object.keys(done).map((id) => {
    const day = doneAtInput[id]
    return [id, isDay(day) ? day : today]
  })) as DoneAt

  const reviews = Object.fromEntries(Object.entries(reviewsInput).flatMap(([id, review]) => {
    if (!done[id] || !review || typeof review !== 'object') return []
    const { at, step } = review as Record<string, unknown>
    return isDay(at) && isReviewStep(step) ? [[id, { at, step }]] : []
  })) as Reviews

  // Nota não depende de o tópico estar concluído (dá para anotar antes de terminar); desmarcar não a apaga.
  const notes = Object.fromEntries(Object.entries(notesInput).flatMap(([id, text]) => {
    if (!validTopicKeys.has(id) || typeof text !== 'string') return []
    const trimmed = text.trim().slice(0, NOTE_MAX)
    return trimmed ? [[id, trimmed]] : []
  })) as Notes

  return {
    done,
    days: [...new Set(value.days.filter(isDay))],
    challenges: Object.fromEntries(Object.entries(challenges).flatMap(([id, day]) =>
      areasWithChallenge.has(id) && isDay(day) ? [[id, day]] : [])) as Challenges,
    doneAt,
    reviews,
    notes,
  }
}

export const safeProgress = (input: unknown, today: string = localDay()): ProgressData | undefined => {
  try {
    return cleanProgress(input, today)
  } catch {
    return undefined
  }
}

export const createBackup = (data: ProgressData): ProgressBackup => ({ version: 5, ...cleanProgress(data) })

export function parseBackup(input: unknown, today: string = localDay()): ProgressData {
  if (!input || typeof input !== 'object' || ![1, 2, 3, 4, 5].includes((input as Record<string, unknown>).version as number)) {
    throw new Error('Arquivo inválido')
  }
  return cleanProgress(input, today)
}
