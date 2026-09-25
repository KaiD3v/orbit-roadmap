import { useEffect, useMemo, useState } from 'react'
import { areas, orderedAreas, type Area } from './data/roadmap'
import { badges, metrics, nextArea, PHASE_XP, TOPIC_XP, type Done } from './domain/progress'
import { createBackup, useProgress } from './store/progress'
import { AreaDialog } from './components/AreaDialog'
import { BackupControls } from './components/BackupControls'
import { RoadmapMap } from './components/RoadmapMap'
import { matchesArea, type Filter } from './components/roadmapFilter'
import { Sidebar } from './components/Sidebar'
import './App.css'

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
    const nextDone: Done = { ...done }
    if (wasDone) delete nextDone[key]
    else nextDone[key] = true
    toggleTopic(key)
    setToast(!wasDone && metrics(nextDone, days).finishedPhases > progress.finishedPhases ? `Fase concluída! +${PHASE_XP} XP ✦` : wasDone ? 'Tópico reaberto' : `+${TOPIC_XP} XP · Tópico concluído!`)
  }

  function resetView() {
    setFilter('all')
    setSearch('')
  }

  function continueJourney() {
    resetView()
    requestAnimationFrame(() => {
      const node = document.getElementById(`area-${next.id}`)
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      node?.focus({ preventScroll: true })
    })
  }

  return <>
    <div className="app-shell">
      <Sidebar done={done} progress={progress} resetView={resetView} />
      <main id="inicio">
        <header className="topbar">
          <div className="breadcrumb">Roadmap <span>/</span> Engenharia de Software com IA</div>
          <BackupControls backup={createBackup(done, days)} importBackup={importBackup} notify={setToast} />
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
          <div className="stat"><span className="stat-icon yellow">⌁</span><div><strong>{achievements.filter(badge => badge[3]).length} / {achievements.length}</strong><span>conquistas desbloqueadas</span></div></div>
        </section>
        <section className="journey" aria-labelledby="journey-title"><div className="section-heading"><div><span className="small-label">Mapa de aprendizagem</span><h2 id="journey-title">Trace seu caminho</h2>
          <p>As etapas vão de 01 a {orderedAreas.length}. Comece pelos tópicos obrigatórios para colocar o conhecimento em prática; use os de aprofundamento para ampliar seu domínio.</p></div></div>
          <div className="toolbar"><label className="search-field"><span aria-hidden="true">⌕</span><input type="search" placeholder="Encontrar no mapa" aria-label="Encontrar área ou tópico no mapa" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <div className="filter-group" role="group" aria-label="Filtrar áreas">{([['all', 'Todas'], ['pending', 'Em aberto'], ['done', 'Concluídas']] as const).map(([value, label]) =>
              <button type="button" className={`filter ${filter === value ? 'active' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div></div>
          <p className="map-legend"><span><i className="legend-dot" /> Próximo passo</span><span><i className="legend-dot finished" /> Área concluída</span><span><i className="legend-dot extension" /> Aprofundamento</span><span>{matches} {matches === 1 ? 'nó encontrado' : 'nós encontrados'}</span></p>
          <RoadmapMap done={done} query={query} filter={filter} nextId={next.id} open={setSelected} />
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
