import roadmap from './roadmap.json'
import type { Area } from '../types/content'

export type { Area, Resource, Topic } from '../types/content'

export const areas: Area[] = roadmap
export const phases = [
  ['Fundamentos & sistemas', 'Arquitetura, backend e infraestrutura', '◈'],
  ['Base de IA', 'Matemática, Python e modelos', '✳'],
  ['LLMs em prática', 'APIs, busca e recuperação', '⌘'],
  ['Agentes & workflows', 'Contexto, memória e orquestração', '✦'],
  ['Qualidade & produção', 'Avaliação, segurança e operação', '◷'],
  ['Fronteira', 'Sistemas multiagente e otimização', '◇'],
] as const

export const orderedAreas = phases.flatMap((_, index) => areas.filter(area => area.phase === index + 1))
export const displayNumber = new Map(orderedAreas.map((area, index) => [area.id, index + 1]))
export const validTopicKeys = new Set(areas.flatMap(area => area.topics.map(topic => topic.id)))
export const legacyTopicKeys = new Map<string, string>(areas.flatMap(area => area.topics.flatMap(topic => {
  const originalIndex = Number(topic.id.match(/-t(\d+)$/)?.[1]) - 1
  return Number.isInteger(originalIndex) ? [[`${area.id}:${originalIndex}`, topic.id] as const] : []
})))
