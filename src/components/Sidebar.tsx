import { phases } from '../data/roadmap'
import { levelFor, metrics, phaseProgress, type Done } from '../domain/progress'

export function Sidebar({ done, progress, resetView }: { done: Done; progress: ReturnType<typeof metrics>; resetView: () => void }) {
  const level = levelFor(progress.percent)
  return <aside className="sidebar" aria-label="Navegação">
    <a className="brand" href="#inicio"><span className="brand-mark" aria-hidden="true">✳</span><span>orbit<span className="brand-dot">.</span></span></a>
    <div className="sidebar-intro">Sua jornada em engenharia de software com IA</div>
    <nav aria-label="Fases do roadmap">{phases.map(([name], index) => {
      const [completed, total] = phaseProgress(index + 1, done)
      return <a className="nav-link" href={`#fase-${index + 1}`} key={name} onClick={resetView}>
        <span className="nav-number">{index + 1}</span>{name}<span>{total ? Math.round(completed / total * 100) : 0}%</span>
      </a>
    })}</nav>
    <div className="sidebar-bottom">
      <div className="level-label">Seu nível <strong>{level}</strong></div>
      <div className="mini-progress" role="progressbar" aria-label="Progresso da trilha obrigatória" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress.percent}%` }} /></div>
      <p>{progress.requiredDone} de {progress.requiredTotal} obrigatórios concluídos</p>
    </div>
  </aside>
}
