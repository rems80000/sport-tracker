import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GuidancePlayer } from '../src/modules/presence/GuidancePlayer.ts'
import { guidedSessions } from '../src/modules/presence/guidedSessions.ts'

globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
function setup() {
  const played = [], notifications = []
  const synth = { getVoices: () => [{ lang: 'fr-FR', voiceURI: 'fr', localService: true }], cancel() {}, speak(item) { played.push(item); item.onstart() } }
  const player = new GuidancePlayer(synth, (...args) => notifications.push(args))
  return { player, played, notifications }
}
test('all five sessions have spaced cues that finish before the timer', () => {
  assert.equal(guidedSessions.length, 5)
  for (const session of guidedSessions) {
    assert.equal(session.guidance[0].at, 0)
    session.guidance.forEach((cue, index) => {
      // Conservative 115 words/minute estimate, with a margin before next cue/end.
      const duration = cue.text.split(/\s+/).length * 60 / 115
      const end = session.guidance[index + 1]?.at ?? session.minutes * 60
      assert.ok(cue.at + duration < end, session.id)
      if (index) assert.ok(cue.at > session.guidance[index - 1].at)
    })
  }
})
test('starts synchronously and never duplicates a cue across timer ticks', () => {
  const { player, played } = setup()
  player.start(guidedSessions[0].guidance)
  player.tick(0); player.tick(1); player.tick(44)
  assert.equal(played.length, 1)
  player.tick(45); player.tick(46)
  assert.equal(played.length, 2)
  assert.equal(played[1].lang, 'fr-FR')
})
test('resume repeats interrupted guidance, but not an already completed cue', () => {
  const { player, played } = setup()
  player.start(guidedSessions[0].guidance)
  player.pause(); player.resume(10)
  assert.equal(played.length, 2)
  played[1].onend()
  player.pause(); player.resume(20)
  assert.equal(played.length, 2)
})
test('a suspended timer skips missed cues rather than queueing them', () => {
  const { player, played } = setup()
  player.start(guidedSessions[0].guidance)
  player.tick(150)
  assert.equal(played.length, 1)
  player.tick(160)
  assert.equal(played.length, 2)
  assert.equal(played[1].text, guidedSessions[0].guidance[3].text)
})
test('mute, stop and restart do not leave queued or stale speech', () => {
  const { player, played, notifications } = setup()
  player.start(guidedSessions[0].guidance)
  const stale = played[0]
  player.enabled = false; player.mute(); player.tick(45)
  assert.equal(played.length, 1)
  player.enabled = true; player.tick(50, true)
  stale.onend()
  assert.deepEqual(notifications.at(-1), [true])
  player.stop(); player.tick(100)
  assert.equal(played.length, 2)
  player.start(guidedSessions[1].guidance)
  assert.equal(played.length, 3)
})
