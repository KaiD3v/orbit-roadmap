import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { areasByPhase, phases, stepLabel, type Phase } from '../data/roadmap'
import { matchesArea, type Filter } from '../domain/filter'
import { areaState, percent, phaseState, priorityProgress, type AreaState } from '../domain/progress'
import { useProgress } from '../store/progress'
import type { Area } from '../types/content'
import type { Done } from '../types/progress'

type MapView = { query: string, filter: Filter, nextId: number, open: (area: Area) => void }

// Padrão senoidal repetido a cada 8 nós (J05): desvio horizontal em fração da amplitude.
const OFFSETS = [0, 0.5, 0.85, 0.5, 0, -0.5, -0.85, -0.5]
const offsetAt = (index: number) => OFFSETS[index % OFFSETS.length] ?? 0

function NodeGlyph({ area, done, state }: { area: Area, done: Done, state: AreaState }) {
  if (state === 'done') return <span className="node-glyph">✓</span>
  if (state === 'next') return <span className="node-glyph">✦</span>
  if (state === 'progress') {
    const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
    const p = percent(requiredDone, requiredTotal)
    return (
      <span className="node-ring" style={{ '--p': `${p}%` } as CSSProperties}>
        <span className="node-ring-inner" />
      </span>
    )
  }
  return stepLabel(area)
}

function MapNode({ area, view, index }: { area: Area, view: MapView, index: number }) {
  const done = useProgress(state => state.done)
  const state = areaState(area, done, view.nextId)
  const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
  const [deepDone, deepTotal] = priorityProgress(area, done, false)
  const number = stepLabel(area)
  const summary = requiredTotal && deepTotal
    ? `${requiredDone}/${requiredTotal} essenciais · ${deepDone}/${deepTotal} extras`
    : requiredTotal ? `Essencial · ${requiredDone}/${requiredTotal}` : `Para ir além · ${deepDone}/${deepTotal}`
  const matches = matchesArea(area, done, view.query, view.filter)
  const offset = offsetAt(index)
  const side = offset > 0 ? 'label-left' : 'label-right'

  // "Pop" só na transição para concluída (J06); recarregar a página já concluída não anima.
  const [celebrating, setCelebrating] = useState(false)
  const prevState = useRef(state)
  useEffect(() => {
    if (prevState.current !== 'done' && state === 'done') {
      setCelebrating(true)
      const timer = window.setTimeout(() => setCelebrating(false), 600)
      prevState.current = state
      return () => window.clearTimeout(timer)
    }
    prevState.current = state
  }, [state])

  const nodeClassName = ['map-node', `is-${state}`, !requiredTotal && 'is-extension', celebrating && 'is-celebrating']
    .filter(Boolean).join(' ')

  return (
    <div className="map-node-row" style={{ '--x': offset } as CSSProperties} hidden={!matches}>
      <button
        className={nodeClassName}
        type="button"
        id={`area-${area.id}`}
        onClick={() => view.open(area)}
        aria-label={`Abrir etapa ${number}: ${area.title}; ${summary}`}
      >
        <NodeGlyph area={area} done={done} state={state} />
        {state === 'next' && <span className="node-tag">Comece aqui</span>}
      </button>
      <span className={`node-label ${side} is-${state}`} aria-hidden="true">{area.title}</span>
    </div>
  )
}

// Curva suave entre pontos verticalmente empilhados: controles na mesma X dos extremos, no meio do Y.
function buildPath(points: { x: number, y: number }[]) {
  const [first, ...rest] = points
  if (!first) return ''
  let d = `M ${first.x} ${first.y}`
  let prev = first
  for (const p1 of rest) {
    const midY = (prev.y + p1.y) / 2
    d += ` C ${prev.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`
    prev = p1
  }
  return d
}

// Coordenadas em unidades do próprio layout: x em múltiplos de --amp (-1..1) e y em linhas (--row).
// O CSS dimensiona o SVG com as mesmas variáveis dos nós, então o caminho passa pelo centro de cada um.
function MapPath({ list, view, phaseColorDone }: { list: Area[], view: MapView, phaseColorDone: number }) {
  const done = useProgress(state => state.done)
  const visible = list.filter(area => matchesArea(area, done, view.query, view.filter))
  if (visible.length < 2) return null
  const points = visible.map((_, i) => ({ x: offsetAt(i), y: i + 0.5 }))
  const lastDoneIndex = Math.min(phaseColorDone, points.length) - 1
  const solidPoints = lastDoneIndex >= 0 ? points.slice(0, lastDoneIndex + 1) : []
  const dashedPoints = lastDoneIndex >= 0 ? points.slice(lastDoneIndex) : points
  return (
    <svg
      className="map-path"
      viewBox={`-1 0 2 ${points.length}`}
      preserveAspectRatio="none"
      style={{ '--rows': points.length } as CSSProperties}
      aria-hidden="true"
    >
      <path d={buildPath(dashedPoints)} className="map-path-future" fill="none" />
      <path d={buildPath(solidPoints)} className="map-path-done" fill="none" />
    </svg>
  )
}

function PhaseMap({ phase, view }: { phase: Phase, view: MapView }) {
  const done = useProgress(state => state.done)
  const list = areasByPhase.get(phase.number) ?? []
  const state = phaseState(phase.number, done)
  const searching = !!view.query || view.filter !== 'all'
  const phaseMatches = list.filter(area => matchesArea(area, done, view.query, view.filter)).length
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const expanded = searching ? phaseMatches > 0 : (userOpen ?? state === 'current')

  useEffect(() => {
    function checkHash() {
      if (location.hash === `#fase-${phase.number}`) setUserOpen(true)
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [phase.number])

  const headStatus = searching
    ? (phaseMatches > 0 ? `${phaseMatches} ${phaseMatches === 1 ? 'área' : 'áreas'}` : 'sem resultados')
    : state === 'done' ? '✓ Concluída' : state === 'current' ? 'Você está aqui' : `${list.length} áreas`

  // Quantos nós visíveis, a partir do início, já estão concluídos (para colorir o trecho percorrido do caminho).
  const visibleStates = list
    .filter(area => matchesArea(area, done, view.query, view.filter))
    .map(area => areaState(area, done, view.nextId))
  let doneRun = 0
  while (doneRun < visibleStates.length && visibleStates[doneRun] === 'done') doneRun++

  let visibleIndex = -1
  return (
    <section className={`phase-section is-${state} ${expanded ? 'is-expanded' : 'is-collapsed'}`} id={`fase-${phase.number}`}>
      <h3 className="phase-heading">
        <button
          className="phase-head"
          type="button"
          aria-expanded={expanded}
          aria-controls={`fase-${phase.number}-body`}
          onClick={() => setUserOpen(!expanded)}
        >
          <span className="phase-glyph" aria-hidden="true">{phase.glyph}</span>
          <span className="phase-head-copy">
            <span className="phase-name">Fase {phase.number}: {phase.name}</span>
            <span className="phase-desc">{phase.description}</span>
            {/* Constelação da fase: uma estrela por área, acesa quando concluída */}
            <span className="phase-stars" aria-hidden="true">
              {list.map(area => <i className={`is-${areaState(area, done, view.nextId)}`} key={area.id} />)}
            </span>
          </span>
          <span className={`phase-status is-${state}`}>{headStatus}</span>
        </button>
      </h3>
      <div className="map-track" id={`fase-${phase.number}-body`} hidden={!expanded}>
        <MapPath list={list} view={view} phaseColorDone={doneRun} />
        {list.map((area) => {
          const matches = matchesArea(area, done, view.query, view.filter)
          if (matches) visibleIndex++
          return <MapNode area={area} view={view} index={visibleIndex} key={area.id} />
        })}
        <div className="map-end">Fim da fase {phase.number} de {phases.length}</div>
      </div>
    </section>
  )
}

export function RoadmapMap(view: MapView) {
  return <div id="roadmap">{phases.map(phase => <PhaseMap phase={phase} view={view} key={phase.number} />)}</div>
}
