import roadmap from './roadmap.json'

export type Resource = { type: string; title: string; url: string }
export type Area = {
  id: number
  title: string
  phase: number
  description: string
  topics: string[]
  required: number[]
  resources: Resource[]
}

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
export const validTopicKeys = new Set(areas.flatMap(area => area.topics.map((_, index) => `${area.id}:${index}`)))
