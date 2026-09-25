import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { areas, displayNumber, orderedAreas, phases, type Area } from './data/roadmap'
import { badges, countDone, metrics, nextArea, phaseProgress, priorityProgress, topicKey, type Done } from './domain/progress'
import { useProgress } from './store/progress'
import './App.css'

type Filter = 'all' | 'pending' | 'done'

function matchesArea(area: Area, done: Done, query: string, filter: Filter) {
  const finished = countDone(area, done) === area.topics.length
  return (filter === 'all' || (filter === 'done' ? finished : !finished)) &&
    (!query || `${area.title} ${area.topics.join(' ')}`.toLocaleLowerCase('pt-BR').includes(query))
}

function MapNode({ area, done, query, filter, nextId, open }: {
  area: Area; done: Done; query: string; filter: Filter; nextId: number; open: (area: Area) => void
}) {
  const count = countDone(area, done)
  const finished = count === area.topics.length
  const [requiredDone, requiredTotal] = priorityProgress(area, done, true)
  const [deepDone, deepTotal] = priorityProgress(area, done, false)
  const number = String(displayNumber.get(area.id)).padStart(2, '0')
  const summary = requiredTotal && deepTotal ? `${requiredDone}/${requiredTotal} obrig. · ${deepDone}/${deepTotal} aprof.`
    : requiredTotal ? `Obrigatório · ${requiredDone}/${requiredTotal}` : `Aprofundamento · ${deepDone}/${deepTotal}`
  const className = ['map-node', finished && 'is-done', !requiredTotal && 'is-extension',
    !matchesArea(area, done, query, filter) && 'is-faded', area.id === nextId && !query && filter === 'all' && 'is-next'].filter(Boolean).join(' ')

  return <button className={className} type="button" id={`area-${area.id}`} onClick={() => open(area)}
    aria-label={`Abrir etapa ${number}: ${area.title}; ${summary}`}>
    <span className="node-index">{number}</span>
    <span className="node-copy"><strong>{area.title}</strong><small>{summary}</small></span>
    <span className="node-state" aria-hidden="true">{finished ? '✓' : '↗'}</span>
  </button>
}

function PhaseMap({ phase, done, query, filter, nextId, open }: {
  phase: number; done: Done; query: string; filter: Filter; nextId: number; open: (area: Area) => void
}) {
  const [name, description, glyph] = phases[phase - 1]
  const list = orderedAreas.filter(area => area.phase === phase)
  const [completed, total] = phaseProgress(phase, done)
  const percent = Math.round(completed / total * 100)
  const rows = Array.from({ length: Math.ceil(list.length / 2) }, (_, index) => [list[index * 2], list[index * 2 + 1]])
  return <section className="phase-section" id={`fase-${phase}`}>
    <div className="phase-head">
      <span className="phase-glyph" aria-hidden="true">{glyph}</span>
      <div><h3>Fase {phase}: {name}</h3><p>{description} · {list.length} áreas</p></div>
      <div className="phase-meter"><strong>{percent}%</strong><div className="phase-bar"><span style={{ width: `${percent}%` }} /></div></div>
    </div>
    <div className="map-track">
      {rows.map(([left, right]) => <div className="map-row" key={left.id}>
        <div className="map-slot left has-node"><MapNode area={left} done={done} query={query} filter={filter} nextId={nextId} open={open} /></div>
        <div className={`map-slot right ${right ? 'has-node' : ''}`}>
          {right && <MapNode area={right} done={done} query={query} filter={filter} nextId={nextId} open={open} />}
        </div>
      </div>)}
      <div className="map-end">Checkpoint {phase} / 6</div>
    </div>
  </section>
}

function TopicGroup({ area, done, required, toggle }: {
  area: Area; done: Done; required: boolean; toggle: (key: string) => void
}) {
  const indices = area.topics.map((_, index) => index).filter(index => area.required.includes(index) === required)
  if (!indices.length) return null
  const completed = indices.filter(index => done[topicKey(area, index)]).length
  return <section className={`topic-section ${required ? 'required' : 'deepening'}`}>
    <div className="topic-section-head"><h3>{required ? 'Obrigatório' : 'Aprofundamento'}</h3><span>{completed}/{indices.length}</span></div>
    <p>{required ? 'Base para construir, avaliar e operar uma aplicação funcional.' : 'Alternativas, detalhes internos e especializações para estudar depois.'}</p>
    <div className="topic-grid">{indices.map(index => {
      const key = topicKey(area, index)
      return <label className={`topic ${done[key] ? 'checked' : ''}`} key={key}>
        <input type="checkbox" checked={Boolean(done[key])} onChange={() => toggle(key)} />
        <span>{area.topics[index]}</span>
      </label>
    })}</div>
  </section>
}

function AreaDialog({ area, done, toggle, close }: {
  area: Area | null; done: Done; toggle: (key: string) => void; close: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (area && dialog && !dialog.open) dialog.showModal()
    if (!area && dialog?.open) dialog.close()
  }, [area])
  const completed = area ? countDone(area, done) : 0
  const percent = area ? Math.round(completed / area.topics.length * 100) : 0
  return <dialog id="detail-dialog" ref={ref} aria-labelledby="detail-title" onClose={close}
    onClick={event => { if (event.target === event.currentTarget) close() }}>
    {area && <>
      <div className="detail-top">
        <button className="detail-close" type="button" aria-label="Fechar detalhes" onClick={close}>×</button>
        <span className="detail-phase">Fase {area.phase} · Etapa {String(displayNumber.get(area.id)).padStart(2, '0')}</span>
        <h2 id="detail-title">{area.title}</h2><p>{area.description}</p>
        <div className="detail-progress"><div className="phase-bar"><span style={{ width: `${percent}%` }} /></div><strong>{percent}%</strong></div>
      </div>
      <div className="detail-main">
        <TopicGroup area={area} done={done} required toggle={toggle} />
        <TopicGroup area={area} done={done} required={false} toggle={toggle} />
        <div className="area-subtitle">Materiais para esta área</div>
        <div className="resource-grid">{area.resources.map(resource => <a className="resource" href={resource.url} target="_blank" rel="noopener noreferrer" key={`${resource.type}-${resource.url}`}>
          <small>{resource.type} ↗</small><span>{resource.title}</span>
        </a>)}</div>
        <p className="detail-note">Seu progresso é salvo automaticamente neste navegador. Um tópico vale 10 XP; completar uma fase rende mais 100 XP.</p>
      </div>
    </>}
  </dialog>
}

function App() {
  const done = useProgress(state => state.done)
  const days = useProgress(state => state.days)
  const toggleTopic = useProgress(state => state.toggleTopic)
  const importBackup = useProgress(state => state.importBackup)
  const [selected, setSelected] = useState<Area | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [toast, setToast] = useState('')
  const progress = useMemo(() => metrics(done, days), [done, days])
  const achievements = badges(progress)
  const next = nextArea(done)
  const query = search.toLocaleLowerCase('pt-BR').trim()
  const matches = areas.filter(area => matchesArea(area, done, query, filter)).length

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  function toggle(key: string) {
    const wasDone = Boolean(done[key])
    const before = progress.finishedPhases
    const nextDone = { ...done }
    if (wasDone) delete nextDone[key]
    else nextDone[key] = true
    toggleTopic(key)
    setToast(!wasDone && metrics(nextDone, days).finishedPhases > before ? 'Fase concluída! +100 XP ✦' : wasDone ? 'Tópico reaberto' : '+10 XP · Tópico concluído!')
  }

  function continueJourney() {
    setFilter('all')
    setSearch('')
    requestAnimationFrame(() => {
      const node = document.getElementById(`area-${next.id}`)
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      node?.focus({ preventScroll: true })
    })
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 1, done, days }, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'orbit-progresso.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    setToast('Progresso exportado')
  }

  async function loadBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      importBackup(JSON.parse(await file.text()) as unknown)
      setToast('Progresso importado')
    } catch {
      setToast('Arquivo inválido. Use um JSON exportado pelo Orbit.')
    }
    input.value = ''
  }

  return <>
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação">
        <a className="brand" href="#inicio"><span className="brand-mark" aria-hidden="true">✳</span><span>orbit<span className="brand-dot">.</span></span></a>
        <div className="sidebar-intro">Sua jornada em engenharia de software com IA</div>
        <nav aria-label="Fases do roadmap">{phases.map(([name], index) => {
          const [completed, total] = phaseProgress(index + 1, done)
          return <a className="nav-link" href={`#fase-${index + 1}`} key={name} onClick={() => { setFilter('all'); setSearch('') }}>
            <span className="nav-number">{index + 1}</span>{name}<span>{Math.round(completed / total * 100)}%</span>
          </a>
        })}</nav>
        <div className="sidebar-bottom">
          <div className="level-label">Seu nível <strong>{progress.percent === 100 ? 'Arquiteto orbital' : progress.percent >= 60 ? 'Especialista' : progress.percent >= 25 ? 'Construtor' : 'Explorador'}</strong></div>
          <div className="mini-progress"><span style={{ width: `${progress.percent}%` }} /></div>
          <p>{progress.requiredDone} de {progress.requiredTotal} obrigatórios concluídos</p>
        </div>
      </aside>
      <main id="inicio">
        <header className="topbar"><div className="breadcrumb">Roadmap <span>/</span> Engenharia de Software com IA</div>
          <div className="top-actions"><button className="text-button" type="button" onClick={exportBackup}>Exportar progresso ↗</button>
            <label className="import-button">Importar <input type="file" accept="application/json,.json" onChange={loadBackup} /></label></div>
        </header>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy"><div className="hero-kicker"><span className="live-dot" /> Seu mapa de evolução</div>
            <h1 id="hero-title">Construa sistemas<br /><span>inteligentes de verdade.</span></h1>
            <p>Da arquitetura ao deploy. Avance um conceito por vez, aplique em projetos reais e veja sua evolução tomar forma.</p>
            <div className="hero-actions"><button className="primary-button" type="button" onClick={continueJourney}>Continuar jornada <span aria-hidden="true">↗</span></button>
              <span className="hero-hint">{progress.requiredDone}/{progress.requiredTotal} obrigatórios · {progress.deepDone}/{progress.deepTotal} aprofundamento</span></div>
          </div>
          <div className="orbit-wrap" aria-label={`Progresso obrigatório: ${progress.percent}%`}><div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="orbit-satellite satellite-one" /><div className="orbit-satellite satellite-two" />
            <div className="progress-ring" style={{ background: `conic-gradient(var(--violet) ${progress.percent}%, #2b3454 ${progress.percent}%)` }}><div className="ring-inner"><span>{progress.percent}%</span><small>da trilha obrigatória</small></div></div>
          </div>
        </section>
        <section className="stats" aria-label="Resumo do progresso">
          <div className="stat"><span className="stat-icon purple">✦</span><div><strong>{progress.completed}</strong><span>tópicos concluídos</span></div></div>
          <div className="stat"><span className="stat-icon cyan">◈</span><div><strong>{progress.xp} XP</strong><span>experiência acumulada</span></div></div>
          <div className="stat"><span className="stat-icon coral">◷</span><div><strong>{progress.streak} {progress.streak === 1 ? 'dia' : 'dias'}</strong><span>sequência de estudo</span></div></div>
          <div className="stat"><span className="stat-icon yellow">⌁</span><div><strong>{achievements.filter(badge => badge[3]).length} / 5</strong><span>conquistas desbloqueadas</span></div></div>
        </section>
        <section className="journey" aria-labelledby="journey-title"><div className="section-heading"><div><span className="small-label">Mapa de aprendizagem</span><h2 id="journey-title">Trace seu caminho</h2>
          <p>As etapas vão de 01 a 60. Comece pelos tópicos obrigatórios para colocar o conhecimento em prática; use os de aprofundamento para ampliar seu domínio.</p></div></div>
          <div className="toolbar"><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" placeholder="Encontrar no mapa" aria-label="Encontrar área ou tópico no mapa" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <div className="filter-group" role="group" aria-label="Filtrar áreas">{([['all', 'Todas'], ['pending', 'Em aberto'], ['done', 'Concluídas']] as const).map(([value, label]) =>
              <button type="button" className={`filter ${filter === value ? 'active' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div></div>
          <p className="map-legend"><span><i className="legend-dot" /> Próximo passo</span><span><i className="legend-dot finished" /> Área concluída</span><span><i className="legend-dot extension" /> Aprofundamento</span><span>{matches} {matches === 1 ? 'nó encontrado' : 'nós encontrados'}</span></p>
          <div id="roadmap">{phases.map((_, index) => <PhaseMap phase={index + 1} done={done} query={query} filter={filter} nextId={next.id} open={setSelected} key={index} />)}</div>
          {matches === 0 && <p className="empty-state">Nenhum nó corresponde à busca. Tente outro termo ou filtro.</p>}
        </section>
        <section className="achievements" aria-labelledby="achievements-title"><div className="section-heading"><div><span className="small-label">Conquistas</span><h2 id="achievements-title">Pequenas vitórias, grande jornada</h2></div></div>
          <div className="badge-grid">{achievements.map(([icon, title, description, unlocked]) => <div className={`badge ${unlocked ? '' : 'locked'}`} aria-label={`${title}: ${unlocked ? 'desbloqueada' : 'bloqueada'}`} key={title}>
            <div className="badge-icon">{icon}</div><strong>{title}</strong><p>{description}</p></div>)}</div>
        </section>
        <footer>Feito para aprender construindo. Seu progresso é salvo neste navegador. <span>Orbit / React</span></footer>
      </main>
    </div>
    <AreaDialog area={selected} done={done} toggle={toggle} close={() => setSelected(null)} />
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
  </>
}

export default App
