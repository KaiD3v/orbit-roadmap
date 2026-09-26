import { useState } from 'react'
import { normalizeResourceUrl, resourceMeta, resourcesForTopic } from '../domain/resources'
import type { Area, Resource } from '../types/content'
import type { ResourcesRead } from '../types/progress'
import { BookIcon } from './icons/BookIcon'
import { ResourceBody } from './ResourceBody'

type ResourceCardProps = {
  resource: Resource
  resourcesRead: ResourcesRead
  onToggleRead: (url: string) => void
  featured?: boolean
  // L03: o painel da área (`panel`, o padrão) mantém o card de sempre; a Biblioteca (`library`) usa o
  // cartão da constelação — astro no topo, sem "depois, este" (a linha da constelação já mostra a ordem).
  variant?: 'panel' | 'library'
}

// B06: um material, com metadados discretos ("Vídeo · Intermediário · EN · grátis · 40 min"), o
// "porquê" (o que dá para fazer depois) e o controle de "lido". `featured` é só o primeiro da área
// ("Comece por este"); no painel, os demais mostram "depois, este" quando têm `why`.
export function ResourceCard({ resource, resourcesRead, onToggleRead, featured, variant = 'panel' }: ResourceCardProps) {
  const read = Boolean(resourcesRead[normalizeResourceUrl(resource.url)])
  const meta = resourceMeta(resource)

  if (variant === 'library') {
    return (
      <div className={`observatory-card ${read ? 'is-read' : ''} ${featured ? 'is-featured' : ''}`}>
        <span className="observatory-astro">
          <ResourceBody type={resource.type} read={read} featured={featured} size={40} />
        </span>
        {featured && <span className="resource-tag">Comece por este</span>}
        {/* Nome acessível do link = só o título (L05); a etiqueta e os metadados ficam fora dele. */}
        <a className="observatory-card-link" href={resource.url} target="_blank" rel="noopener noreferrer">
          <span className="observatory-card-title">{resource.title}</span>
        </a>
        {resource.why && <p className="resource-why">{resource.why}</p>}
        <div className="observatory-card-foot">
          <small>{meta} ↗</small>
          <button
            type="button"
            className="observatory-read-toggle"
            aria-pressed={read}
            aria-label={read ? `Lido: ${resource.title}` : `Marcar como lido: ${resource.title}`}
            onClick={() => onToggleRead(resource.url)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

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
