import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { exportJSON, importJSON } from '../utils/storage'
import { Download, Upload, Trash2, Timer, Moon, Sun, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Timer as TimerComponent } from '../components/Timer'

export function Settings() {
  const { state, dispatch } = useStore()
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
    dispatch({ type: 'IMPORT_STATE', payload: { sessions: [], activeSessionLog: null, theme: state.theme } })
    setShowDeleteConfirm(false)
    navigate('/')
  }

  const sessionCount = state.sessions.length
  const dataSize = Math.round(JSON.stringify(state).length / 1024)

  return (
    <div className="flex flex-col gap-6 pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white">Réglages</h1>

      {/* Timer demo */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Timer de repos</h2>
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-6 flex flex-col items-center">
          <TimerComponent initialSeconds={90} />
        </div>
      </section>

      {/* Theme */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Apparence</h2>
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl overflow-hidden">
          <button
            onClick={() => dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' })}
            className="w-full flex items-center gap-4 px-4 py-4 active:bg-slate-700/30 transition-colors"
          >
            {state.theme === 'dark'
              ? <Moon size={20} className="text-indigo-400" />
              : <Sun size={20} className="text-yellow-400" />
            }
            <span className="text-white font-semibold">
              {state.theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
            </span>
            <span className="ml-auto text-slate-500 text-sm">Changer</span>
          </button>
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
