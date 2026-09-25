import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { stepLabel } from '../data/roadmap'
import { goalsLine, levelFor, nextTopic, priorityProgress, type Feedback } from '../domain/progress'
import { useMetrics, useProgress, useToggleTopic } from '../store/progress'
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
  open: (area: Area) => void
}) {
  const done = useProgress(state => state.done)
  const challenges = useProgress(state => state.challenges)
  const progress = useMetrics()
  const toggle = useToggleTopic(notify)
  const next = nextTopic(done, challenges)
  const xpPulsing = useXpPulse(progress.xp)

  const goals = goalsLine(progress)
  const meta = (
    <footer className="next-step-meta">
      <span>Nível <strong>{levelFor(progress.percent)}</strong></span>
      <span><strong className={`xp-value ${xpPulsing ? 'is-pulsing' : ''}`}>{progress.xp}</strong> XP</span>
      <span><strong>{progress.streak}</strong> {progress.streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
      {goals && <span className="next-step-goal">{goals}</span>}
    </footer>
  )

  if (!next) {
    return (
      <section className="next-step" aria-labelledby="next-step-title">
        <div className="next-step-body">
          <h2 className="next-step-title" id="next-step-title">Trilha completa</h2>
          <strong className="next-step-topic">Você percorreu o roadmap inteiro.</strong>
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
              </>
            )}
        <p className="next-step-footer">{footer}</p>
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
