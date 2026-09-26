type Point = [number, number]
type Link = [number, number]
type Figure = { key: string, points: Point[], links: Link[] }

// L01/fix: duas constelações-figura de estudo (livro aberto, lamparina), à mão — pontos e ligações
// gerados com `map`, sem biblioteca. Cada uma é um <svg> pequeno e autocontido (viewBox próprio),
// posicionado por CSS só nos cantos do CABEÇALHO (`.library-top`, `LibraryHeaderFigures`), nunca no
// fundo fixo da página inteira: um fundo fixo com figuras largas colidia com títulos de área ao rolar
// (o cabeçalho nunca rola por baixo de nada, então é o único lugar onde "nunca atrás de texto" é
// garantido por construção, não por coordenadas escolhidas à mão). Sem nome escrito ao lado (reduz
// ainda mais o risco de sobrepor texto) — reduzido de 4 para 2 figuras, ver AGENTS.md.
const FIGURES: Figure[] = [
  {
    key: 'book',
    points: [[-24, -10], [-9, 7], [0, 19], [9, 7], [24, -10]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    key: 'lamp',
    points: [[0, -18], [-11, 7], [11, 7], [0, 18]],
    links: [[0, 1], [0, 2], [1, 3], [2, 3], [1, 2]],
  },
]

// Meridianos e paralelos curvos: uma grade de atlas fraca cobrindo o fundo, sem servir de página.
const PARALLELS = [180, 330, 480, 630, 780]
const MERIDIANS = [220, 500, 780, 1060, 1340]

// Fundo fixo da Biblioteca: o céu da Home (--sky-stars, via CSS) + a grade de atlas. Só linhas finas e
// muito fracas — nada com texto, nada largo o bastante para brigar com o conteúdo ao rolar.
export function LibrarySky() {
  return (
    <div className="library-sky" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g className="atlas-grid">
          {PARALLELS.map(y => <path d={`M0,${y} Q720,${y - 60} 1440,${y}`} key={`p${y}`} />)}
          {MERIDIANS.map(x => <path d={`M${x},0 Q${x - 40},450 ${x},900`} key={`m${x}`} />)}
        </g>
      </svg>
    </div>
  )
}

// As duas figuras, presas aos cantos do cabeçalho (`.library-top` precisa de `position: relative` +
// `overflow: hidden`). `z-index: -1` (library.css): atrás do título/frase/total lido, que são conteúdo
// normal (não posicionado) — o mesmo truque do fundo fixo.
export function LibraryHeaderFigures() {
  return (
    <div className="library-header-figures" aria-hidden="true">
      {FIGURES.map(figure => (
        <svg className={`study-figure figure-${figure.key}`} viewBox="-28 -22 56 44" key={figure.key}>
          {figure.links.map(([from, to]) => {
            const [x1, y1] = figure.points[from]!
            const [x2, y2] = figure.points[to]!
            return <line x1={x1} y1={y1} x2={x2} y2={y2} key={`${from}-${to}`} />
          })}
          {figure.points.map(([x, y], index) => <circle cx={x} cy={y} r="2.2" key={index} />)}
        </svg>
      ))}
    </div>
  )
}
