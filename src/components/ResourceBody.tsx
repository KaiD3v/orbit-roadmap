import type { ResourceType } from '../types/content'

const SLUG: Record<ResourceType, string> = {
  Livro: 'book',
  Curso: 'course',
  Vídeo: 'comet',
  Material: 'spark',
}

// L02: o astro de cada material, pelo tipo — planeta com anel (Livro), estrela parada numa órbita
// pontilhada (Curso), cometa (Vídeo) ou estrela de quatro pontas (Material). As cores vêm do CSS
// (currentColor + `--phase-color`/`--cyan`), nunca fixas no SVG: não lido usa a cor da fase, lido
// acende em ciano (library.css). `featured` acrescenta o halo do primeiro material da constelação.
export function ResourceBody({ type, read, featured, size = 44 }: {
  type: ResourceType
  read: boolean
  featured?: boolean
  size?: number
}) {
  const className = [
    'resource-body',
    `resource-body-${SLUG[type]}`,
    read ? 'is-read' : 'is-unread',
    featured ? 'is-featured' : '',
  ].filter(Boolean).join(' ')
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        {type === 'Livro' && (
          <g transform="rotate(-18 24 24)">
            <path className="body-ring body-ring-back" d="M8 24 A16 7 0 0 1 40 24" />
            <circle className="body-core" cx="24" cy="24" r="10" />
            <path className="body-ring body-ring-front" d="M8 24 A16 7 0 0 0 40 24" />
          </g>
        )}
        {type === 'Curso' && (
          <g>
            <circle className="body-orbit" cx="24" cy="24" r="15" />
            <circle className="body-orbit-point" cx="24" cy="9" r="2.4" />
            <circle className="body-core" cx="24" cy="24" r="5" />
          </g>
        )}
        {type === 'Vídeo' && (
          // Núcleo no centro do quadro (24,24), como os outros astros: é ele que fica sobre a linha
          <g transform="translate(-6 -6)">
            <path className="body-tail body-tail-far" d="M33 27 L27 33 L6 10 Z" />
            <path className="body-tail body-tail-near" d="M33 27 L27 33 L16 21 Z" />
            <circle className="body-core" cx="30" cy="30" r="5" />
          </g>
        )}
        {type === 'Material' && (
          <g>
            <path className="body-core" d="M24 6 L30 18 L42 24 L30 30 L24 42 L18 30 L6 24 L18 18 Z" />
            <circle className="body-spark" cx="24" cy="24" r="2" />
          </g>
        )}
      </svg>
    </span>
  )
}
