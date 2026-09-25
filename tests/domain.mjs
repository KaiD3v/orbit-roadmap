import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { areas, areasByPhase } = await server.ssrLoadModule('/src/data/roadmap.ts')
const {
  areaState, goalsLine, levelFor, localDay, metrics, nextGoals, nextTopic, percent, phaseState, PHASE_XP,
  streak, toggleFeedback, TOPIC_XP,
} = await server.ssrLoadModule('/src/domain/progress.ts')
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
assert.deepEqual(toggleFeedback({}, someTopic.id), { message: `+${TOPIC_XP} XP · Tópico concluído!`, kind: 'topic' })
assert.deepEqual(toggleFeedback({ [someTopic.id]: true }, someTopic.id), { message: 'Tópico desmarcado', kind: 'undo' })

const phase1Topics = areasByPhase.get(1).flatMap(area => area.topics)
const lastTopic = phase1Topics[phase1Topics.length - 1]
const almostDone = Object.fromEntries(phase1Topics.slice(0, -1).map(topic => [topic.id, true]))
const phaseFeedback = toggleFeedback(almostDone, lastTopic.id)
assert.equal(phaseFeedback.kind, 'phase')
assert.equal(phaseFeedback.message, `Fase concluída! +${PHASE_XP} XP ✦`)

assert.throws(() => parseBackup({ version: 3, done: {}, days: [] }))

const area1 = areas.find(area => area.id === 1)
const firstEssential = area1.topics.find(topic => topic.required)
assert.equal(nextTopic({}).area.id, 1)
assert.equal(nextTopic({}).topic.id, firstEssential.id)

const area2 = areas.find(area => area.id === 2)
const area1Essentials = area1.topics.filter(topic => topic.required)
const area1EssentialsDone = Object.fromEntries(area1Essentials.map(topic => [topic.id, true]))
const secondFirstEssential = area2.topics.find(topic => topic.required)
assert.equal(nextTopic(area1EssentialsDone).area.id, 2)
assert.equal(nextTopic(area1EssentialsDone).topic.id, secondFirstEssential.id)

const allDone = Object.fromEntries(areas.flatMap(area => area.topics).map(topic => [topic.id, true]))
assert.equal(nextTopic(allDone), null)

assert.equal(phaseState(1, {}), 'current')
assert.equal(phaseState(2, {}), 'future')
assert.equal(phaseState(1, area1EssentialsDone), 'current')
assert.equal(phaseState(2, area1EssentialsDone), 'future')
assert.equal(phaseState(6, allDone), 'done')

assert.equal(areaState(area1, {}, 1), 'next')
assert.equal(areaState(area1, {}, 2), 'todo')
assert.equal(areaState(area1, { [area1.topics[0].id]: true }, 2), 'progress')
assert.equal(areaState(area1, area1EssentialsDone, 2), 'done')
assert.equal(areaState(area2, area1EssentialsDone, 2), 'next')

const emptyMetrics = metrics({}, [])
const goalsEmpty = nextGoals(emptyMetrics)
assert.equal(goalsEmpty.level.name, 'Construtor')
assert.equal(goalsEmpty.badge.title, 'Primeiro passo')
assert.equal(goalsEmpty.badge.remaining, 1)

// remaining deve ser exatamente o ponto em que levelFor muda de nível (arredondamento incluso)
const allEssentials = areas.flatMap(a => a.topics.filter(t => t.required))
const remaining = goalsEmpty.level.remaining
const justBelow = Object.fromEntries(allEssentials.slice(0, remaining - 1).map(t => [t.id, true]))
const atThreshold = Object.fromEntries(allEssentials.slice(0, remaining).map(t => [t.id, true]))
assert.equal(levelFor(metrics(justBelow, []).percent), 'Explorador')
assert.equal(levelFor(metrics(atThreshold, []).percent), 'Construtor')

const tenDone = Object.fromEntries(areas.flatMap(a => a.topics).slice(0, 10).map(t => [t.id, true]))
const goals10 = nextGoals(metrics(tenDone, []))
assert.equal(goals10.badge.title, 'Consistência')
assert.equal(goals10.badge.remaining, 40)

const emptyLine = goalsLine(emptyMetrics)
assert(emptyLine.startsWith('Falta 1 tópico para Primeiro passo · '))
assert(!emptyLine.includes('Faltam 1 tópico'))
assert(!emptyLine.includes('essencialis'))
assert(emptyLine.includes('essenciais') || emptyLine.includes('1 essencial '))

// toggleFeedback: um caso para cada kind (undo e topic já cobertos acima)
const levelTopicId = allEssentials[remaining - 1].id
const levelFeedback = toggleFeedback(justBelow, levelTopicId)
assert.equal(levelFeedback.kind, 'level')
assert.equal(levelFeedback.message, 'Novo nível: Construtor!')

const area2Essentials = area2.topics.filter(topic => topic.required)
const area2AlmostDone = Object.fromEntries(area2Essentials.slice(0, -1).map(topic => [topic.id, true]))
const area2Last = area2Essentials[area2Essentials.length - 1]
const areaFeedback = toggleFeedback(area2AlmostDone, area2Last.id)
assert.equal(areaFeedback.kind, 'area')
assert(areaFeedback.message.startsWith('Área concluída! Próxima:'))

await server.close()
console.log('domain: percent, localDay, streak, matchesArea, toggleFeedback, nextTopic, phaseState, areaState e nextGoals OK')
