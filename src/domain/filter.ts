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

// Minúsculas e sem acento ('memoria' encontra 'memória'): NFD separa a letra da marca diacrítica,
// que \p{M} então remove.
export const normalizeQuery = (text: string) =>
  text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '').trim()

const searchText = new Map(areas.map(area =>
  [area.id, normalizeQuery(`${area.title} ${area.topics.map(topic => topic.title).join(' ')}`)]))

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export type QueryMatcher = (text: string) => boolean

// Compilada uma vez por consulta (não uma vez por área). O trecho precisa começar uma palavra:
// no início do texto ou logo após um caractere que não é letra nem número. Assim "rag" encontra
// "RAG", não "storage".
export function queryMatcher(query: string): QueryMatcher | null {
  if (!query) return null
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(query)}`, 'u')
  return text => pattern.test(text)
}

export function matchesArea(area: Area, done: Done, matcher: QueryMatcher | null, filter: Filter) {
  const finished = isAreaDone(area, done)
  return (filter === 'all' || (filter === 'done' ? finished : !finished))
    && (!matcher || matcher(searchText.get(area.id) ?? ''))
}
