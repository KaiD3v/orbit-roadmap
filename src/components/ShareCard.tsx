import { useEffect, useRef, useState } from 'react'
import type { ShareCardData } from '../domain/shareCard'
import type { Feedback } from '../domain/progress'
import { CARD_SIZES, drawCard, type CardFormat } from './share/drawCard'

const NAME_KEY = 'orbit-share-name'
const PREVIEW_WIDTH = 260

// Nome/@ é preferência de exibição, não progresso: guardado à parte, nunca entra no backup nem no link.
function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveName(name: string) {
  try {
    if (name) localStorage.setItem(NAME_KEY, name)
    else localStorage.removeItem(NAME_KEY)
  } catch {
    // localStorage indisponível (aba anônima etc.): segue sem salvar, não é dado essencial
  }
}

export function ShareCard({ data, close, notify }: {
  data: ShareCardData | null
  close: () => void
  notify: (feedback: Feedback) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [format, setFormat] = useState<CardFormat>('feed')
  const [name, setName] = useState(loadName)
  // Detecção de capacidade (roda uma vez, não depende de re-render): inicializador preguiçoso do
  // useState em vez de efeito, para não disparar "setState síncrono dentro de efeito".
  const [nativeShare] = useState(() =>
    typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [new File([''], 't.png', { type: 'image/png' })] }))

  useEffect(() => {
    const dialog = ref.current
    if (data && dialog && !dialog.open) dialog.showModal()
    if (!data && dialog?.open) dialog.close()
  }, [data])

  useEffect(() => {
    if (!data || !canvasRef.current) return
    const canvas = canvasRef.current
    const { width, height } = CARD_SIZES[format]
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) void drawCard(ctx, data, format, name.trim() || undefined)
  }, [data, format, name])

  function updateName(value: string) {
    setName(value)
    saveName(value.trim())
  }

  async function shareImage() {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const filePart = data.kind === 'challenge' ? 'desafio' : 'fase'
    const file = new File([blob], `orbit-${filePart}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: data.caption })
      } catch {
        // cancelou o compartilhamento nativo; não é um erro
      }
      return
    }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = file.name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    try {
      await navigator.clipboard.writeText(data.caption)
      notify({ message: 'Imagem baixada. A legenda foi copiada, é só colar.', kind: 'info' })
    } catch {
      notify({ message: 'Imagem baixada.', kind: 'info' })
    }
  }

  async function copyCaption() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.caption)
      notify({ message: 'Legenda copiada', kind: 'info' })
    } catch {
      window.prompt('Copie a legenda:', data.caption)
    }
  }

  const previewHeight = data ? PREVIEW_WIDTH * CARD_SIZES[format].height / CARD_SIZES[format].width : 0

  return (
    <dialog
      id="share-dialog"
      ref={ref}
      aria-labelledby="share-title"
      onClose={close}
      onClick={(event) => { if (event.target === event.currentTarget) close() }}
    >
      {data && (
        <>
          <div className="share-top">
            <button className="detail-close" type="button" aria-label="Fechar compartilhamento" onClick={close}>×</button>
            <h2 id="share-title">Compartilhar</h2>
          </div>
          <div className="share-body">
            <div className="share-preview">
              <canvas ref={canvasRef} style={{ width: PREVIEW_WIDTH, height: previewHeight }} />
            </div>
            <div className="share-controls">
              <div className="share-format" role="radiogroup" aria-label="Formato da imagem">
                <button
                  className={`ghost-button ${format === 'feed' ? 'is-active' : ''}`}
                  type="button"
                  aria-pressed={format === 'feed'}
                  onClick={() => setFormat('feed')}
                >
                  Feed (1080×1350)
                </button>
                <button
                  className={`ghost-button ${format === 'stories' ? 'is-active' : ''}`}
                  type="button"
                  aria-pressed={format === 'stories'}
                  onClick={() => setFormat('stories')}
                >
                  Stories (1080×1920)
                </button>
              </div>
              <label className="share-name-field">
                Nome ou @ (opcional)
                <input
                  type="text"
                  value={name}
                  maxLength={40}
                  placeholder="Como aparece no card"
                  onChange={event => updateName(event.target.value)}
                />
              </label>
              <button className="ghost-button share-main-action" type="button" onClick={shareImage}>
                {nativeShare ? 'Compartilhar imagem' : 'Baixar imagem'}
              </button>
              <button className="text-button" type="button" onClick={copyCaption}>Copiar legenda</button>
              <p className="share-caption-preview">{data.caption}</p>
            </div>
          </div>
        </>
      )}
    </dialog>
  )
}
