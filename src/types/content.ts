import type { phases } from '../data/roadmap'

export type ResourceType = 'Material' | 'Curso' | 'Vídeo' | 'Livro'
export type PhaseNumber = (typeof phases)[number]['number']

export type Resource = { type: ResourceType, title: string, url: `https://${string}` }
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
