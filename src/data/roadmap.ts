import { areas } from './areas'
import { normalizeResourceUrl } from '../domain/resources'
import type { Area } from '../types/content'

export { areas }
export const phases = [
  { number: 1, name: 'Fundamentos & sistemas', description: 'Arquitetura, backend e infraestrutura', glyph: '◈' },
  { number: 2, name: 'Base de IA', description: 'Matemática, Python e modelos', glyph: '✳' },
  { number: 3, name: 'LLMs em prática', description: 'APIs, busca e recuperação', glyph: '⌘' },
  { number: 4, name: 'Agentes & workflows', description: 'Contexto, memória e orquestração', glyph: '✦' },
  { number: 5, name: 'Qualidade & produção', description: 'Avaliação, segurança e operação', glyph: '◷' },
  { number: 6, name: 'Fronteira', description: 'Sistemas multiagente e otimização', glyph: '◇' },
] as const
export type Phase = (typeof phases)[number]

export const areasByPhase = new Map<number, Area[]>(
  phases.map(phase => [phase.number, areas.filter(area => area.phase === phase.number)]),
)
export const orderedAreas = phases.flatMap(phase => areasByPhase.get(phase.number) ?? [])
export const displayNumber = new Map(orderedAreas.map((area, index) => [area.id, index + 1]))
export const stepLabel = (area: Area) => String(displayNumber.get(area.id)).padStart(2, '0')
export const validTopicKeys = new Set(areas.flatMap(area => area.topics.map(topic => topic.id)))
export const areasWithChallenge = new Set(areas.filter(area => area.challenge).map(area => String(area.id)))
// Índice 0-based do sufixo `-t{NN}` do id (a1-t01 -> 0). Usado no id legado (`{área}:{índice}`)
// e no link de progresso (F02), cujo bit k corresponde a esse mesmo índice.
export const topicIndex = (topicId: string) => Number(topicId.match(/-t(\d+)$/)?.[1]) - 1
export const legacyTopicKeys = new Map<string, string>(areas.flatMap(area => area.topics.flatMap((topic) => {
  const originalIndex = topicIndex(topic.id)
  return Number.isInteger(originalIndex) ? [[`${area.id}:${originalIndex}`, topic.id] as const] : []
})))

// B06: Biblioteca de materiais. `resourceEntries` guarda cada material junto da área dona, na mesma
// ordem de exibição do mapa (fase, depois posição no array); um mesmo material (ex.: um livro citado
// em 5 áreas) aparece uma vez por área, todas com a mesma chave (URL normalizada). `validResourceKeys`
// é usado na migração para descartar chaves de materiais que não existem mais (curadoria trocou a URL).
export const resourceEntries = orderedAreas.flatMap(area => area.resources.map(resource => ({ area, resource })))
export const validResourceKeys = new Set(resourceEntries.map(({ resource }) => normalizeResourceUrl(resource.url)))
