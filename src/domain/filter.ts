import { areas } from '../data/roadmap'
import { isAreaDone } from './progress'
import type { Area } from '../types/content'
import type { Done } from '../types/progress'

export const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Em aberto' },
  { value: 'done', label: 'Concluídas' },
] as const
export type Filter = (typeof FILTERS)[number]['value']

export const normalizeQuery = (text: string) => text.toLocaleLowerCase('pt-BR').trim()

const searchText = new Map(areas.map(area =>
  [area.id, normalizeQuery(`${area.title} ${area.topics.map(topic => topic.title).join(' ')}`)]))

export function matchesArea(area: Area, done: Done, query: string, filter: Filter) {
  const finished = isAreaDone(area, done)
  return (filter === 'all' || (filter === 'done' ? finished : !finished))
    && (!query || (searchText.get(area.id) ?? '').includes(query))
}
