import { useState } from 'react'
import { normalizeResourceUrl, resourceMeta, resourcesForTopic } from '../domain/resources'
import type { Area, Resource } from '../types/content'
import type { ResourcesRead } from '../types/progress'

// Livro aberto: pílula de "Onde estudar" (aqui e na Biblioteca da sidebar, mesmo ícone).
export function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2Z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7Z" />
    </svg>
  )
}

// B06: um material, com metadados discretos ("Vídeo · Intermediário · EN · grátis · 40 min"), o
// "porquê" (o que dá para fazer depois) e o controle de "lido". `featured` é só o primeiro da área
// ("Comece por este"); os demais mostram "depois, este" quando têm `why` (sequência sem numeração).
export function ResourceCard({ resource, resourcesRead, onToggleRead, featured }: {
  resource: Resource
  resourcesRead: ResourcesRead
  onToggleRead: (url: string) => void
  featured?: boolean
}) {
  const read = Boolean(resourcesRead[normalizeResourceUrl(resource.url)])
  const meta = resourceMeta(resource)
  return (
    <div className={`resource ${featured ? 'resource-featured' : 'resource-compact'} ${read ? 'is-read' : ''}`}>
      <a className="resource-link" href={resource.url} target="_blank" rel="noopener noreferrer">
        {featured
          ? <span className="resource-tag">Comece por este</span>
          : resource.why && <span className="resource-tag resource-tag-next">depois, este</span>}
        <small>{meta} ↗</small>
        <span>{resource.title}</span>
      </a>
      {resource.why && <p className="resource-why">{resource.why}</p>}
      <button
        type="button"
        className="text-button resource-read-toggle"
        aria-pressed={read}
        onClick={() => onToggleRead(resource.url)}
      >
        {read ? <><span className="note-dot" aria-hidden="true" />Lido</> : 'Marcar como lido'}
      </button>
    </div>
  )
}

// Materiais ligados a um tópico específico (campo `topics` do Resource), atrás de um link discreto.
export function TopicResources({ area, topicId, resourcesRead, onToggleRead }: {
  area: Area
  topicId: string
  resourcesRead: ResourcesRead
  onToggleRead: (url: string) => void
}) {
  const resources = resourcesForTopic(area, topicId)
  const [open, setOpen] = useState(false)
  if (!resources.length) return null
  return (
    <div className={`topic-resources ${open ? 'is-open' : ''}`}>
      <button className="topic-resources-toggle" type="button" onClick={() => setOpen(!open)}>
        <BookIcon />{open ? 'Ocultar' : 'Onde estudar'}
      </button>
      {open && (
        <div className="resource-list">
          {resources.map(resource => (
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
