import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { areas, areasByPhase } = await server.ssrLoadModule('/src/data/roadmap.ts')
const {
  areaState, badges, CHALLENGE_XP, goalsLine, isChallengeUnlocked, levelFor, localDay, metrics, nextGoals,
  nextTopic, percent, phaseState, PHASE_XP, streak, toggleChallengeFeedback, toggleFeedback, TOPIC_XP,
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

assert.throws(() => parseBackup({ version: 4, done: {}, days: [] }))
assert.deepEqual(parseBackup({ version: 3, done: {}, days: [], challenges: { 1: '2026-09-25' } }).challenges, { 1: '2026-09-25' })

const area1 = areas.find(area => area.id === 1)
const firstEssential = area1.topics.find(topic => topic.required)
assert.equal(nextTopic({}).area.id, 1)
assert.equal(nextTopic({}).kind, 'topic')
assert.equal(nextTopic({}).topic.id, firstEssential.id)

const area2 = areas.find(area => area.id === 2)
const area1Essentials = area1.topics.filter(topic => topic.required)
const area1EssentialsDone = Object.fromEntries(area1Essentials.map(topic => [topic.id, true]))
const secondFirstEssential = area2.topics.find(topic => topic.required)

// Essenciais da área 1 completos, desafio pendente: o próximo passo é o desafio, ainda na área 1
const area1ChallengeStep = nextTopic(area1EssentialsDone)
assert.equal(area1ChallengeStep.kind, 'challenge')
assert.equal(area1ChallengeStep.area.id, 1)
assert.equal(area1ChallengeStep.challenge.title, area1.challenge.title)

// Desafio marcado: o próximo passo segue para a área 2
const area1ChallengeDone = { 1: localDay() }
assert.equal(nextTopic(area1EssentialsDone, area1ChallengeDone).area.id, 2)
assert.equal(nextTopic(area1EssentialsDone, area1ChallengeDone).topic.id, secondFirstEssential.id)

const allDone = Object.fromEntries(areas.flatMap(area => area.topics).map(topic => [topic.id, true]))
const allChallengesDone = Object.fromEntries(
  areas.filter(area => area.challenge).map(area => [String(area.id), localDay()]),
)
assert.equal(nextTopic(allDone, allChallengesDone), null)
// Tópicos todos feitos mas desafios não: ainda sobra o desafio da primeira área pendente
assert.equal(nextTopic(allDone).kind, 'challenge')

assert.equal(phaseState(1, {}), 'current')
assert.equal(phaseState(2, {}), 'future')
assert.equal(phaseState(1, area1EssentialsDone), 'current')
assert.equal(phaseState(2, area1EssentialsDone), 'future')
assert.equal(phaseState(6, allDone, allChallengesDone), 'done')

// Desafio: libera só quando os essenciais terminam; sem trava rígida (o store decide se permite marcar antes)
assert.equal(isChallengeUnlocked(area1, {}), false)
assert.equal(isChallengeUnlocked(area1, area1EssentialsDone), true)

// XP do desafio soma no total, e entra na contagem de challengesDone
const metricsWithChallenge = metrics({}, [], { 1: localDay() })
assert.equal(metricsWithChallenge.xp, CHALLENGE_XP)
assert.equal(metricsWithChallenge.challengesDone, 1)

// Feedback do desafio: toast grande (kind 'challenge'), desfazer ao desmarcar
assert.deepEqual(toggleChallengeFeedback({}, '1'), { message: `Desafio concluído! +${CHALLENGE_XP} XP`, kind: 'challenge' })
assert.deepEqual(toggleChallengeFeedback({ 1: localDay() }, '1'), { message: 'Desafio desmarcado', kind: 'undo' })

// Conquista "Mão na massa": desbloqueia no primeiro desafio concluído
const handsOn = badges(metrics({}, [], { 1: localDay() })).find(badge => badge.title === 'Mão na massa')
assert.equal(handsOn.unlocked, true)
assert.equal(badges(metrics({}, [], {})).find(badge => badge.title === 'Mão na massa').unlocked, false)

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
