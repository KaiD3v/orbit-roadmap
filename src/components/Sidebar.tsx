import { useEffect, useRef, useState } from 'react'
import { phases } from '../data/roadmap'
import { levelFor, phaseState } from '../domain/progress'
import { useMetrics, useProgress } from '../store/progress'

// Só "concluída" usa glifo; atual e a seguir são desenhados no CSS (.nav-state)
const PHASE_ICON = { done: '✓', current: '', future: '' } as const
const PHASE_LABEL = { done: 'concluída', current: 'fase atual', future: 'a seguir' } as const

export function Sidebar({ resetView }: { resetView: () => void }) {
  const done = useProgress(state => state.done)
  const progress = useMetrics()
  const level = levelFor(progress.percent)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLElement>(null)

  // Menu mobile: fecha com Esc ou clique fora
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  function goToPhase() {
    resetView()
    setOpen(false)
  }

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Navegação" ref={ref}>
      <div className="sidebar-head">
        <a className="brand" href="#inicio">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span>orbit<span className="brand-dot">.</span></span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="sidebar-menu"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      <div className="sidebar-menu" id="sidebar-menu">
        <div className="sidebar-intro">Sua jornada em engenharia de software com IA</div>
        <nav aria-label="Fases do roadmap">
          {phases.map((phase) => {
            const state = phaseState(phase.number, done)
            return (
              <a className={`nav-link is-${state}`} href={`#fase-${phase.number}`} key={phase.name} onClick={goToPhase}>
                <span className="nav-number">{phase.number}</span>
                {phase.name}
                <span className={`nav-state is-${state}`} aria-label={PHASE_LABEL[state]}>{PHASE_ICON[state]}</span>
              </a>
            )
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="level-label">Seu nível <strong>{level}</strong></div>
          <div className="mini-progress" role="progressbar" aria-label="Progresso da trilha essencial" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress.percent}%` }} /></div>
          <p>{progress.requiredDone} de {progress.requiredTotal} tópicos essenciais</p>
        </div>
      </div>
    </aside>
  )
}
