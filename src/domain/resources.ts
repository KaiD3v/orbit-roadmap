import type { Area, Resource } from '../types/content'

// B06: chave estável do material lido. Materiais não têm id próprio, então a chave é a URL normalizada:
// sem barra final e sem parâmetros utm_*. Trocar a URL de um material na curadoria perde o registro de
// "lido" de quem já marcou (aceito e documentado no AGENTS.md).
export function normalizeResourceUrl(url: string): string {
  try {
    const parsed = new URL(url)
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) parsed.searchParams.delete(key)
    }
    const query = parsed.searchParams.toString()
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.origin}${path}${query ? `?${query}` : ''}`
  } catch {
    return url.replace(/\/+$/, '')
  }
}

// Materiais da área que cobrem um tópico específico (campo opcional `topics` do Resource).
export function resourcesForTopic(area: Area, topicId: string): Resource[] {
  return area.resources.filter(resource => resource.topics?.includes(topicId))
}

export const LEVEL_LABEL: Record<NonNullable<Resource['level']>, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

// Metadados discretos de um material: "Vídeo · Intermediário · EN · grátis · 40 min".
// Só entram os campos preenchidos; sem nenhum, sobra só o tipo (igual ao comportamento anterior à B06).
export function resourceMeta(resource: Resource): string {
  return [
    resource.type,
    resource.level && LEVEL_LABEL[resource.level],
    resource.lang?.toUpperCase(),
    resource.free === true ? 'grátis' : resource.free === false ? 'pago' : undefined,
    resource.duration,
  ].filter(Boolean).join(' · ')
}
