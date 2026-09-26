import { areasByPhase } from '../data/roadmap'
import type { Phase } from '../data/roadmap'
import { CHALLENGE_XP, phaseProgress, PHASE_XP, TOPIC_XP } from './progress'
import type { Area } from '../types/content'
import type { Challenges, Done } from '../types/progress'

const TAGLINE = 'trilha de Engenharia de Software com IA'
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Só os dados do card (o desenho fica em components/share/drawCard.ts). `lines` é a lista de marcas do
// desafio; no card de fase fica vazia (a constelação em `stars` já mostra o que foi feito).
export type ShareCardData = {
  kind: 'challenge' | 'phase'
  title: string
  subtitle: string
  lines: string[]
  stats: { xp: number, areas?: number, topics?: number }
  stars: { lit: number, total: number }
  date: string
  caption: string
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
  }
}
