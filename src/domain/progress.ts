import { areas, orderedAreas, phases, type Area } from '../data/roadmap'
import type { Done } from '../types/progress'

export type { Done } from '../types/progress'
export const TOPIC_XP = 10
export const PHASE_XP = 100

export function countDone(area: Area, done: Done) {
  return area.topics.filter(topic => done[topic.id]).length
}

export function priorityProgress(area: Area, done: Done, required: boolean): [number, number] {
  const topics = area.topics.filter(topic => topic.required === required)
  return [topics.filter(topic => done[topic.id]).length, topics.length]
}

export function phaseProgress(phase: number, done: Done): [number, number] {
  const phaseAreas = areas.filter(area => area.phase === phase)
  return [phaseAreas.reduce((sum, area) => sum + countDone(area, done), 0), phaseAreas.reduce((sum, area) => sum + area.topics.length, 0)]
}

export function nextArea(done: Done) {
  const first = orderedAreas[0]
  if (!first) throw new Error('Roadmap sem áreas')
  return orderedAreas.find(area => {
    const [completed, total] = priorityProgress(area, done, true)
    return completed < total
  }) || orderedAreas.find(area => countDone(area, done) < area.topics.length) || first
}

export function streak(days: string[]) {
  const studied = new Set(days)
  const date = new Date()
  const day = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  if (!studied.has(day(date))) date.setDate(date.getDate() - 1)
  let count = 0
  while (studied.has(day(date))) {
    count++
    date.setDate(date.getDate() - 1)
  }
  return count
}

export function metrics(done: Done, days: string[]) {
  const total = areas.reduce((sum, area) => sum + area.topics.length, 0)
  const completed = areas.reduce((sum, area) => sum + countDone(area, done), 0)
  const [requiredDone, requiredTotal] = areas.reduce(([current, count], area) => {
    const [areaDone, areaTotal] = priorityProgress(area, done, true)
    return [current + areaDone, count + areaTotal]
  }, [0, 0])
  const finishedPhases = phases.filter((_, index) => {
    const [current, count] = phaseProgress(index + 1, done)
    return current === count
  }).length
  return {
    completed,
    total,
    requiredDone,
    requiredTotal,
    deepDone: completed - requiredDone,
    deepTotal: total - requiredTotal,
    percent: requiredTotal ? Math.round(requiredDone / requiredTotal * 100) : 0,
    xp: completed * TOPIC_XP + finishedPhases * PHASE_XP,
    finishedPhases,
    streak: streak(days),
  }
}

export type Metrics = ReturnType<typeof metrics>

export function levelFor(percent: number) {
  if (percent === 100) return 'Arquiteto orbital'
  if (percent >= 60) return 'Especialista'
  if (percent >= 25) return 'Construtor'
  return 'Explorador'
}

export function badges(progress: ReturnType<typeof metrics>) {
  return BADGES.map(badge => [badge.icon, badge.title, badge.description, badge.earned(progress)] as const)
}

const BADGES = [
  { icon: '✦', title: 'Primeiro passo', description: 'Conclua seu primeiro tópico', earned: (progress: ReturnType<typeof metrics>) => progress.completed >= 1 },
  { icon: '⚡', title: 'Em movimento', description: 'Conclua 10 tópicos', earned: (progress: ReturnType<typeof metrics>) => progress.completed >= 10 },
  { icon: '◈', title: 'Consistência', description: 'Conclua 50 tópicos', earned: (progress: ReturnType<typeof metrics>) => progress.completed >= 50 },
  { icon: '⌁', title: 'Mestre de fase', description: 'Complete uma fase', earned: (progress: ReturnType<typeof metrics>) => progress.finishedPhases >= 1 },
  { icon: '✳', title: 'Órbita completa', description: 'Conclua todo o roadmap', earned: (progress: ReturnType<typeof metrics>) => progress.completed === progress.total },
] as const
