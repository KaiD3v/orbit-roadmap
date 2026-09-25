import { displayNumber, orderedAreas, phases, type Area } from '../data/roadmap'
import { countDone, phaseProgress, priorityProgress, type Done } from '../domain/progress'
import { matchesArea, type Filter } from './roadmapFilter'

function MapNode({ area, done, query, filter, nextId, open }: {
  area: Area; done: Done; query: string; filter: Filter; nextId: number; open: (area: Area) => void
}) {
  const count = countDone(area, done)
  const finished = count === area.topics.length
  const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
  const [deepDone, deepTotal] = priorityProgress(area, done, false)
  const number = String(displayNumber.get(area.id)).padStart(2, '0')
  const summary = requiredTotal && deepTotal ? `${requiredDone}/${requiredTotal} obrig. · ${deepDone}/${deepTotal} aprof.`
    : requiredTotal ? `Obrigatório · ${requiredDone}/${requiredTotal}` : `Aprofundamento · ${deepDone}/${deepTotal}`
  const className = ['map-node', finished && 'is-done', !requiredTotal && 'is-extension',
    !matchesArea(area, done, query, filter) && 'is-faded', area.id === nextId && !query && filter === 'all' && 'is-next'].filter(Boolean).join(' ')

  return <button className={className} type="button" id={`area-${area.id}`} onClick={() => open(area)}
    aria-label={`Abrir etapa ${number}: ${area.title}; ${summary}`}>
    <span className="node-index">{number}</span>
    <span className="node-copy"><strong>{area.title}</strong><small>{summary}</small></span>
    <span className="node-state" aria-hidden="true">{finished ? '✓' : '↗'}</span>
  </button>
}

function PhaseMap({ phase, meta, done, query, filter, nextId, open }: {
  phase: number; meta: (typeof phases)[number]; done: Done; query: string; filter: Filter; nextId: number; open: (area: Area) => void
}) {
  const [name, description, glyph] = meta
  const list = orderedAreas.filter(area => area.phase === phase)
  const [completed, total] = phaseProgress(phase, done)
  const percent = total ? Math.round(completed / total * 100) : 0
  const rows = list.flatMap((left, index) => index % 2 === 0 ? [[left, list[index + 1]] as const] : [])
  return <section className="phase-section" id={`fase-${phase}`}>
    <div className="phase-head">
      <span className="phase-glyph" aria-hidden="true">{glyph}</span>
      <div><h3>Fase {phase}: {name}</h3><p>{description} · {list.length} áreas</p></div>
      <div className="phase-meter"><strong>{percent}%</strong><div className="phase-bar" role="progressbar" aria-label={`Progresso da fase ${phase}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div></div>
    </div>
    <div className="map-track">
      {rows.map(([left, right]) => <div className="map-row" key={left.id}>
        <div className="map-slot left has-node"><MapNode area={left} done={done} query={query} filter={filter} nextId={nextId} open={open} /></div>
        <div className={`map-slot right ${right ? 'has-node' : ''}`}>
          {right && <MapNode area={right} done={done} query={query} filter={filter} nextId={nextId} open={open} />}
        </div>
      </div>)}
      <div className="map-end">Checkpoint {phase} / {phases.length}</div>
    </div>
  </section>
}

export function RoadmapMap({ done, query, filter, nextId, open }: {
  done: Done; query: string; filter: Filter; nextId: number; open: (area: Area) => void
}) {
  return <div id="roadmap">{phases.map((meta, index) => <PhaseMap phase={index + 1} meta={meta} done={done} query={query} filter={filter} nextId={nextId} open={open} key={index} />)}</div>
}
