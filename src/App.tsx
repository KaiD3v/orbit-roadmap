import { Analytics } from '@vercel/analytics/react'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { decodeProgress } from './domain/share'
import type { ShareCardData } from './domain/shareCard'
import { AreaDialog } from './components/AreaDialog'
import { BackupControls } from './components/BackupControls'
import { ShareCard } from './components/ShareCard'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import type { PageProps } from './pages/types'
import { href, usePath } from './router'
import { useProgress, type Notification } from './store/progress'
import type { Area } from './types/content'

// Página nova: um componente em `pages/` que recebe PageProps e uma linha aqui. Rota desconhecida cai na `/`.
type Route = { title: string, Page: ComponentType<PageProps> }
const home: Route = { title: 'Engenharia de Software com IA', Page: HomePage }
const routes: Record<string, Route> = {
  '/': home,
  '/biblioteca': { title: 'Biblioteca de materiais', Page: LibraryPage },
}

const LINK_HASH_PREFIX = '#p='

function App() {
  const path = usePath()
  const { title, Page } = routes[path] ?? home
  const [selected, setSelected] = useState<Area | null>(null)
  const [highlightTopicId, setHighlightTopicId] = useState<string | null>(null)
  const [toast, setToast] = useState<Notification | null>(null)
  const [shareData, setShareData] = useState<ShareCardData | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

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

  useEffect(() => {
    document.title = `Orbit · ${title}`
  }, [title])

  // Troca de página: âncora (`#fase-2`) rola até ela; rota nova volta ao topo e leva o foco para o conteúdo.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const anchor = location.hash.startsWith('#/') ? null : document.getElementById(location.hash.slice(1))
    if (anchor) anchor.scrollIntoView()
    else window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [path])

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

  return (
    <>
      <div className="app-shell">
        <Sidebar path={path} openShare={setShareData} />
        <main id="inicio" ref={mainRef} tabIndex={-1}>
          <header className="topbar">
            <div className="breadcrumb"><a href={href('/')}>Roadmap</a> <span>/</span> {title}</div>
            <BackupControls notify={setToast} />
          </header>
          <Page notify={setToast} openArea={openArea} openShare={setShareData} />
          <footer>
            <p>Feito para aprender construindo. Seu progresso é salvo neste navegador.</p>
            <p className="footer-contact">
              Achou um erro ou tem uma sugestão?{' '}
              <a href="https://github.com/KaiD3v/orbit-roadmap/issues" target="_blank" rel="noreferrer">Abra uma issue</a>
              {' ou '}
              <a href="mailto:kaikricardo99@gmail.com?subject=Orbit">mande um e-mail</a>
            </p>
            <span>Orbit</span>
          </footer>
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
      <ShareCard data={shareData} close={() => setShareData(null)} notify={setToast} />
      {/* A rota vive no hash, que a Vercel não vê: informa o caminho à mão. Isso também mantém o `#p=`
          (o progresso por link) fora do que é enviado. */}
      <Analytics route={path} path={path} />
    </>
  )
}

export default App
