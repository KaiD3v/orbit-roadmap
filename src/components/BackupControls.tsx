import type { ChangeEvent } from 'react'
import { createBackup } from '../domain/backup'
import { useProgress } from '../store/progress'

export function BackupControls({ notify }: { notify: (message: string) => void }) {
  function exportBackup() {
    const backup = createBackup(useProgress.getState())
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'orbit-progresso.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    notify('Progresso exportado')
  }

  async function loadBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      const imported = JSON.parse(await file.text()) as unknown
      const { done, days } = useProgress.getState()
      if ((Object.keys(done).length || days.length) && !window.confirm('Importar este arquivo substituirá o progresso atual. Deseja continuar?')) return
      useProgress.getState().importBackup(imported)
      notify('Progresso importado')
    } catch {
      notify('Arquivo inválido. Use um JSON exportado pelo Orbit.')
    } finally {
      input.value = ''
    }
  }

  return (
    <div className="top-actions">
      <button className="text-button" type="button" onClick={exportBackup}>Exportar progresso ↗</button>
      <label className="import-button">
        Importar <input type="file" accept="application/json,.json" onChange={loadBackup} />
      </label>
    </div>
  )
}
