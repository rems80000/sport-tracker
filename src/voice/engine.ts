// Shared by the web app and the Google Apps Script worker. No browser dependency.
export const META_MARKER = '\n\n--- Life Hub v1 ---\n'
export const SERVICE_LIST = 'Life Hub — service'
export const SHOPPING_LIST = 'Commissions — Life Hub'
export const NOTES_LIST = 'Notes — Life Hub'
export type IntentKind = 'task' | 'event' | 'shopping' | 'note' | 'review'
export interface Intent {
  kind: IntentKind
  title: string
  items?: string[]
  date?: string
  start?: string
  end?: string
  reason?: string
}
export interface VoiceMeta {
  version: 1
  state: 'queued' | 'processed' | 'review' | 'error'
  intent: Intent
  processedAt?: string
  error?: string
  eventUrl?: string
  outputListId?: string
  outputIds?: string[]
  generatedFor?: string
  captureId?: string
  plannedAt?: string
}
export interface VoiceTask {
  id: string
  title: string
  notes?: string
  status: 'needsAction' | 'completed'
  updated?: string
  due?: string
  deleted?: boolean
  etag?: string
  webViewLink?: string
}

export function unpackNotes(notes = ''): { text: string; meta?: VoiceMeta } {
  const index = notes.lastIndexOf(META_MARKER)
  if (index < 0) return { text: notes }
  try {
    const meta = JSON.parse(notes.slice(index + META_MARKER.length)) as VoiceMeta
    if (meta.version === 1 && ['queued', 'processed', 'review', 'error'].includes(meta.state)
      && ['task', 'event', 'shopping', 'note', 'review'].includes(meta.intent?.kind)
      && typeof meta.intent.title === 'string'
      && (meta.intent.items === undefined || Array.isArray(meta.intent.items) && meta.intent.items.every(item => typeof item === 'string'))
      && ['date', 'start', 'end', 'reason'].every(key => (meta.intent as unknown as Record<string, unknown>)[key] === undefined || typeof (meta.intent as unknown as Record<string, unknown>)[key] === 'string')) return { text: notes.slice(0, index), meta }
  } catch { /* Preserve unrecognized notes verbatim. */ }
  return { text: notes }
}

export function packNotes(text: string, meta: VoiceMeta) {
  const value = text + META_MARKER + JSON.stringify(meta)
  if (value.length > 8192) throw new Error('Les détails sont trop longs pour Google Tasks. Raccourcissez-les avant le traitement.')
  return value
}

export function fold(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’]/g, "'")
}

export function parisDay(reference: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(reference))
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}

// Reject invalid dates, DST gaps and ambiguous times. All times mean Europe/Paris.
export function parisInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const candidates = ['+01:00', '+02:00'].map(offset => new Date(`${date}T${time}:00${offset}`))
    .filter(candidate => !Number.isNaN(candidate.getTime()) && formatter.format(candidate) === `${date} ${time}`)
  return candidates.length === 1 ? candidates[0].toISOString() : null
}

export function validateIntent(intent: Intent, now = new Date().toISOString()): string | null {
  if (!intent.title.trim()) return 'Précisez le contenu de la demande.'
  if (intent.kind === 'review') return intent.reason || 'Choisissez une destination.'
  if (intent.kind === 'shopping' && (!intent.items?.length || intent.items.length > 30 || intent.items.some(item => !item.trim() || item.length > 1024))) return 'Précisez entre 1 et 30 articles, un par ligne.'
  if (intent.kind !== 'event') return null
  if (!intent.date || !intent.start || !intent.end) return 'Précisez la date, l’heure de début et l’heure de fin du rendez-vous.'
  const start = parisInstant(intent.date, intent.start)
  const end = parisInstant(intent.date, intent.end)
  if (!start || !end) return 'Date ou heure invalide ou ambiguë lors du changement d’heure. Choisissez un autre horaire.'
  if (end <= start) return 'L’heure de fin doit suivre l’heure de début, le même jour.'
  if (Date.parse(start) <= Date.parse(now)) return 'Ce rendez-vous est dans le passé. Précisez une date future.'
  return null
}

export function classify(text: string, reference = new Date().toISOString()): Intent {
  const title = text.trim().replace(/^(?:ok google[, :]*|hey google[, :]*)/i, '')
    .replace(/^(?:rappelle[- ]moi (?:de |d['’])?|fais[- ]moi penser (?:à |a ))/i, '').trim()
  const normalized = fold(title)
  const review = (reason: string): Intent => ({ kind: 'review', title, reason })
  if (!title) return review('La demande est vide.')
  if (/^(?:note\b|idee\b|garde (?:cette |l')idee\b|retiens\b|enregistre (?:une |cette )?note\b)/.test(normalized)) {
    const content = title.replace(/^(?:note|idée|idee|garde (?:cette |l['’])idée|retiens|enregistre (?:une |cette )?note)\s*[:,-]?\s*/i, '')
    return content ? { kind: 'note', title: content } : review('Précisez la note à conserver.')
  }
  if (/\b(ne pas|n'|annule|supprime|sauf|peut-etre|si jamais|tous les|toutes les|chaque)\b/.test(normalized)) return review('Cette demande contient une condition, une négation ou une répétition : vérifiez son traitement.')
  if (/\b(?:et|puis)\s+(?:appeler|prendre|reserver|noter|ajouter|bloquer|acheter|rappeler)\b/.test(normalized)) return review('Cette phrase contient plusieurs actions. Séparez-les avant le traitement.')
  if (/^(?:prendre|demander|fixer|reserver)\s+(?:un\s+)?(?:rendez-vous|rendez vous|rdv)\b/.test(normalized)) return { kind: 'task', title }
  if (/^(?:acheter\b|courses\b|commissions\b|(?:ajoute|ajouter)\b.*\b(?:courses|commissions)\b|il faut acheter\b)/.test(normalized)) {
    const content = title.replace(/^(?:il faut acheter|acheter|courses|commissions|ajouter|ajoute)\s*[:,-]?\s*/i, '')
      .replace(/\s+(?:à|a|dans)\s+(?:ma |la |une )?liste (?:de |des )?(?:courses|commissions).*$/i, '').trim()
    if (/\b(?:demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b|\d{1,2}\s*h\b/.test(fold(content))) return review('Vérifiez les articles et leur éventuelle échéance.')
    const items = content.split(/\s*(?:,|;|\n|\bet\b)\s*/i).map(item => item.trim()).filter(Boolean)
    if (!items.length || items.length > 30) return review('Précisez les articles à ajouter aux commissions.')
    return { kind: 'shopping', title, items }
  }
  if (/\b(?:rendez-vous|rendez vous|rdv|reunion)\b|^(?:bloque|bloquer|planifie|planifier)\b/.test(normalized)) {
    let date: string | undefined
    const iso = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/)
    const french = normalized.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
    if (iso) date = iso[1]
    else if (french) date = `${french[3]}-${french[2].padStart(2, '0')}-${french[1].padStart(2, '0')}`
    else if (/\b(?:demain|aujourd'hui)\b/.test(normalized)) {
      const day = new Date(`${parisDay(reference)}T12:00:00Z`)
      if (/\bdemain\b/.test(normalized)) day.setUTCDate(day.getUTCDate() + (/\bapres-demain\b/.test(normalized) ? 2 : 1))
      date = day.toISOString().slice(0, 10)
    }
    const range = normalized.match(/\bde\s+(\d{1,2})\s*(?:h|heures?|:)(\d{2})?\s+a\s+(\d{1,2})\s*(?:h|heures?|:)(\d{2})?\b/)
    const intent: Intent = { kind: 'event', title, date,
      start: range ? `${range[1].padStart(2, '0')}:${range[2] || '00'}` : undefined,
      end: range ? `${range[3].padStart(2, '0')}:${range[4] || '00'}` : undefined }
    intent.reason = validateIntent(intent, reference) || undefined
    return intent
  }
  if (/^(?:appeler|envoyer|payer|faire|prendre|penser|preparer|ranger|nettoyer|verifier|renouveler|reserver|finir|terminer|lire|aller|recuperer|rapporter|reparer|contacter|repondre|remplir|deposer|sortir|tester)\b/.test(normalized)) return { kind: 'task', title }
  return review('Choisissez Tâche, Rendez-vous, Commissions ou Note pour cette formulation.')
}
