import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import ts from 'typescript'

const engine = readFileSync(new URL('../src/voice/engine.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(engine, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText.replace(/^export /gm, '')
const adapter = readFileSync(new URL('../automation/Server.gs', import.meta.url), 'utf8')
const output = new URL('../public/automation/', import.meta.url)
mkdirSync(output, { recursive: true })
writeFileSync(new URL('LifeHub.gs', output), compiled + '\n' + adapter)
const escaped = (compiled + '\n' + adapter).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
writeFileSync(new URL('source.html', output), '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Code du traitement Life Hub</title><body><pre id="source">' + escaped + '</pre></body></html>')
copyFileSync(new URL('../automation/appsscript.json', import.meta.url), new URL('appsscript.json', output))
console.log('Automatisation Google Apps Script générée.')
