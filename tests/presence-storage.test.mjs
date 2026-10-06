import { test } from 'node:test'
import assert from 'node:assert/strict'
import { savePresenceAudio, loadPresenceAudio } from '../src/modules/presence/presenceAudio.ts'

function setup() {
  const transactions=[]
  let closed=0
  globalThis.indexedDB={open(){
    const request={}
    const db={close(){closed++},transaction(){
      const dataRequest={result:undefined}
      const tx={objectStore(){return {put(){return dataRequest},get(){return dataRequest}}}}
      transactions.push({tx,request:dataRequest})
      return tx
    }}
    queueMicrotask(()=>{request.result=db;request.onsuccess()})
    return request
  }}
  return {transactions,get closed(){return closed}}
}
test('an audio import is confirmed only after its transaction commits',async()=>{
  const state=setup()
  let settled=false
  const file=new File(['test'],'guide.mp3',{type:'audio/mpeg'})
  const saving=savePresenceAudio('voice',file).then(result=>{settled=true;return result})
  await new Promise(resolve=>setImmediate(resolve))
  const {tx,request}=state.transactions[0]
  request.onsuccess?.()
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(settled,false)
  assert.equal(state.closed,0)
  tx.oncomplete()
  const result=await saving
  assert.equal(result.name,'guide.mp3')
  assert.equal(state.closed,1)
  URL.revokeObjectURL(result.url)
})
test('an abort after a successful write rejects the import and closes the database',async()=>{
  const state=setup()
  const saving=savePresenceAudio('relax',new File(['test'],'fond.mp3'))
  const expected=assert.rejects(saving,/Quota exceeded/)
  await new Promise(resolve=>setImmediate(resolve))
  const {tx,request}=state.transactions[0]
  request.onsuccess?.()
  tx.error=new Error('Quota exceeded')
  tx.onabort()
  await expected
  assert.equal(state.closed,1)
})
test('a committed read returns the file and an empty slot remains empty',async()=>{
  const state=setup()
  const loading=loadPresenceAudio('voice')
  await new Promise(resolve=>setImmediate(resolve))
  const {tx,request}=state.transactions[0]
  request.result=new File(['test'],'guide.mp3')
  request.onsuccess?.();tx.oncomplete()
  const result=await loading
  assert.equal(result.name,'guide.mp3');URL.revokeObjectURL(result.url)
  const missing=loadPresenceAudio('relax')
  await new Promise(resolve=>setImmediate(resolve))
  state.transactions[1].tx.oncomplete()
  assert.equal(await missing,null)
  assert.equal(state.closed,2)
})
