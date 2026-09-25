import { areas, orderedAreas } from '../data/roadmap'
import { matchesArea, normalizeQuery, type Filter } from '../domain/filter'
import { nextArea } from '../domain/progress'
import { useProgress } from '../store/progress'
import { MapToolbar } from './MapToolbar'
import { RoadmapMap } from './RoadmapMap'
import { SectionHeading } from './SectionHeading'
import type { Area } from '../types/content'

export function Journey({ search, onSearch, filter, onFilter, open }: {
  search: string
  onSearch: (value: string) => void
  filter: Filter
  onFilter: (value: Filter) => void
  open: (area: Area) => void
}) {
  const done = useProgress(state => state.done)
  const query = normalizeQuery(search)
  const matches = areas.filter(area => matchesArea(area, done, query, filter)).length
  return (
    <section className="journey" aria-labelledby="journey-title">
      <SectionHeading id="journey-title" label="Mapa de aprendizagem" title="Trace seu caminho">
        As etapas vão de 01 a {orderedAreas.length}. Comece pelos tópicos obrigatórios para colocar o conhecimento
        em prática; use os de aprofundamento para ampliar seu domínio.
      </SectionHeading>
      <MapToolbar search={search} onSearch={onSearch} filter={filter} onFilter={onFilter} matches={matches} />
      <RoadmapMap query={query} filter={filter} nextId={nextArea(done).id} open={open} />
      {matches === 0 && <p className="empty-state">Nenhum nó corresponde à busca. Tente outro termo ou filtro.</p>}
    </section>
  )
}
