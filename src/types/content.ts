export type Resource = { type: string; title: string; url: string }
export type Topic = { id: string; title: string; required: boolean }

export type Area = {
  id: number
  title: string
  phase: number
  description: string
  topics: Topic[]
  resources: Resource[]
}
