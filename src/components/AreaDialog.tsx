import { useEffect, useRef } from 'react'
import { stepLabel } from '../data/roadmap'
import { countDone, percent, PHASE_XP, toggleMessage, TOPIC_XP } from '../domain/progress'
import { useProgress } from '../store/progress'
import type { Area } from '../types/content'

function TopicGroup({ area, required, toggle }: {
  area: Area
  required: boolean
  toggle: (key: string) => void
}) {
  const done = useProgress(state => state.done)
  const topics = area.topics.filter(topic => topic.required === required)
  if (!topics.length) return null
  const completed = topics.filter(topic => done[topic.id]).length
  return (
    <section className={`topic-section ${required ? 'required' : 'deepening'}`}>
      <div className="topic-section-head">
        <h3>{required ? 'Obrigatório' : 'Aprofundamento'}</h3>
        <span>{completed}/{topics.length}</span>
      </div>
      <p>{required ? 'Base para construir, avaliar e operar uma aplicação funcional.' : 'Alternativas, detalhes internos e especializações para estudar depois.'}</p>
      <div className="topic-grid">
        {topics.map((topic) => {
          const key = topic.id
          return (
            <label className={`topic ${done[key] ? 'checked' : ''}`} key={key}>
              <input type="checkbox" checked={Boolean(done[key])} onChange={() => toggle(key)} />
              <span>{topic.title}</span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

export function AreaDialog({ area, notify, close }: {
  area: Area | null
  notify: (message: string) => void
  close: () => void
}) {
  const done = useProgress(state => state.done)
  const toggleTopic = useProgress(state => state.toggleTopic)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (area && dialog && !dialog.open) dialog.showModal()
    if (!area && dialog?.open) dialog.close()
  }, [area])

  function toggle(key: string) {
    notify(toggleMessage(done, key))
    toggleTopic(key)
  }
  const completed = area ? countDone(area, done) : 0
  const areaPercent = percent(completed, area?.topics.length ?? 0)
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
              <div className="phase-bar" role="progressbar" aria-label={`Progresso em ${area.title}`} aria-valuenow={areaPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${areaPercent}%` }} /></div>
              <strong>{areaPercent}%</strong>
            </div>
          </div>
          <div className="detail-main">
            <TopicGroup area={area} required toggle={toggle} />
            <TopicGroup area={area} required={false} toggle={toggle} />
            <div className="area-subtitle">Materiais para esta área</div>
            <div className="resource-grid">
              {area.resources.map(resource => (
                <a className="resource" href={resource.url} target="_blank" rel="noopener noreferrer" key={`${resource.type}-${resource.url}`}>
                  <small>{resource.type} ↗</small>
                  <span>{resource.title}</span>
                </a>
              ))}
            </div>
            <p className="detail-note">
              Seu progresso é salvo automaticamente neste navegador.
              Um tópico vale {TOPIC_XP} XP; completar uma fase rende mais {PHASE_XP} XP.
            </p>
          </div>
        </>
      )}
    </dialog>
  )
}
