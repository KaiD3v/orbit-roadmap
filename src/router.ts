import { useSyncExternalStore } from 'react'

// Roteamento por hash: `#/biblioteca` é a rota `/biblioteca`. Hash sem barra (`#fase-2`, `#inicio`) é âncora
// dentro da página inicial, e `#p=…` é o progresso por link (App): os dois ficam na rota `/`.
// Hash e não caminho de URL: funciona em qualquer hospedagem estática e offline (PWA) sem configurar fallback.
export type Path = `/${string}`

export const pathFromHash = (hash: string): Path => (hash.startsWith('#/') ? hash.slice(1) as Path : '/')

export const href = (path: Path) => `#${path}`

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function usePath(): Path {
  return useSyncExternalStore(subscribe, () => pathFromHash(location.hash), () => '/')
}
