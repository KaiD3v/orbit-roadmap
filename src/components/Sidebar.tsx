import { phases } from '../data/roadmap'
import { levelFor, percent, phaseProgress } from '../domain/progress'
import { useMetrics, useProgress } from '../store/progress'

export function Sidebar({ resetView }: { resetView: () => void }) {
  const done = useProgress(state => state.done)
  const progress = useMetrics()
  const level = levelFor(progress.percent)
  return (
    <aside className="sidebar" aria-label="Navegação">
      <a className="brand" href="#inicio">
        <span className="brand-mark" aria-hidden="true">✳</span>
        <span>orbit<span className="brand-dot">.</span></span>
      </a>
      <div className="sidebar-intro">Sua jornada em engenharia de software com IA</div>
      <nav aria-label="Fases do roadmap">
        {phases.map((phase) => {
          const [completed, total] = phaseProgress(phase.number, done)
          return (
            <a className="nav-link" href={`#fase-${phase.number}`} key={phase.name} onClick={resetView}>
              <span className="nav-number">{phase.number}</span>
              {phase.name}
              <span>{percent(completed, total)}%</span>
            </a>
          )
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="level-label">Seu nível <strong>{level}</strong></div>
        <div className="mini-progress" role="progressbar" aria-label="Progresso da trilha obrigatória" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress.percent}%` }} /></div>
        <p>{progress.requiredDone} de {progress.requiredTotal} obrigatórios concluídos</p>
      </div>
    </aside>
  )
}
