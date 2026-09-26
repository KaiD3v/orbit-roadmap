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

// F01: as 14 áreas da fase 1 têm desafio, com o formato mínimo (3 a 5 critérios de pronto)
const phase1Areas = areas.filter(area => area.phase === 1)
assert.equal(phase1Areas.length, 14)
assert(phase1Areas.every(area => area.challenge))
assert(areas.every(area => !area.challenge || (
  typeof area.challenge.title === 'string' && area.challenge.title.trim().length > 0
  && typeof area.challenge.brief === 'string' && area.challenge.brief.trim().length > 0
  && Array.isArray(area.challenge.done) && area.challenge.done.length >= 3 && area.challenge.done.length <= 5
  && area.challenge.done.every(item => typeof item === 'string' && item.trim().length > 0)
)))

const legacyDone = { '1:0': true, '1:1': false, '999:0': true }
const saved = new Map([['orbit-roadmap-react-v1', JSON.stringify({ state: { done: legacyDone, days: ['2026-09-25'] }, version: 0 })]])
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key),
}
globalThis.window = { localStorage: globalThis.localStorage }
const { cleanProgress, createBackup, safeProgress } = await server.ssrLoadModule('/src/domain/backup.ts')
const { localDay } = await server.ssrLoadModule('/src/domain/progress.ts')
const { pickReview } = await server.ssrLoadModule('/src/domain/review.ts')
const { useProgress } = await server.ssrLoadModule('/src/store/progress.ts')
const cleaned = cleanProgress({ done: legacyDone, days: ['2026-09-25', '2026-02-30', 'inválido'] })
const firstTopicId = areas.find(area => area.id === 1).topics[0].id
assert.equal(useProgress.getState().done[firstTopicId], true)
useProgress.getState().importBackup({ version: 1, done: legacyDone, days: [] })
assert.equal(createBackup(useProgress.getState()).version, 4)

// Migração v2 -> v3: progresso salvo sem `challenges` (v1/v2) ganha objeto vazio, sem perder done/days
const migratedV2 = safeProgress({ done: legacyDone, days: ['2026-09-25'] })
assert.deepEqual(migratedV2.challenges, {})
assert.equal(migratedV2.done[firstTopicId], true)
assert.deepEqual(migratedV2.days, ['2026-09-25'])

// Migração v3 -> v4 (F03): progresso sem `doneAt`/`reviews` ganha a data de hoje para tópicos já concluídos,
// nunca a data real de conclusão (perdida) — e por isso nenhuma revisão aparece no dia da migração
const migratedV3 = safeProgress({ done: legacyDone, days: ['2026-09-25'], challenges: { 1: '2026-09-25' } })
assert.equal(migratedV3.doneAt[firstTopicId], localDay())
assert.deepEqual(migratedV3.reviews, {})
assert.equal(pickReview(migratedV3, localDay()), null)

// importBackup aceita um backup v2 sem `challenges` e preenche com {}
useProgress.getState().importBackup({ version: 2, done: legacyDone, days: ['2026-09-25'] })
assert.deepEqual(useProgress.getState().challenges, {})

// cleanProgress filtra entradas de challenges inválidas: id sem desafio ou data mal formada
const dirtyChallenges = { 1: '2026-09-25', 999: '2026-09-25', 2: 'não é uma data' }
assert.deepEqual(cleanProgress({ done: {}, days: [], challenges: dirtyChallenges }).challenges, { 1: '2026-09-25' })

// toggleChallenge: marca (com o dia em `days`), desmarca, e ignora id de área sem desafio
useProgress.setState({ done: {}, days: [], challenges: {} })
useProgress.getState().toggleChallenge('1')
assert(useProgress.getState().challenges['1'])
assert.equal(useProgress.getState().days.length, 1)
useProgress.getState().toggleChallenge('1')
assert.equal(useProgress.getState().challenges['1'], undefined)
useProgress.getState().toggleChallenge('999')
assert.equal(useProgress.getState().challenges['999'], undefined)

// mergeProgress (F02, progresso por link): soma sem apagar o que já existe, e devolve quantos tópicos são novos
const secondTopicId = areas.find(area => area.id === 1).topics[1].id
useProgress.setState({ done: { [firstTopicId]: true }, days: ['2026-09-20'], challenges: {} })
const added = useProgress.getState().mergeProgress({
  done: { [secondTopicId]: true, [firstTopicId]: true }, days: ['2026-09-21'], challenges: {},
})
assert.equal(added, 1)
assert.deepEqual(useProgress.getState().done, { [firstTopicId]: true, [secondTopicId]: true })
assert.deepEqual(new Set(useProgress.getState().days), new Set(['2026-09-20', '2026-09-21']))

// toggleTopic (F03): grava `doneAt` ao marcar; ao desmarcar, remove `doneAt` e qualquer revisão daquele tópico
useProgress.setState({ done: {}, days: [], challenges: {}, doneAt: {}, reviews: {} })
useProgress.getState().toggleTopic(firstTopicId)
assert.equal(useProgress.getState().doneAt[firstTopicId], localDay())
useProgress.setState(state => ({ reviews: { ...state.reviews, [firstTopicId]: { at: localDay(), step: 1 } } }))
useProgress.getState().toggleTopic(firstTopicId)
assert.equal(useProgress.getState().doneAt[firstTopicId], undefined)
assert.equal(useProgress.getState().reviews[firstTopicId], undefined)

// answerReview (F03): registra a resposta em `reviews`, sem desmarcar o tópico
useProgress.setState({
  done: { [firstTopicId]: true }, days: [], challenges: {}, doneAt: { [firstTopicId]: '2026-01-01' }, reviews: {},
})
useProgress.getState().answerReview(firstTopicId, true)
assert.deepEqual(useProgress.getState().reviews[firstTopicId], { at: localDay(), step: 1 })
assert.equal(useProgress.getState().done[firstTopicId], true)

await server.close()

assert.deepEqual(cleaned.done, { [firstTopicId]: true })
assert.deepEqual(cleaned.days, ['2026-09-25'])
console.log(`store: ${topics.length} IDs únicos, 14 desafios da fase 1 e migração v1/v2/v3 -> v4 íntegra`)
