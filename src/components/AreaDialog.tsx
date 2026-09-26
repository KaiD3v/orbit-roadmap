import { useEffect, useRef, useState } from 'react'
import { stepLabel } from '../data/roadmap'
import { NOTE_MAX } from '../domain/backup'
import {
  CHALLENGE_XP, countDone, isChallengeUnlocked, percent, PHASE_XP, priorityProgress, TOPIC_XP, type Feedback,
} from '../domain/progress'
import { useProgress, useToggleChallenge, useToggleTopic } from '../store/progress'
import { ResourceCard, TopicResources } from './ResourceCard'
import type { Area, Resource } from '../types/content'
import type { Challenges, Done, Notes, ResourcesRead } from '../types/progress'

// B03: nota curta por tópico. Um tópico com nota aberta por vez (controlado pelo pai, `AreaDialog`),
// fora do `<label>` do checkbox para não competir com ele. Esc fecha a nota, não o `<dialog>`.
type NoteProps = {
  topicId: string
  notes: Notes
  setNote: (topicId: string, text: string) => void
  openNoteId: string | null
  onOpenNote: (topicId: string) => void
  onCloseNote: () => void
}

// Editor separado: montado só quando a nota abre, então o rascunho sempre nasce do texto salvo mais
// recente, sem precisar sincronizar via efeito (o próprio mount/unmount faz esse trabalho).
function TopicNoteEditor({ topicId, note, setNote, onClose }: {
  topicId: string
  note: string | undefined
  setNote: (topicId: string, text: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(note ?? '')
  const save = () => setNote(topicId, draft)
  const finish = () => {
    save()
    onClose()
  }
  return (
    <div className="topic-note-open">
      <textarea
        className="topic-note-textarea"
        value={draft}
        maxLength={NOTE_MAX}
        placeholder="O que você aprendeu ou um link que ajudou"
        autoFocus
        onChange={event => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            finish()
          } else if (event.key === 'Enter' && event.ctrlKey) {
            event.preventDefault()
            finish()
          }
        }}
      />
      <div className="topic-note-footer">
        <span>{draft.length}/{NOTE_MAX}</span>
        <button className="text-button" type="button" onClick={finish}>Pronto</button>
      </div>
    </div>
  )
}

function TopicNote({ topicId, notes, setNote, openNoteId, onOpenNote, onCloseNote }: NoteProps) {
  const note = notes[topicId]
  if (openNoteId !== topicId) {
    return (
      <button className="text-button topic-note-toggle" type="button" onClick={() => onOpenNote(topicId)}>
        {note ? <><span className="note-dot" aria-hidden="true" />Ver nota</> : 'Anotar'}
      </button>
    )
  }
  return <TopicNoteEditor topicId={topicId} note={note} setNote={setNote} onClose={onCloseNote} />
}

function EssentialSteps({ area, done, toggle, highlightTopicId, noteProps, resourcesRead, onToggleRead }: {
  area: Area
  done: Done
  toggle: (key: string) => void
  highlightTopicId?: string | null
  noteProps: Omit<NoteProps, 'topicId'>
  resourcesRead: ResourcesRead
  onToggleRead: (url: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const essentials = area.topics.filter(topic => topic.required)
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const completed = essentials.filter(topic => done[topic.id])
  // "Rever" (F03) pode apontar para um tópico já concluído, escondido dentro do <details> recolhido: abre-o.
  const highlightIsCompleted = highlightTopicId != null && completed.some(topic => topic.id === highlightTopicId)
  useEffect(() => {
    if (highlightIsCompleted && detailsRef.current) detailsRef.current.open = true
  }, [highlightIsCompleted])
  if (!essentials.length) return null
  const pending = essentials.filter(topic => !done[topic.id])
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
                  <label className="topic" id={`topic-${topic.id}`}>
                    <input type="checkbox" checked={Boolean(done[topic.id])} onChange={() => toggle(topic.id)} />
                    <span>
                      {index === 0 && <span className="step-tag">Próximo</span>}
                      <span className="step-title">{topic.title}</span>
                    </span>
                  </label>
                  <TopicNote topicId={topic.id} {...noteProps} />
                  <TopicResources
                    area={area}
                    topicId={topic.id}
                    resourcesRead={resourcesRead}
                    onToggleRead={onToggleRead}
                  />
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
        <details className="steps-done" ref={detailsRef}>
          <summary>✓ {completed.length} feitos</summary>
          <div className="topic-grid">
            {completed.map(topic => (
              <div className={`topic-entry ${noteProps.openNoteId === topic.id ? 'note-open' : ''}`} key={topic.id}>
                <label className="topic checked" id={`topic-${topic.id}`}>
                  <input type="checkbox" checked onChange={() => toggle(topic.id)} />
                  <span>{topic.title}</span>
                </label>
                <TopicNote topicId={topic.id} {...noteProps} />
                <TopicResources
                  area={area}
                  topicId={topic.id}
                  resourcesRead={resourcesRead}
                  onToggleRead={onToggleRead}
                />
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function ChallengeSection({ area, done, challenges, toggleChallenge }: {
  area: Area
  done: Done
  challenges: Challenges
  toggleChallenge: (areaId: string) => void
}) {
  if (!area.challenge) return null
  const areaKey = String(area.id)
  const completed = Boolean(challenges[areaKey])
  const unlocked = completed || isChallengeUnlocked(area, done)
  return (
    <section className={`topic-section challenge-section ${completed ? 'is-done' : ''}`}>
      <div className="topic-section-head">
        <h3>Construa isto</h3>
        {completed && <span>Concluído</span>}
      </div>
      <p className="challenge-title">{area.challenge.title}</p>
      <p className="challenge-brief">{area.challenge.brief}</p>
      <ul className="challenge-criteria">
        {area.challenge.done.map(item => <li key={item}>{item}</li>)}
      </ul>
      {!unlocked && <p className="challenge-locked">Libera quando você concluir os essenciais</p>}
      <button
        className={`ghost-button challenge-toggle ${completed ? 'is-done' : ''}`}
        type="button"
        onClick={() => toggleChallenge(areaKey)}
      >
        {completed ? `✓ Desafio concluído · +${CHALLENGE_XP} XP` : 'Concluí o desafio'}
      </button>
    </section>
  )
}

function ExtrasGroup({ area, done, toggle, noteProps, resourcesRead, onToggleRead }: {
  area: Area
  done: Done
  toggle: (key: string) => void
  noteProps: Omit<NoteProps, 'topicId'>
  resourcesRead: ResourcesRead
  onToggleRead: (url: string) => void
}) {
  const extras = area.topics.filter(topic => !topic.required)
  if (!extras.length) return null
  const completed = extras.filter(topic => done[topic.id]).length
  return (
    <details className="topic-section deepening extras-group">
      <summary>Para ir além · {extras.length} tópicos{completed > 0 && ` (${completed} feitos)`}</summary>
      <p>Alternativas, detalhes internos e especializações, para quando a base estiver firme.</p>
      <div className="topic-grid">
        {extras.map(topic => (
          <div className={`topic-entry ${noteProps.openNoteId === topic.id ? 'note-open' : ''}`} key={topic.id}>
            <label className={`topic ${done[topic.id] ? 'checked' : ''}`}>
              <input type="checkbox" checked={Boolean(done[topic.id])} onChange={() => toggle(topic.id)} />
              <span>{topic.title}</span>
            </label>
            <TopicNote topicId={topic.id} {...noteProps} />
            <TopicResources
              area={area}
              topicId={topic.id}
              resourcesRead={resourcesRead}
              onToggleRead={onToggleRead}
            />
          </div>
        ))}
      </div>
    </details>
  )
}

function ResourceHighlight({ resources, resourcesRead, onToggleRead }: {
  resources: Resource[]
  resourcesRead: ResourcesRead
  onToggleRead: (url: string) => void
}) {
  const [first, ...rest] = resources
  if (!first) return null
  return (
    <div className="resource-highlight">
      <ResourceCard resource={first} resourcesRead={resourcesRead} onToggleRead={onToggleRead} featured />
      {rest.length > 0 && (
        <div className="resource-list">
          {rest.map(resource => (
            <ResourceCard
              resource={resource}
              resourcesRead={resourcesRead}
              onToggleRead={onToggleRead}
              key={resource.url}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function AreaDialog({ area, notify, close, highlightTopicId }: {
  area: Area | null
  notify: (feedback: Feedback) => void
  close: () => void
  highlightTopicId?: string | null
}) {
  const done = useProgress(state => state.done)
  const challenges = useProgress(state => state.challenges)
  const notes = useProgress(state => state.notes)
  const setNote = useProgress(state => state.setNote)
  const resourcesRead = useProgress(state => state.resourcesRead)
  const toggleResourceRead = useProgress(state => state.toggleResourceRead)
  const toggle = useToggleTopic(notify)
  const toggleChallenge = useToggleChallenge(notify)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (area && dialog && !dialog.open) dialog.showModal()
    if (!area && dialog?.open) dialog.close()
  }, [area])

  // B03: só uma nota aberta por vez. Guarda a área junto para que trocar de área feche a nota sem precisar
  // de um efeito: se a área mudou, o `topicId` guardado não é mais "desta área" e some sozinho no próximo render.
  const [openNote, setOpenNote] = useState<{ areaId: number, topicId: string } | null>(null)
  const openNoteId = openNote && openNote.areaId === area?.id ? openNote.topicId : null
  const noteProps: Omit<NoteProps, 'topicId'> = {
    notes,
    setNote,
    openNoteId,
    onOpenNote: topicId => area && setOpenNote({ areaId: area.id, topicId }),
    onCloseNote: () => setOpenNote(null),
  }

  // Revisão espaçada (F03): "Rever" abre o painel já rolado até o tópico, com um destaque breve (2s).
  useEffect(() => {
    if (!area || !highlightTopicId) return
    const target = document.getElementById(`topic-${highlightTopicId}`)
    if (!target) return
    target.scrollIntoView({ block: 'center' })
    target.classList.add('is-highlighted')
    const timer = window.setTimeout(() => target.classList.remove('is-highlighted'), 2000)
    return () => window.clearTimeout(timer)
  }, [area, highlightTopicId])

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
            <EssentialSteps
              area={area}
              done={done}
              toggle={toggle}
              highlightTopicId={highlightTopicId}
              noteProps={noteProps}
              resourcesRead={resourcesRead}
              onToggleRead={toggleResourceRead}
              key={area.id}
            />
            <ChallengeSection area={area} done={done} challenges={challenges} toggleChallenge={toggleChallenge} />
            <ExtrasGroup
              area={area}
              done={done}
              toggle={toggle}
              noteProps={noteProps}
              resourcesRead={resourcesRead}
              onToggleRead={toggleResourceRead}
            />
            <h3 className="area-subtitle">Para estudar</h3>
            <ResourceHighlight
              resources={area.resources}
              resourcesRead={resourcesRead}
              onToggleRead={toggleResourceRead}
            />
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
