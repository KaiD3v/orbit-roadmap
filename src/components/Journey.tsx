import { areas, orderedAreas } from '../data/roadmap'
import { matchesArea, normalizeQuery, queryMatcher, type Filter } from '../domain/filter'
import { nextArea } from '../domain/progress'
import type { ShareCardData } from '../domain/shareCard'
import { useProgress } from '../store/progress'
import { MapToolbar } from './MapToolbar'
import { RoadmapMap } from './RoadmapMap'
import { SectionHeading } from './SectionHeading'
import type { Area } from '../types/content'

export function Journey({ search, onSearch, filter, onFilter, open, openShare }: {
  search: string
  onSearch: (value: string) => void
  filter: Filter
  onFilter: (value: Filter) => void
  open: (area: Area) => void
  openShare: (data: ShareCardData) => void
}) {
  const done = useProgress(state => state.done)
  const query = normalizeQuery(search)
  const matcher = queryMatcher(query)
  const matches = areas.filter(area => matchesArea(area, done, matcher, filter)).length
  return (
    <section className="journey" aria-labelledby="journey-title">
      <SectionHeading id="journey-title" title="Trace seu caminho">
        São {orderedAreas.length} etapas. Comece pelos tópicos essenciais para já construir algo real; os extras
        ficam para quando quiser ir mais fundo.
      </SectionHeading>
      <MapToolbar search={search} onSearch={onSearch} filter={filter} onFilter={onFilter} matches={matches} />
      <RoadmapMap matcher={matcher} filter={filter} nextId={nextArea(done).id} open={open} openShare={openShare} />
      {matches === 0 && <p className="empty-state">Nada por aqui. Tente outro termo ou limpe os filtros.</p>}
    </section>
  )
}
