import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Cloud, CloudOff, LogOut, RefreshCw, Settings2, WifiOff, X } from 'lucide-react'
import { useDriveSync } from '../store/driveSyncContext'
import { loadGoogleIdentity } from '../cloud/googleDrive'
import './googleConnection.css'

const STARTUP_KEY = 'life_hub_google_startup_v1'
function startupEnabled() {
  try { return localStorage.getItem(STARTUP_KEY) === 'true' } catch { return false }
}

export function GoogleConnection() {
  const drive = useDriveSync()
  const [remind, setRemind] = useState(startupEnabled)
  const [open, setOpen] = useState(startupEnabled)
  const [online, setOnline] = useState(navigator.onLine)
  const [preferenceError, setPreferenceError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const closeAfterConnect = useRef(false)
  const busy = drive.status === 'connecting' || drive.status === 'syncing'

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  useEffect(() => {
    // Prepare the Google library so a click can open its window immediately on mobile.
    // This does not request authorization or open a sign-in window.
    if (online && drive.configured) void loadGoogleIdentity().catch(() => {})
  }, [online, drive.configured])

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  useEffect(() => {
    if (closeAfterConnect.current && drive.status === 'synced') {
      closeAfterConnect.current = false
      dialog.current?.close()
    }
  }, [drive.status])

  const setStartup = (enabled: boolean) => {
    try {
      localStorage.setItem(STARTUP_KEY, String(enabled))
      setRemind(enabled)
      setPreferenceError('')
    } catch { setPreferenceError('Ce navigateur ne permet pas de mémoriser ce réglage.') }
  }
  const connect = () => {
    closeAfterConnect.current = true
    void drive.connect()
  }
  const stateLabel = !online ? 'Hors ligne' : drive.status === 'connecting' ? 'Connexion…' : drive.status === 'syncing' ? 'Synchronisation…' : drive.status === 'error' ? (drive.connected ? 'Synchronisation à vérifier' : 'Connexion à réessayer') : drive.connected ? 'Connecté' : 'Non connecté'
  const actionLabel = busy ? 'En cours…' : drive.connected ? 'Synchroniser' : 'Connecter Google'
  const StateIcon = !online ? WifiOff : busy ? RefreshCw : drive.connected ? CheckCircle2 : CloudOff

  return <>
    <section className={`google-connection ${drive.connected ? 'is-connected' : 'is-disconnected'}`} aria-label="Connexion Google">
      <div className="google-connection-state" role="status">
        <StateIcon size={19} className={busy ? 'google-spinning' : ''} aria-hidden="true" />
        <div><strong>Google</strong><span>{stateLabel}</span></div>
      </div>
      <div className="google-connection-actions">
        <button type="button" className="google-connect-button" onClick={drive.connected ? () => void drive.syncNow() : connect} disabled={busy || !online || !drive.configured}>
          {drive.connected ? <RefreshCw size={16} aria-hidden="true" /> : <Cloud size={17} aria-hidden="true" />}{actionLabel}
        </button>
        <button type="button" className="google-options-button" onClick={() => setOpen(true)} aria-label="Options de connexion Google" title="Connexion et rappel au démarrage"><Settings2 size={19} /></button>
      </div>
    </section>
    <dialog ref={dialog} className="google-connection-dialog" aria-labelledby="google-dialog-title" onClose={() => { closeAfterConnect.current = false; setOpen(false) }}>
      <div className="google-dialog-heading"><div><span>LIFE HUB · TOUS TES ESPACES</span><h2 id="google-dialog-title">Ta connexion Google</h2></div><button type="button" className="google-options-button" onClick={() => dialog.current?.close()} aria-label="Fermer les options Google"><X size={20} /></button></div>
      <p>Connecte Google pour retrouver tes demandes et synchroniser tes données. Le bouton reste en haut de tous les écrans du Hub.</p>
      <div className={`google-dialog-status ${drive.connected ? 'is-connected' : ''}`}><StateIcon size={20} aria-hidden="true" /><strong>{stateLabel}</strong></div>
      {!online && <p>Tu peux continuer à utiliser les fonctions locales. La connexion Google sera disponible au retour du réseau.</p>}
      {!drive.configured && <p>La connexion Google doit d’abord être configurée pour cette application.</p>}
      {drive.error && <p className="google-dialog-error" role="alert">{drive.error}</p>}
      <label className="google-startup-option"><input type="checkbox" checked={remind} onChange={event => setStartup(event.target.checked)} /><span><strong>Me proposer la connexion au démarrage</strong><small>Sur cet appareil, à chaque nouveau chargement de l’application. Tu peux toujours choisir « Plus tard ».</small></span></label>
      {preferenceError && <p className="google-dialog-error" role="alert">{preferenceError}</p>}
      <p className="google-dialog-note">Cette option est un rappel : Google peut encore demander une reconnexion après une fermeture ou l’expiration de l’accès.</p>
      <div className="google-dialog-buttons"><button type="button" className="google-connect-button" disabled={busy || !online || !drive.configured} onClick={drive.connected ? () => void drive.syncNow() : connect}>{actionLabel}</button><button type="button" className="google-later-button" onClick={() => dialog.current?.close()}>{drive.connected ? 'Fermer' : 'Plus tard'}</button></div>
      {drive.connected && <button type="button" className="google-disconnect-button" disabled={busy} onClick={drive.disconnect}><LogOut size={15} /> Déconnecter Google</button>}
    </dialog>
  </>
}
