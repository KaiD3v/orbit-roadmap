import { areas, areasByPhase, orderedAreas, phases } from '../data/roadmap'
import type { Area } from '../types/content'
import type { Done } from '../types/progress'

export const TOPIC_XP = 10
export const PHASE_XP = 100

export const percent = (completed: number, total: number) =>
  total ? Math.round(completed / total * 100) : 0

export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function countDone(area: Area, done: Done) {
  return area.topics.filter(topic => done[topic.id]).length
}

export function isAreaDone(area: Area, done: Done) {
  return countDone(area, done) === area.topics.length
}

export function priorityProgress(area: Area, done: Done, required: boolean): [number, number] {
  const topics = area.topics.filter(topic => topic.required === required)
  return [topics.filter(topic => done[topic.id]).length, topics.length]
}

export function phaseProgress(phase: number, done: Done): [number, number] {
  const phaseAreas = areasByPhase.get(phase) ?? []
  const completed = phaseAreas.reduce((sum, area) => sum + countDone(area, done), 0)
  const total = phaseAreas.reduce((sum, area) => sum + area.topics.length, 0)
  return [completed, total]
}

export function nextArea(done: Done) {
  const first = orderedAreas[0]
  if (!first) throw new Error('Roadmap sem áreas')
  return orderedAreas.find((area) => {
    const [completed, total] = priorityProgress(area, done, true)
    return completed < total
  }) || orderedAreas.find(area => countDone(area, done) < area.topics.length) || first
}

export function streak(days: string[]) {
  const studied = new Set(days)
  const date = new Date()
  if (!studied.has(localDay(date))) date.setDate(date.getDate() - 1)
  let count = 0
  while (studied.has(localDay(date))) {
    count++
    date.setDate(date.getDate() - 1)
  }
  return count
}

export function countFinishedPhases(done: Done) {
  return phases.filter((phase) => {
    const [current, count] = phaseProgress(phase.number, done)
    return current === count
  }).length
}

export function metrics(done: Done, days: string[]) {
  const total = areas.reduce((sum, area) => sum + area.topics.length, 0)
  const completed = areas.reduce((sum, area) => sum + countDone(area, done), 0)
  const [requiredDone, requiredTotal] = areas.reduce(([current, count], area) => {
    const [areaDone, areaTotal] = priorityProgress(area, done, true)
    return [current + areaDone, count + areaTotal]
  }, [0, 0])
  const finishedPhases = countFinishedPhases(done)
  return {
    completed,
    total,
    requiredDone,
    requiredTotal,
    deepDone: completed - requiredDone,
    deepTotal: total - requiredTotal,
    percent: percent(requiredDone, requiredTotal),
    xp: completed * TOPIC_XP + finishedPhases * PHASE_XP,
    finishedPhases,
    streak: streak(days),
  }
}

export type Metrics = ReturnType<typeof metrics>

export function toggleMessage(done: Done, key: string) {
  if (done[key]) return 'Tópico desmarcado'
  const after = { ...done, [key]: true as const }
  return countFinishedPhases(after) > countFinishedPhases(done)
    ? `Fase concluída! +${PHASE_XP} XP ✦`
    : `+${TOPIC_XP} XP · Tópico concluído!`
}

export function levelFor(percent: number) {
  if (percent === 100) return 'Arquiteto orbital'
  if (percent >= 60) return 'Especialista'
  if (percent >= 25) return 'Construtor'
  return 'Explorador'
}

type Badge = { icon: string, title: string, description: string, earned: (progress: Metrics) => boolean }

const BADGES: Badge[] = [
  { icon: '✦', title: 'Primeiro passo', description: 'Conclua seu primeiro tópico', earned: progress => progress.completed >= 1 },
  { icon: '⚡', title: 'Em movimento', description: 'Conclua 10 tópicos', earned: progress => progress.completed >= 10 },
  { icon: '◈', title: 'Consistência', description: 'Conclua 50 tópicos', earned: progress => progress.completed >= 50 },
  { icon: '⌁', title: 'Mestre de fase', description: 'Complete uma fase', earned: progress => progress.finishedPhases >= 1 },
  { icon: '✳', title: 'Órbita completa', description: 'Conclua todo o roadmap', earned: progress => progress.completed === progress.total },
]

export function badges(progress: Metrics) {
  return BADGES.map(({ earned, ...badge }) => ({ ...badge, unlocked: earned(progress) }))
}
