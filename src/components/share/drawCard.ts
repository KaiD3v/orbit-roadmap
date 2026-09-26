import type { ShareCardData } from '../../domain/shareCard'

export type CardFormat = 'feed' | 'stories'

export const CARD_SIZES: Record<CardFormat, { width: number, height: number }> = {
  feed: { width: 1080, height: 1350 },
  stories: { width: 1080, height: 1920 },
}

// Hex duplicados de src/styles/base.css e map.css: um <canvas> não lê custom properties do CSS.
// Se os tokens mudarem lá, atualize aqui também.
const COLORS = {
  bg: '#060a1a',
  muted: '#8d97bb',
  text: '#eef1ff',
  violet: '#a889ff',
  cyan: '#65e1ec',
  starDim: '#2b3454',
}

const MARGIN = 80

// PRNG determinístico (mulberry32): mesma semente sempre -> mesmo céu, para "gerar duas vezes produz a
// mesma imagem" valer também para o fundo, não só para o conteúdo.
function seededRandom(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, height)
  const glow = ctx.createRadialGradient(width * 0.85, 0, 0, width * 0.85, 0, width * 0.95)
  glow.addColorStop(0, '#a889ff26')
  glow.addColorStop(1, '#a889ff00')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  const rand = seededRandom(20260101)
  for (let i = 0; i < 280; i++) {
    const x = rand() * width
    const y = rand() * height
    const r = rand() * 1.6 + 0.3
    ctx.globalAlpha = rand() * 0.5 + 0.35
    ctx.fillStyle = i % 9 === 0 ? '#c9d4ff' : '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// Quebra manual medindo com measureText (canvas não quebra linha sozinho), para títulos longos não
// estourarem a margem de ~80px.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

// A lua/planeta é a assinatura visual do app (animada na interface; aqui, estática).
function drawPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r)
  body.addColorStop(0, color)
  body.addColorStop(1, `${color}00`)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `${color}55`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(x, y, r * 1.8, r * 0.55, -0.4, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = COLORS.text
  ctx.beginPath()
  ctx.arc(x + r * 1.6, y - r * 0.4, r * 0.16, 0, Math.PI * 2)
  ctx.fill()
}

// Anel de progresso do card de nível (mesma ideia do `.node-ring`/`conic-gradient` do mapa, em canvas).
function drawRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pct: number, color: string) {
  const lineWidth = r * 0.22
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.strokeStyle = COLORS.starDim
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
  ctx.stroke()
  ctx.lineCap = 'butt'

  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.text
  ctx.font = `700 ${Math.round(r * 0.5)}px "Space Grotesk"`
  ctx.fillText(`${pct}%`, cx, cy + r * 0.16)
  ctx.textAlign = 'left'
}

// Medalha da conquista: o mesmo glifo do `.badge-icon` em Achievements.tsx, ampliado.
function drawMedallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, glyph: string, color: string) {
  const body = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r)
  body.addColorStop(0, `${color}33`)
  body.addColorStop(1, `${color}0d`)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = color
  ctx.font = `${Math.round(r * 0.9)}px "Space Grotesk"`
  ctx.fillText(glyph, cx, cy + r * 0.32)
  ctx.textAlign = 'left'
}

// Constelação da fase/trilha (B08): uma estrela por área, ligada em ordem por uma trilha em serpentina
// (esquerda->direita, depois direita->esquerda, "boustrophedon") para as linhas nunca se cruzarem.
// Acesa em ciano quando concluída, como no mapa; o traço entre duas acesas também vira ciano.
type ConstellationItem = { lit: boolean }
type ConstellationGroup = ConstellationItem[]

// Agrupa a trilha por fase (cada fase vira uma constelação separada, sem linha entre elas). Sem
// `trail` (defesa: cards antigos ou um `stars` sem trilha), um grupo só com as `lit` primeiras acesas
// — o comportamento anterior à B08.
function constellationGroups(data: ShareCardData): ConstellationGroup[] {
  if (!data.trail?.length) {
    return data.stars.total ? [Array.from({ length: data.stars.total }, (_, i) => ({ lit: i < data.stars.lit }))] : []
  }
  const groups: ConstellationGroup[] = []
  let currentPhase: number | undefined
  for (const entry of data.trail) {
    if (entry.phase !== currentPhase || !groups.length) {
      groups.push([])
      currentPhase = entry.phase
    }
    groups[groups.length - 1]?.push({ lit: entry.lit })
  }
  return groups
}

// Raio fixo por formato (não escala com a altura da linha): a estrela precisa continuar uma estrela
// — pequena, com o brilho ciano carregando a presença —, nunca um disco/nó grande.
const DOT_R: Record<CardFormat, { lit: number, dim: number }> = {
  feed: { lit: 11, dim: 5 },
  stories: { lit: 15, dim: 7 },
}
const LINE_WIDTH: Record<CardFormat, number> = { feed: 2, stories: 3 }
const MIN_ROW_H = 46
// Teto de segurança (raramente atingido: as colunas por proporção abaixo já miram preencher
// `availableHeight` quase exatamente) — só evita um grupo de 1-2 itens virar uma linha absurda.
const MAX_ROW_H: Record<CardFormat, number> = { feed: 300, stories: 520 }
// Nenhuma coluna mais estreita que isto, pra não empilhar estrelas coladas quando o total é grande.
const MIN_CELL_W = 90
// Espaço extra entre constelações de fases diferentes, em unidades de linha.
const PHASE_GAP_FACTOR = 0.7
// Deslocamento aleatório de cada estrela, como fração do tamanho da célula (linha ou coluna) — pra
// parecer constelação (pontos com jeito orgânico), não grade/tabuleiro. Bem abaixo de 0.5, então
// nunca aproxima uma estrela da linha vizinha.
const JITTER_FRACTION = 0.45

type GroupLayout = { items: ConstellationItem[], cols: number, rows: number }

// Puro (sem ctx): escolhe as colunas por grupo pela proporção do espaço livre (menos colunas e mais
// linhas quando `availableHeight` é alto — o caso do stories — mais colunas quando é baixo, o feed),
// não um número fixo por formato, e calcula a altura de linha que preenche essa altura livre.
function layoutConstellation(groups: ConstellationGroup[], format: CardFormat, width: number, availableHeight: number) {
  const total = groups.reduce((sum, g) => sum + g.length, 0)
  if (!total) return { groupLayouts: [] as GroupLayout[], rowH: 0, gapPx: 0, height: 0 }

  const maxColsByWidth = Math.max(1, Math.floor(width / MIN_CELL_W))
  // Tamanho de célula que faria a constelação inteira caber na proporção do espaço livre (células
  // ~quadradas): daí vem o número de colunas, comum a todos os grupos (mesma escala visual).
  const cellEstimate = Math.sqrt((width * availableHeight) / total)
  const cols = Math.max(1, Math.min(maxColsByWidth, Math.round(width / cellEstimate)))

  const groupLayouts: GroupLayout[] = groups.map((items) => {
    const groupCols = Math.max(1, Math.min(items.length, cols))
    return { items, cols: groupCols, rows: Math.max(1, Math.ceil(items.length / groupCols)) }
  })
  const totalRows = groupLayouts.reduce((sum, g) => sum + g.rows, 0)
  const gaps = Math.max(0, groups.length - 1)
  const units = totalRows + gaps * PHASE_GAP_FACTOR
  const rowH = units ? Math.min(MAX_ROW_H[format], Math.max(MIN_ROW_H, availableHeight / units)) : 0
  const gapPx = rowH * PHASE_GAP_FACTOR
  const height = totalRows * rowH + gaps * gapPx
  return { groupLayouts, rowH, gapPx, height }
}

type PlacedStar = { x: number, y: number, lit: boolean, groupIndex: number }

function drawConstellation(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number, groups: ConstellationGroup[],
  format: CardFormat, availableHeight: number,
): number {
  const { groupLayouts, rowH, gapPx } = layoutConstellation(groups, format, width, availableHeight)
  if (!groupLayouts.length) return y

  const { lit: dotLit, dim: dotDim } = DOT_R[format]
  // Semente fixa (não a hora ou `Math.random`): duas gerações do mesmo card saem byte a byte iguais.
  const jitter = seededRandom(9026021)

  // Calcula todas as posições antes de desenhar qualquer coisa. Se uma linha fosse desenhada depois
  // da estrela anterior, ela sairia da estrela pelo centro e pintaria por cima dela.
  const placed: PlacedStar[] = []
  let cursorY = y
  groupLayouts.forEach((group, groupIndex) => {
    const cellW = width / group.cols
    group.items.forEach((item, i) => {
      const row = Math.floor(i / group.cols)
      const posInRow = i % group.cols
      // Linha par: esquerda->direita. Ímpar: direita->esquerda. Assim a estrela seguinte de uma
      // linha começa do lado onde a anterior terminou, sem a linha voltar e se cruzar.
      const col = row % 2 === 0 ? posInRow : group.cols - 1 - posInRow
      placed.push({
        x: x + cellW * col + cellW / 2 + (jitter() - 0.5) * cellW * JITTER_FRACTION,
        y: cursorY + row * rowH + (jitter() - 0.5) * rowH * JITTER_FRACTION,
        lit: item.lit,
        groupIndex,
      })
    })
    cursorY += group.rows * rowH
    if (groupIndex < groupLayouts.length - 1) cursorY += gapPx
  })

  // 1ª passada: todos os traços, na ordem da trilha (sem ligar o último de um grupo ao primeiro do
  // próximo — cada fase é uma constelação separada).
  ctx.lineWidth = LINE_WIDTH[format]
  for (let i = 1; i < placed.length; i++) {
    const prev = placed[i - 1]
    const curr = placed[i]
    if (!prev || !curr || curr.groupIndex !== prev.groupIndex) continue
    ctx.strokeStyle = curr.lit && prev.lit ? COLORS.cyan : COLORS.starDim
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(curr.x, curr.y)
    ctx.stroke()
  }

  // 2ª passada: todas as estrelas por cima dos traços (senão o traço que sai de uma estrela acesa
  // rumo à vizinha apagada nasce no centro dela e pinta por cima, cortando a estrela ao meio).
  for (const star of placed) {
    if (star.lit) {
      ctx.shadowColor = COLORS.cyan
      ctx.shadowBlur = dotLit * 2.3
    }
    ctx.fillStyle = star.lit ? COLORS.cyan : COLORS.starDim
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.lit ? dotLit : dotDim, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  return cursorY
}

// Desenha o card completo. Espera as fontes antes de desenhar (senão o navegador troca por uma
// genérica na primeira passada e o texto sai com métricas erradas).
export async function drawCard(
  ctx: CanvasRenderingContext2D, data: ShareCardData, format: CardFormat, name?: string,
): Promise<void> {
  const { width, height } = CARD_SIZES[format]
  const contentWidth = width - MARGIN * 2
  // Ciano = concluído (fase, nível, conquista, trilha); violeta = ação, só o desafio ainda por vir.
  const accent = data.kind === 'challenge' ? COLORS.violet : COLORS.cyan

  await Promise.all([
    document.fonts.load('700 62px "Space Grotesk"'),
    document.fonts.load('600 30px "Space Grotesk"'),
    document.fonts.load('400 32px "DM Sans"'),
  ])
  await document.fonts.ready

  drawSky(ctx, width, height)
  drawPlanet(ctx, width - MARGIN - 42, MARGIN + 42, 46, accent)

  const SUBTITLE_H = 60
  const TITLE_LINE_H = 70
  const GAP_AFTER_TITLE = 30
  const ITEM_LINE_H = 38
  const ITEM_GAP = 18
  const STAT_LINE_H = 56
  const emblemR = format === 'stories' ? 150 : 120
  const emblemCx = MARGIN + contentWidth / 2

  const topAnchor = MARGIN + 50
  const footerY = height - MARGIN
  const bottomLimit = footerY - 90
  const available = Math.max(0, bottomLimit - topAnchor)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 62px "Space Grotesk"'
  const titleLines = wrapText(ctx, data.title, contentWidth)

  // Mede o bloco inteiro antes de desenhar, para poder centralizá-lo verticalmente no espaço livre
  // entre o cabeçalho e o rodapé (sem isso, um card com pouco conteúdo — ex.: fase com poucas áreas —
  // sobra vazio embaixo, mais visível ainda no formato stories, bem mais alto que largo).
  let contentHeight = SUBTITLE_H + titleLines.length * TITLE_LINE_H + GAP_AFTER_TITLE
  let badgeDescLines: string[] = []
  let constellationGroupsData: ConstellationGroup[] = []
  let constellationAvailable = 0
  if (data.kind === 'challenge') {
    ctx.font = '400 30px "DM Sans"'
    for (const item of data.lines) {
      contentHeight += wrapText(ctx, item, contentWidth - 50).length * ITEM_LINE_H + ITEM_GAP
    }
  } else if (data.kind === 'level') {
    contentHeight += emblemR * 2 + 20
  } else if (data.kind === 'badge') {
    ctx.font = '400 28px "DM Sans"'
    badgeDescLines = data.lines[0] ? wrapText(ctx, data.lines[0], contentWidth) : []
    contentHeight += emblemR * 2 + 30 + badgeDescLines.length * 34
  } else {
    // A constelação ocupa o espaço vertical que sobra (até o rodapé), não uma altura fixa — senão
    // uma fase pequena vira uma faixa fina no meio de um stories enorme e vazio.
    contentHeight += STAT_LINE_H
    constellationGroupsData = constellationGroups(data)
    constellationAvailable = Math.max(0, available - contentHeight)
    contentHeight += layoutConstellation(constellationGroupsData, format, contentWidth, constellationAvailable).height
  }

  let cursorY = topAnchor + Math.max(0, (available - contentHeight) / 2)

  ctx.fillStyle = accent
  ctx.font = '600 30px "Space Grotesk"'
  ctx.fillText(data.subtitle, MARGIN, cursorY)
  cursorY += SUBTITLE_H

  ctx.fillStyle = COLORS.text
  ctx.font = '700 62px "Space Grotesk"'
  for (const line of titleLines) {
    ctx.fillText(line, MARGIN, cursorY)
    cursorY += TITLE_LINE_H
  }
  cursorY += GAP_AFTER_TITLE

  if (data.kind === 'challenge') {
    ctx.font = '400 30px "DM Sans"'
    for (const item of data.lines) {
      ctx.fillStyle = COLORS.cyan
      ctx.fillText('✓', MARGIN, cursorY)
      ctx.fillStyle = COLORS.muted
      const itemLines = wrapText(ctx, item, contentWidth - 50)
      itemLines.forEach((line, i) => ctx.fillText(line, MARGIN + 50, cursorY + i * ITEM_LINE_H))
      cursorY += itemLines.length * ITEM_LINE_H + ITEM_GAP
    }
  } else if (data.kind === 'level') {
    drawRing(ctx, emblemCx, cursorY + emblemR, emblemR, data.stats.percent ?? 0, accent)
  } else if (data.kind === 'badge') {
    drawMedallion(ctx, emblemCx, cursorY + emblemR, emblemR, data.icon ?? '✦', accent)
    cursorY += emblemR * 2 + 30
    ctx.font = '400 28px "DM Sans"'
    ctx.fillStyle = COLORS.muted
    ctx.textAlign = 'center'
    badgeDescLines.forEach((line, i) => ctx.fillText(line, emblemCx, cursorY + i * 34))
    ctx.textAlign = 'left'
  } else {
    const areas = data.stats.areas ?? data.stars.total
    const topics = data.stats.topics ?? 0
    ctx.font = '600 26px "DM Sans"'
    ctx.fillStyle = COLORS.muted
    ctx.fillText(`${areas} ${areas === 1 ? 'área concluída' : 'áreas concluídas'} · ${topics} tópicos`, MARGIN, cursorY)
    cursorY += STAT_LINE_H
    drawConstellation(ctx, MARGIN, cursorY, contentWidth, constellationGroupsData, format, constellationAvailable)
  }

  // Rodapé: XP e data à esquerda, marca e nome/@ opcional à direita, sempre colados na base do card.
  ctx.textAlign = 'left'
  ctx.font = '700 34px "Space Grotesk"'
  ctx.fillStyle = accent
  ctx.fillText(`+${data.stats.xp} XP`, MARGIN, footerY)
  ctx.font = '400 26px "DM Sans"'
  ctx.fillStyle = COLORS.muted
  ctx.fillText(data.date, MARGIN, footerY + 34)

  ctx.textAlign = 'right'
  ctx.font = '700 30px "Space Grotesk"'
  ctx.fillStyle = COLORS.text
  ctx.fillText('Orbit', width - MARGIN, footerY)
  if (name) {
    ctx.font = '400 26px "DM Sans"'
    ctx.fillStyle = COLORS.muted
    ctx.fillText(name, width - MARGIN, footerY + 34)
  }
  ctx.textAlign = 'left'
}
