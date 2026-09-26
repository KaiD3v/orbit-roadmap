import { areasByPhase, orderedAreas } from '../data/roadmap'
import type { Phase } from '../data/roadmap'
import {
  areaState, CHALLENGE_XP, countDone, metrics as buildMetrics, nextArea, phaseProgress, PHASE_XP, TOPIC_XP,
  type BadgeInfo, type Metrics,
} from './progress'
import type { Area } from '../types/content'
import type { Challenges, Done } from '../types/progress'

const TAGLINE = 'trilha de Engenharia de Software com IA'
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Só os dados do card (o desenho fica em components/share/drawCard.ts). `lines` é a lista de marcas do
// desafio (ou a descrição da conquista); no card de fase, nível e trilha fica vazia (a constelação ou
// o anel de `stars`/`stats.percent` já mostram o que foi feito).
export type ShareCardData = {
  kind: 'challenge' | 'phase' | 'level' | 'badge' | 'journey'
  title: string
  subtitle: string
  lines: string[]
  stats: { xp: number, areas?: number, topics?: number, percent?: number }
  stars: { lit: number, total: number }
  date: string
  caption: string
  // Glifo da conquista (só no card `badge`; o mesmo usado em `Achievements.tsx`/BADGES).
  icon?: string
  // Uma entrada por área, na ordem da trilha (B08): alimenta a constelação ligada em `drawCard.ts`.
  // Só `phase` e `journey` preenchem; sem o campo, o desenho trata como as `stars.lit` primeiras acesas.
  trail?: { lit: boolean, phase: number }[]
}

// Formata 'YYYY-MM-DD' (mesmo formato de `localDay`) em algo como "25 set 2026", sem depender do locale
// do navegador (`toLocaleDateString` varia por SO/idioma do sistema).
export function formatCardDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return `${date} ${MONTHS[(month ?? 1) - 1]} ${year}`
}

export function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

export function challengeCard(area: Area, day: string): ShareCardData {
  const challenge = area.challenge
  if (!challenge) throw new Error(`Área ${area.id} não tem desafio`)
  return {
    kind: 'challenge',
    title: challenge.title,
    subtitle: area.title,
    lines: challenge.done,
    stats: { xp: CHALLENGE_XP },
    stars: { lit: 1, total: 1 },
    date: formatCardDate(day),
    caption: `Concluí o desafio "${challenge.title}" na ${TAGLINE}.`,
  }
}

// `day` explícito (não `new Date()` interno) para a função continuar pura e testável, como o resto do
// domínio (ex.: `weekProgress`, que também recebe `today` de fora).
export function phaseCard(phase: Phase, done: Done, challenges: Challenges, day: string): ShareCardData {
  const areas = areasByPhase.get(phase.number) ?? []
  const [, totalTopics] = phaseProgress(phase.number, done)
  const challengesDone = areas.filter(area => area.challenge && challenges[String(area.id)]).length
  const xp = totalTopics * TOPIC_XP + PHASE_XP + challengesDone * CHALLENGE_XP
  const areaCount = areas.length
  return {
    kind: 'phase',
    title: `Fase ${phase.number}: ${phase.name}`,
    subtitle: TAGLINE,
    lines: [],
    stats: { xp, areas: areaCount, topics: totalTopics },
    stars: { lit: areaCount, total: areaCount },
    date: formatCardDate(day),
    caption: `Completei a Fase ${phase.number}: "${phase.name}" (${pluralize(areaCount, 'área', 'áreas')}) na ${TAGLINE}.`,
    trail: areas.map(() => ({ lit: true, phase: phase.number })),
  }
}

// `metrics` já traz `percent` (essenciais concluídos), `requiredDone`/`requiredTotal` e `xp` prontos —
// evita recalcular o que `useMetrics()`/`metrics()` já sabe.
export function levelCard(level: string, metrics: Metrics, day: string): ShareCardData {
  return {
    kind: 'level',
    title: level,
    subtitle: TAGLINE,
    lines: [],
    stats: { xp: metrics.xp, percent: metrics.percent },
    stars: { lit: metrics.requiredDone, total: metrics.requiredTotal },
    date: formatCardDate(day),
    caption: `Subi para o nível ${level} na ${TAGLINE}.`,
  }
}

export function badgeCard(badge: BadgeInfo, metrics: Metrics, day: string): ShareCardData {
  return {
    kind: 'badge',
    title: badge.title,
    subtitle: TAGLINE,
    lines: [badge.description],
    stats: { xp: metrics.xp },
    stars: { lit: 1, total: 1 },
    date: formatCardDate(day),
    caption: `Desbloqueei a conquista "${badge.title}" na ${TAGLINE}.`,
    icon: badge.icon,
  }
}

// "Minha trilha até aqui" (sob demanda, não amarrada a uma transição): a constelação do roadmap
// inteiro, uma estrela por área. Acesa usa a mesma regra visual do mapa (`areaState` === 'done',
// essenciais completos), não `isAreaDone` (que exigiria também os extras).
export function journeyCard(done: Done, challenges: Challenges, day: string): ShareCardData {
  const nextId = nextArea(done).id
  const trail = orderedAreas.map(area => ({ lit: areaState(area, done, nextId) === 'done', phase: area.phase }))
  const doneAreas = trail.filter(entry => entry.lit).length
  const totalAreas = orderedAreas.length
  const completedTopics = orderedAreas.reduce((sum, area) => sum + countDone(area, done), 0)
  return {
    kind: 'journey',
    title: 'Minha trilha até aqui',
    subtitle: TAGLINE,
    lines: [],
    stats: { xp: buildMetrics(done, [], challenges).xp, areas: doneAreas, topics: completedTopics },
    stars: { lit: doneAreas, total: totalAreas },
    date: formatCardDate(day),
    caption: `${pluralize(doneAreas, 'área concluída', 'áreas concluídas')} de ${totalAreas} na ${TAGLINE}.`,
    trail,
  }
}
