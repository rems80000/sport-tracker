import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { unpackNotes, packNotes } from '../src/voice/engine.ts'
const compiled = ts.transpileModule(readFileSync(new URL('../src/voice/engine.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText.replace(/^export /gm, '')
const code = compiled + readFileSync(new URL('../automation/Server.gs', import.meta.url), 'utf8')
function setup(seed = []) {
  const values = {}, tasks = { source: seed }, lists = [{id:'source',title:'Mes tâches'}], triggers = [], events = {}, calls = []
  let sequence = 0, failSourceCompletion = false, failInsertResponse = false
  const clone = x => JSON.parse(JSON.stringify(x))
  const ctx = vm.createContext({ console, Intl, Date,
    PropertiesService: { getScriptProperties: () => ({ getProperty:k=>values[k]??null, setProperty:(k,v)=>{values[k]=v}, setProperties:v=>Object.assign(values,v) }) },
    LockService: { getScriptLock:()=>({tryLock:()=>true,waitLock(){},releaseLock(){}}) },
    ScriptApp: { getProjectTriggers:()=>triggers, deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1), newTrigger:name=>({timeBased:()=>({everyMinutes:()=>({create:()=>triggers.push({getHandlerFunction:()=>name})})})}) },
    Utilities: { DigestAlgorithm:{SHA_256:'sha256'}, computeDigest:(_,text)=>[...createHash('sha256').update(text).digest()] },
    Tasks: { Tasklists: { get:()=>clone(lists[0]), list:()=>({items:clone(lists)}), insert:p=>{const list={...p,id:'list'+(++sequence)};lists.push(list);tasks[list.id]=[];return clone(list)} },
      Tasks: { list:(id,options)=>({items:clone(tasks[id].filter(t=>options.showCompleted||t.status!=='completed'))}),
        insert:(p,id)=>{const item={...p,id:'task'+(++sequence),status:'needsAction',updated:new Date().toISOString()};tasks[id].push(item);calls.push(['insert',id]);if(failInsertResponse&&id!=='source'){failInsertResponse=false;throw new Error('Network response lost')}return clone(item)},
        patch:(p,list,id)=>{if(failSourceCompletion&&list==='source'&&p.status==='completed'){failSourceCompletion=false;throw new Error('Transient patch failure')}const item=tasks[list].find(t=>t.id===id);Object.assign(item,p,{updated:new Date().toISOString()});calls.push(['patch',list,id,p]);return clone(item)} } },
    Calendar: { Events: { get:(_,id)=>{if(!events[id])throw new Error('Not Found');return clone(events[id])}, insert:p=>{events[p.id]={...p,htmlLink:'https://calendar.google.com/event?eid='+p.id};return clone(events[p.id])} } },
  })
  vm.runInContext(code, ctx)
  ctx.installer()
  return {ctx,values,tasks,lists,triggers,events,calls,setFailCompletion:()=>{failSourceCompletion=true},setLostResponse:()=>{failInsertResponse=true},add:(title,notes)=>tasks.source.push({id:'source'+(++sequence),title,notes,status:'needsAction',updated:new Date(Date.now()+1000).toISOString()})}
}
test('install is idempotent and does not process pre-existing requests', () => {
  const s=setup([{id:'old',title:'Acheter du lait',updated:'2020-01-01T00:00:00Z',status:'needsAction'}])
  s.ctx.installer();s.ctx.traiterDemandes()
  assert.equal(s.triggers.length,1);assert.equal(s.lists.length,4);assert.equal(s.tasks.source[0].notes,undefined)
  s.ctx.arreter();assert.equal(s.triggers.length,0);assert.equal(s.tasks.source.length,1)
})
test('shopping, notes, tasks and incomplete events route without duplicate outputs', () => {
  const s=setup();s.add('Acheter du lait et des pommes');s.add('Note : partir en Bretagne');s.add('Appeler le garage');s.add('Rendez-vous garage')
  s.ctx.traiterDemandes();s.ctx.traiterDemandes()
  assert.equal(s.tasks[s.values.shoppingListId].length,2);assert.equal(s.tasks[s.values.notesListId].length,1)
  assert.equal(s.tasks.source[0].status,'completed');assert.equal(s.tasks.source[2].status,'needsAction')
  assert.equal(unpackNotes(s.tasks.source[3].notes).meta.state,'review');assert.equal(Object.keys(s.events).length,0)
  const taskPatches=s.calls.filter(c=>c[0]==='patch'&&c[2]===s.tasks.source[2].id)
  assert.ok(taskPatches.every(c=>!('due' in c[3])))
})
test('retry recovers partial success and lost responses without duplicating shopping items', () => {
  const s=setup();s.add('Acheter du pain et des pommes');s.setLostResponse();s.ctx.traiterDemandes()
  assert.equal(unpackNotes(s.tasks.source[0].notes).meta.state,'error')
  s.setFailCompletion();s.ctx.traiterDemandes();s.ctx.traiterDemandes()
  assert.equal(s.tasks[s.values.shoppingListId].length,2);assert.equal(s.tasks.source[0].status,'completed')
})
test('stable Calendar event id prevents duplicates after source update fails', () => {
  const s=setup();s.add('Rendez-vous garage le 25/09/2099 de 14h à 15h');s.setFailCompletion()
  s.ctx.traiterDemandes();s.ctx.traiterDemandes()
  assert.equal(Object.keys(s.events).length,1);assert.equal(s.tasks.source[0].status,'completed')
  const event=Object.values(s.events)[0];assert.equal(event.start.timeZone,'Europe/Paris');assert.equal(event.attendees,undefined)
})
test('manual clarification queues old items and is honored instead of reclassification', () => {
  const s=setup();s.add('Texte vague',packNotes('Détails conservés',{version:1,state:'queued',captureId:'draft-1',intent:{kind:'note',title:'Une note précisée'}}));s.ctx.traiterDemandes()
  assert.equal(s.tasks[s.values.notesListId][0].title,'Une note précisée')
  assert.equal(unpackNotes(s.tasks[s.values.notesListId][0].notes).text,'Détails conservés')
  assert.equal(unpackNotes(s.tasks.source[0].notes).meta.captureId,'draft-1')
})

test('one oversized request does not block following tasks or erase its notes', () => {
  const s=setup();s.add('Acheter du lait','a'.repeat(8180));s.add('Appeler Paul');s.ctx.traiterDemandes()
  assert.equal(s.tasks.source[0].notes,'a'.repeat(8180));assert.equal(unpackNotes(s.tasks.source[1].notes).meta.state,'processed')
})
