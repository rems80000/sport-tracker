import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mediaKind } from '../src/modules/guitar/mediaStore.ts'
import { BUILTIN_BACKINGS } from '../src/modules/guitar/backingCatalog.ts'

test('accepts supported local media, including files without a MIME type', () => {
  assert.equal(mediaKind({ name:'tab.pdf', type:'application/pdf', size:100 }), 'pdf')
  assert.equal(mediaKind({ name:'tab.JPG', type:'image/jpeg', size:100 }), 'image')
  assert.equal(mediaKind({ name:'groove.mp3', type:'', size:100 }), 'audio')
  assert.equal(mediaKind({ name:'groove.m4a', type:'video/mp4', size:100 }), 'audio')
})
test('rejects empty, oversized and executable media', () => {
  for (const file of [{name:'tab.pdf',type:'application/pdf',size:0},{name:'groove.wav',type:'audio/wav',size:41*1024*1024},{name:'tab.svg',type:'image/svg+xml',size:100},{name:'x.html',type:'text/html',size:100},{name:'tab.pdf',type:'text/html',size:100}]) assert.throws(() => mediaKind(file))
})
test('all built-in backings are audible eight-bar WAV loops within PWA precache limits', () => {
  for (const track of BUILTIN_BACKINGS) {
    const file=readFileSync(new URL('../public/'+track.path, import.meta.url))
    assert.equal(file.toString('ascii',0,4),'RIFF')
    assert.equal(file.toString('ascii',8,12),'WAVE')
    assert.equal(file.readUInt16LE(22),1)
    const duration=file.readUInt32LE(40)/file.readUInt32LE(28)
    assert.ok(Math.abs(duration-32*60/track.bpm)<.001)
    assert.ok(file.length<4*1024*1024)
    let peak=0,squares=0
    for(let i=44;i<file.length;i+=2){const sample=file.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(sample));squares+=sample*sample}
    assert.ok(peak<.99 && peak>.4)
    assert.ok(Math.sqrt(squares/((file.length-44)/2))>.03)
  }
})
