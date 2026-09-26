import { badges, goalsLine, localDay } from '../domain/progress'
import { badgeCard, journeyCard, type ShareCardData } from '../domain/shareCard'
import { useMetrics, useProgress } from '../store/progress'
import { SectionHeading } from './ui/SectionHeading'

export function Achievements({ openShare }: { openShare: (data: ShareCardData) => void }) {
  const done = useProgress(state => state.done)
  const challenges = useProgress(state => state.challenges)
  const progress = useMetrics()
  const achievements = badges(progress)
  const goal = goalsLine(progress)
  return (
    <section className="achievements" aria-labelledby="achievements-title">
      <SectionHeading id="achievements-title" title="Conquistas">
        {goal ?? 'Você desbloqueou todas. Pequenas vitórias, grande jornada.'}
      </SectionHeading>
      <div className="badge-grid">
        {achievements.map(badge => (
          <div
            className={`badge ${badge.unlocked ? 'is-unlocked' : 'locked'}`}
            title={badge.description}
            aria-label={`${badge.title}: ${badge.description}, ${badge.unlocked ? 'desbloqueada' : 'bloqueada'}`}
            key={badge.title}
          >
            <span className="badge-icon" aria-hidden="true">{badge.icon}</span>
            <strong>{badge.title}</strong>
            <small>{badge.description}</small>
            {badge.unlocked && (
              <button
                className="text-button badge-share"
                type="button"
                onClick={() => openShare(badgeCard(badge, progress, localDay()))}
              >
                Compartilhar
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className="ghost-button journey-share"
        type="button"
        onClick={() => openShare(journeyCard(done, challenges, localDay()))}
      >
        Compartilhar minha trilha até aqui
      </button>
    </section>
  )
}
