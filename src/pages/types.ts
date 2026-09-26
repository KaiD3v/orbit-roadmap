import type { Feedback } from '../domain/progress'
import type { ShareCardData } from '../domain/shareCard'
import type { Area } from '../types/content'

// O que a shell (App) entrega a toda página: as camadas globais que ficam por cima de qualquer rota.
export type PageProps = {
  notify: (feedback: Feedback) => void
  openArea: (area: Area, topicId?: string) => void
  openShare: (data: ShareCardData) => void
}
