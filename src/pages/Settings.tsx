import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useDriveSync } from '../store/driveSyncContext'
import { exportJSON, importJSON } from '../utils/storage'
import { Download, Upload, Trash2, Timer, Info, Cloud, ExternalLink, LogIn, LogOut, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AppTheme } from '../types'

const THEMES: { value: AppTheme; label: string; sub: string; preview: string }[] = [
  {
    value: 'dark',
    label: 'Sombre Sport',
    sub: 'Indigo · violet · bleu',
    preview: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)',
  },
  {
    value: 'tech',
    label: 'Tech / Réacteur',
    sub: 'Rouge · ambre · noir',
    preview: 'linear-gradient(135deg, #ef4444 0%, #eab308 50%, #f97316 100%)',
  },
  {
    value: 'minimal',
    label: 'Minimal Sombre',
    sub: 'Pur noir · sans dégradé',
    preview: 'linear-gradient(135deg, #1e1e24 0%, #111115 100%)',
  },
]

export function Settings() {
  const { state, dispatch } = useStore()
  const drive = useDriveSync()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const navigate = useNavigate()

  const handleExport = () => exportJSON(state)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportSuccess(false)
    try {
      const newState = await importJSON(file)
      dispatch({ type: 'IMPORT_STATE', payload: newState })
      setImportSuccess(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur')
    }
    e.target.value = ''
  }

  const handleDeleteAll = () => {
    dispatch({ type: 'IMPORT_STATE', payload: { sessions: [], deletedSessionIds: [...new Set([...(state.deletedSessionIds ?? []), ...state.sessions.map(session => session.id)])], activeSessionLog: null, theme: state.theme } })
    setShowDeleteConfirm(false)
    navigate('/')
  }

  const sessionCount = state.sessions.length
  const dataSize = Math.round(JSON.stringify(state).length / 1024)
  const driveBusy = drive.status === 'connecting' || drive.status === 'syncing'
  const driveConnected = drive.status === 'synced' || drive.status === 'syncing'
  const lastSyncLabel = drive.lastSyncedAt
    ? new Date(drive.lastSyncedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null

  return (
    <div className="flex flex-col gap-6 pb-[130px] pt-4 px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
      <h1 className="text-2xl font-bold text-white">Réglages</h1>

      {/* Theme selector */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thème visuel</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(theme => {
            const active = state.theme === theme.value
            return (
              <button
                key={theme.value}
                onClick={() => dispatch({ type: 'SET_THEME', payload: theme.value })}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 ${
                  active
                    ? 'border-indigo-500/60 bg-indigo-600/10'
                    : 'border-slate-700/40 bg-slate-800/30 active:bg-slate-700/40'
                }`}
              >
                {/* Color swatch */}
                <div
                  className="w-full h-10 rounded-xl flex-shrink-0"
                  style={{ background: theme.preview }}
                />
                <div className="text-center">
                  <p className={`text-xs font-bold leading-tight ${active ? 'text-indigo-300' : 'text-slate-200'}`}>
                    {theme.label}
                  </p>
                  <p className="text-slate-500 text-[10px] leading-tight mt-0.5">{theme.sub}</p>
                </div>
                {active && (
                  <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wide">Actif</span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Données</h2>
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden divide-y divide-slate-700/40">
          <div className="flex items-center gap-4 px-4 py-3">
            <Info size={16} className="text-slate-400" />
            <span className="text-slate-300 text-sm">{sessionCount} séances · {dataSize} Ko</span>
          </div>

          <button
            onClick={handleExport}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-slate-700/30 transition-colors"
          >
            <Download size={20} className="text-green-400" />
            <div className="text-left">
              <p className="text-white font-semibold">Exporter les données</p>
              <p className="text-slate-400 text-xs">Télécharger un fichier JSON de sauvegarde</p>
            </div>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-slate-700/30 transition-colors"
          >
            <Upload size={20} className="text-indigo-400" />
            <div className="text-left">
              <p className="text-white font-semibold">Importer des données</p>
              <p className="text-slate-400 text-xs">Restaurer depuis un fichier JSON</p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {importSuccess && (
          <p className="text-green-400 text-sm mt-2 text-center">Données importées avec succès !</p>
        )}
        {importError && (
          <p className="text-red-400 text-sm mt-2 text-center">{importError}</p>
        )}
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-xs font-bold text-red-400/70 uppercase tracking-wider mb-3">Zone de danger</h2>
        <div className="bg-red-900/10 border border-red-500/20 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-red-500/10 transition-colors"
          >
            <Trash2 size={20} className="text-red-400" />
            <div className="text-left">
              <p className="text-red-300 font-semibold">Effacer toutes les données</p>
              <p className="text-red-400/60 text-xs">Irréversible — exportez d'abord</p>
            </div>
          </button>
        </div>
      </section>

      {/* Menu latéral */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Interface</h2>
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
          <button
            onClick={() => dispatch({ type: 'SET_SIDEBAR_COMPACT', payload: !(state.sidebarCompact ?? false) })}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-slate-700/30 transition-colors"
          >
            <div className="flex-1 text-left">
              <p className="text-white font-semibold">Menu latéral discret</p>
              <p className="text-slate-400 text-xs">Sur PC : icônes seules sans texte (plus compact)</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${state.sidebarCompact ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition-transform ${state.sidebarCompact ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </section>

      {/* Sauvegarde cloud */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Cloud size={12} /> Sauvegarde multi-appareils
        </h2>
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden divide-y divide-slate-700/40">
          <div className="px-4 py-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              drive.status === 'synced' ? 'bg-green-500/15' : drive.status === 'error' ? 'bg-red-500/15' : 'bg-blue-500/15'
            }`}>
              {drive.status === 'synced'
                ? <CheckCircle2 size={18} className="text-green-400" />
                : drive.status === 'error'
                  ? <AlertTriangle size={18} className="text-red-400" />
                  : <Cloud size={18} className="text-blue-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-slate-200 text-sm font-bold">
                {drive.status === 'synced' ? 'Données synchronisées' : drive.status === 'syncing' ? 'Synchronisation…' : 'Google Drive'}
              </p>
              <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                {lastSyncLabel
                  ? `Dernière sauvegarde : ${lastSyncLabel}`
                  : 'Un fichier privé remy-life-hub.json réunira Sport, Présence et tes futurs projets.'}
              </p>
              {drive.error && <p className="text-red-400 text-xs mt-2 break-words">{drive.error}</p>}
            </div>
          </div>

          {!drive.configured && (
            <div className="px-4 py-3 bg-amber-500/5">
              <p className="text-amber-300 text-xs font-bold mb-1">Configuration administrateur nécessaire</p>
              <p className="text-amber-200/60 text-[11px] leading-relaxed">
                Ajoutez le Client ID Google dans la variable <code className="text-amber-200">VITE_GOOGLE_CLIENT_ID</code>, puis redéployez l'application.
              </p>
            </div>
          )}

          <div className="flex gap-2 px-4 py-3">
            {!driveConnected ? (
              <button
                onClick={() => void drive.connect()}
                disabled={driveBusy || !drive.configured}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
              >
                {driveBusy ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
                {drive.status === 'error' ? 'Reconnecter Google' : 'Connecter Google'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => void drive.syncNow()}
                  disabled={driveBusy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-700/20 border border-green-600/30 text-green-300 text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
                >
                  <RefreshCw size={14} className={driveBusy ? 'animate-spin' : ''} /> Synchroniser
                </button>
                <button
                  onClick={drive.disconnect}
                  className="px-3 flex items-center justify-center rounded-xl bg-slate-700/50 text-slate-400 active:scale-95 transition-transform"
                  title="Déconnecter Google Drive"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>

          <div className="flex gap-2 px-4 py-3">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/40 border border-slate-600/30 text-slate-300 text-xs font-bold active:scale-95 transition-transform"
            >
              <Download size={14} /> Export manuel
            </button>
            <a
              href={drive.fileUrl ?? 'https://drive.google.com/drive/my-drive'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700/40 border border-slate-600/30 text-slate-300 text-xs font-bold active:scale-95 transition-transform"
            >
              <ExternalLink size={14} /> {drive.fileUrl ? 'Ouvrir la sauvegarde' : 'Ouvrir Drive'}
            </a>
          </div>
        </div>
      </section>

      {/* PWA tip */}
      <section className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
        <p className="text-slate-400 text-sm font-semibold mb-1 flex items-center gap-2">
          <Timer size={14} />
          Installation PWA
        </p>
        <p className="text-slate-500 text-xs">
          Sur iOS : Safari → Partager → "Sur l'écran d'accueil"<br />
          Sur Android : Menu Chrome → "Ajouter à l'écran d'accueil"
        </p>
      </section>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-sm animate-bounce-in">
            <h3 className="text-xl font-bold text-white mb-2">Effacer toutes les données ?</h3>
            <p className="text-slate-400 text-sm mb-6">Cette action est irréversible. Toutes vos séances seront supprimées.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
