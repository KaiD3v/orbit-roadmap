// B06: verificador de links dos materiais (`src/data/areas.ts`). Roda de vez em quando, fora do
// `pnpm test`: HEAD em cada URL única (GET se o HEAD falhar ou não responder) com limite de
// concorrência e timeout, e lista as que não respondem 2xx/3xx. Não conserta nada sozinho.
import { createServer } from 'vite'

const CONCURRENCY = 8
const TIMEOUT_MS = 12_000
const isOkStatus = status => status >= 200 && status < 400

async function fetchWithTimeout(url, method) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { method, signal: controller.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

async function checkUrl(url) {
  try {
    const head = await fetchWithTimeout(url, 'HEAD')
    if (isOkStatus(head.status)) return { url, ok: true, status: head.status }
  } catch {
    // alguns servidores recusam ou derrubam HEAD; tenta GET antes de desistir
  }
  try {
    const get = await fetchWithTimeout(url, 'GET')
    return { url, ok: isOkStatus(get.status), status: get.status }
  } catch (error) {
    return { url, ok: false, status: null, error: error.message }
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length)
  let next = 0
  async function worker_() {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker_))
  return results
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { areas } = await server.ssrLoadModule('/src/data/areas.ts')
await server.close()

const urls = [...new Set(areas.flatMap(area => area.resources.map(resource => resource.url)))]
console.log(`Verificando ${urls.length} URLs únicas de materiais (concorrência ${CONCURRENCY}, timeout ${TIMEOUT_MS}ms)...`)

const results = await runPool(urls, checkUrl, CONCURRENCY)
const broken = results.filter(result => !result.ok)

if (broken.length) {
  console.log('\nQuebrados:')
  for (const result of broken) {
    console.log(`  ${result.status ?? 'erro'}  ${result.url}${result.error ? ` (${result.error})` : ''}`)
  }
}
console.log(`\n${urls.length - broken.length}/${urls.length} OK, ${broken.length} quebrado${broken.length === 1 ? '' : 's'}`)
if (broken.length) process.exitCode = 1
