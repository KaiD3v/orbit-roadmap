import { useEffect, useState } from 'react'
import type { Filter } from './domain/filter'
import { decodeProgress } from './domain/share'
import type { ShareCardData } from './domain/shareCard'
import { AreaDialog } from './components/AreaDialog'
import { BackupControls } from './components/BackupControls'
import { Hero } from './components/Hero'
import { Journey } from './components/Journey'
import { Achievements } from './components/Achievements'
import { NextStep } from './components/NextStep'
import { ShareCard } from './components/ShareCard'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { useProgress, type Notification } from './store/progress'
import type { Area } from './types/content'

const LINK_HASH_PREFIX = '#p='

function App() {
  const [selected, setSelected] = useState<Area | null>(null)
  const [highlightTopicId, setHighlightTopicId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [toast, setToast] = useState<Notification | null>(null)
  const [shareData, setShareData] = useState<ShareCardData | null>(null)

  // Abre o painel da área; usado tanto pelos cliques normais (mapa, próximo passo) quanto pelo "Rever"
  // da revisão espaçada, que também destaca o tópico revisado dentro do painel.
  function openArea(area: Area, topicId?: string) {
    setHighlightTopicId(topicId ?? null)
    setSelected(area)
  }

  function closeArea() {
    setSelected(null)
    setHighlightTopicId(null)
  }

  function closeShare() {
    setShareData(null)
  }

  // Progresso por link (F02): se o endereço trouxer `#p=…`, junta com o progresso local uma única vez.
  useEffect(() => {
    if (!location.hash.startsWith(LINK_HASH_PREFIX)) return
    const text = location.hash.slice(LINK_HASH_PREFIX.length)
    history.replaceState(null, '', location.pathname + location.search)
    // queueMicrotask: setState não pode rodar direto no corpo do efeito (react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      try {
        const added = useProgress.getState().mergeProgress(decodeProgress(text))
        setToast({
          message: added
            ? `Progresso do link adicionado: +${added} tópico${added === 1 ? '' : 's'}`
            : 'Este aparelho já tinha tudo desse link',
          kind: 'info',
        })
      } catch {
        setToast({ message: 'Esse link de progresso está incompleto ou é de outra versão.', kind: 'info' })
      }
    })
  }, [])

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
          <NextStep notify={setToast} open={openArea} />
          <Journey
            search={search}
            onSearch={setSearch}
            filter={filter}
            onFilter={setFilter}
            open={openArea}
            openShare={setShareData}
          />
          <Achievements />
          <footer>Feito para aprender construindo. Seu progresso é salvo neste navegador. <span>Orbit</span></footer>
        </main>
      </div>
      <AreaDialog
        area={selected}
        notify={setToast}
        close={closeArea}
        highlightTopicId={highlightTopicId}
        openShare={setShareData}
      />
      <Toast message={toast} onHide={setToast} onShare={setShareData} />
      <ShareCard data={shareData} close={closeShare} notify={setToast} />
    </>
  )
}

export default App
