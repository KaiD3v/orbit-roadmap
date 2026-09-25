import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { areas } = await server.ssrLoadModule('/src/data/areas.ts')
const topics = areas.flatMap(area => area.topics)
const ids = topics.map(topic => topic.id)

assert(topics.length > 0)
assert.equal(new Set(ids).size, topics.length)
assert(topics.every(topic => typeof topic.title === 'string' && typeof topic.required === 'boolean'))
assert(areas.every(area =>
  ['Material', 'Curso', 'Vídeo', 'Livro'].every(type =>
    area.resources.some(resource =>
      resource.type === type && resource.title.trim() && /^https:\/\//.test(resource.url)),
  ),
))

const legacyDone = { '1:0': true, '1:1': false, '999:0': true }
const saved = new Map([['orbit-roadmap-react-v1', JSON.stringify({ state: { done: legacyDone, days: ['2026-09-25'] }, version: 0 })]])
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key),
}
globalThis.window = { localStorage: globalThis.localStorage }
const { cleanProgress, createBackup } = await server.ssrLoadModule('/src/domain/backup.ts')
const { useProgress } = await server.ssrLoadModule('/src/store/progress.ts')
const cleaned = cleanProgress({ done: legacyDone, days: ['2026-09-25', '2026-02-30', 'inválido'] })
const firstTopicId = areas.find(area => area.id === 1).topics[0].id
assert.equal(useProgress.getState().done[firstTopicId], true)
useProgress.getState().importBackup({ version: 1, done: legacyDone, days: [] })
assert.equal(createBackup(useProgress.getState()).version, 2)
await server.close()

assert.deepEqual(cleaned.done, { [firstTopicId]: true })
assert.deepEqual(cleaned.days, ['2026-09-25'])
console.log(`store: ${topics.length} IDs únicos e migração v1 íntegra`)
