type Point = [number, number]
type Link = [number, number]
type Figure = {
  key: string
  name: string
  x: number
  y: number
  points: Point[]
  links: Link[]
  extra?: boolean
  lamp?: boolean
}

// L01: quatro constelações-figura de estudo, à mão, como nas cartas celestes antigas — pontos e
// ligações geradas com `map`, sem biblioteca. Coordenadas locais à figura; `x`/`y` posicionam cada
// uma num canto do viewBox 1440×900. `extra` esconde Pena/Óculos abaixo de 820px; `lamp` some
// também abaixo de 580px (só a grade + Livro Aberto sobrevivem, por L01).
const FIGURES: Figure[] = [
  {
    key: 'book',
    name: 'Livro Aberto',
    x: 1230,
    y: 130,
    points: [[-42, -18], [-16, 12], [0, 34], [16, 12], [42, -18]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    key: 'lamp',
    name: 'Lamparina',
    x: 160,
    y: 770,
    lamp: true,
    points: [[0, -32], [-20, 12], [20, 12], [0, 32]],
    links: [[0, 1], [0, 2], [1, 3], [2, 3], [1, 2]],
  },
  {
    key: 'pen',
    name: 'Pena',
    x: 130,
    y: 160,
    extra: true,
    points: [[-30, 32], [0, 0], [26, -34], [11, -10], [-6, 6]],
    links: [[0, 1], [1, 2], [1, 3], [1, 4]],
  },
  {
    key: 'glasses',
    name: 'Óculos',
    x: 1280,
    y: 760,
    extra: true,
    points: [[-34, -8], [-34, 8], [-14, 8], [-14, -8], [14, -8], [14, 8], [34, 8], [34, -8]],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [3, 4]],
  },
]

// Meridianos e paralelos curvos: uma grade de atlas fraca cobrindo o fundo, sem servir de página.
const PARALLELS = [180, 330, 480, 630, 780]
const MERIDIANS = [220, 500, 780, 1060, 1340]

export function LibrarySky() {
  return (
    <div className="library-sky" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g className="atlas-grid">
          {PARALLELS.map(y => <path d={`M0,${y} Q720,${y - 60} 1440,${y}`} key={`p${y}`} />)}
          {MERIDIANS.map(x => <path d={`M${x},0 Q${x - 40},450 ${x},900`} key={`m${x}`} />)}
        </g>
        {FIGURES.map(figure => (
          <g
            className={`study-figure ${figure.extra ? 'figure-extra' : ''} ${figure.lamp ? 'figure-lamp' : ''}`}
            transform={`translate(${figure.x} ${figure.y})`}
            key={figure.key}
          >
            {figure.links.map(([from, to]) => {
              const [x1, y1] = figure.points[from]!
              const [x2, y2] = figure.points[to]!
              return <line x1={x1} y1={y1} x2={x2} y2={y2} key={`${from}-${to}`} />
            })}
            {figure.points.map(([x, y], index) => <circle cx={x} cy={y} r="2.6" key={index} />)}
            <text y="56" textAnchor="middle">{figure.name}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
