import { areas, areasWithChallenge, orderedAreas, topicIndex } from '../data/roadmap'
import { cleanProgress } from './backup'
import { localDay } from './progress'
import type { Challenges, Done, ProgressData } from '../types/progress'

// Progresso por link: tudo depois do `#` do endereço, que o navegador nunca envia ao servidor.
// Formato: `1~<áreas>~<dias>~<desafios>`. Primeira versão do link (F02 implementada depois da F01,
// então já nasce carregando desafios; não existe link `1~` antigo para migrar).
const LINK_VERSION = '1'
const DAY_WINDOW = 60 // dias que cabem no link; suficiente para preservar a sequência (streak)

function bytesToBase64Url(bytes: number[]): string {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(text: string): number[] {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - padded.length % 4) % 4))
  return Array.from(binary, char => char.charCodeAt(0))
}

function bitsToBytes(bits: boolean[]): number[] {
  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let bit = 0; bit < 8 && i + bit < bits.length; bit++) {
      if (bits[i + bit]) byte |= 1 << bit
    }
    bytes.push(byte)
  }
  return bytes
}

function bytesToBits(bytes: number[]): boolean[] {
  return bytes.flatMap(byte => Array.from({ length: 8 }, (_, bit) => (byte & (1 << bit)) !== 0))
}

// Por área, bit k = tópico com sufixo `-t{k+1}` (topicIndex). Área sem tópico concluído não entra no link.
// Segmentos separados por `,`: o alfabeto base64url já usa `-` e `_`, então `_` não serve de separador
// (um bit em base64url pode conter `_`, o que quebraria o split). `,` nunca aparece no alfabeto.
function encodeAreas(done: Done): string {
  return orderedAreas.flatMap((area) => {
    const indices = area.topics.filter(topic => done[topic.id]).map(topic => topicIndex(topic.id))
    if (!indices.length) return []
    const bits = Array.from({ length: Math.max(...indices) + 1 }, (_, i) => indices.includes(i))
    return [`${area.id}.${bytesToBase64Url(bitsToBytes(bits))}`]
  }).join(',')
}

// Tolerante: segmento sem área correspondente ou bits ilegíveis é descartado, não quebra o link inteiro.
function decodeAreas(text: string): Done {
  const done: Record<string, true> = {}
  if (!text) return done as Done
  for (const segment of text.split(',')) {
    try {
      const [areaIdText, bitsText] = segment.split('.')
      const area = areas.find(candidate => String(candidate.id) === areaIdText)
      if (!area || !bitsText) continue
      const bits = bytesToBits(base64UrlToBytes(bitsText))
      area.topics.forEach((topic) => {
        if (bits[topicIndex(topic.id)]) done[topic.id] = true
      })
    } catch {
      // segmento adulterado: ignora e segue para o próximo
    }
  }
  return done as Done
}

// Bit 0 = hoje, bit i = hoje - i dias. Dias fora da janela de 60 não viajam no link (aceito).
function encodeDays(days: string[]): string {
  const studied = new Set(days)
  const bits = Array.from({ length: DAY_WINDOW }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return studied.has(localDay(date))
  })
  return bytesToBase64Url(bitsToBytes(bits))
}

function decodeDays(text: string): string[] {
  if (!text) return []
  try {
    const bits = bytesToBits(base64UrlToBytes(text)).slice(0, DAY_WINDOW)
    return bits.flatMap((set, i) => {
      if (!set) return []
      const date = new Date()
      date.setDate(date.getDate() - i)
      return [localDay(date)]
    })
  } catch {
    return []
  }
}

function encodeChallenges(challenges: Challenges): string {
  return Object.keys(challenges).filter(id => areasWithChallenge.has(id)).sort().join(',')
}

// A data de conclusão não viaja no link (nunca é lida em nenhuma tela); quem chega por aqui ganha "hoje".
function decodeChallenges(text: string): Challenges {
  if (!text) return {}
  const today = localDay()
  return Object.fromEntries(
    text.split(',').filter(id => areasWithChallenge.has(id)).map(id => [id, today]),
  )
}

export function encodeProgress(data: ProgressData): string {
  return [LINK_VERSION, encodeAreas(data.done), encodeDays(data.days), encodeChallenges(data.challenges)].join('~')
}

export function decodeProgress(text: string): ProgressData {
  const parts = text.split('~')
  if (parts.length !== 4 || parts[0] !== LINK_VERSION) {
    throw new Error('Esse link de progresso está incompleto ou é de outra versão')
  }
  const [, areasPart = '', daysPart = '', challengesPart = ''] = parts
  return cleanProgress({
    done: decodeAreas(areasPart),
    days: decodeDays(daysPart),
    challenges: decodeChallenges(challengesPart),
  })
}

// Quantos tópicos do link são novidade neste aparelho (para o toast "+N tópicos").
export function newTopicsCount(current: Done, incoming: Done): number {
  return Object.keys(incoming).filter(id => !current[id]).length
}

// União: nada do progresso local se perde ao importar um link (diferente de importBackup, que substitui).
export function combineProgress(current: ProgressData, incoming: ProgressData): ProgressData {
  return cleanProgress({
    done: { ...current.done, ...incoming.done },
    days: [...new Set([...current.days, ...incoming.days])],
    challenges: { ...current.challenges, ...incoming.challenges },
  })
}
