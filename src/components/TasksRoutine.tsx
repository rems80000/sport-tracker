import { useState } from 'react'
import { useDriveSync } from '../store/driveSyncContext'
import type { VoiceWorkspace } from '../cloud/googleTasks'

export function TasksRoutine() {
  const drive = useDriveSync()
  const [workspace, setWorkspace] = useState<VoiceWorkspace | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() {
    setBusy(true); setError('')
    try { setWorkspace(await drive.readVoiceInbox()) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Vérification impossible.') } finally { setBusy(false) }
  }
  const health = workspace?.health
  const recent = health?.lastRun && workspace && Date.parse(workspace.fetchedAt) - Date.parse(health.lastRun) < 15 * 60000
  return <section className="rounded-2xl border border-slate-600 bg-slate-800 p-5 text-slate-200">
    <h2 className="text-lg font-bold">Routine Google Tasks</h2>
    <p className="mt-2 text-sm text-slate-300">Dictez vos notes dans la liste par défaut de Google Tasks, utilisée comme boîte d’entrée globale. Le classement s’exécute côté Google environ toutes les cinq minutes, même quand Life Hub est fermé.</p>
    <p className="mt-2 text-sm text-slate-300">« Note : … » → Notes ; « Acheter … » → Commissions ; « Commission Leroy Merlin : … » → la liste indiquée ; « Regarder le film … » → Films et séries. Les tâches ordinaires gardent leurs rappels dans la boîte d’entrée.</p>
    <div className="mt-3 flex flex-wrap gap-2 text-sm"><button disabled={!drive.connected || busy} onClick={() => void refresh()} className="rounded-lg bg-indigo-600 px-3 py-2 font-bold disabled:opacity-40">{busy ? 'Vérification…' : 'Vérifier la routine'}</button><a href="https://tasks.google.com/tasks/" target="_blank" rel="noreferrer" className="rounded-lg bg-slate-700 px-3 py-2">Ouvrir Google Tasks</a><a href="https://script.google.com/home/projects/1Cw_Aziy1XGdqfTlTePG_Q1JszmdBb91GIVrTp9-7EgomhmupzBcKoBgv/edit" target="_blank" rel="noreferrer" className="rounded-lg bg-slate-700 px-3 py-2">Configurer la routine</a></div>
    {!drive.connected && <p className="mt-2 text-xs text-slate-400">Connectez Google en haut de l’écran pour vérifier son état.</p>}
    {workspace && <p role="status" className="mt-3 text-sm">Boîte d’entrée : {workspace.source.title}. {health?.active && recent ? 'Routine active, passage récent.' : 'Routine à vérifier : aucun passage récent confirmé.'} {health?.lastRun && `Dernier passage : ${new Date(health.lastRun).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.`} {health?.message}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    <details className="mt-3 text-xs text-slate-400"><summary>Réinstaller après suppression d’une liste</summary><p className="mt-2">Dans le projet Apps Script existant, remplacez Code.gs par le code ci-dessous, enregistrez puis exécutez « installer ». Les listes sont retrouvées ou recréées et un seul déclencheur est conservé. Autorisez Google si demandé.</p><a className="mt-2 inline-block text-indigo-300 underline" href={`${import.meta.env.BASE_URL}automation/source.html`} target="_blank" rel="noreferrer">Code de la routine</a><p className="mt-2">Les demandes ambiguës restent dans l’inbox. Pour relancer une demande à préciser, créez une nouvelle tâche avec une formulation explicite. La dictée et la destination par défaut se règlent dans Google/Gemini sur votre appareil.</p></details>
  </section>
}
