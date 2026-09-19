import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createVoiceCapture, listTasks, patchVoiceTask, readVoiceWorkspace } from '../src/cloud/googleTasks.ts'
import { packNotes } from '../src/voice/engine.ts'
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status })
test('reads all pages, completed hidden tasks, and escapes identifiers', async () => {
  const calls=[]; const original=globalThis.fetch
  globalThis.fetch=async url=>{calls.push(String(url));return reply(calls.length===1?{items:[{id:'1'}],nextPageToken:'next'}:{items:[{id:'2'},{id:'3',deleted:true}]})}
  try { const tasks=await listTasks('token','a/b');assert.equal(tasks.length,2);assert.match(calls[0],/a%2Fb/);assert.match(calls[0],/showHidden=true/);assert.match(calls[1],/pageToken=next/) } finally {globalThis.fetch=original}
})
test('patch only requested fields and detects a concurrent edit', async () => {
  const original=globalThis.fetch;let request
  globalThis.fetch=async (_,options)=>{request=options;return reply({},412)}
  try {await assert.rejects(patchVoiceTask('token','list',{id:'id',etag:'etag-old'}, {status:'completed'}),/changé/);assert.equal(request.headers['If-Match'],'etag-old');assert.deepEqual(JSON.parse(request.body),{status:'completed'})} finally {globalThis.fetch=original}
})
test('manual capture retry finds a processed capture instead of inserting again', async () => {
  const original=globalThis.fetch;let calls=0
  globalThis.fetch=async ()=>{calls++;return reply({items:[{id:'existing',notes:packNotes('',{version:1,state:'processed',intent:{kind:'note',title:'idée'},captureId:'draft-1'})}]})}
  try {const task=await createVoiceCapture('token','list','Note : idée','draft-1');assert.equal(task.id,'existing');assert.equal(calls,1)} finally {globalThis.fetch=original}
})
test('missing automation remains absent rather than claiming service is active', async () => {
  const original=globalThis.fetch
  globalThis.fetch=async url=>reply(String(url).includes('/tasks?')?{items:[]}:String(url).endsWith('/%40default')?{id:'source',title:'Mes tâches'}:{items:[{id:'source',title:'Mes tâches'}]})
  try {const result=await readVoiceWorkspace('token');assert.equal(result.health,undefined);assert.equal(result.source.id,'source')} finally {globalThis.fetch=original}
})
