import { useEffect, useRef, useState } from 'react'
import { stepLabel } from '../data/roadmap'
import { countDone, percent, PHASE_XP, priorityProgress, TOPIC_XP, type Feedback } from '../domain/progress'
import { useProgress, useToggleTopic } from '../store/progress'
import type { Area, Resource } from '../types/content'
import type { Done } from '../types/progress'

function EssentialSteps({ area, done, toggle }: { area: Area, done: Done, toggle: (key: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const essentials = area.topics.filter(topic => topic.required)
  if (!essentials.length) return null
  const pending = essentials.filter(topic => !done[topic.id])
  const completed = essentials.filter(topic => done[topic.id])
  const visible = expanded ? pending : pending.slice(0, 3)
  const hiddenCount = pending.length - visible.length

  return (
    <section className="topic-section required">
      <div className="topic-section-head">
        <h3>Essencial</h3>
        <span>{completed.length}/{essentials.length}</span>
      </div>
      <p>O mínimo para construir, testar e colocar uma aplicação no ar.</p>
      {pending.length === 0
        ? <p className="essentials-done">✓ Base concluída! Os extras abaixo são opcionais.</p>
        : (
            <ol className="essential-steps">
              {visible.map((topic, index) => (
                <li className={index === 0 ? 'is-next' : ''} key={topic.id}>
                  <label className="topic">
                    <input type="checkbox" checked={Boolean(done[topic.id])} onChange={() => toggle(topic.id)} />
                    <span>
                      {index === 0 && <span className="step-tag">Próximo</span>}
                      <span className="step-title">{topic.title}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          )}
      {hiddenCount > 0 && (
        <button className="text-button steps-more" type="button" onClick={() => setExpanded(true)}>
          +{hiddenCount} depois
        </button>
      )}
      {completed.length > 0 && (
        <details className="steps-done">
          <summary>✓ {completed.length} feitos</summary>
          <div className="topic-grid">
            {completed.map(topic => (
              <label className="topic checked" key={topic.id}>
                <input type="checkbox" checked onChange={() => toggle(topic.id)} />
                <span>{topic.title}</span>
              </label>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function ExtrasGroup({ area, done, toggle }: { area: Area, done: Done, toggle: (key: string) => void }) {
  const extras = area.topics.filter(topic => !topic.required)
  if (!extras.length) return null
  const completed = extras.filter(topic => done[topic.id]).length
  return (
    <details className="topic-section deepening extras-group">
      <summary>Para ir além · {extras.length} tópicos{completed > 0 && ` (${completed} feitos)`}</summary>
      <p>Alternativas, detalhes internos e especializações, para quando a base estiver firme.</p>
      <div className="topic-grid">
        {extras.map(topic => (
          <label className={`topic ${done[topic.id] ? 'checked' : ''}`} key={topic.id}>
            <input type="checkbox" checked={Boolean(done[topic.id])} onChange={() => toggle(topic.id)} />
            <span>{topic.title}</span>
          </label>
        ))}
      </div>
    </details>
  )
}

function ResourceHighlight({ resources }: { resources: Resource[] }) {
  const [first, ...rest] = resources
  if (!first) return null
  return (
    <div className="resource-highlight">
      <a className="resource resource-featured" href={first.url} target="_blank" rel="noopener noreferrer">
        <span className="resource-tag">Comece por este</span>
        <small>{first.type} ↗</small>
        <span>{first.title}</span>
      </a>
      {rest.length > 0 && (
        <div className="resource-list">
          {rest.map(resource => (
            <a className="resource resource-compact" href={resource.url} target="_blank" rel="noopener noreferrer" key={`${resource.type}-${resource.url}`}>
              <small>{resource.type} ↗</small>
              <span>{resource.title}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export function AreaDialog({ area, notify, close }: {
  area: Area | null
  notify: (feedback: Feedback) => void
  close: () => void
}) {
  const done = useProgress(state => state.done)
  const toggle = useToggleTopic(notify)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (area && dialog && !dialog.open) dialog.showModal()
    if (!area && dialog?.open) dialog.close()
  }, [area])

  const [requiredDone, requiredTotal] = area ? priorityProgress(area, done, true) : [0, 0]
  const useExtras = requiredTotal === 0
  const barDone = useExtras ? (area ? countDone(area, done) : 0) : requiredDone
  const barTotal = useExtras ? (area?.topics.length ?? 0) : requiredTotal
  const barPercent = percent(barDone, barTotal)
  return (
    <dialog
      id="detail-dialog"
      ref={ref}
      aria-labelledby="detail-title"
      onClose={close}
      onClick={(event) => { if (event.target === event.currentTarget) close() }}
    >
      {area && (
        <>
          <div className="detail-top">
            <button className="detail-close" type="button" aria-label="Fechar detalhes" onClick={close}>×</button>
            <span className="detail-phase">Fase {area.phase} · Etapa {stepLabel(area)}</span>
            <h2 id="detail-title">{area.title}</h2>
            <p>{area.description}</p>
            <div className="detail-progress">
              <div className="phase-bar" role="progressbar" aria-label={`Progresso em ${area.title}`} aria-valuenow={barPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${barPercent}%` }} /></div>
              <strong>{barDone} de {barTotal} {useExtras ? 'extras' : 'essenciais'}</strong>
            </div>
          </div>
          <div className="detail-main">
            {/* key={area.id}: recolhe o "+N depois" ao trocar de área, sem efeito extra */}
            <EssentialSteps area={area} done={done} toggle={toggle} key={area.id} />
            <ExtrasGroup area={area} done={done} toggle={toggle} />
            <h3 className="area-subtitle">Para estudar</h3>
            <ResourceHighlight resources={area.resources} />
            <p className="detail-note">
              Cada tópico vale {TOPIC_XP} XP, e fechar uma fase rende mais {PHASE_XP}. Tudo fica salvo neste
              navegador.
            </p>
          </div>
        </>
      )}
    </dialog>
  )
}
