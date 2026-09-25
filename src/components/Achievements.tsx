import { badges, goalsLine } from '../domain/progress'
import { useMetrics } from '../store/progress'
import { SectionHeading } from './SectionHeading'

export function Achievements() {
  const progress = useMetrics()
  const achievements = badges(progress)
  const goal = goalsLine(progress)
  return (
    <section className="achievements" aria-labelledby="achievements-title">
      <SectionHeading id="achievements-title" title="Conquistas">
        {goal ?? 'Você desbloqueou todas. Pequenas vitórias, grande jornada.'}
      </SectionHeading>
      <div className="badge-grid">
        {achievements.map(({ icon, title, description, unlocked }) => (
          <div
            className={`badge ${unlocked ? 'is-unlocked' : 'locked'}`}
            title={description}
            aria-label={`${title}: ${description}, ${unlocked ? 'desbloqueada' : 'bloqueada'}`}
            key={title}
          >
            <span className="badge-icon" aria-hidden="true">{icon}</span>
            <strong>{title}</strong>
            <small>{description}</small>
          </div>
        ))}
      </div>
    </section>
  )
}
