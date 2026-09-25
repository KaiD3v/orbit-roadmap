import { useState } from 'react'
import type { Filter } from './domain/filter'
import type { Feedback } from './domain/progress'
import { AreaDialog } from './components/AreaDialog'
import { BackupControls } from './components/BackupControls'
import { Hero } from './components/Hero'
import { Journey } from './components/Journey'
import { Achievements } from './components/Achievements'
import { NextStep } from './components/NextStep'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import type { Area } from './types/content'

function App() {
  const [selected, setSelected] = useState<Area | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [toast, setToast] = useState<Feedback | null>(null)

  function resetView() {
    setFilter('all')
    setSearch('')
  }

  return (
    <>
      <div className="app-shell">
        <Sidebar resetView={resetView} />
        <main id="inicio">
          <header className="topbar">
            <div className="breadcrumb">Roadmap <span>/</span> Engenharia de Software com IA</div>
            <BackupControls notify={setToast} />
          </header>
          <Hero />
          <NextStep notify={setToast} open={setSelected} />
          <Journey search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} open={setSelected} />
          <Achievements />
          <footer>Feito para aprender construindo. Seu progresso é salvo neste navegador. <span>Orbit</span></footer>
        </main>
      </div>
      <AreaDialog area={selected} notify={setToast} close={() => setSelected(null)} />
      <Toast message={toast} onHide={setToast} />
    </>
  )
}

export default App
