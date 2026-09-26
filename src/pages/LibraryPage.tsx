import { useState } from 'react'
import { LibrarySky } from '../components/LibrarySky'
import { ResourceCard } from '../components/ResourceCard'
import { areasByPhase, phases } from '../data/roadmap'
import { normalizeQuery, queryMatcher } from '../domain/filter'
import { byLevel, normalizeResourceUrl } from '../domain/resources'
import { useProgress } from '../store/progress'
import type { Resource, ResourceLevel, ResourceType } from '../types/content'
import type { PageProps } from './types'

type TypeFilter = ResourceType | 'all'
type LevelFilter = ResourceLevel | 'all'
type LangFilter = 'pt' | 'en' | 'all'
type TriFilter = 'all' | 'yes' | 'no'

const RESOURCE_TYPES: ResourceType[] = ['Material', 'Curso', 'Vídeo', 'Livro']

// B06: Biblioteca — todos os materiais do roadmap, agrupados por fase e área, com busca e filtros.
// Rota `#/biblioteca`.
export function LibraryPage({ openArea }: PageProps) {
  const resourcesRead = useProgress(state => state.resourcesRead)
  const toggleResourceRead = useProgress(state => state.toggleResourceRead)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [level, setLevel] = useState<LevelFilter>('all')
  const [lang, setLang] = useState<LangFilter>('all')
  const [free, setFree] = useState<TriFilter>('all')
  const [read, setRead] = useState<TriFilter>('all')

  const matcher = queryMatcher(normalizeQuery(search))
  const filtering = matcher !== null || type !== 'all' || level !== 'all' || lang !== 'all' || free !== 'all' || read !== 'all'

  function matches(resource: Resource) {
    if (type !== 'all' && resource.type !== type) return false
    if (level !== 'all' && resource.level !== level) return false
    if (lang !== 'all' && resource.lang !== lang) return false
    if (free === 'yes' && resource.free !== true) return false
    if (free === 'no' && resource.free !== false) return false
    const isRead = Boolean(resourcesRead[normalizeResourceUrl(resource.url)])
    if (read === 'yes' && !isRead) return false
    if (read === 'no' && isRead) return false
    if (matcher && !matcher(normalizeQuery(resource.title))) return false
    return true
  }

  const groups = phases.flatMap((phase) => {
    const areaGroups = (areasByPhase.get(phase.number) ?? []).flatMap((area) => {
      const resources = byLevel(area.resources.filter(matches))
      return resources.length ? [{ area, resources }] : []
    })
    return areaGroups.length ? [{ phase, areaGroups }] : []
  })
  const totalMatches = groups.reduce(
    (sum, group) => sum + group.areaGroups.reduce((areaSum, g) => areaSum + g.resources.length, 0), 0,
  )

  return (
    <section className="library-page" aria-labelledby="library-title">
      <LibrarySky />
      <div className="library-top">
        <h1 id="library-title">Biblioteca de materiais</h1>
        <p>Todo material do roadmap, num só lugar. Filtre pelo que importa agora e volte depois pelo resto.</p>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar material pelo título"
              aria-label="Buscar material pelo título"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="library-filters">
          <label className="library-filter">
            <span className="sr-only">Tipo de material</span>
            <select value={type} onChange={event => setType(event.target.value as TypeFilter)}>
              <option value="all">Todos os tipos</option>
              {RESOURCE_TYPES.map(value => <option value={value} key={value}>{value}</option>)}
            </select>
          </label>
          <label className="library-filter">
            <span className="sr-only">Nível</span>
            <select value={level} onChange={event => setLevel(event.target.value as LevelFilter)}>
              <option value="all">Todos os níveis</option>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
          <label className="library-filter">
            <span className="sr-only">Idioma</span>
            <select value={lang} onChange={event => setLang(event.target.value as LangFilter)}>
              <option value="all">Português e inglês</option>
              <option value="pt">Só em português</option>
              <option value="en">Só em inglês</option>
            </select>
          </label>
          <label className="library-filter">
            <span className="sr-only">Custo</span>
            <select value={free} onChange={event => setFree(event.target.value as TriFilter)}>
              <option value="all">Grátis e pagos</option>
              <option value="yes">Só grátis</option>
              <option value="no">Só pagos</option>
            </select>
          </label>
          <label className="library-filter">
            <span className="sr-only">Lido</span>
            <select value={read} onChange={event => setRead(event.target.value as TriFilter)}>
              <option value="all">Lidos e não lidos</option>
              <option value="yes">Só lidos</option>
              <option value="no">Só não lidos</option>
            </select>
          </label>
        </div>
        {filtering && (
          <p className="toolbar-count">{totalMatches} {totalMatches === 1 ? 'material encontrado' : 'materiais encontrados'}</p>
        )}
      </div>
      <div className="library-main">
        {groups.length === 0 && <p className="empty-state">Nenhum material bate com esse filtro.</p>}
        {groups.map(({ phase, areaGroups }) => (
          <section className="library-phase" key={phase.number}>
            <h3>Fase {phase.number}: {phase.name}</h3>
            {areaGroups.map(({ area, resources }) => (
              <div className="library-area" key={area.id}>
                <div className="library-area-head">
                  <h4>{area.title}</h4>
                  <button className="text-button" type="button" onClick={() => openArea(area)}>Abrir área</button>
                </div>
                <div className="resource-list">
                  {resources.map(resource => (
                    <ResourceCard
                      resource={resource}
                      resourcesRead={resourcesRead}
                      onToggleRead={toggleResourceRead}
                      key={resource.url}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </section>
  )
}
