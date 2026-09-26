import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { areas, stepLabel } from '../data/roadmap'
import { goalsLine, levelFor, localDay, nextTopic, priorityProgress, type Feedback } from '../domain/progress'
import { pickReview, reviewElapsedDays, timeAgo } from '../domain/review'
import { useMetrics, useProgress, useToggleTopic, useWeek } from '../store/progress'
import { TopicResources } from './ResourceCard'
import type { Area } from '../types/content'

function useXpPulse(xp: number) {
  const [pulsing, setPulsing] = useState(false)
  const prev = useRef(xp)
  useEffect(() => {
    if (xp > prev.current) {
      setPulsing(true)
      const timer = window.setTimeout(() => setPulsing(false), 500)
      prev.current = xp
      return () => window.clearTimeout(timer)
    }
    prev.current = xp
  }, [xp])
  return pulsing
}

export function NextStep({ notify, open }: {
  notify: (feedback: Feedback) => void
  open: (area: Area, topicId?: string) => void
}) {
  const done = useProgress(state => state.done)
  const days = useProgress(state => state.days)
  const challenges = useProgress(state => state.challenges)
  const doneAt = useProgress(state => state.doneAt)
  const reviews = useProgress(state => state.reviews)
  const notes = useProgress(state => state.notes)
  const resourcesRead = useProgress(state => state.resourcesRead)
  const toggleResourceRead = useProgress(state => state.toggleResourceRead)
  const answerReview = useProgress(state => state.answerReview)
  const progress = useMetrics()
  const week = useWeek()
  const toggle = useToggleTopic(notify)
  const next = nextTopic(done, challenges)
  const xpPulsing = useXpPulse(progress.xp)

  // Revisão espaçada (F03): "de vez em quando, um tópico concluído há semanas volta para relembrar".
  const today = localDay()
  const progressData = { done, days, challenges, doneAt, reviews, notes, resourcesRead }
  const reviewTopic = pickReview(progressData, today)
  const reviewArea = reviewTopic && areas.find(area => area.topics.some(topic => topic.id === reviewTopic.id))
  const reviewNote = reviewTopic && notes[reviewTopic.id]
  // Guarda o id junto: se o tópico em revisão mudar (respondeu e o próximo apareceu), a comparação
  // deixa de bater e a nota fecha sozinha, sem precisar de um efeito para resetar o estado.
  const [openReviewNoteId, setOpenReviewNoteId] = useState<string | null>(null)
  const reviewNoteOpen = reviewTopic != null && openReviewNoteId === reviewTopic.id
  const reviewBlock = reviewTopic && reviewArea && (
    <div className="next-step-review">
      <span className="review-comet" aria-hidden="true" />
      <p>
        Ainda lembra de <strong>{reviewTopic.title}</strong>?{' '}
        <span className="next-step-review-when">
          (concluído {timeAgo(reviewElapsedDays(progressData, reviewTopic.id, today))})
        </span>
      </p>
      {reviewNote && (
        <div className="next-step-review-note">
          <button
            className="text-button"
            type="button"
            onClick={() => setOpenReviewNoteId(reviewNoteOpen ? null : reviewTopic.id)}
          >
            {reviewNoteOpen ? 'Ocultar sua nota' : 'Ver sua nota'}
          </button>
          {reviewNoteOpen && <p className="review-note-text">{reviewNote}</p>}
        </div>
      )}
      <div className="next-step-review-actions">
        <button className="ghost-button" type="button" onClick={() => answerReview(reviewTopic.id, true)}>
          Lembro
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            answerReview(reviewTopic.id, false)
            open(reviewArea, reviewTopic.id)
          }}
        >
          Rever
        </button>
      </div>
    </div>
  )

  const goals = goalsLine(progress)
  const weekLit = Math.min(week.done, week.goal)
  const weekHit = week.done >= week.goal
  const meta = (
    <footer className="next-step-meta">
      <span>Nível <strong>{levelFor(progress.percent)}</strong></span>
      <span><strong className={`xp-value ${xpPulsing ? 'is-pulsing' : ''}`}>{progress.xp}</strong> XP</span>
      <span><strong>{progress.streak}</strong> {progress.streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
      <span className="next-step-week">
        {weekHit
          ? <span><strong>{week.done}</strong> nesta semana</span>
          : <span><strong>{week.done}</strong> de {week.goal} nesta semana</span>}
        {weekHit && <span className="week-hit">· Meta da semana batida</span>}
        <span className="week-dots" aria-hidden="true">
          {Array.from({ length: week.goal }, (_, i) => <i key={i} className={i < weekLit ? 'is-done' : ''} />)}
        </span>
      </span>
      {goals && <span className="next-step-goal">{goals}</span>}
    </footer>
  )

  if (!next) {
    return (
      <section className="next-step" aria-labelledby="next-step-title">
        <div className="next-step-body">
          <h2 className="next-step-title" id="next-step-title">Trilha completa</h2>
          <strong className="next-step-topic">Você percorreu o roadmap inteiro.</strong>
          {reviewBlock}
        </div>
        {meta}
      </section>
    )
  }

  const { area } = next
  const essentials = area.topics.filter(item => item.required)
  const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
  const remaining = requiredTotal - requiredDone
  const footer = next.kind === 'challenge'
    ? 'Essenciais concluídos. Falta o desafio para fechar esta área.'
    : remaining <= 0
      ? 'Só faltam extras nesta área.'
      : remaining === 1
        ? 'Falta 1 tópico essencial para fechar esta área.'
        : `Faltam ${remaining} tópicos essenciais para fechar esta área.`

  return (
    <section className="next-step" aria-labelledby="next-step-title">
      <div className="next-step-body">
        <h2 className="next-step-title" id="next-step-title">Seu próximo passo</h2>
        <p className="next-step-area">{next.kind === 'challenge' ? `Desafio de ${area.title}` : area.title}</p>
        {next.kind === 'challenge'
          ? (
              <>
                <strong className="next-step-topic is-challenge">{next.challenge.title}</strong>
                <div className="next-step-actions">
                  <button className="primary-button" type="button" onClick={() => open(area)}>
                    Ver desafio
                  </button>
                </div>
              </>
            )
          : (
              <>
                <strong className="next-step-topic">{next.topic.title}</strong>
                <div className="next-step-actions">
                  <button className="primary-button" type="button" onClick={() => toggle(next.topic.id)}>
                    ✓ Já estudei
                  </button>
                  <button className="ghost-button" type="button" onClick={() => open(area)}>
                    Ver área
                  </button>
                </div>
                <TopicResources
                  area={area}
                  topicId={next.topic.id}
                  resourcesRead={resourcesRead}
                  onToggleRead={toggleResourceRead}
                  label="Onde estudar isto"
                />
              </>
            )}
        <p className="next-step-footer">{footer}</p>
        {reviewBlock}
      </div>
      {/* Constelação da área: um ponto por essencial, acesos os concluídos, o próximo em destaque */}
      <div className="area-orbit" aria-hidden="true" style={{ '--n': essentials.length } as CSSProperties}>
        {essentials.map((item, index) => (
          <i
            key={item.id}
            className={done[item.id] ? 'is-done' : next.kind === 'topic' && item.id === next.topic.id ? 'is-next' : ''}
            style={{ '--i': index } as CSSProperties}
          />
        ))}
        <span className="area-orbit-core">{stepLabel(area)}</span>
      </div>
      {meta}
    </section>
  )
}
