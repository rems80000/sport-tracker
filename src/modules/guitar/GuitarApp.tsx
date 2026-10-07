import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Guitar } from 'lucide-react'
import { AUDIO_PAUSE_EVENT, AUDIO_REQUEST_EVENT, DEFAULT_SPOTIFY_URL, requestHubAudio, SPOON_STATIONS, spotifyEmbedUrl } from '../../data/audioSources'
import { PracticeTools } from './PracticeTools'
import { BackingTracks } from './BackingTracks'
import { saveMedia } from './mediaStore'
import type { StoredMediaRef } from './mediaStore'
import { TabDocument } from './TabDocument'
import './guitar.css'

type Source = 'none' | 'spoon' | 'spotify' | 'audio'
interface Song { id: string; title: string; artist: string; tab: string; source: Source; audioUrl: string; stationId: string; speed: number; tabFile?: StoredMediaRef }
const LIBRARY_KEY = 'life_hub_guitar_songs_v1'
const DEMO: Song = { id: 'exercice-cordes', title: 'Cordes à vide', artist: 'Exercice Life Hub', source: 'none', audioUrl: '', stationId: 'acoustic', speed: 18,
  tab: ['Exercice original · lentement, une note par clic', '', ...Array.from({ length: 8 }, (_, i) => `Passage ${i + 1}\ne|--------------------0---|\nB|----------------0-------|\nG|------------0-----------|\nD|--------0---------------|\nA|----0-------------------|\nE|0-----------------------|\n`)].join('\n') }
function initialLibrary(): { songs: Song[]; error: string } {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (raw === null) return { songs: [DEMO], error: '' }
    const songs: unknown = JSON.parse(raw)
    if (!Array.isArray(songs) || !songs.every(s => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.artist === 'string' && typeof s.tab === 'string' && ['none', 'spoon', 'spotify', 'audio'].includes(s.source) && typeof s.audioUrl === 'string' && typeof s.stationId === 'string' && Number.isFinite(s.speed) && s.speed >= 5 && s.speed <= 80 && (!s.tabFile || typeof s.tabFile.id === 'string' && typeof s.tabFile.name === 'string' && ['pdf', 'image'].includes(s.tabFile.kind)))) throw Error('Invalid library')
    return { songs, error: '' }
  } catch { return { songs: [], error: 'Bibliothèque illisible ou stockage indisponible. Aucune donnée existante n’a été écrasée.' } }
}
function savedPlaylist() { try { return localStorage.getItem('life_hub_spotify_url_v1') || DEFAULT_SPOTIFY_URL } catch { return DEFAULT_SPOTIFY_URL } }
function safeAudio(url: string) { try { return new URL(url).protocol === 'https:' } catch { return false } }

export function GuitarApp() {
  const [initial] = useState(initialLibrary)
  const [songs, setSongs] = useState(initial.songs)
  const [selected, setSelected] = useState(initial.songs[0]?.id || '')
  const [error, setError] = useState(initial.error)
  function save(song: Song) {
    const next = songs.some(s => s.id === song.id) ? songs.map(s => s.id === song.id ? song : s) : [...songs, song]
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(next)); setSongs(next); setSelected(song.id); setError(''); return true } catch { setError('Sauvegarde impossible : espace insuffisant ou stockage bloqué. Gardez cette page ouverte et copiez votre tablature.'); return false }
  }
  return <div className="guitar-page"><div className="guitar-layout">
    <header className="guitar-heading"><span><Guitar size={28} /></span><div><p className="guitar-kicker">Life Hub · Musique</p><h1>Un moment pour jouer.</h1><p>Accordez, trouvez le rythme, puis laissez défiler votre tablature.</p></div></header>
    <PracticeTools />
    <BackingTracks />
    <section className="guitar-card">
      <div className="guitar-library-heading"><div><p className="guitar-kicker">Votre répertoire</p><h2>Morceaux & tablatures</h2></div><button onClick={() => setSelected('')}>Nouveau morceau</button></div>
      <div className="guitar-actions"><select aria-label="Morceau" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Nouveau morceau…</option>{songs.map(song => <option key={song.id} value={song.id}>{song.title}{song.artist ? ` · ${song.artist}` : ''}</option>)}</select><button onClick={() => requestHubAudio({ source: 'spotify', url: savedPlaylist() })}>Ouvrir ma playlist</button><button onClick={() => requestHubAudio({ source: 'spoon', stationId: 'acoustic' })}>Spoon Acoustic</button></div>
      <p className="guitar-hint">Votre playlist existante reste dans le lecteur du haut. Spoon diffuse en direct : le choix d’un titre précis nécessite son lien Spotify ou un fichier audio accessible. Ajoutez vos tablatures en texte, PDF ou image.</p>
      {error && <p role="alert" className="guitar-error">{error}</p>}
      <SongPanel key={selected} song={songs.find(song => song.id === selected)} onSave={save} />
    </section>
    <p className="guitar-hint">Morceaux, tablatures, imports et tempo sont conservés sur cet appareil. Gardez une copie de vos fichiers : effacer les données du navigateur efface aussi vos imports. La radio et Spotify nécessitent Internet. Sauvegarde Drive de Guitare non activée.</p>
  </div></div>
}

function SongPanel({ song, onSave }: { song?: Song; onSave: (song: Song) => boolean }) {
  const [draft, setDraft] = useState<Song>(() => song ? { ...song } : { ...DEMO, id: crypto.randomUUID(), title: '', artist: '', tab: '', source: 'none' })
  const [editing, setEditing] = useState(!song)
  const [message, setMessage] = useState('')
  const [scrolling, setScrolling] = useState(false)
  const [followAudio, setFollowAudio] = useState(false)
  const [tabMode, setTabMode] = useState<'text' | 'file'>(song?.tabFile ? 'file' : 'text')
  const [zoom, setZoom] = useState(100)
  const [uploading, setUploading] = useState(false)
  const isPdf = tabMode === 'file' && draft.tabFile?.kind === 'pdf'
  const hasTab = tabMode === 'text' ? Boolean(draft.tab) : Boolean(draft.tabFile)
  const tab = useRef<HTMLDivElement>(null)
  const audio = useRef<HTMLAudioElement>(null)
  const update = (patch: Partial<Song>) => { setDraft(current => ({ ...current, ...patch })); setMessage('') }
  useEffect(() => {
    const element = tab.current
    if (!scrolling || !element || isPdf) return
    let frame = 0, previous = performance.now(), position = element.scrollTop
    function tick(now: number) {
      const delta = Math.min(now - previous, 100) / 1000
      previous = now
      const max = element!.scrollHeight - element!.clientHeight
      position += draft.speed * delta
      element!.scrollTop = Math.min(position, max)
      if (position < max) frame = requestAnimationFrame(tick)
      else setScrolling(false)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [scrolling, draft.speed, isPdf, tabMode])
  useEffect(() => {
    const stop = (event?: Event) => { if (event instanceof CustomEvent && event.detail === audio.current) return; audio.current?.pause(); setScrolling(false) }
    const hidden = () => { if (document.hidden) stop() }
    window.addEventListener(AUDIO_PAUSE_EVENT, stop)
    window.addEventListener(AUDIO_REQUEST_EVENT, stop)
    document.addEventListener('visibilitychange', hidden)
    return () => { window.removeEventListener(AUDIO_PAUSE_EVENT, stop); window.removeEventListener(AUDIO_REQUEST_EVENT, stop); document.removeEventListener('visibilitychange', hidden) }
  }, [])
  function stopAutoScroll() { setScrolling(false); setFollowAudio(false) }
  async function importTab(file: File) {
    setUploading(true); setMessage('')
    try {
      const tabFile = await saveMedia(file, 'document')
      update({ tabFile }); setTabMode('file'); setScrolling(false); setFollowAudio(false)
      setMessage('Fichier conservé sur cet appareil. Enregistrez le morceau pour l’associer.')
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Import impossible.') } finally { setUploading(false) }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) { setMessage('Donnez un titre au morceau.'); return }
    if (draft.source === 'spotify' && !spotifyEmbedUrl(draft.audioUrl)) { setMessage('Collez un lien Spotify valide.'); return }
    if (draft.source === 'audio' && !safeAudio(draft.audioUrl)) { setMessage('Utilisez un lien audio direct en HTTPS.'); return }
    if (onSave({ ...draft, title: draft.title.trim() })) { setEditing(false); setMessage('Morceau enregistré sur cet appareil.') }
  }
  function loadSource() {
    audio.current?.pause(); setScrolling(false)
    if (draft.source === 'spoon') requestHubAudio({ source: 'spoon', stationId: draft.stationId })
    if (draft.source === 'spotify' && spotifyEmbedUrl(draft.audioUrl)) requestHubAudio({ source: 'spotify', url: draft.audioUrl })
    setMessage('Source ouverte dans le lecteur du haut. Lancez la lecture, puis le défilement ici.')
  }
  return <div className="guitar-song">
    {editing ? <form onSubmit={submit} className="guitar-editor">
      <label>Titre<input required maxLength={150} value={draft.title} onChange={e => update({ title: e.target.value })} /></label>
      <label>Artiste<input maxLength={150} value={draft.artist} onChange={e => update({ artist: e.target.value })} /></label>
      <label>Source audio<select value={draft.source} onChange={e => update({ source: e.target.value as Source })}><option value="none">Sans audio</option><option value="spoon">Spoon · radio en direct</option><option value="spotify">Titre ou playlist Spotify</option><option value="audio">Lien audio direct HTTPS</option></select></label>
      {draft.source === 'spoon' && <label>Station<select value={draft.stationId} onChange={e => update({ stationId: e.target.value })}>{SPOON_STATIONS.map(station => <option key={station.id} value={station.id}>{station.label}</option>)}</select></label>}
      {(draft.source === 'spotify' || draft.source === 'audio') && <label>Lien audio<input required value={draft.audioUrl} onChange={e => update({ audioUrl: e.target.value })} placeholder={draft.source === 'spotify' ? 'https://open.spotify.com/track/…' : 'https://…/morceau.mp3'} /></label>}
      <label className="guitar-wide">Tablature en texte<textarea rows={12} value={draft.tab} onChange={e => update({ tab: e.target.value })} placeholder="Collez votre tablature ici…" /></label>
      <label className="guitar-wide">Tablature PDF ou image<input disabled={uploading} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void importTab(file) }} /></label>
      {draft.tabFile && <div className="guitar-actions guitar-wide"><span>{draft.tabFile.name}</span><button type="button" onClick={() => { update({ tabFile: undefined }); setTabMode('text') }}>Dissocier le document</button></div>}
      {uploading && <p role="status" className="guitar-wide guitar-hint">Enregistrement de la tablature…</p>}
      <div className="guitar-actions guitar-wide"><button disabled={uploading} className="primary">Enregistrer le morceau</button>{song && <button type="button" onClick={() => { setDraft({ ...song }); setEditing(false) }}>Annuler</button>}</div>
    </form> : <>
      <div className="guitar-library-heading"><h3>{draft.title} <small>{draft.artist}</small></h3><button onClick={() => { setScrolling(false); audio.current?.pause(); setEditing(true) }}>Modifier</button></div>
      {draft.source === 'audio' && safeAudio(draft.audioUrl) && <>
        <audio ref={audio} src={draft.audioUrl} preload="none" controls aria-label={`Écouter ${draft.title}`} onPlay={() => window.dispatchEvent(new CustomEvent(AUDIO_PAUSE_EVENT, { detail: audio.current }))} onError={() => setMessage('Audio indisponible. Vérifiez le lien et son accès public.')} onTimeUpdate={() => { const a = audio.current; if (followAudio && a && Number.isFinite(a.duration) && a.duration > 0 && tab.current) tab.current.scrollTop = (tab.current.scrollHeight - tab.current.clientHeight) * a.currentTime / a.duration }} />
        <label className="guitar-follow"><input type="checkbox" disabled={isPdf} checked={followAudio} onChange={e => { setFollowAudio(e.target.checked); setScrolling(false) }} /> Suivre la progression audio (répartition uniforme)</label>
      </>}
      {(draft.source === 'spoon' || draft.source === 'spotify') && <button onClick={loadSource}>Charger la source dans le lecteur</button>}
      <div className="guitar-actions" role="group" aria-label="Affichage tablature"><button aria-pressed={tabMode === 'text'} onClick={() => { setTabMode('text'); setScrolling(false) }}>Texte</button><button disabled={!draft.tabFile} aria-pressed={tabMode === 'file'} onClick={() => { setTabMode('file'); setScrolling(false); setFollowAudio(false) }}>{draft.tabFile?.kind === 'image' ? 'Image' : 'PDF / image'}</button>{tabMode === 'file' && draft.tabFile?.kind === 'image' && <label>Zoom<select aria-label="Zoom tablature" value={zoom} onChange={e => setZoom(Number(e.target.value))}>{[75, 100, 125, 150, 200].map(n => <option key={n} value={n}>{n}%</option>)}</select></label>}</div>
      <div className="guitar-actions"><button disabled={!hasTab || followAudio || isPdf} className="primary" onClick={() => setScrolling(!scrolling)}>{scrolling ? 'Pause du défilement' : 'Défiler la tablature'}</button><button onClick={() => { setScrolling(false); if (tab.current) tab.current.scrollTop = 0; if (audio.current) audio.current.currentTime = 0 }}>Revenir au début</button><label>Vitesse : {draft.speed} px/s<input aria-label="Vitesse de défilement" type="range" min="5" max="80" value={draft.speed} onChange={e => { const next = { ...draft, speed: Number(e.target.value) }; setDraft(next); onSave(next) }} /></label></div>
      <p className="guitar-hint">Pour Spoon et Spotify, lancez le défilement manuellement. Ajustez la vitesse ; aucune synchronisation note par note n’est supposée.</p>
      {isPdf && <p className="guitar-hint">Le PDF utilise son propre lecteur. Sur mobile, « Ouvrir en grand » ou « Télécharger » permet de le consulter si l’aperçu est indisponible. Le défilement automatique fonctionne en mode texte ou image.</p>}
      <div ref={tab} className={isPdf ? 'guitar-document-view' : 'guitar-tab'} tabIndex={0} aria-label="Tablature" onWheel={stopAutoScroll} onTouchStart={stopAutoScroll} onKeyDown={event => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopAutoScroll() }}>{tabMode === 'file' && draft.tabFile ? <TabDocument file={draft.tabFile} zoom={zoom} /> : <pre>{draft.tab || 'Aucune tablature texte. Cliquez sur Modifier pour en ajouter une.'}</pre>}</div>
    </>}
    {message && <p role="status" className="guitar-hint">{message}</p>}
  </div>
}
