import { useState } from 'react'
import { normalizeResourceUrl, resourceMeta, resourcesForTopic } from '../domain/resources'
import type { Area, Resource } from '../types/content'
import type { ResourcesRead } from '../types/progress'

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
// `label` muda a palavra do botão fechado ("Onde estudar" no painel da área, "Onde estudar isto" no
// card de próximo passo); aberto, o botão sempre mostra "Ocultar".
export function TopicResources({ area, topicId, resourcesRead, onToggleRead, label = 'Onde estudar' }: {
  area: Area
  topicId: string
  resourcesRead: ResourcesRead
  onToggleRead: (url: string) => void
  label?: string
}) {
  const resources = resourcesForTopic(area, topicId)
  const [open, setOpen] = useState(false)
  if (!resources.length) return null
  return (
    <div className="topic-resources">
      <button className="text-button topic-resources-toggle" type="button" onClick={() => setOpen(!open)}>
        {open ? 'Ocultar' : label}
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
