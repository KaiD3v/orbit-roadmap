import { badges } from '../domain/progress'
import { useMetrics } from '../store/progress'
import { SectionHeading } from './SectionHeading'

export function Achievements() {
  const achievements = badges(useMetrics())
  return (
    <section className="achievements" aria-labelledby="achievements-title">
      <SectionHeading id="achievements-title" label="Conquistas" title="Pequenas vitórias, grande jornada" />
      <div className="badge-grid">
        {achievements.map(({ icon, title, description, unlocked }) => (
          <div className={`badge ${unlocked ? '' : 'locked'}`} aria-label={`${title}: ${unlocked ? 'desbloqueada' : 'bloqueada'}`} key={title}>
            <div className="badge-icon">{icon}</div>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
