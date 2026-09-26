import { areas, areasByPhase, orderedAreas, phases } from '../data/roadmap'
import type { Area, Challenge, Topic } from '../types/content'
import type { Challenges, Done, DoneAt } from '../types/progress'

export const TOPIC_XP = 10
export const PHASE_XP = 100
export const CHALLENGE_XP = 50

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

// Mesma regra usada para "área concluída": libera quando os essenciais acabam (ou tudo, se não há essenciais).
export function isChallengeUnlocked(area: Area, done: Done) {
  const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
  return requiredTotal ? requiredDone === requiredTotal : isAreaDone(area, done)
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

export type Step
  = | { area: Area, kind: 'topic', topic: Topic }
    | { area: Area, kind: 'challenge', challenge: Challenge }

// Varre as áreas em ordem: essencial pendente primeiro, depois o desafio (se liberado e não feito),
// só então segue para a próxima área. No fim, sobra o modo antigo: fechar os extras que restarem.
export function nextTopic(done: Done, challenges: Challenges = {}): Step | null {
  for (const area of orderedAreas) {
    const requiredPending = area.topics.find(t => t.required && !done[t.id])
    if (requiredPending) return { area, kind: 'topic', topic: requiredPending }
    if (area.challenge && isChallengeUnlocked(area, done) && !challenges[String(area.id)]) {
      return { area, kind: 'challenge', challenge: area.challenge }
    }
  }
  const area = nextArea(done)
  const topic = area.topics.find(t => !done[t.id])
  return topic ? { area, kind: 'topic', topic } : null
}

export type PhaseState = 'done' | 'current' | 'future'

export function phaseState(phase: number, done: Done, challenges: Challenges = {}): PhaseState {
  if (nextTopic(done, challenges) === null) return 'done'
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

// Meta semanal (B02): medida de constância mais tolerante que a sequência diária — quem estuda três
// vezes por semana não "perde" nada. Fixa em 5 nesta versão; configurar a meta pediria campo novo no esquema.
export const WEEKLY_GOAL = 5

// Segunda-feira da semana do dia informado. Em UTC a partir da string (mesma técnica de `isDay`, em
// `domain/backup.ts`), para não depender do fuso horário de quem roda a função.
export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  const sinceMonday = (date.getUTCDay() + 6) % 7 // domingo (getUTCDay() 0) fica 6 dias depois da segunda
  date.setUTCDate(date.getUTCDate() - sinceMonday)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

// Tópicos marcados nesta semana (por `doneAt`) + desafios concluídos nesta semana (por `challenges`,
// 1 cada). Revisões não contam. Comparação de string funciona: as datas são 'YYYY-MM-DD' (ordem = ISO).
export function weekProgress(doneAt: DoneAt, challenges: Challenges, today: string): { done: number, goal: number } {
  const start = weekStart(today)
  const inWeek = (day: string) => day >= start && day <= today
  const done = Object.values(doneAt).filter(inWeek).length + Object.values(challenges).filter(inWeek).length
  return { done, goal: WEEKLY_GOAL }
}

export function countFinishedPhases(done: Done) {
  return phases.filter((phase) => {
    const [current, count] = phaseProgress(phase.number, done)
    return current === count
  }).length
}

export function metrics(done: Done, days: string[], challenges: Challenges = {}) {
  const total = areas.reduce((sum, area) => sum + area.topics.length, 0)
  const completed = areas.reduce((sum, area) => sum + countDone(area, done), 0)
  const [requiredDone, requiredTotal] = areas.reduce(([current, count], area) => {
    const [areaDone, areaTotal] = priorityProgress(area, done, true)
    return [current + areaDone, count + areaTotal]
  }, [0, 0])
  const finishedPhases = countFinishedPhases(done)
  const challengesDone = Object.keys(challenges).length
  return {
    completed,
    total,
    requiredDone,
    requiredTotal,
    deepDone: completed - requiredDone,
    deepTotal: total - requiredTotal,
    percent: percent(requiredDone, requiredTotal),
    xp: completed * TOPIC_XP + finishedPhases * PHASE_XP + challengesDone * CHALLENGE_XP,
    finishedPhases,
    challengesDone,
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

export type Feedback = { message: string, kind: 'undo' | 'topic' | 'area' | 'level' | 'phase' | 'info' | 'challenge' | 'week' }

export function toggleChallengeFeedback(challenges: Challenges, areaId: string): Feedback {
  if (challenges[areaId]) return { message: 'Desafio desmarcado', kind: 'undo' }
  return { message: `Desafio concluído! +${CHALLENGE_XP} XP`, kind: 'challenge' }
}

// Prioridade da maior para a menor conquista: fase > nível > área > meta da semana > tópico > desmarcar.
// `week` é opcional (antes/depois de marcar este tópico) para o aviso "Meta da semana batida" aparecer
// só na transição (4 -> 5), nunca de novo enquanto a meta continuar batida.
export function toggleFeedback(
  done: Done, key: string, week?: { before: number, after: number, goal: number },
): Feedback {
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

  if (week && week.before < week.goal && week.after >= week.goal) {
    return { message: `Meta da semana batida! +${TOPIC_XP} XP`, kind: 'week' }
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
  { icon: '⚒', title: 'Mão na massa', description: 'Conclua seu primeiro desafio', earned: progress => progress.challengesDone >= 1 },
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
