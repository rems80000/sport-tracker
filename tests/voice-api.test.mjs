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

test('loads named lists with their own IDs, dates and completed items', async () => {
  const original=globalThis.fetch
  globalThis.fetch=async url=>{
    const text=String(url)
    if(text.endsWith('/users/@me/lists?maxResults=100'))return reply({items:[{id:'store',title:'Commission Norauto'}]})
    if(text.includes('/%40default'))return reply({id:'source',title:'Entrée'})
    if(text.includes('/lists/store/tasks'))return reply({items:[{id:'tyre',title:'Pneus',due:'2026-10-11T00:00:00Z',status:'completed'}]})
    return reply({items:[]})
  }
  try {
    const result=await readVoiceWorkspace('token');const list=result.lists.find(list=>list.key==='norauto')
    assert.equal(result.lists.length,6);assert.equal(list.id,'store');assert.equal(list.tasks[0].due,'2026-10-11T00:00:00Z');assert.equal(list.tasks[0].status,'completed')
    assert.equal(result.lists.find(list=>list.key==='pets').id,undefined)
  } finally {globalThis.fetch=original}
})
