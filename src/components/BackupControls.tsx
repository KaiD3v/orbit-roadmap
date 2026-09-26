import type { ChangeEvent } from 'react'
import { createBackup } from '../domain/backup'
import type { Feedback } from '../domain/progress'
import { encodeProgress } from '../domain/share'
import { useProgress } from '../store/progress'

export function BackupControls({ notify }: { notify: (feedback: Feedback) => void }) {
  async function shareLink() {
    const url = `${location.origin}${location.pathname}#p=${encodeProgress(useProgress.getState())}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Meu progresso no Orbit', url })
      } catch {
        // cancelou o compartilhamento nativo; não é um erro
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      notify({ message: 'Link copiado. Abra no outro aparelho.', kind: 'info' })
    } catch {
      window.prompt('Copie o link do seu progresso:', url)
    }
  }

  function exportBackup() {
    const backup = createBackup(useProgress.getState())
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'orbit-progresso.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    notify({ message: 'Backup baixado', kind: 'info' })
  }

  async function loadBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      const imported = JSON.parse(await file.text()) as unknown
      const { done, days } = useProgress.getState()
      if ((Object.keys(done).length || days.length) && !window.confirm('Isso troca seu progresso atual pelo do arquivo. Continuar?')) return
      useProgress.getState().importBackup(imported)
      notify({ message: 'Progresso restaurado', kind: 'info' })
    } catch {
      notify({ message: 'Não reconhecemos esse arquivo. Use um backup baixado do Orbit.', kind: 'info' })
    } finally {
      input.value = ''
    }
  }

  return (
    <div className="top-actions">
      <button className="text-button" type="button" onClick={shareLink}>Copiar link de progresso</button>
      <button className="text-button" type="button" onClick={exportBackup}>Baixar backup</button>
      <label className="import-button">
        Restaurar backup <input type="file" accept="application/json,.json" onChange={loadBackup} />
      </label>
    </div>
  )
}
