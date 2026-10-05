import { useEffect, useRef, useState } from 'react'
import { AUDIO_PAUSE_EVENT, AUDIO_REQUEST_EVENT } from '../../data/audioSources'
import { BUILTIN_BACKINGS } from './backingCatalog'
import { deleteMedia, saveMedia } from './mediaStore'
import type { StoredMediaRef } from './mediaStore'
import { useMediaUrl } from './useMediaUrl'

interface PersonalBacking { id: string; title: string; key: string; file: StoredMediaRef }
const STORAGE_KEY = 'life_hub_guitar_backings_v1'
function loadBackings(): { tracks: PersonalBacking[]; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { tracks: [], error: '' }
    const tracks = JSON.parse(raw)
    if (!Array.isArray(tracks) || !tracks.every(t => typeof t.id === 'string' && typeof t.title === 'string' && typeof t.key === 'string' && typeof t.file?.id === 'string' && t.file.kind === 'audio')) throw Error()
    return { tracks, error: '' }
  } catch { return { tracks: [], error: 'La liste des pistes personnelles n’a pas pu être lue. Aucun fichier n’a été effacé.' } }
}

export function BackingTracks() {
  const [initial] = useState(loadBackings)
  const [personal, setPersonal] = useState(initial.tracks)
  const [selected, setSelected] = useState<string>(BUILTIN_BACKINGS[0].id)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initial.error)
  const [loop, setLoop] = useState(true)
  const [rate, setRate] = useState(1)
  const audio = useRef<HTMLAudioElement>(null)
  const builtin = BUILTIN_BACKINGS.find(track => track.id === selected)
  const imported = personal.find(track => track.id === selected)
  const media = useMediaUrl(imported?.file.id)
  const url = builtin ? `${import.meta.env.BASE_URL}${builtin.path}` : media.url

  useEffect(() => {
    const element = audio.current
    if (!element) return
    element.playbackRate = rate
    element.preservesPitch = true
  }, [rate, url])
  useEffect(() => {
    const element = audio.current
    function stop(event?: Event) { if (!(event instanceof CustomEvent && event.detail === element)) element?.pause() }
    function hidden() { if (document.hidden) stop() }
    window.addEventListener(AUDIO_PAUSE_EVENT, stop); window.addEventListener(AUDIO_REQUEST_EVENT, stop)
    document.addEventListener('visibilitychange', hidden)
    return () => { element?.pause(); window.removeEventListener(AUDIO_PAUSE_EVENT, stop); window.removeEventListener(AUDIO_REQUEST_EVENT, stop); document.removeEventListener('visibilitychange', hidden) }
  }, [url])
  async function importTrack(file: File) {
    setBusy(true); setError('')
    let stored: StoredMediaRef | undefined
    try {
      stored = await saveMedia(file, 'audio')
      const track: PersonalBacking = { id: stored.id, title: file.name.replace(/\.[^.]+$/, ''), key: key.trim(), file: stored }
      const next = [...personal, track]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setPersonal(next); setSelected(track.id)
    } catch (caught) { if (stored) await deleteMedia(stored.id).catch(() => {}); setError(caught instanceof Error ? caught.message : 'Import impossible.') } finally { setBusy(false) }
  }
  async function remove() {
    if (!imported) return
    setBusy(true); setError('')
    try {
      const next = personal.filter(t => t.id !== imported.id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      audio.current?.pause(); setPersonal(next); setSelected(BUILTIN_BACKINGS[0].id)
      await deleteMedia(imported.file.id)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Suppression impossible.') } finally { setBusy(false) }
  }
  return <section className="guitar-card guitar-backings" aria-labelledby="backing-title">
    <div className="guitar-library-heading"><div><p className="guitar-kicker">Improviser</p><h2 id="backing-title">Backing tracks</h2></div><span className="guitar-offline">3 pistes intégrées · hors ligne</span></div>
    <p className="guitar-hint">Boucles originales de basse, accords et batterie. Choisissez une pentatonique, puis improvisez à votre rythme.</p>
    <label>Accompagnement<select aria-label="Backing track" value={selected} onChange={e => { audio.current?.pause(); setSelected(e.target.value); setError('') }}><optgroup label="Pistes intégrées">{BUILTIN_BACKINGS.map(track => <option key={track.id} value={track.id}>{track.title} · {track.bpm} BPM</option>)}</optgroup>{personal.length > 0 && <optgroup label="Mes pistes">{personal.map(track => <option key={track.id} value={track.id}>{track.title}{track.key ? ` · ${track.key}` : ''}</option>)}</optgroup>}</select></label>
    <audio key={url} ref={audio} src={url || undefined} preload="metadata" controls loop={loop} aria-label="Lecteur backing track" onPlay={() => window.dispatchEvent(new CustomEvent(AUDIO_PAUSE_EVENT, { detail: audio.current }))} onError={() => setError('Cette piste ne peut pas être lue. Essayez un fichier MP3 ou WAV.')}/>
    <div className="guitar-actions"><label className="guitar-follow"><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} /> Répéter en boucle</label><label>Vitesse<select aria-label="Vitesse backing track" value={rate} onChange={e => setRate(Number(e.target.value))}>{[.75, .9, 1, 1.1, 1.25].map(n => <option key={n} value={n}>{n}×{builtin ? ` · ${Math.round(builtin.bpm * n)} BPM` : ''}</option>)}</select></label></div>
    {builtin && <details className="guitar-scale"><summary>Pentatonique {builtin.key.toLowerCase()} · {builtin.notes}</summary><p className="guitar-hint">Une position pour commencer : montez et descendez lentement. Cherchez à terminer vos phrases sur {builtin.notes.split(' · ')[0]}.</p><pre>{builtin.tab}</pre></details>}
    <details className="guitar-import"><summary>Ajouter mes propres backing tracks</summary><p className="guitar-hint">Importez un fichier audio (40 Mo maximum). Il reste sur cet appareil et sera lisible hors ligne. Gardez aussi votre fichier d’origine : effacer les données du navigateur efface les imports.</p><div className="guitar-editor"><label>Tonalité de ma piste (facultatif)<input value={key} onChange={e => setKey(e.target.value)} maxLength={60} placeholder="Ex. : La mineur" /></label><label>Importer une piste<input disabled={busy} type="file" accept=".mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,audio/*" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importTrack(file) }} /></label></div></details>
    {imported && <button disabled={busy} onClick={() => void remove()}>Retirer cette piste de l’application</button>}
    {(error || media.error) && <p role="alert" className="guitar-error">{error || media.error}</p>}
    {busy && <p role="status" className="guitar-hint">Enregistrement du fichier…</p>}
  </section>
}
