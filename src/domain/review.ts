import { orderedAreas } from '../data/roadmap'
import type { Topic } from '../types/content'
import type { ProgressData, ReviewStep } from '../types/progress'

// Leitner de 3 degraus: cada resposta "Lembro" empurra o tópico para o próximo intervalo, até o degrau 2
// (90 dias). Uma revisão lembrada nesse degrau encerra o ciclo (`step` 3) — não faz sentido perguntar de
// novo por algo já revisto três vezes. "Rever" nunca pune: volta ao degrau 0, o tópico continua concluído.
export const REVIEW_INTERVALS = [14, 30, 90] as const // dias, por degrau (0, 1, 2)
const GRADUATED = 3 as const

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).valueOf()
  const end = new Date(`${to}T00:00:00Z`).valueOf()
  return Math.round((end - start) / 86_400_000)
}

// Ordem de desempate ("menor id"): por número de área e depois de tópico, não a ordem lexicográfica
// da string (que erraria "a10" antes de "a2").
function parseTopicId(id: string): [number, number] {
  const match = id.match(/^a(\d+)-t(\d+)$/)
  return match ? [Number(match[1]), Number(match[2])] : [0, 0]
}
function compareTopicId(a: string, b: string) {
  const [areaA, topicA] = parseTopicId(a)
  const [areaB, topicB] = parseTopicId(b)
  return areaA - areaB || topicA - topicB
}

function reviewReference(data: ProgressData, topicId: string): string | undefined {
  return data.reviews[topicId]?.at ?? data.doneAt[topicId]
}

export function reviewElapsedDays(data: ProgressData, topicId: string, today: string): number {
  const reference = reviewReference(data, topicId)
  return reference ? daysBetween(reference, today) : 0
}

// Só essenciais concluídos entram no ciclo; no máximo uma revisão por dia (qualquer `at === today` a barra);
// escolha determinística: o mais atrasado (maior número de dias desde a última referência), empate por id.
export function pickReview(data: ProgressData, today: string): Topic | null {
  if (Object.values(data.reviews).some(review => review.at === today)) return null

  let best: { topic: Topic, elapsed: number } | null = null
  for (const area of orderedAreas) {
    for (const topic of area.topics) {
      if (!topic.required || !data.done[topic.id]) continue
      const step = data.reviews[topic.id]?.step ?? 0
      if (step === GRADUATED) continue
      const reference = reviewReference(data, topic.id)
      if (!reference) continue
      const elapsed = daysBetween(reference, today)
      if (elapsed < REVIEW_INTERVALS[step]) continue
      const isMoreOverdue = !best || elapsed > best.elapsed
      const isTiebreakWinner = best && elapsed === best.elapsed && compareTopicId(topic.id, best.topic.id) < 0
      if (isMoreOverdue || isTiebreakWinner) best = { topic, elapsed }
    }
  }
  return best?.topic ?? null
}

export function answerReview(data: ProgressData, topicId: string, remembered: boolean, today: string): ProgressData {
  if (!data.done[topicId]) return data
  const currentStep = data.reviews[topicId]?.step ?? 0
  const step: ReviewStep = remembered ? Math.min(currentStep + 1, GRADUATED) as ReviewStep : 0
  return { ...data, reviews: { ...data.reviews, [topicId]: { at: today, step } } }
}

// "há 2 semanas", "há 1 mês" etc. Só usado para tópicos elegíveis (>= 14 dias), mas aceita qualquer valor.
export function timeAgo(days: number): string {
  if (days < 30) {
    const weeks = Math.max(1, Math.round(days / 7))
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  }
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30))
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  }
  const years = Math.max(1, Math.round(days / 365))
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`
}
