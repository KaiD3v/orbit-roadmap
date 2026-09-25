import { areas, areasByPhase, orderedAreas, phases } from '../data/roadmap'
import type { Area, Topic } from '../types/content'
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

export function nextTopic(done: Done): { area: Area, topic: Topic } | null {
  const area = nextArea(done)
  const topic = area.topics.find(t => t.required && !done[t.id]) ?? area.topics.find(t => !done[t.id])
  return topic ? { area, topic } : null
}

export type PhaseState = 'done' | 'current' | 'future'

export function phaseState(phase: number, done: Done): PhaseState {
  if (nextTopic(done) === null) return 'done'
  const current = nextArea(done).phase
  if (phase === current) return 'current'
  return phase < current ? 'done' : 'future'
}

export type AreaState = 'done' | 'next' | 'progress' | 'todo'

export function areaState(area: Area, done: Done, nextId: number): AreaState {
  const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
  const finished = requiredTotal ? requiredDone === requiredTotal : isAreaDone(area, done)
  if (finished) return 'done'
  if (area.id === nextId) return 'next'
  return countDone(area, done) > 0 ? 'progress' : 'todo'
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

export function levelFor(percent: number) {
  if (percent === 100) return 'Arquiteto orbital'
  if (percent >= 60) return 'Especialista'
  if (percent >= 25) return 'Construtor'
  return 'Explorador'
}

function justCompletedArea(area: Area, before: Done, after: Done) {
  const [beforeDone, beforeTotal] = priorityProgress(area, before, true)
  const [afterDone, afterTotal] = priorityProgress(area, after, true)
  if (afterTotal) return afterDone === afterTotal && beforeDone < beforeTotal
  return isAreaDone(area, after) && !isAreaDone(area, before)
}

export type Feedback = { message: string, kind: 'undo' | 'topic' | 'area' | 'level' | 'phase' | 'info' }

// Prioridade da maior para a menor conquista: fase > nível > área > tópico > desmarcar.
export function toggleFeedback(done: Done, key: string): Feedback {
  if (done[key]) return { message: 'Tópico desmarcado', kind: 'undo' }
  const after = { ...done, [key]: true as const }

  if (countFinishedPhases(after) > countFinishedPhases(done)) {
    return { message: `Fase concluída! +${PHASE_XP} XP ✦`, kind: 'phase' }
  }

  const levelBefore = levelFor(metrics(done, []).percent)
  const levelAfter = levelFor(metrics(after, []).percent)
  if (levelAfter !== levelBefore) {
    return { message: `Novo nível: ${levelAfter}!`, kind: 'level' }
  }

  const area = areas.find(candidate => candidate.topics.some(topic => topic.id === key))
  if (area && justCompletedArea(area, done, after)) {
    return { message: `Área concluída! Próxima: ${nextArea(after).title}`, kind: 'area' }
  }

  return { message: `+${TOPIC_XP} XP · Tópico concluído!`, kind: 'topic' }
}

type Badge = {
  icon: string
  title: string
  description: string
  target?: number
  earned: (progress: Metrics) => boolean
}

const countBadge = (icon: string, title: string, target: number): Badge => ({
  icon,
  title,
  description: `Conclua ${target === 1 ? 'seu primeiro tópico' : `${target} tópicos`}`,
  target,
  earned: progress => progress.completed >= target,
})

const BADGES: Badge[] = [
  countBadge('✦', 'Primeiro passo', 1),
  countBadge('⚡', 'Em movimento', 10),
  countBadge('◈', 'Consistência', 50),
  { icon: '⌁', title: 'Mestre de fase', description: 'Complete uma fase', earned: progress => progress.finishedPhases >= 1 },
  { icon: '✳', title: 'Órbita completa', description: 'Conclua todo o roadmap', earned: progress => progress.completed === progress.total },
]

export function badges(progress: Metrics) {
  return BADGES.map(({ earned, ...badge }) => ({ ...badge, unlocked: earned(progress) }))
}

const LEVEL_THRESHOLDS = [
  { percent: 25, name: 'Construtor' },
  { percent: 60, name: 'Especialista' },
  { percent: 100, name: 'Arquiteto orbital' },
] as const

// Menor n tal que percent(n, total) >= target, coerente com o arredondamento de levelFor.
function minDoneForPercent(total: number, target: number) {
  return total ? Math.max(0, Math.ceil((target - 0.5) * total / 100)) : 0
}

export function nextGoals(progress: Metrics): {
  level?: { name: string, remaining: number }
  badge?: { title: string, icon: string, remaining?: number }
} {
  const threshold = LEVEL_THRESHOLDS.find(t => progress.percent < t.percent)
  const level = !threshold
    ? undefined
    : {
        name: threshold.name,
        remaining: minDoneForPercent(progress.requiredTotal, threshold.percent) - progress.requiredDone,
      }

  const nextBadge = badges(progress).find(badge => !badge.unlocked)
  const badgeRemaining = nextBadge?.target === undefined ? undefined : nextBadge.target - progress.completed
  const badge = nextBadge ? { title: nextBadge.title, icon: nextBadge.icon, remaining: badgeRemaining } : undefined

  return { level, badge }
}

// Frase única usada no card "próximo passo" e como título da seção de conquistas.
export function goalsLine(progress: Metrics): string | null {
  const goals = nextGoals(progress)
  const parts: string[] = []
  if (goals.badge) {
    if (goals.badge.remaining === undefined) {
      const description = badges(progress).find(badge => badge.title === goals.badge?.title)?.description
      if (description) parts.push(description)
    } else {
      const n = goals.badge.remaining
      parts.push(`${n === 1 ? 'Falta' : 'Faltam'} ${n} tópico${n === 1 ? '' : 's'} para ${goals.badge.title}`)
    }
  }
  if (goals.level) {
    const n = goals.level.remaining
    parts.push(`${n} ${n === 1 ? 'essencial' : 'essenciais'} para o nível ${goals.level.name}`)
  }
  return parts.length ? parts.join(' · ') : null
}
