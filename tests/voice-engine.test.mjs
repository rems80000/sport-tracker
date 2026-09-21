import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, packNotes, unpackNotes, parisInstant, parisDay, validateIntent } from '../src/voice/engine.ts'
const now = '2026-09-18T12:00:00Z'

test('classifies explicit shopping, notes and ordinary tasks without mixing their content', () => {
  assert.deepEqual(classify('Acheter du lait et des pommes', now).items, ['du lait', 'des pommes'])
  assert.equal(classify('Note : penser à acheter une voiture', now).kind, 'note')
  assert.equal(classify('Fais-moi penser à appeler le garage', now).kind, 'task')
  assert.equal(classify('Rappelle-moi de préparer le sac', now).kind, 'task')
  assert.equal(classify('Ajouter du pain à ma liste de courses', now).kind, 'shopping')
})
test('ambiguous, compound, negative and recurring instructions need review', () => {
  for (const phrase of ['Bonjour', 'Ne pas acheter de pain', 'Acheter du lait et appeler Paul', 'Appeler Paul chaque lundi', 'Acheter du lait demain']) assert.equal(classify(phrase, now).kind, 'review', phrase)
})
test('appointments require an explicit date and both times; never infer from reminder due', () => {
  const intent = classify('Rendez-vous garage le 25/09/2026 de 14 h à 15 h', now)
  assert.equal(intent.kind, 'event'); assert.equal(intent.date, '2026-09-25'); assert.equal(intent.start, '14:00'); assert.equal(intent.end, '15:00')
  assert.equal(validateIntent(intent, now), null)
  assert.ok(validateIntent(classify('Rendez-vous garage à 14 h', now), now))
  assert.equal(classify('Prendre rendez-vous chez le dentiste', now).kind, 'task')
  assert.equal(classify('Réunion demain de 9h30 à 10h30', now).date, '2026-09-19')
})
test('Paris dates and DST, impossible dates, past and inverted events', () => {
  assert.equal(parisDay('2026-09-18T23:30:00Z'), '2026-09-19')
  assert.equal(parisInstant('2026-09-25', '14:00'), '2026-09-25T12:00:00.000Z')
  assert.equal(parisInstant('2026-12-25', '14:00'), '2026-12-25T13:00:00.000Z')
  assert.equal(parisInstant('2026-03-29', '02:30'), null)
  assert.equal(parisInstant('2026-10-25', '02:30'), null)
  assert.equal(parisInstant('2026-02-30', '10:00'), null)
  assert.equal(parisInstant('2026-09-25', '25:00'), null)
  assert.ok(validateIntent({kind:'event', title:'test', date:'2026-09-25', start:'15:00', end:'14:00'}, now))
  assert.ok(validateIntent({kind:'event', title:'test', date:'2025-09-25', start:'14:00', end:'15:00'}, now))
})
test('preserves user notes and refuses truncation', () => {
  const meta = { version:1, state:'queued', intent:{ kind:'note', title:'Mon idée' } }
  const text = 'Texte personnel\navec accents é et liens https://exemple.fr'
  assert.deepEqual(unpackNotes(packNotes(text, meta)), {text, meta})
  assert.equal(unpackNotes('Texte\n\n--- Life Hub v1 ---\npas du json').text, 'Texte\n\n--- Life Hub v1 ---\npas du json')
  assert.throws(() => packNotes('a'.repeat(8192), meta), /longs/)
})

test('extra destinations and scheduled dates remain explicit without inventing a reminder time', async () => {
  const { EXTRA_LISTS, scheduledDay, scheduledLabel } = await import('../src/voice/engine.ts')
  for (const list of EXTRA_LISTS) {
    const intent=classify(list.title+' : exemple')
    assert.equal(intent.destination,list.key);assert.equal(intent.kind,list.kind);assert.equal(validateIntent(intent),null)
  }
  assert.equal(classify('Acheter des vis chez Leroy Merlin').destination,'leroy')
  assert.equal(classify('Acheter du lait au supermarché').destination,'supermarket')
  assert.equal(classify('Acheter des pneus chez Norauto').destination,'norauto')
  assert.equal(classify('Acheter une laisse en animalerie').destination,'pets')
  assert.equal(classify('Acheter du savon à la pharmacie').destination,'pharmacy')
  assert.equal(classify('Regarder le film Dune').destination,'watchlist')
  assert.equal(scheduledDay('2026-10-11T00:00:00.000Z'),'2026-10-11')
  assert.match(scheduledLabel('2026-11-11T00:00:00.000Z'),/11 novembre 2026/)
  assert.equal(scheduledDay('2026-02-31T00:00:00Z'),null)
  assert.equal(scheduledLabel(undefined),null)
  assert.ok(validateIntent({kind:'shopping',title:'exemple',items:['exemple'],destination:'invalid'}))
})
