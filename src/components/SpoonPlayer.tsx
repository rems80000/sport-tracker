import { ChevronDown, ChevronUp, ExternalLink, LogIn, Music2, Radio, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

type AudioSource = 'spoon' | 'spotify'

const SOURCE_KEY = 'life_hub_audio_source_v1'
const STATION_KEY = 'life_hub_spoon_station_v1'
const SPOTIFY_KEY = 'life_hub_spotify_url_v1'
const PLAYER_OPEN_KEY = 'life_hub_audio_player_open_v1'
const DEFAULT_SPOTIFY_URL = 'https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U'

const SPOON_STATIONS = [
  { id: 'rock', label: 'Radio Rock', detail: 'MP3 · 192 kbit/s', url: 'https://spoonradio.ice.infomaniak.ch/spoonradio-hd.mp3', type: 'audio/mpeg' },
  { id: 'classics', label: 'Rock Classics', detail: 'HD AAC', url: 'https://spoonradioclassicrock.ice.infomaniak.ch/spoon-classicrock-hd.aac', type: 'audio/aac' },
  { id: 'ballads', label: 'Rock Ballads', detail: 'HD AAC', url: 'https://spoonradiorockballads.ice.infomaniak.ch/spoon-rockballads-hd.aac', type: 'audio/aac' },
  { id: 'hard-rock', label: 'Hard Rock', detail: 'HD AAC', url: 'https://spoonradiohardrock.ice.infomaniak.ch/spoon-hardrock-hd.aac', type: 'audio/aac' },
  { id: 'alternative', label: 'Alternative Rock', detail: 'HD AAC', url: 'https://spoonradioalternativerock.ice.infomaniak.ch/spoon-alternativerock-hd.aac', type: 'audio/aac' },
  { id: 'acoustic', label: 'Acoustic Rock', detail: 'HD AAC', url: 'https://spoonradioacousticrock.ice.infomaniak.ch/spoon-acousticrock-hd.aac', type: 'audio/aac' },
  { id: 'modern', label: 'Modern Rock', detail: 'HD AAC', url: 'https://spoonradiomodernrock.ice.infomaniak.ch/spoon-modernrock-hd.aac', type: 'audio/aac' },
] as const

function savedValue(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}

function spotifyEmbedUrl(value: string): string | null {
  const trimmed = value.trim()
  const uri = trimmed.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/)
  if (uri) return `https://open.spotify.com/embed/${uri[1]}/${uri[2]}?utm_source=generator&theme=0`

  try {
    const url = new URL(trimmed)
    if (url.hostname !== 'open.spotify.com') return null
    const match = url.pathname.match(/^\/(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/)
    return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0` : null
  } catch {
    return null
  }
}

export function SpoonPlayer() {
  const [source, setSource] = useState<AudioSource>(() => savedValue(SOURCE_KEY, 'spoon') === 'spotify' ? 'spotify' : 'spoon')
  const [stationId, setStationId] = useState(() => savedValue(STATION_KEY, 'rock'))
  const [spotifyUrl, setSpotifyUrl] = useState(() => savedValue(SPOTIFY_KEY, DEFAULT_SPOTIFY_URL))
  const [spotifyDraft, setSpotifyDraft] = useState(spotifyUrl)
  const [spotifyError, setSpotifyError] = useState('')
  const [spotifyFrameKey, setSpotifyFrameKey] = useState(0)
  const [open, setOpen] = useState(() => savedValue(PLAYER_OPEN_KEY, '1') !== '0')
  const station = SPOON_STATIONS.find(item => item.id === stationId) ?? SPOON_STATIONS[0]
  const embedUrl = spotifyEmbedUrl(spotifyUrl) ?? spotifyEmbedUrl(DEFAULT_SPOTIFY_URL)!

  function chooseSource(next: AudioSource) {
    setSource(next)
    try { localStorage.setItem(SOURCE_KEY, next) } catch { /* stockage privé indisponible */ }
  }

  function chooseStation(next: string) {
    setStationId(next)
    try { localStorage.setItem(STATION_KEY, next) } catch { /* stockage privé indisponible */ }
  }

  function loadSpotify(event: FormEvent) {
    event.preventDefault()
    if (!spotifyEmbedUrl(spotifyDraft)) {
      setSpotifyError('Collez un lien Spotify de playlist, album, artiste, titre ou podcast.')
      return
    }
    const next = spotifyDraft.trim()
    setSpotifyUrl(next)
    setSpotifyError('')
    try { localStorage.setItem(SPOTIFY_KEY, next) } catch { /* stockage privé indisponible */ }
  }

  function toggleOpen() {
    setOpen(current => {
      const next = !current
      try { localStorage.setItem(PLAYER_OPEN_KEY, next ? '1' : '0') } catch { /* stockage privé indisponible */ }
      return next
    })
  }

  return (
    <section className={`relative z-[60] mx-auto w-full max-w-3xl flex-shrink-0 overflow-hidden border-x border-b shadow-xl transition-colors ${source === 'spoon' ? 'border-rose-500/30 bg-gradient-to-br from-rose-950 via-slate-950 to-violet-950 shadow-rose-950/30' : 'border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-950 to-black shadow-emerald-950/30'}`}>
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      <button type="button" onClick={toggleOpen} className="relative flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${source === 'spoon' ? 'bg-gradient-to-br from-rose-500 to-violet-600 text-white' : 'bg-[#1ed760] text-black'}`}>{source === 'spoon' ? <Radio size={17} /> : <Music2 size={17} />}</span>
        <span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Audio en continu</span><span className="block truncate text-sm font-black text-white">{source === 'spoon' ? station.label : 'Spotify'}</span></span>
        <span className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400">{open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}</span>
      </button>

      <div aria-hidden={!open} className={`relative grid transition-[grid-template-rows,opacity] duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}>
      <div className="min-h-0 overflow-hidden">
      <div className="max-h-[min(520px,58vh)] overflow-y-auto px-3 pb-3">
      <div className="mb-3 grid grid-cols-2 rounded-2xl border border-white/5 bg-black/40 p-1.5" role="tablist" aria-label="Source audio">
        <button type="button" role="tab" aria-selected={source === 'spoon'} onClick={() => chooseSource('spoon')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-all ${source === 'spoon' ? 'bg-gradient-to-r from-rose-600 to-violet-600 text-white shadow-lg shadow-rose-950' : 'text-slate-500 hover:text-white'}`}><Radio size={15} /> Spoon</button>
        <button type="button" role="tab" aria-selected={source === 'spotify'} onClick={() => chooseSource('spotify')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-all ${source === 'spotify' ? 'bg-[#1ed760] text-black shadow-lg shadow-emerald-950' : 'text-slate-500 hover:text-white'}`}><Music2 size={15} /> Spotify</button>
      </div>

      {source === 'spoon' ? (
        <div role="tabpanel">
          <div className="mb-3 flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}final-rems-flag.png`} alt="Spoon Radio" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-rose-500/40" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-rose-500">Spoon Radio · Live</p>
              <p className="truncate text-base font-black text-white">{station.label}</p>
              <p className="text-[10px] font-bold text-slate-500">{station.detail}</p>
            </div>
            <a href="https://www.spoonradio.com/" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le site Spoon Radio" className="rounded-lg p-2 text-rose-500 hover:bg-rose-900/40"><ExternalLink size={15} /></a>
          </div>
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {SPOON_STATIONS.map(item => <button type="button" key={item.id} onClick={() => chooseStation(item.id)} className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[10px] font-black transition ${station.id === item.id ? 'border-rose-400 bg-rose-500 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:border-rose-500/50 hover:text-white'}`}>{item.label.replace('Radio ', '').replace('Rock ', '')}</button>)}
          </div>
          <audio key={station.id} controls preload="none" className="h-10 w-full" aria-label={`Lecteur Spoon ${station.label}`}>
            <source src={station.url} type={station.type} />
            Votre navigateur ne prend pas en charge la lecture audio.
          </audio>
        </div>
      ) : (
        <div role="tabpanel">
          <div className="mb-3 flex items-center gap-3 px-1">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1ed760] text-black shadow-lg shadow-emerald-950"><Music2 size={22} /></span>
            <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-400">Spotify dans Life Hub</p><p className="text-sm font-black text-white">Ta musique, sans quitter l’entraînement</p></div>
          </div>
          <iframe key={spotifyFrameKey} title="Lecteur Spotify intégré" src={embedUrl} width="100%" height="352" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="rounded-2xl border-0 shadow-xl" />
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <a href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-[10px] font-black text-emerald-300"><LogIn size={13} /> Connecter mon compte</a>
            <button type="button" onClick={() => setSpotifyFrameKey(key => key + 1)} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-black text-slate-300"><RefreshCw size={13} /> Actualiser</button>
          </div>
          <form onSubmit={loadSpotify} className="mt-2">
            <label htmlFor="spotify-link" className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Changer le contenu Spotify</label>
            <div className="mt-1 flex gap-1.5">
              <input id="spotify-link" value={spotifyDraft} onChange={event => setSpotifyDraft(event.target.value)} inputMode="url" autoCapitalize="none" spellCheck={false} placeholder="Coller un lien Spotify" className="min-w-0 flex-1 rounded-lg border border-emerald-800/50 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-emerald-500" />
              <button className="rounded-lg bg-emerald-600 px-3 text-xs font-black text-white">Charger</button>
            </div>
            {spotifyError && <p className="mt-1 text-[10px] font-bold text-red-400">{spotifyError}</p>}
          </form>
        </div>
      )}
      </div>
      </div>
      </div>
    </section>
  )
}
