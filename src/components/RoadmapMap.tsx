import { areasByPhase, phases, stepLabel, type Phase } from '../data/roadmap'
import { matchesArea, type Filter } from '../domain/filter'
import { isAreaDone, percent, phaseProgress, priorityProgress } from '../domain/progress'
import { useProgress } from '../store/progress'
import type { Area } from '../types/content'

type MapView = { query: string, filter: Filter, nextId: number, open: (area: Area) => void }

function MapNode({ area, view }: { area: Area, view: MapView }) {
  const done = useProgress(state => state.done)
  const finished = isAreaDone(area, done)
  const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
  const [deepDone, deepTotal] = priorityProgress(area, done, false)
  const number = stepLabel(area)
  const summary = requiredTotal && deepTotal
    ? `${requiredDone}/${requiredTotal} obrig. · ${deepDone}/${deepTotal} aprof.`
    : requiredTotal ? `Obrigatório · ${requiredDone}/${requiredTotal}` : `Aprofundamento · ${deepDone}/${deepTotal}`
  const isNext = area.id === view.nextId && !view.query && view.filter === 'all'
  const className = ['map-node', finished && 'is-done', !requiredTotal && 'is-extension',
    !matchesArea(area, done, view.query, view.filter) && 'is-faded', isNext && 'is-next'].filter(Boolean).join(' ')

  return (
    <button
      className={className}
      type="button"
      id={`area-${area.id}`}
      onClick={() => view.open(area)}
      aria-label={`Abrir etapa ${number}: ${area.title}; ${summary}`}
    >
      <span className="node-index">{number}</span>
      <span className="node-copy">
        <strong>{area.title}</strong>
        <small>{summary}</small>
      </span>
      <span className="node-state" aria-hidden="true">{finished ? '✓' : '↗'}</span>
    </button>
  )
}

function PhaseMap({ phase, view }: { phase: Phase, view: MapView }) {
  const done = useProgress(state => state.done)
  const list = areasByPhase.get(phase.number) ?? []
  const [completed, total] = phaseProgress(phase.number, done)
  const phasePercent = percent(completed, total)
  const rows = list.flatMap((left, index) => index % 2 === 0 ? [[left, list[index + 1]] as const] : [])
  return (
    <section className="phase-section" id={`fase-${phase.number}`}>
      <div className="phase-head">
        <span className="phase-glyph" aria-hidden="true">{phase.glyph}</span>
        <div>
          <h3>Fase {phase.number}: {phase.name}</h3>
          <p>{phase.description} · {list.length} áreas</p>
        </div>
        <div className="phase-meter">
          <strong>{phasePercent}%</strong>
          <div className="phase-bar" role="progressbar" aria-label={`Progresso da fase ${phase.number}`} aria-valuenow={phasePercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${phasePercent}%` }} /></div>
        </div>
      </div>
      <div className="map-track">
        {rows.map(([left, right]) => (
          <div className="map-row" key={left.id}>
            <div className="map-slot left has-node"><MapNode area={left} view={view} /></div>
            <div className={`map-slot right ${right ? 'has-node' : ''}`}>
              {right && <MapNode area={right} view={view} />}
            </div>
          </div>
        ))}
        <div className="map-end">Checkpoint {phase.number} / {phases.length}</div>
      </div>
    </section>
  )
}

export function RoadmapMap(view: MapView) {
  return <div id="roadmap">{phases.map(phase => <PhaseMap phase={phase} view={view} key={phase.number} />)}</div>
}
