import { badges } from '../domain/progress'
import { useMetrics } from '../store/progress'

export function StatsBar() {
  const progress = useMetrics()
  const achievements = badges(progress)
  return (
    <section className="stats" aria-label="Resumo do progresso">
      <div className="stat">
        <span className="stat-icon purple">✦</span>
        <div>
          <strong>{progress.completed}</strong>
          <span>tópicos concluídos</span>
        </div>
      </div>
      <div className="stat">
        <span className="stat-icon cyan">◈</span>
        <div>
          <strong>{progress.xp} XP</strong>
          <span>experiência acumulada</span>
        </div>
      </div>
      <div className="stat">
        <span className="stat-icon coral">◷</span>
        <div>
          <strong>{progress.streak} {progress.streak === 1 ? 'dia' : 'dias'}</strong>
          <span>sequência de estudo</span>
        </div>
      </div>
      <div className="stat">
        <span className="stat-icon yellow">⌁</span>
        <div>
          <strong>{achievements.filter(badge => badge.unlocked).length} / {achievements.length}</strong>
          <span>conquistas desbloqueadas</span>
        </div>
      </div>
    </section>
  )
}
