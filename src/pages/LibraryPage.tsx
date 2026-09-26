import type { ReactNode } from 'react'
import { useState, type CSSProperties } from 'react'
import { LibraryHeaderFigures, LibrarySky } from '../components/LibrarySky'
import { ResourceBody } from '../components/ResourceBody'
import { ResourceCard } from '../components/ResourceCard'
import { areasByPhase, phases, resourceEntries } from '../data/roadmap'
import { normalizeQuery, queryMatcher } from '../domain/filter'
import { nextArea } from '../domain/progress'
import { byLevel, LEVEL_LABEL, normalizeResourceUrl } from '../domain/resources'
import { useProgress } from '../store/progress'
import type { Resource, ResourceLevel, ResourceType } from '../types/content'
import type { PageProps } from './types'

type TypeFilter = ResourceType | 'all'
type LevelFilter = ResourceLevel | 'all'
type LangFilter = 'pt' | 'en' | 'all'
type TriFilter = 'all' | 'yes' | 'no'

const RESOURCE_TYPES: ResourceType[] = ['Material', 'Curso', 'Vídeo', 'Livro']
const LEVELS: ResourceLevel[] = ['iniciante', 'intermediario', 'avancado']
const REDUCED_MOTION = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// L04: um chip de filtro (botão pressed/not-pressed), no mesmo estilo do `.filter-group` do mapa.
function Chip({ active, onClick, children }: { active: boolean, onClick: () => void, children: ReactNode }) {
  return (
    <button type="button" className={`filter ${active ? 'active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}

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
  // Paginação por fase: abre na fase atual da jornada
  const [selectedPhase, setSelectedPhase] = useState(() => nextArea(useProgress.getState().done).phase as number)

  const matcher = queryMatcher(normalizeQuery(search))
  const filtering = matcher !== null || type !== 'all' || level !== 'all' || lang !== 'all' || free !== 'all' || read !== 'all'
  const extraActive = [level !== 'all', lang !== 'all', free !== 'all', read !== 'all'].filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setType('all')
    setLevel('all')
    setLang('all')
    setFree('all')
    setRead('all')
  }

  // Troca a página e volta ao topo da lista (o índice de fases), para não abrir a fase nova no meio
  function goToPhase(number: number) {
    setSelectedPhase(number)
    document.getElementById('library-phase-index')
      ?.scrollIntoView({ behavior: REDUCED_MOTION() ? 'auto' : 'smooth', block: 'start' })
  }

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
  // Com filtro, a fase escolhida pode ficar sem resultado: mostra a primeira que tem
  const page = groups.find(group => group.phase.number === selectedPhase) ?? groups[0]
  const pageIndex = page ? groups.indexOf(page) : -1
  const previous = groups[pageIndex - 1]
  const next = groups[pageIndex + 1]
  const countIn = (group: (typeof groups)[number]) => group.areaGroups.reduce((sum, g) => sum + g.resources.length, 0)
  const totalRead = resourceEntries.filter(({ resource }) => resourcesRead[normalizeResourceUrl(resource.url)]).length
  const totalAll = resourceEntries.length
  const readPercent = totalAll ? Math.round((totalRead / totalAll) * 100) : 0

  return (
    <section className="library-page" aria-labelledby="library-title">
      <LibrarySky />
      <div className="library-top">
        <LibraryHeaderFigures />
        <div className="library-top-head">
          <div>
            <h1 id="library-title">Biblioteca</h1>
            <p>Os materiais de cada área, ligados na ordem em que vale estudar.</p>
          </div>
          <div className="library-read-total">
            <span>{totalRead} de {totalAll} materiais lidos</span>
            <div
              className="phase-bar"
              role="progressbar"
              aria-label="Materiais lidos"
              aria-valuenow={readPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${readPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="library-filter-bar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar material"
            aria-label="Buscar material pelo título"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </label>
        <div className="library-chip-row">
          <div className="filter-group" role="group" aria-label="Filtrar por tipo de material">
            <Chip active={type === 'all'} onClick={() => setType('all')}>Todos</Chip>
            {RESOURCE_TYPES.map(value => (
              <Chip active={type === value} onClick={() => setType(value)} key={value}>
                <ResourceBody type={value} read={false} size={16} />{value}
              </Chip>
            ))}
          </div>
          <details className="library-more-filters">
            <summary>Mais filtros{extraActive > 0 && ` (${extraActive})`}</summary>
            <div className="library-more-filters-body">
              <div className="filter-group" role="group" aria-label="Filtrar por nível">
                {LEVELS.map(value => (
                  <Chip active={level === value} onClick={() => setLevel(level === value ? 'all' : value)} key={value}>
                    {LEVEL_LABEL[value]}
                  </Chip>
                ))}
              </div>
              <div className="filter-group" role="group" aria-label="Filtrar por idioma">
                <Chip active={lang === 'pt'} onClick={() => setLang(lang === 'pt' ? 'all' : 'pt')}>PT</Chip>
                <Chip active={lang === 'en'} onClick={() => setLang(lang === 'en' ? 'all' : 'en')}>EN</Chip>
              </div>
              <div className="filter-group" role="group" aria-label="Filtrar por custo">
                <Chip active={free === 'yes'} onClick={() => setFree(free === 'yes' ? 'all' : 'yes')}>Grátis</Chip>
              </div>
              <div className="filter-group" role="group" aria-label="Filtrar por lido">
                <Chip active={read === 'no'} onClick={() => setRead(read === 'no' ? 'all' : 'no')}>Não lidos</Chip>
              </div>
            </div>
          </details>
          {filtering && <button className="text-button library-clear" type="button" onClick={clearFilters}>Limpar filtros</button>}
        </div>
        {filtering && (
          <p className="toolbar-count library-match-count">
            {totalMatches} {totalMatches === 1 ? 'material encontrado' : 'materiais encontrados'}
          </p>
        )}
      </div>
      <nav className="library-phase-index" id="library-phase-index" aria-label="Fases da biblioteca">
        {phases.map((phase) => {
          const group = groups.find(g => g.phase.number === phase.number)
          return (
            <button
              type="button"
              className="library-phase-dot"
              style={{ '--phase-color': `var(--phase-${phase.number})` } as CSSProperties}
              disabled={!group}
              aria-current={page?.phase.number === phase.number ? 'page' : undefined}
              aria-label={`Fase ${phase.number}: ${phase.name}, ${group ? countIn(group) : 0} materiais`}
              onClick={() => goToPhase(phase.number)}
              key={phase.number}
            >
              <span aria-hidden="true" />
              Fase {phase.number}
              {group && <small>{countIn(group)}</small>}
            </button>
          )
        })}
      </nav>
      <div className="library-main">
        {groups.length === 0 && (
          <div className="library-empty">
            <span className="library-empty-astro"><ResourceBody type="Material" read={false} size={56} /></span>
            <p>Nenhum material com esses filtros.</p>
            <button className="ghost-button" type="button" onClick={clearFilters}>Limpar filtros</button>
          </div>
        )}
        {page && (
          <section
            className="library-phase"
            id={`library-phase-${page.phase.number}`}
            style={{ '--phase-color': `var(--phase-${page.phase.number})` } as CSSProperties}
            key={page.phase.number}
          >
            <h3>Fase {page.phase.number}: {page.phase.name}</h3>
            {page.areaGroups.map(({ area, resources }) => {
              const readCount = resources.filter(r => resourcesRead[normalizeResourceUrl(r.url)]).length
              return (
                <div className="observatory-area" key={area.id}>
                  <div className="observatory-area-head">
                    <h4>{area.title}</h4>
                    <span className="observatory-area-count">{readCount} de {resources.length} lidos</span>
                    <button className="text-button" type="button" onClick={() => openArea(area)}>Abrir área</button>
                  </div>
                  <div className="constellation-scroll">
                    <div className="constellation" role="list">
                      {resources.map((resource, index) => (
                        <div
                          className={`constellation-item ${resourcesRead[normalizeResourceUrl(resource.url)] ? 'is-read' : ''}`}
                          role="listitem"
                          key={resource.url}
                        >
                          <ResourceCard
                            resource={resource}
                            resourcesRead={resourcesRead}
                            onToggleRead={toggleResourceRead}
                            featured={index === 0}
                            variant="library"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        )}
        {(previous || next) && (
          <nav className="library-pager" aria-label="Outras fases">
            {previous && (
              <button className="ghost-button" type="button" onClick={() => goToPhase(previous.phase.number)}>
                <small>Fase anterior</small>
                {previous.phase.name}
              </button>
            )}
            {next && (
              <button className="ghost-button is-next" type="button" onClick={() => goToPhase(next.phase.number)}>
                <small>Próxima fase</small>
                {next.phase.name}
              </button>
            )}
          </nav>
        )}
      </div>
    </section>
  )
}
