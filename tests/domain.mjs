import assert from 'node:assert/strict'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { areas, areasByPhase } = await server.ssrLoadModule('/src/data/roadmap.ts')
const {
  areaState, badges, CHALLENGE_XP, goalsLine, isChallengeUnlocked, levelFor, localDay, metrics, nextGoals,
  nextTopic, percent, phaseState, PHASE_XP, streak, toggleChallengeFeedback, toggleFeedback, TOPIC_XP,
} = await server.ssrLoadModule('/src/domain/progress.ts')
const { matchesArea, normalizeQuery } = await server.ssrLoadModule('/src/domain/filter.ts')
const { cleanProgress, parseBackup } = await server.ssrLoadModule('/src/domain/backup.ts')
const {
  combineProgress, decodeProgress, encodeProgress, newTopicsCount,
} = await server.ssrLoadModule('/src/domain/share.ts')
const { answerReview, pickReview, REVIEW_INTERVALS, timeAgo } = await server.ssrLoadModule('/src/domain/review.ts')

// dias atrás, no formato do progresso ('YYYY-MM-DD', fuso local) — usado nos testes de revisão espaçada.
// setDate (não subtração em ms) para não tropeçar em horário de verão, como o resto do arquivo já faz.
function daysAgo(n) {
  const date = new Date()
  date.setDate(date.getDate() - n)
  return localDay(date)
}

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

assert.throws(() => parseBackup({ version: 5, done: {}, days: [] }))
assert.deepEqual(parseBackup({ version: 3, done: {}, days: [], challenges: { 1: '2026-09-25' } }).challenges, { 1: '2026-09-25' })

const area1 = areas.find(area => area.id === 1)
const firstEssential = area1.topics.find(topic => topic.required)

// v4: aceita doneAt/reviews, e um tópico concluído sem doneAt migra para a data passada como `today`
const v4Backup = parseBackup(
  { version: 4, done: { [firstEssential.id]: true }, days: [], doneAt: {}, reviews: {} }, '2026-01-10',
)
assert.equal(v4Backup.doneAt[firstEssential.id], '2026-01-10')
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

// F02: link de progresso - ida e volta com tudo concluído (557 tópicos + 60 dias + 14 desafios)
const allTopicsDoneLink = Object.fromEntries(areas.flatMap(area => area.topics).map(topic => [topic.id, true]))
const allChallengesDoneLink = Object.fromEntries(
  areas.filter(area => area.challenge).map(area => [String(area.id), localDay()]),
)
const last60Days = Array.from({ length: 60 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - i)
  return localDay(date)
})
const fullProgress = { done: allTopicsDoneLink, days: last60Days, challenges: allChallengesDoneLink }
const fullLink = encodeProgress(fullProgress)
console.log(`domain: link de progresso completo tem ${fullLink.length} caracteres`)
assert(fullLink.length < 1500)
const roundTrip = decodeProgress(fullLink)
assert.deepEqual(roundTrip.done, allTopicsDoneLink)
assert.deepEqual(new Set(roundTrip.days), new Set(last60Days))
assert.deepEqual(roundTrip.challenges, allChallengesDoneLink)

// Ida e volta com progresso vazio
const emptyRoundTrip = decodeProgress(encodeProgress({ done: {}, days: [], challenges: {} }))
assert.deepEqual(emptyRoundTrip, { done: {}, days: [], challenges: {}, doneAt: {}, reviews: {} })

// Link com segmento de área inexistente: ignora o segmento ruim, mantém o resto
const area1FirstEssential = area1.topics.find(topic => topic.required)
const oneTopicLink = encodeProgress({ done: { [area1FirstEssential.id]: true }, days: [], challenges: {} })
const [, areaSegment, daysSegment, challengesSegment] = oneTopicLink.split('~')
const withUnknownArea = decodeProgress(`1~9999.${areaSegment.split('.')[1]},${areaSegment}~${daysSegment}~${challengesSegment}`)
assert.deepEqual(withUnknownArea.done, { [area1FirstEssential.id]: true })

// Link com bits além dos tópicos reais da área: nunca inventa um id de tópico inexistente
const overflowBits = decodeProgress('1~2._w~~')
assert(Object.keys(overflowBits.done).every(id => area2.topics.some(topic => topic.id === id)))

// Segmento de área adulterado (bits ilegíveis): ignora e não quebra o link inteiro
const garbledLink = decodeProgress('1~2.####~~')
assert.deepEqual(garbledLink.done, {})

// Prefixo de versão inválido ou link sem a forma esperada lança erro
assert.throws(() => decodeProgress('2~~~'))
assert.throws(() => decodeProgress('lixo'))

// combineProgress: união nunca desmarca o que já existia localmente
const localState = { done: { [area1FirstEssential.id]: true }, days: ['2026-09-20'], challenges: {} }
const area2FirstEssential = area2.topics.find(topic => topic.required)
const incoming = { done: { [area2FirstEssential.id]: true }, days: ['2026-09-21'], challenges: {} }
assert.equal(newTopicsCount(localState.done, incoming.done), 1)
assert.equal(newTopicsCount(localState.done, localState.done), 0)
const combined = combineProgress(localState, incoming)
assert.deepEqual(combined.done, { [area1FirstEssential.id]: true, [area2FirstEssential.id]: true })
assert.deepEqual(new Set(combined.days), new Set(['2026-09-20', '2026-09-21']))

// F03: no link (F02), datas não viajam — tópico que já existia mantém seu doneAt, o novo ganha hoje
const localWithDates = {
  done: { [area1FirstEssential.id]: true },
  days: [],
  challenges: {},
  doneAt: { [area1FirstEssential.id]: '2026-01-01' },
  reviews: {},
}
const incomingLink = { done: { [area2FirstEssential.id]: true }, days: [], challenges: {}, doneAt: {}, reviews: {} }
const combinedWithDates = combineProgress(localWithDates, incomingLink)
assert.equal(combinedWithDates.doneAt[area1FirstEssential.id], '2026-01-01')
assert.equal(combinedWithDates.doneAt[area2FirstEssential.id], localDay())

// F03: revisão espaçada — elegibilidade por degrau (14 / 30 / 90 dias), 1 por dia, desempate e as duas respostas
const todayStr = localDay()
assert.deepEqual(REVIEW_INTERVALS, [14, 30, 90])
const reviewData = overrides => ({ done: {}, days: [], challenges: {}, doneAt: {}, reviews: {}, ...overrides })

// Degrau 0 (sem revisão ainda): referência é `doneAt`, intervalo de 14 dias
const step0Early = reviewData({
  done: { [area1FirstEssential.id]: true }, doneAt: { [area1FirstEssential.id]: daysAgo(13) },
})
assert.equal(pickReview(step0Early, todayStr), null)
const step0Ready = reviewData({
  done: { [area1FirstEssential.id]: true }, doneAt: { [area1FirstEssential.id]: daysAgo(14) },
})
assert.equal(pickReview(step0Ready, todayStr).id, area1FirstEssential.id)

// Degrau 1: referência passa a ser `reviews[id].at`, intervalo de 30 dias
const step1Early = reviewData({
  done: { [area1FirstEssential.id]: true },
  doneAt: { [area1FirstEssential.id]: daysAgo(200) },
  reviews: { [area1FirstEssential.id]: { at: daysAgo(29), step: 1 } },
})
assert.equal(pickReview(step1Early, todayStr), null)
const step1Ready = reviewData({
  done: { [area1FirstEssential.id]: true },
  doneAt: { [area1FirstEssential.id]: daysAgo(200) },
  reviews: { [area1FirstEssential.id]: { at: daysAgo(30), step: 1 } },
})
assert.equal(pickReview(step1Ready, todayStr).id, area1FirstEssential.id)

// Degrau 2: intervalo de 90 dias
const step2Ready = reviewData({
  done: { [area1FirstEssential.id]: true },
  doneAt: { [area1FirstEssential.id]: daysAgo(200) },
  reviews: { [area1FirstEssential.id]: { at: daysAgo(90), step: 2 } },
})
assert.equal(pickReview(step2Ready, todayStr).id, area1FirstEssential.id)

// Graduado (degrau 3, interno): já passou por uma revisão de 90 dias, sai do ciclo para sempre
const graduated = reviewData({
  done: { [area1FirstEssential.id]: true },
  doneAt: { [area1FirstEssential.id]: daysAgo(400) },
  reviews: { [area1FirstEssential.id]: { at: daysAgo(400), step: 3 } },
})
assert.equal(pickReview(graduated, todayStr), null)

// Só essenciais entram no ciclo, mesmo que um extra esteja concluído há muito tempo
const extraTopic = area1.topics.find(topic => !topic.required)
if (extraTopic) {
  const extraOnly = reviewData({ done: { [extraTopic.id]: true }, doneAt: { [extraTopic.id]: daysAgo(400) } })
  assert.equal(pickReview(extraOnly, todayStr), null)
}

// No máximo uma revisão por dia: já respondida hoje (em qualquer tópico), nada mais aparece
const dailyLimit = reviewData({
  done: { [area1FirstEssential.id]: true, [area2FirstEssential.id]: true },
  doneAt: { [area1FirstEssential.id]: daysAgo(14), [area2FirstEssential.id]: daysAgo(14) },
  reviews: { [area2FirstEssential.id]: { at: todayStr, step: 0 } },
})
assert.equal(pickReview(dailyLimit, todayStr), null)

// Desempate por menor id (área 1 antes da área 2, não a ordem lexicográfica da string)
const tie = reviewData({
  done: { [area1FirstEssential.id]: true, [area2FirstEssential.id]: true },
  doneAt: { [area1FirstEssential.id]: daysAgo(14), [area2FirstEssential.id]: daysAgo(14) },
})
assert.equal(pickReview(tie, todayStr).id, area1FirstEssential.id)

// Escolha determinística: o mais atrasado vence, mesmo estando em outra área
const overdue = reviewData({
  done: { [area1FirstEssential.id]: true, [area2FirstEssential.id]: true },
  doneAt: { [area1FirstEssential.id]: daysAgo(15), [area2FirstEssential.id]: daysAgo(40) },
})
assert.equal(pickReview(overdue, todayStr).id, area2FirstEssential.id)

// answerReview: "Lembro" avança o degrau; no degrau 2, avança para o graduado (encerra o ciclo)
const afterRemember0 = answerReview(step0Ready, area1FirstEssential.id, true, todayStr)
assert.deepEqual(afterRemember0.reviews[area1FirstEssential.id], { at: todayStr, step: 1 })
const afterRemember2 = answerReview(step2Ready, area1FirstEssential.id, true, todayStr)
assert.equal(afterRemember2.reviews[area1FirstEssential.id].step, 3)

// answerReview: "Rever" nunca pune — volta ao degrau 0 e o tópico continua concluído
const afterReview = answerReview(step2Ready, area1FirstEssential.id, false, todayStr)
assert.deepEqual(afterReview.reviews[area1FirstEssential.id], { at: todayStr, step: 0 })
assert.equal(afterReview.done[area1FirstEssential.id], true)

// answerReview num tópico não concluído: não cria revisão nenhuma (defensivo)
assert.equal(answerReview(reviewData(), 'id-inexistente', true, todayStr).reviews['id-inexistente'], undefined)

// timeAgo: texto do tempo passado, coerente com os limiares de revisão
assert.equal(timeAgo(14), 'há 2 semanas')
assert.equal(timeAgo(20), 'há 3 semanas')
assert.equal(timeAgo(30), 'há 1 mês')
assert.equal(timeAgo(90), 'há 3 meses')
assert.equal(timeAgo(1), 'há 1 semana')

// Migração (esquema v3 -> v4): tópico já concluído sem doneAt recebe a data da migração, sem perder progresso
const migratedV3 = cleanProgress({ done: { [area1FirstEssential.id]: true }, days: [], challenges: {} }, '2026-02-01')
assert.equal(migratedV3.doneAt[area1FirstEssential.id], '2026-02-01')
assert.deepEqual(migratedV3.reviews, {})

// cleanProgress filtra reviews de tópico não concluído, id inexistente, data ou degrau inválidos
const dirtyReviews = cleanProgress({
  done: { [area1FirstEssential.id]: true },
  days: [],
  challenges: {},
  doneAt: { [area1FirstEssential.id]: '2026-01-01' },
  reviews: {
    [area1FirstEssential.id]: { at: '2026-01-15', step: 1 },
    [area2FirstEssential.id]: { at: '2026-01-15', step: 1 }, // não concluído aqui: descartado
    'id-fantasma': { at: '2026-01-15', step: 1 }, // id inexistente
    [`${area1FirstEssential.id}-2`]: { at: 'não é uma data', step: 1 },
  },
})
assert.deepEqual(dirtyReviews.reviews, { [area1FirstEssential.id]: { at: '2026-01-15', step: 1 } })

await server.close()
console.log(
  'domain: percent, localDay, streak, matchesArea, toggleFeedback, nextTopic, phaseState, areaState, nextGoals, '
  + 'link de progresso (F02) e revisão espaçada (F03) OK',
)
