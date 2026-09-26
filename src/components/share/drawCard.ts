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

// Constelação da fase: uma estrela por área, acesa em ciano quando concluída (mesma linguagem visual
// do `.phase-stars` no mapa).
function constellationLayout(total: number, cellH: number) {
  const cols = Math.min(total, 7)
  const rows = total ? Math.ceil(total / cols) : 0
  return { cols, rows, height: rows * cellH }
}

function drawConstellation(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number, total: number, lit: number, cellH: number,
): number {
  const { cols, rows } = constellationLayout(total, cellH)
  if (!total) return y
  const cellW = width / cols
  const dotLit = cellH * 0.16
  const dotDim = cellH * 0.1
  for (let i = 0; i < total; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = x + cellW * col + cellW / 2
    const cy = y + row * cellH
    const isLit = i < lit
    if (isLit) {
      ctx.shadowColor = COLORS.cyan
      ctx.shadowBlur = cellH * 0.3
    }
    ctx.fillStyle = isLit ? COLORS.cyan : COLORS.starDim
    ctx.beginPath()
    ctx.arc(cx, cy, isLit ? dotLit : dotDim, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  return y + rows * cellH
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
  // Estrelas maiores no stories (mais alto, mesma largura): sem isso, a constelação de uma fase com
  // poucas áreas fica pequena demais perdida no meio do card.
  const constellationCellH = format === 'stories' ? 74 : 54
  const emblemR = format === 'stories' ? 150 : 120
  const emblemCx = MARGIN + contentWidth / 2

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '700 62px "Space Grotesk"'
  const titleLines = wrapText(ctx, data.title, contentWidth)

  // Mede o bloco inteiro antes de desenhar, para poder centralizá-lo verticalmente no espaço livre
  // entre o cabeçalho e o rodapé (sem isso, um card com pouco conteúdo — ex.: fase com poucas áreas —
  // sobra vazio embaixo, mais visível ainda no formato stories, bem mais alto que largo).
  let contentHeight = SUBTITLE_H + titleLines.length * TITLE_LINE_H + GAP_AFTER_TITLE
  let badgeDescLines: string[] = []
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
    contentHeight += STAT_LINE_H + constellationLayout(data.stars.total, constellationCellH).height
  }

  const topAnchor = MARGIN + 50
  const footerY = height - MARGIN
  const bottomLimit = footerY - 90
  const available = Math.max(0, bottomLimit - topAnchor)
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
    drawConstellation(ctx, MARGIN, cursorY, contentWidth, data.stars.total, data.stars.lit, constellationCellH)
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
