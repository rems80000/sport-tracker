import { useCallback, useEffect, useRef, useState } from 'react'
import { Archive, ArrowRight, Check, Inbox, ListTodo, MessageSquareText, Plus, RefreshCw, Settings2, ShoppingBasket, StickyNote, X } from 'lucide-react'
import type { VoiceWorkspace } from '../cloud/googleTasks'
import { LIFE_HUB_PROJECTS_IMPORTED_EVENT, loadProjectsSnapshot } from '../cloud/moduleStorage'
import { useDriveSync } from '../store/driveSyncContext'
import { classify, EXTRA_LISTS, packNotes, scheduledDay, scheduledLabel, parisDay, unpackNotes, validateIntent } from '../voice/engine'
import type { Destination, Intent, IntentKind, VoiceTask } from '../voice/engine'
import './voiceInbox.css'

type View = Destination | 'inbox' | 'review' | 'task' | 'shopping' | 'note' | 'history'
type Draft = { id: string; title: string }
const DRAFT_KEY = 'life_hub_voice_drafts_v1'
const KINDS: Record<IntentKind, string> = { task: 'Tâche', event: 'Rendez-vous', shopping: 'Commissions', note: 'Note', review: 'À préciser' }
const TABS: { id: View; title: string }[] = [{ id: 'inbox', title: 'Réception' }, { id: 'review', title: 'À préciser' }, { id: 'task', title: 'Tâches' }, { id: 'shopping', title: 'Commissions générales' }, ...EXTRA_LISTS.map(list => ({ id: list.key, title: list.title })), { id: 'note', title: 'Notes' }, { id: 'history', title: 'Historique' }]
function loadDrafts(): Draft[] {
  try { const data = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]'); return Array.isArray(data) ? data.filter(d => typeof d?.id === 'string' && typeof d.title === 'string') : [] } catch { return [] }
}
function clock(value?: string | null) { return value ? new Date(value).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }) : 'Pas encore effectué' }
function groupFor(task: VoiceTask): View {
  const meta = unpackNotes(task.notes).meta
  if (task.status === 'completed' || meta?.state === 'processed' && meta.intent.kind !== 'task') return 'history'
  if (meta?.state === 'review' || meta?.state === 'error') return 'review'
  return meta?.state === 'processed' ? 'task' : 'inbox'
}
function safeUrl(url?: string) {
  try { const parsed = new URL(url || ''); return parsed.protocol === 'https:' && ['calendar.google.com', 'www.google.com'].includes(parsed.hostname) ? url : undefined } catch { return undefined }
}

export function VoiceInbox() {
  const { connected, error: driveError, readVoiceInbox, captureVoiceTask, updateVoiceTask } = useDriveSync()
  const [workspace, setWorkspace] = useState<VoiceWorkspace | null>(null)
  const [view, setView] = useState<View>('inbox')
  const [drafts, setDrafts] = useState(loadDrafts)
  const [text, setText] = useState('')
  const [captureList, setCaptureList] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [setup, setSetup] = useState(false)
  const [editor, setEditor] = useState<VoiceTask | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(() => Date.now())
  const [legacy, setLegacy] = useState(() => loadProjectsSnapshot().data)
  useEffect(() => { const imported = () => setLegacy(loadProjectsSnapshot().data); window.addEventListener(LIFE_HUB_PROJECTS_IMPORTED_EVENT, imported); return () => window.removeEventListener(LIFE_HUB_PROJECTS_IMPORTED_EVENT, imported) }, [])
  const refreshing = useRef(false), working = useRef(false)
  const refresh = useCallback(async () => {
    if (refreshing.current || !navigator.onLine) return
    refreshing.current = true
    try { setWorkspace(await readVoiceInbox()); setError('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Lecture de Google Tasks impossible.') }
    finally { refreshing.current = false }
  }, [readVoiceInbox])
  useEffect(() => {
    const network = () => { setOnline(navigator.onLine); setNow(Date.now()) }
    const clockTimer = setInterval(() => setNow(Date.now()), 60_000)
    window.addEventListener('online', network); window.addEventListener('offline', network)
    return () => { clearInterval(clockTimer); window.removeEventListener('online', network); window.removeEventListener('offline', network) }
  }, [])
  useEffect(() => {
    if (!connected || !online) return
    const first = setTimeout(() => void refresh(), 0)
    const visibleRefresh = () => { if (document.visibilityState === 'visible' && !working.current) void refresh() }
    const timer = setInterval(visibleRefresh, 60_000)
    window.addEventListener('focus', visibleRefresh)
    return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener('focus', visibleRefresh) }
  }, [connected, online, refresh])
  function storeDrafts(next: Draft[]) { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); setDrafts(next) }
  async function run(action: () => Promise<void>) {
    if (working.current) return
    working.current = true; setBusy(true); setError(''); setMessage('')
    try { await action() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Cette action n’a pas abouti.') }
    finally { working.current = false; setBusy(false) }
  }
  async function sendDraft(draft: Draft) {
    if (!workspace || !connected) throw new Error('Connectez Google avant d’envoyer votre brouillon.')
    await captureVoiceTask(workspace.source.id, draft.title, draft.id)
    storeDrafts(loadDrafts().filter(item => item.id !== draft.id))
    setMessage('Enregistré dans Google Tasks. ' + (workspace.health?.active ? 'Traitement au prochain passage.' : 'L’automatisation doit encore être activée.'))
    await refresh()
  }
  function capture() {
    if (!text.trim()) return
    void run(async () => {
      const destination = EXTRA_LISTS.find(list => list.key === captureList)
      const draft = { id: crypto.randomUUID(), title: destination ? `${destination.title} : ${text.trim()}` : text.trim() }
      storeDrafts([...loadDrafts(), draft]); setText('')
      if (connected && online && workspace) await sendDraft(draft)
      else setMessage('Brouillon conservé sur cet appareil. Connecte Google puis envoie-le.')
    })
  }
  async function submitIntent(intent: Intent) {
    if (!editor || !workspace) return
    const reason = validateIntent(intent)
    if (reason) { setError(reason); return }
    await run(async () => {
      const parsed = unpackNotes(editor.notes)
      await updateVoiceTask(workspace.source.id, editor, { notes: packNotes(parsed.text, { version: 1, state: 'queued', intent, captureId: parsed.meta?.captureId }) })
      setEditor(null); setMessage('Choix enregistré. Il attend le prochain passage de l’automatisation.'); await refresh()
    })
  }
  const tasks = workspace?.tasks ?? [], health = workspace?.health
  const counts: Record<string, number> = { inbox: drafts.length, review: 0, task: 0, shopping: workspace?.shopping.filter(t => t.status !== 'completed').length ?? 0, note: workspace?.notes.length ?? 0, history: 0 }
  EXTRA_LISTS.forEach(list => { counts[list.key] = workspace?.lists.find(saved => saved.key === list.key)?.tasks.filter(task => task.status !== 'completed').length ?? 0 })
  tasks.forEach(task => counts[groupFor(task)]++)
  const selectedList = workspace?.lists.find(list => list.key === view)
  const listDefinition = EXTRA_LISTS.find(list => list.key === view)
  const displayed = (listDefinition ? selectedList?.tasks ?? [] : view === 'shopping' ? workspace?.shopping ?? [] : view === 'note' ? workspace?.notes ?? [] : tasks.filter(task => groupFor(task) === view)).slice().sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || (scheduledDay(a.due) || '9999').localeCompare(scheduledDay(b.due) || '9999') || (b.updated || '').localeCompare(a.updated || ''))
  const active = Boolean(health?.active && !health.errors && !error && health.lastRun && now - Date.parse(health.lastRun) < 15 * 60_000)
  return <div className="voice-app"><div className="voice-shell">
    <header className="voice-header"><div><p className="voice-eyebrow">LIFE HUB · ASSISTANT PERSONNEL</p><h1>Dis-le. Retrouve-le.</h1><p>Tes demandes, au bon endroit.</p></div><div className="voice-header-actions">
      <button onClick={() => setSetup(!setup)} aria-expanded={setup}><Settings2 size={17} /> Configuration</button>
      {connected && <button className="voice-primary" disabled={busy || !online} onClick={() => void run(refresh)}><RefreshCw size={17} />{busy ? 'Un instant…' : 'Actualiser'}</button>}</div></header>
    <div className="voice-status" role="status"><span className={`voice-dot ${active && online && connected ? 'active' : ''}`} />{!online ? 'Hors connexion · brouillons disponibles' : !connected ? 'Google déconnecté · utilise « Connecter Google » dans la barre en haut' : !health ? 'Réception disponible · automatisation à installer' : !health.active ? 'Automatisation arrêtée' : !health.lastRun ? 'Automatisation installée · premier passage attendu' : active ? 'Automatisation active' : 'Automatisation à vérifier · aucun passage récent'}{health?.lastRun && <small>Dernier passage : {clock(health.lastRun)}</small>}</div>
    {(error || driveError) && <p className="voice-alert" role="alert">{error || driveError}</p>}{message && <p className="voice-success" role="status">{message}</p>}{health?.errors ? <p className="voice-alert">Le traitement signale une erreur : {health.message}</p> : null}
    {setup && <section className="voice-setup"><div className="voice-section-title"><h2>Une entrée, depuis tous tes appareils</h2><button aria-label="Fermer la configuration" onClick={() => setSetup(false)}><X size={18} /></button></div>
      <ol><li><b>Dicte à Google.</b> Les demandes doivent arriver dans la liste Google Tasks « {workspace?.source.title || 'ta liste par défaut'} », avec le même compte sur le téléphone, la montre et l’enceinte.</li><li><b>Active le traitement.</b> Il passe environ toutes les cinq minutes, même avec le Hub fermé. Il examine les tâches nouvelles ou modifiées de cette liste, y compris celles saisies à la main. Aucun service d’IA payant n’est utilisé.</li><li><b>Retrouve le résultat ici.</b> Des règles traitent les formulations explicites. Les autres restent dans « À préciser ». Notes et commissions utilisent des listes Google Tasks dédiées.</li></ol>
      <p><b>Sur l’enceinte :</b> donne l’heure de rappel demandée par Google. Pour un rendez-vous, indique aussi sa date et ses heures dans le texte, ou complète-les ici. Google ne transmet pas l’heure du rappel à cette application.</p>
      <div className="voice-examples"><span>« Acheter du lait et des pommes »</span><span>« Note : idée de week-end à Lille »</span><span>« Rendez-vous garage le 25/09/2026 de 14 h à 15 h »</span></div>
      <details><summary>Installer ou arrêter l’automatisation</summary><p>Dans un projet Google Apps Script, colle LifeHub.gs dans Code.gs et le manifeste dans appsscript.json (visible depuis les paramètres du projet). Exécute « installer » et autorise Google Tasks, Calendar et le déclencheur. Aucun déploiement public n’est nécessaire. La fonction « arreter » désactive ce traitement.</p><div className="voice-links"><a href="https://script.google.com/home/projects/1Cw_Aziy1XGdqfTlTePG_Q1JszmdBb91GIVrTp9-7EgomhmupzBcKoBgv/edit" target="_blank" rel="noreferrer">Ouvrir mon automatisation ↗</a><a href={`${import.meta.env.BASE_URL}automation/LifeHub.gs`} download>Télécharger le script</a><a href={`${import.meta.env.BASE_URL}automation/appsscript.json`} download>Télécharger le manifeste</a></div><p>Les tâches antérieures à l’installation restent à envoyer manuellement depuis Réception. Un traitement réussi termine la demande source, sauf pour une tâche ordinaire qui reste à faire. Son rappel Google est conservé.</p></details>
    </section>}
    <section className="voice-capture" aria-label="Nouvelle demande"><div className="voice-capture-symbol"><MessageSquareText size={26} /></div><div className="voice-capture-content"><label htmlFor="voice-text">Une chose à ne pas oublier ?</label><textarea id="voice-text" value={text} maxLength={1024} onChange={event => setText(event.target.value)} placeholder="Écris ici, ou utilise le micro de ton clavier…" rows={2} /><label className="voice-list-picker">Liste de destination<select value={captureList} onChange={event => setCaptureList(event.target.value)}><option value="">Automatique selon la demande</option>{EXTRA_LISTS.map(list => <option key={list.key} value={list.key}>{list.title}</option>)}</select></label><div className="voice-capture-footer"><span>La voix passe par Google. Tu peux aussi écrire ici.</span><button className="voice-primary" disabled={!text.trim() || busy} onClick={capture}><Plus size={17} />{connected && online && workspace ? 'Ajouter la demande' : 'Garder en brouillon'}</button></div></div></section>
    <div className="voice-content"><nav className="voice-tabs" aria-label="Demandes et listes">{TABS.map(({ id, title }) => <button key={id} onClick={() => { setView(id); setCaptureList(EXTRA_LISTS.some(list => list.key === id) ? id : "") }} aria-current={view === id ? 'page' : undefined}><span>{title}</span><b>{counts[id]}</b></button>)}<a className="voice-google" href="https://tasks.google.com/" target="_blank" rel="noreferrer">Ouvrir Google Tasks ↗</a></nav>
      <section className="voice-feed" aria-label={TABS.find(tab => tab.id === view)?.title}><div className="voice-feed-header"><div><p className="voice-eyebrow">{view === 'history' ? 'CE QUI A ÉTÉ TRAITÉ' : 'TON ESPACE'}</p><h2>{TABS.find(tab => tab.id === view)?.title}</h2></div><span>{workspace ? `Actualisé le ${clock(workspace.fetchedAt)}` : 'En attente de connexion'}</span></div>
        {view === 'inbox' && drafts.map(draft => <article className="voice-item" key={draft.id}><div className="voice-item-icon"><MessageSquareText size={19} /></div><div className="voice-item-body"><span className="voice-tag">Brouillon · cet appareil</span><h3>{draft.title}</h3><p>Pas encore envoyé à Google.</p></div><button disabled={!connected || !online || busy} onClick={() => void run(() => sendDraft(draft))}>Envoyer <ArrowRight size={16} /></button></article>)}
        {displayed.map(task => {
          const parsed = unpackNotes(task.notes), meta = parsed.meta, intent = listDefinition ? { kind: listDefinition.kind, title: task.title } : meta?.intent ?? classify(task.title, task.updated)
          const day = scheduledDay(task.due), dateLabel = scheduledLabel(task.due)
          const today = parisDay(new Date(now).toISOString())
          const Icon = intent.kind === 'shopping' ? ShoppingBasket : intent.kind === 'note' ? StickyNote : ListTodo
          const canEdit = !listDefinition && view !== 'note' && view !== 'shopping' && task.status !== 'completed' && !meta?.generatedFor && (!meta || meta.state === 'review'), url = safeUrl(meta?.eventUrl)
          const checkable = Boolean(listDefinition) || view === 'shopping' || view === 'task'
          return <article className={`voice-item ${task.status === 'completed' && checkable ? 'is-done' : ''}`} key={task.id}>
            {checkable ? <button className="voice-check" aria-label={`${task.status === 'completed' ? 'Réactiver' : 'Terminer'} ${task.title}`} disabled={!connected || !online || busy} onClick={() => void run(async () => { const list = listDefinition ? selectedList?.id : view === 'shopping' ? health?.shoppingListId : workspace?.source.id; if (list) { await updateVoiceTask(list, task, { status: task.status === 'completed' ? 'needsAction' : 'completed' }); await refresh() } })}>{task.status === 'completed' && <Check size={17} />}</button> : <div className={`voice-item-icon ${intent.kind}`}><Icon size={19} /></div>}
            <div className="voice-item-body"><div className="voice-item-meta"><span className="voice-tag">{KINDS[intent.kind]}</span><small>{view === 'note' ? 'Enregistrée' : task.status === 'completed' ? 'Terminée' : meta?.state === 'queued' ? 'En attente du traitement' : meta?.state === 'error' ? 'Nouvelle tentative prévue' : meta?.state === 'review' ? 'À préciser' : meta?.state === 'processed' ? 'À faire dans Google Tasks' : 'Reçue dans Google Tasks'}</small></div><h3>{task.title}</h3>{dateLabel && <p className={`voice-schedule ${day && day < today && task.status !== 'completed' ? 'is-overdue' : ''}`}><time dateTime={day || undefined}>Planifiée le {dateLabel}</time>{day === today && ' · Aujourd’hui'}{day && day < today && task.status !== 'completed' && ' · Date passée'}</p>}{parsed.text && <p className="voice-detail">{parsed.text}</p>}{(meta?.intent.reason || meta?.error) && <p>{meta.error || meta.intent.reason}</p>}{intent.kind === 'event' && intent.date && <p>{intent.date} · {intent.start || 'Début à préciser'} → {intent.end || 'Fin à préciser'} · Paris</p>}{meta?.state === 'processed' && intent.kind === 'shopping' && Boolean(intent.items?.length) && <p>{intent.items?.length} article(s) ajouté(s) aux commissions.</p>}{url && <a href={url} target="_blank" rel="noreferrer">Voir dans Google Calendar ↗</a>}</div>
            {canEdit && <button disabled={!connected || !online || busy} onClick={() => { setError(''); setEditor(task) }}>Préciser <ArrowRight size={16} /></button>}</article>
        })}
        {displayed.some(task => scheduledDay(task.due)) && <p className="voice-schedule-help">Google transmet la date, mais pas l’heure ni la répétition du rappel. <a href="https://tasks.google.com/" target="_blank" rel="noreferrer">Voir la planification complète dans Google Tasks ↗</a></p>}
        {listDefinition && connected && !selectedList?.id && <p className="voice-schedule-help">Cette liste sera disponible après le prochain passage du script mis à jour. Puis clique sur Actualiser.</p>}
        {!displayed.length && !(view === 'inbox' && drafts.length) && <div className="voice-empty"><Inbox size={38} strokeWidth={1.3} /><h3>{!connected ? 'Tes demandes t’attendent dans Google.' : view === 'review' ? 'Rien à préciser pour le moment.' : 'Un peu de place dans la tête.'}</h3><p>{!connected ? 'Connecte le même compte que sur ta montre et ton téléphone.' : view === 'inbox' ? 'Tes nouvelles tâches Google apparaîtront ici après actualisation.' : 'Les éléments de cette rubrique apparaîtront ici.'}</p></div>}
      </section></div>
    <details className="voice-legacy"><summary><Archive size={16} /> Anciens projets conservés · {legacy.nodes.length}</summary><p>Ces données restent dans ta sauvegarde. Elles ne sont pas envoyées au nouveau traitement.</p><button onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(legacy, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'anciens-projets-life-hub.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }}>Exporter les anciens projets</button>{legacy.nodes.map(node => <article key={node.id}><h3>{node.title}</h3><p>{node.notes}</p><ul>{node.tasks?.map(task => <li key={task.id}>{task.done ? '✓' : '○'} {task.title}{task.details && ` — ${task.details}`}</li>)}</ul></article>)}</details>
  </div>{editor && <IntentEditor task={editor} busy={busy} error={error} onClose={() => setEditor(null)} onSave={submitIntent} />}</div>
}

function IntentEditor({ task, busy, error, onClose, onSave }: { task: VoiceTask; busy: boolean; error: string; onClose: () => void; onSave: (intent: Intent) => Promise<void> }) {
  const original = unpackNotes(task.notes).meta?.intent ?? classify(task.title, task.updated)
  const [intent, setIntent] = useState<Intent>(original)
  const [items, setItems] = useState((original.items ?? [original.title]).join('\n'))
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close() }, [])
  const candidate = { ...intent, reason: undefined, items: intent.kind === 'shopping' ? items.split('\n').map(item => item.trim()).filter(Boolean) : undefined }, reason = validateIntent(candidate)
  return <dialog className="voice-dialog" ref={dialogRef} onCancel={event => { if (busy) event.preventDefault(); else onClose() }} aria-labelledby="voice-editor-title"><form onSubmit={event => { event.preventDefault(); void onSave(candidate) }}>
    <div className="voice-section-title"><h2 id="voice-editor-title">Où va cette demande ?</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Fermer"><X size={20} /></button></div><p className="voice-original">« {task.title} »</p>
    <label>Destination<select autoFocus value={intent.kind} onChange={event => setIntent({ ...intent, kind: event.target.value as IntentKind, destination: undefined })}>{Object.entries(KINDS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Intitulé<input maxLength={1024} value={intent.title} onChange={event => setIntent({ ...intent, title: event.target.value })} /></label>
    {(intent.kind === 'shopping' || intent.kind === 'note') && <label>Liste<select value={intent.destination || ''} onChange={event => setIntent({ ...intent, destination: (event.target.value || undefined) as Destination | undefined })}><option value="">{intent.kind === 'shopping' ? 'Commissions générales' : 'Notes'}</option>{EXTRA_LISTS.filter(list => list.kind === intent.kind).map(list => <option key={list.key} value={list.key}>{list.title}</option>)}</select></label>}
    {intent.kind === 'shopping' && <label>Articles · un par ligne<textarea rows={5} value={items} onChange={event => setItems(event.target.value)} /></label>}
    {intent.kind === 'event' && <><p>Horaires du rendez-vous, fuseau Europe/Paris. L’heure du rappel Google ne permet pas de les déduire.</p><label>Date<input type="date" value={intent.date ?? ''} onChange={event => setIntent({ ...intent, date: event.target.value })} /></label><div className="voice-times"><label>Début<input type="time" value={intent.start ?? ''} onChange={event => setIntent({ ...intent, start: event.target.value })} /></label><label>Fin<input type="time" value={intent.end ?? ''} onChange={event => setIntent({ ...intent, end: event.target.value })} /></label></div></>}
    {(reason || error) && <p role="status" className="voice-validation">{error || reason}</p>}<button className="voice-primary" type="submit" disabled={busy || Boolean(reason)}><Check size={17} />{busy ? 'Enregistrement…' : 'Enregistrer le traitement'}</button>
  </form></dialog>
}
