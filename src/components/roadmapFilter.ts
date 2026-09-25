import type { Area } from '../data/roadmap'
import { countDone, type Done } from '../domain/progress'

export type Filter = 'all' | 'pending' | 'done'

export function matchesArea(area: Area, done: Done, query: string, filter: Filter) {
  const finished = countDone(area, done) === area.topics.length
  return (filter === 'all' || (filter === 'done' ? finished : !finished)) &&
    (!query || `${area.title} ${area.topics.map(topic => topic.title).join(' ')}`.toLocaleLowerCase('pt-BR').includes(query))
}
