import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GuidancePlayer } from '../src/modules/presence/GuidancePlayer.ts'
import { guidedSessions } from '../src/modules/presence/guidedSessions.ts'
import fs from 'node:fs'

function setup() {
  const audios=[], speech=[], notifications=[]
  const synth={getVoices:()=>[],cancel(){},speak(item){speech.push(item)}}
  const factory=()=>{
    const a={volume:0,paused:false,play(){a.onplaying?.();return Promise.resolve()},pause(){a.paused=true},removeAttribute(){},load(){}}
    audios.push(a);return a
  }
  const player=new GuidancePlayer(synth,(...args)=>notifications.push(args),'/hub/',factory)
  return {player,audios,speech,notifications}
}
globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text}}
test('bundled voice follows cue schedule, changes volume and cancels stale playback',()=>{
  const {player,audios,speech,notifications}=setup()
  player.start(guidedSessions[0].guidance,'voice-calm')
  assert.equal(audios[0].src,'/hub/presence/voice/voice-calm-0.mp3')
  assert.equal(audios[0].playbackRate,.9)
  assert.equal(audios[0].preservesPitch,true)
  assert.equal(speech.length,0)
  player.volume=.3;assert.equal(audios[0].volume,.3)
  player.tick(1);assert.equal(audios.length,1)
  player.pause();assert.equal(audios[0].paused,true)
  player.resume(10);assert.equal(audios.length,2)
  audios[0].onended();assert.deepEqual(notifications.at(-1),[true])
  audios[1].onended();player.pause();player.resume(20);assert.equal(audios.length,2)
  player.tick(150);assert.equal(audios.length,2)
  player.tick(160);assert.equal(audios[2].src,'/hub/presence/voice/voice-calm-3.mp3')
  player.stop();audios[2].onerror();assert.equal(speech.length,0)
})
test('missing recording falls back once, late errors cannot restart a stopped session',async()=>{
  const {player,audios,speech}=setup()
  player.start(guidedSessions[0].guidance,'voice-calm')
  audios[0].onerror();audios[0].onerror()
  assert.equal(speech.length,1)
  player.start(guidedSessions[0].guidance,'voice-calm');player.stop()
  audios[1].onerror();assert.equal(speech.length,1)
})
test('all scheduled cues and six nature recordings are present and fit the PWA size limit',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../public/presence/voice-manifest.json',import.meta.url),'utf8'))
  assert.equal(manifest.length,34)
  for(const session of guidedSessions) for(let index=0;index<session.guidance.length;index++) {
    const file=new URL(`../public/presence/voice/${session.id}-${index}.mp3`,import.meta.url)
    const size=fs.statSync(file).size
    assert.ok(size>1000 && size<4*1024*1024)
    const duration=manifest.find(c=>c.file===`${session.id}-${index}.mp3`).seconds/.9
    const end=session.guidance[index+1]?.at ?? session.minutes*60
    assert.ok(session.guidance[index].at+duration<end,session.id)
  }
  for(const kind of ['rain','waves','forest','fire','stream','night']) {
    assert.ok(fs.statSync(new URL(`../public/presence/ambience/${kind}.mp3`,import.meta.url)).size>1000)
  }
})
