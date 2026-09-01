export interface ParsedGoogleDocTask {
  key: string
  title: string
  details?: string
  done: boolean
  explicitState: boolean
}

const META_LINE = /^(?:capture\s*\/\s*import|source|liste?\s+source|task[- ]?id|note[- ]?id|projet|project|créé(?:e)?\s+le|modifié(?:e)?\s+le)\s*:/i
const SEPARATOR = /^[-_=•·*]{3,}$/

function cleanTitle(value: string) {
  return value
    .replace(/^\s*(?:[-–—•·*]|\d+[.)])\s+/, '')
    .replace(/^\s*(?:\[\s?\]|\[[xX]\]|☐|☑|✅|✓)\s*/, '')
    .trim()
}

export function googleDocTaskKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/\s+/g, ' ')
    .trim()
}

function parsedLine(value: string) {
  const trimmed = value.trim()
  const checked = /^(?:\[[xX]\]|☑|✅|✓)\s*/.test(trimmed)
  const unchecked = /^(?:\[\s?\]|☐)\s*/.test(trimmed)
  const bullet = /^(?:[-–—•·*]|\d+[.)])\s+/.test(trimmed)
  return {
    title: cleanTitle(trimmed),
    done: checked,
    explicitState: checked || unchecked,
    listItem: checked || unchecked || bullet,
  }
}

export function parseGoogleDocTasks(content: string): ParsedGoogleDocTask[] {
  const normalized = content.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []

  const results: ParsedGoogleDocTask[] = []
  const seen = new Set<string>()
  const add = (title: string, details: string[], done: boolean, explicitState: boolean) => {
    const clean = cleanTitle(title)
    const key = googleDocTaskKey(clean)
    if (!clean || !key || seen.has(key) || META_LINE.test(clean) || SEPARATOR.test(clean)) return
    seen.add(key)
    results.push({ key, title: clean, details: details.filter(Boolean).join('\n') || undefined, done, explicitState })
  }

  for (const block of normalized.split(/\n\s*\n+/)) {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line && !SEPARATOR.test(line))
    const actionable = lines.filter(line => !META_LINE.test(line))
    if (!actionable.length) continue

    const listItems = actionable.map(parsedLine).filter(item => item.listItem)
    if (listItems.length) {
      listItems.forEach(item => add(item.title, [], item.done, item.explicitState))
      continue
    }

    const [first, ...details] = actionable
    const item = parsedLine(first)
    add(item.title, details, item.done, item.explicitState)
  }

  return results
}
