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

// B06: campos opcionais de Resource, quando presentes, respeitam o formato. `topics` só pode apontar
// para um tópico da MESMA área (senão o link "Onde estudar" abriria um tópico de outra área).
for (const area of areas) {
  const areaTopicIds = new Set(area.topics.map(topic => topic.id))
  for (const resource of area.resources) {
    if (resource.topics) {
      assert(resource.topics.length > 0, `${area.title}: "topics" vazio em "${resource.title}"`)
      assert(
        resource.topics.every(id => areaTopicIds.has(id)),
        `${area.title}: "${resource.title}" aponta para tópico fora da área`,
      )
    }
    if (resource.why) assert(resource.why.length <= 140, `${area.title}: "why" longo demais em "${resource.title}"`)
    if (resource.duration) assert(resource.duration.length <= 20, `${area.title}: "duration" longa demais em "${resource.title}"`)
    if (resource.level) assert(['iniciante', 'intermediario', 'avancado'].includes(resource.level))
    if (resource.lang) assert(['pt', 'en'].includes(resource.lang))
  }
}

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
const { cleanProgress, createBackup, NOTE_MAX, parseBackup, safeProgress } = await server.ssrLoadModule('/src/domain/backup.ts')
const { localDay } = await server.ssrLoadModule('/src/domain/progress.ts')
const { pickReview } = await server.ssrLoadModule('/src/domain/review.ts')
const { normalizeResourceUrl } = await server.ssrLoadModule('/src/domain/resources.ts')
const { useProgress } = await server.ssrLoadModule('/src/store/progress.ts')
const cleaned = cleanProgress({ done: legacyDone, days: ['2026-09-25', '2026-02-30', 'inválido'] })
const firstTopicId = areas.find(area => area.id === 1).topics[0].id
assert.equal(useProgress.getState().done[firstTopicId], true)
useProgress.getState().importBackup({ version: 1, done: legacyDone, days: [] })
assert.equal(createBackup(useProgress.getState()).version, 6)

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

// Migração v4 -> v5 (B03): progresso sem `notes` ganha objeto vazio, sem perder o resto
const migratedV4 = safeProgress({
  done: legacyDone, days: ['2026-09-25'], challenges: { 1: '2026-09-25' }, doneAt: {}, reviews: {},
})
assert.deepEqual(migratedV4.notes, {})
assert.equal(migratedV4.done[firstTopicId], true)
assert.deepEqual(migratedV4.days, ['2026-09-25'])

// Migração v5 -> v6 (B06): progresso sem `resourcesRead` ganha objeto vazio, sem perder o resto
const migratedV5 = safeProgress({
  done: legacyDone, days: ['2026-09-25'], challenges: { 1: '2026-09-25' }, doneAt: {}, reviews: {}, notes: {},
})
assert.deepEqual(migratedV5.resourcesRead, {})
assert.equal(migratedV5.done[firstTopicId], true)
assert.deepEqual(migratedV5.days, ['2026-09-25'])

// Migração completa v1 -> v6: um progresso salvo na v1 (chave legada `{área}:{índice}`) chega íntegro
// até o esquema atual, com todos os campos novos preenchidos com o padrão vazio
const migratedV1toV6 = safeProgress({ done: legacyDone, days: ['2026-09-25'] })
assert.deepEqual(migratedV1toV6, {
  done: { [firstTopicId]: true },
  days: ['2026-09-25'],
  challenges: {},
  doneAt: { [firstTopicId]: localDay() },
  reviews: {},
  notes: {},
  resourcesRead: {},
})

// setNote (B03): trim + corta em NOTE_MAX, remove a chave quando fica vazia, ignora tópico inválido.
// Anotar não registra dia de estudo (dias não devem crescer).
useProgress.setState({ done: {}, days: [], challenges: {}, doneAt: {}, reviews: {}, notes: {} })
useProgress.getState().setNote(firstTopicId, '  minha nota  ')
assert.equal(useProgress.getState().notes[firstTopicId], 'minha nota')
assert.deepEqual(useProgress.getState().days, [])
useProgress.getState().setNote(firstTopicId, 'x'.repeat(NOTE_MAX + 50))
assert.equal(useProgress.getState().notes[firstTopicId].length, NOTE_MAX)
useProgress.getState().setNote(firstTopicId, '   ')
assert.equal(useProgress.getState().notes[firstTopicId], undefined)
useProgress.getState().setNote('id-inexistente', 'nota')
assert.equal(useProgress.getState().notes['id-inexistente'], undefined)

// Nota não depende de o tópico estar concluído, e desmarcar não a apaga
useProgress.setState({ done: {}, days: [], challenges: {}, doneAt: {}, reviews: {}, notes: {} })
useProgress.getState().setNote(firstTopicId, 'anotado antes de terminar')
useProgress.getState().toggleTopic(firstTopicId) // marca
assert.equal(useProgress.getState().notes[firstTopicId], 'anotado antes de terminar')
useProgress.getState().toggleTopic(firstTopicId) // desmarca
assert.equal(useProgress.getState().done[firstTopicId], undefined)
assert.equal(useProgress.getState().notes[firstTopicId], 'anotado antes de terminar')

// Backup v5 (B03): ida e volta preserva notas
useProgress.setState({
  done: { [firstTopicId]: true },
  days: [],
  challenges: {},
  doneAt: {},
  reviews: {},
  notes: { [firstTopicId]: 'nota de backup' },
  resourcesRead: {},
})
const notesBackup = createBackup(useProgress.getState())
assert.equal(notesBackup.version, 6)
assert.deepEqual(parseBackup(notesBackup).notes, { [firstTopicId]: 'nota de backup' })

// toggleResourceRead (B06): marca/desmarca com a URL normalizada, sem registrar dia de estudo (como a
// nota); ignora URL que não é de nenhum material do roadmap.
const firstAreaResourceUrl = areas.find(area => area.id === 1).resources[0].url
useProgress.setState({ done: {}, days: [], challenges: {}, doneAt: {}, reviews: {}, notes: {}, resourcesRead: {} })
useProgress.getState().toggleResourceRead(firstAreaResourceUrl)
assert.equal(useProgress.getState().resourcesRead[normalizeResourceUrl(firstAreaResourceUrl)], localDay())
assert.deepEqual(useProgress.getState().days, [])
useProgress.getState().toggleResourceRead(firstAreaResourceUrl)
assert.equal(useProgress.getState().resourcesRead[normalizeResourceUrl(firstAreaResourceUrl)], undefined)
useProgress.getState().toggleResourceRead('https://site-que-nao-existe-no-roadmap.example/artigo')
assert.deepEqual(useProgress.getState().resourcesRead, {})

// Backup v6 (B06): ida e volta preserva materiais lidos
useProgress.setState({
  done: {},
  days: [],
  challenges: {},
  doneAt: {},
  reviews: {},
  notes: {},
  resourcesRead: { [normalizeResourceUrl(firstAreaResourceUrl)]: '2026-09-20' },
})
const resourcesReadBackup = createBackup(useProgress.getState())
assert.equal(resourcesReadBackup.version, 6)
assert.deepEqual(
  parseBackup(resourcesReadBackup).resourcesRead,
  { [normalizeResourceUrl(firstAreaResourceUrl)]: '2026-09-20' },
)

await server.close()

assert.deepEqual(cleaned.done, { [firstTopicId]: true })
assert.deepEqual(cleaned.days, ['2026-09-25'])
console.log(
  `store: ${topics.length} IDs únicos, 14 desafios da fase 1, migração v1..v5 -> v6 íntegra, `
  + 'notas por tópico (B03) e materiais lidos (B06) OK',
)
