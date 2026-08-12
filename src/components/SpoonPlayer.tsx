import { ExternalLink, Music2, Radio } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

type AudioSource = 'spoon' | 'spotify'

const SOURCE_KEY = 'life_hub_audio_source_v1'
const STATION_KEY = 'life_hub_spoon_station_v1'
const SPOTIFY_KEY = 'life_hub_spotify_url_v1'
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

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-700/30 bg-rose-950/30 p-3">
      <div className="mb-3 grid grid-cols-2 rounded-xl bg-slate-950/70 p-1" role="tablist" aria-label="Source audio">
        <button type="button" role="tab" aria-selected={source === 'spoon'} onClick={() => chooseSource('spoon')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${source === 'spoon' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-white'}`}><Radio size={14} /> Spoon</button>
        <button type="button" role="tab" aria-selected={source === 'spotify'} onClick={() => chooseSource('spotify')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${source === 'spotify' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}><Music2 size={14} /> Spotify</button>
      </div>

      {source === 'spoon' ? (
        <div role="tabpanel">
          <div className="mb-2 flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}final-rems-flag.png`} alt="Spoon Radio" className="h-10 w-10 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <label htmlFor="spoon-station" className="block text-[10px] font-bold uppercase tracking-wider text-rose-500">Station Spoon</label>
              <select id="spoon-station" value={station.id} onChange={event => chooseStation(event.target.value)} className="mt-0.5 w-full rounded-lg border border-rose-800/50 bg-slate-950 px-2 py-1.5 text-sm font-black text-rose-200 outline-none focus:border-rose-500">
                {SPOON_STATIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
            <a href="https://www.spoonradio.com/" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le site Spoon Radio" className="rounded-lg p-2 text-rose-500 hover:bg-rose-900/40"><ExternalLink size={15} /></a>
          </div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">{station.label} · {station.detail} · en direct</p>
          <audio key={station.id} controls preload="none" className="h-10 w-full" aria-label={`Lecteur Spoon ${station.label}`}>
            <source src={station.url} type={station.type} />
            Votre navigateur ne prend pas en charge la lecture audio.
          </audio>
        </div>
      ) : (
        <div role="tabpanel">
          <iframe title="Lecteur Spotify intégré" src={embedUrl} width="100%" height="352" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="rounded-xl border-0" />
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
    </section>
  )
}
