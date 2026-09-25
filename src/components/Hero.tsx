import type { CSSProperties } from 'react'
import { useMetrics } from '../store/progress'

export function Hero() {
  const progress = useMetrics()
  if (progress.completed > 0) {
    return <h1 id="hero-title" className="sr-only">Construa sistemas inteligentes de verdade.</h1>
  }
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Construa sistemas
          <br />
          <span>inteligentes <span className="no-break">de verdade.</span></span>
        </h1>
        <p>
          Da arquitetura ao deploy. Avance um conceito por vez, aplique em projetos reais
          e veja sua evolução tomar forma.
        </p>
      </div>
      <div className="orbit-wrap" aria-label={`Trilha essencial: ${progress.percent}% concluída`}>
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit-satellite satellite-one" />
        <div className="orbit-satellite satellite-two" />
        <div className="progress-ring" style={{ '--p': `${progress.percent}%` } as CSSProperties}>
          <div className="ring-inner">
            <span>{progress.percent}%</span>
            <small>da trilha essencial</small>
          </div>
        </div>
      </div>
    </section>
  )
}
