import type { CSSProperties } from 'react'
import { useMetrics } from '../store/progress'

export function Hero({ onContinue }: { onContinue: () => void }) {
  const progress = useMetrics()
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="live-dot" /> Seu mapa de evolução</div>
        <h1 id="hero-title">
          Construa sistemas
          <br />
          <span>inteligentes de verdade.</span>
        </h1>
        <p>
          Da arquitetura ao deploy. Avance um conceito por vez, aplique em projetos reais
          e veja sua evolução tomar forma.
        </p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onContinue}>
            Continuar jornada <span aria-hidden="true">↗</span>
          </button>
          <span className="hero-hint">
            {progress.requiredDone}/{progress.requiredTotal} obrigatórios
            · {progress.deepDone}/{progress.deepTotal} aprofundamento
          </span>
        </div>
      </div>
      <div className="orbit-wrap" aria-label={`Progresso obrigatório: ${progress.percent}%`}>
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit-satellite satellite-one" />
        <div className="orbit-satellite satellite-two" />
        <div className="progress-ring" style={{ '--p': `${progress.percent}%` } as CSSProperties}>
          <div className="ring-inner">
            <span>{progress.percent}%</span>
            <small>da trilha obrigatória</small>
          </div>
        </div>
      </div>
    </section>
  )
}
