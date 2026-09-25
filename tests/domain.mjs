import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { areas, areasByPhase } = await server.ssrLoadModule('/src/data/roadmap.ts')
const { localDay, percent, PHASE_XP, streak, toggleMessage, TOPIC_XP } = await server.ssrLoadModule('/src/domain/progress.ts')
const { matchesArea, normalizeQuery } = await server.ssrLoadModule('/src/domain/filter.ts')
const { parseBackup } = await server.ssrLoadModule('/src/domain/backup.ts')

assert.equal(percent(0, 0), 0)
assert.equal(percent(1, 3), 33)

assert.equal(localDay(new Date(2026, 0, 5)), '2026-01-05')

const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const dayBeforeYesterday = new Date(today)
dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
assert.equal(streak([localDay(today), localDay(yesterday)]), 2)
assert.equal(streak([localDay(dayBeforeYesterday)]), 0)

const ragArea = areas.find(area => area.id === 18)
assert(matchesArea(ragArea, {}, normalizeQuery('rag'), 'all'))
const evalArea = areas.find(area => area.id === 31)
assert(matchesArea(evalArea, {}, normalizeQuery('AVALIAÇÃO'), 'all'))
assert(!matchesArea(evalArea, {}, normalizeQuery('inexistente'), 'all'))
const evalDone = Object.fromEntries(evalArea.topics.map(topic => [topic.id, true]))
assert(matchesArea(evalArea, evalDone, '', 'done'))
assert(!matchesArea(evalArea, evalDone, '', 'pending'))
assert(matchesArea(evalArea, {}, '', 'pending'))
assert(!matchesArea(evalArea, {}, '', 'done'))

const someTopic = evalArea.topics[0]
assert.equal(toggleMessage({}, someTopic.id), `+${TOPIC_XP} XP · Tópico concluído!`)
assert.equal(toggleMessage({ [someTopic.id]: true }, someTopic.id), 'Tópico desmarcado')

const phase1Topics = areasByPhase.get(1).flatMap(area => area.topics)
const lastTopic = phase1Topics[phase1Topics.length - 1]
const almostDone = Object.fromEntries(phase1Topics.slice(0, -1).map(topic => [topic.id, true]))
assert.equal(toggleMessage(almostDone, lastTopic.id), `Fase concluída! +${PHASE_XP} XP ✦`)

assert.throws(() => parseBackup({ version: 3, done: {}, days: [] }))

await server.close()
console.log('domain: percent, localDay, streak, matchesArea e toggleMessage OK')
