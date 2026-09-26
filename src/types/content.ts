import type { phases } from '../data/roadmap'

export type ResourceType = 'Material' | 'Curso' | 'Vídeo' | 'Livro'
export type PhaseNumber = (typeof phases)[number]['number']

export type ResourceLevel = 'iniciante' | 'intermediario' | 'avancado'

export type Resource = {
  type: ResourceType
  title: string
  url: `https://${string}`
  level?: ResourceLevel
  lang?: 'pt' | 'en'
  free?: boolean
  duration?: string // texto curto: "2h", "40 min", "300 páginas"
  why?: string // uma frase: o que você consegue fazer depois
  topics?: string[] // ids de tópico (da mesma área) que o material cobre
}
export type Topic = { id: string, title: string, required: boolean }
export type Challenge = { title: string, brief: string, done: string[] }

export type Area = {
  id: number
  title: string
  phase: PhaseNumber
  description: string
  topics: Topic[]
  resources: Resource[]
  challenge?: Challenge
}
