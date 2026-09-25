import { areas, orderedAreas, phases, type Area } from '../data/roadmap'

export type Done = Record<string, true>
export const topicKey = (area: Area, index: number) => `${area.id}:${index}`

export function countDone(area: Area, done: Done) {
  return area.topics.filter((_, index) => done[topicKey(area, index)]).length
}

export function priorityProgress(area: Area, done: Done, required: boolean): [number, number] {
  const indices = area.topics.map((_, index) => index).filter(index => area.required.includes(index) === required)
  return [indices.filter(index => done[topicKey(area, index)]).length, indices.length]
}

export function phaseProgress(phase: number, done: Done): [number, number] {
  const phaseAreas = areas.filter(area => area.phase === phase)
  return [phaseAreas.reduce((sum, area) => sum + countDone(area, done), 0), phaseAreas.reduce((sum, area) => sum + area.topics.length, 0)]
}

export function nextArea(done: Done) {
  return orderedAreas.find(area => {
    const [completed, total] = priorityProgress(area, done, true)
    return completed < total
  }) || orderedAreas.find(area => countDone(area, done) < area.topics.length) || orderedAreas[0]
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
    percent: Math.round(requiredDone / requiredTotal * 100),
    xp: completed * 10 + finishedPhases * 100,
    finishedPhases,
    streak: streak(days),
  }
}

export function badges(progress: ReturnType<typeof metrics>) {
  return [
    ['✦', 'Primeiro passo', 'Conclua seu primeiro tópico', progress.completed >= 1],
    ['⚡', 'Em movimento', 'Conclua 10 tópicos', progress.completed >= 10],
    ['◈', 'Consistência', 'Conclua 50 tópicos', progress.completed >= 50],
    ['⌁', 'Mestre de fase', 'Complete uma fase', progress.finishedPhases >= 1],
    ['✳', 'Órbita completa', 'Conclua todo o roadmap', progress.completed === progress.total],
  ] as const
}
