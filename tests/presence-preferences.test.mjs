import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readAudioPreference, rememberAudioPreference } from '../src/modules/presence/audioPreferences.ts'

test('audio preferences keep existing keys and work when storage is blocked or full', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    const values = new Map([['presence_voice_v2', 'french-voice'], ['presence_ambience_v1', 'waves']])
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    } })
    assert.equal(readAudioPreference('presence_voice_v2'), 'french-voice')
    assert.equal(readAudioPreference('presence_ambience_v1'), 'waves')
    rememberAudioPreference('presence_ambience_v1', 'rain')
    assert.equal(values.get('presence_ambience_v1'), 'rain')

    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError') } })
    assert.equal(readAudioPreference('presence_voice_v2'), null)
    assert.doesNotThrow(() => rememberAudioPreference('presence_voice_v2', ''))

    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: key => values.get(key) ?? null,
      setItem() { throw new Error('QuotaExceededError') },
    } })
    assert.doesNotThrow(() => rememberAudioPreference('presence_ambience_v1', 'forest'))
    assert.equal(readAudioPreference('presence_ambience_v1'), 'rain')
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
