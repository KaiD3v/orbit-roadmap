import { useEffect, useRef } from 'react'
import { displayNumber, type Area } from '../data/roadmap'
import { countDone, PHASE_XP, TOPIC_XP, type Done } from '../domain/progress'

function TopicGroup({ area, done, required, toggle }: {
  area: Area; done: Done; required: boolean; toggle: (key: string) => void
}) {
  const topics = area.topics.filter(topic => topic.required === required)
  if (!topics.length) return null
  const completed = topics.filter(topic => done[topic.id]).length
  return <section className={`topic-section ${required ? 'required' : 'deepening'}`}>
    <div className="topic-section-head"><h3>{required ? 'Obrigatório' : 'Aprofundamento'}</h3><span>{completed}/{topics.length}</span></div>
    <p>{required ? 'Base para construir, avaliar e operar uma aplicação funcional.' : 'Alternativas, detalhes internos e especializações para estudar depois.'}</p>
    <div className="topic-grid">{topics.map(topic => {
      const key = topic.id
      return <label className={`topic ${done[key] ? 'checked' : ''}`} key={key}>
        <input type="checkbox" checked={Boolean(done[key])} onChange={() => toggle(key)} />
        <span>{topic.title}</span>
      </label>
    })}</div>
  </section>
}

export function AreaDialog({ area, done, toggle, close }: {
  area: Area | null; done: Done; toggle: (key: string) => void; close: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (area && dialog && !dialog.open) dialog.showModal()
    if (!area && dialog?.open) dialog.close()
  }, [area])
  const completed = area ? countDone(area, done) : 0
  const percent = area?.topics.length ? Math.round(completed / area.topics.length * 100) : 0
  return <dialog id="detail-dialog" ref={ref} aria-labelledby="detail-title" onClose={close}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    {area && <>
      <div className="detail-top">
        <button className="detail-close" type="button" aria-label="Fechar detalhes" onClick={close}>×</button>
        <span className="detail-phase">Fase {area.phase} · Etapa {String(displayNumber.get(area.id)).padStart(2, '0')}</span>
        <h2 id="detail-title">{area.title}</h2><p>{area.description}</p>
        <div className="detail-progress"><div className="phase-bar" role="progressbar" aria-label={`Progresso em ${area.title}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong></div>
      </div>
      <div className="detail-main">
        <TopicGroup area={area} done={done} required toggle={toggle} />
        <TopicGroup area={area} done={done} required={false} toggle={toggle} />
        <div className="area-subtitle">Materiais para esta área</div>
        <div className="resource-grid">{area.resources.map(resource => <a className="resource" href={resource.url} target="_blank" rel="noopener noreferrer" key={`${resource.type}-${resource.url}`}>
          <small>{resource.type} ↗</small><span>{resource.title}</span>
        </a>)}</div>
        <p className="detail-note">Seu progresso é salvo automaticamente neste navegador. Um tópico vale {TOPIC_XP} XP; completar uma fase rende mais {PHASE_XP} XP.</p>
      </div>
    </>}
  </dialog>
}
