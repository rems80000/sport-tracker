export const DEFAULT_SPOTIFY_URL = 'https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U'
export const SPOON_STATIONS = [
  { id: 'rock', label: 'Radio Rock', detail: 'MP3 · 192 kbit/s', url: 'https://spoonradio.ice.infomaniak.ch/spoonradio-hd.mp3', type: 'audio/mpeg' },
  { id: 'classics', label: 'Rock Classics', detail: 'HD AAC', url: 'https://spoonradioclassicrock.ice.infomaniak.ch/spoon-classicrock-hd.aac', type: 'audio/aac' },
  { id: 'ballads', label: 'Rock Ballads', detail: 'HD AAC', url: 'https://spoonradiorockballads.ice.infomaniak.ch/spoon-rockballads-hd.aac', type: 'audio/aac' },
  { id: 'hard-rock', label: 'Hard Rock', detail: 'HD AAC', url: 'https://spoonradiohardrock.ice.infomaniak.ch/spoon-hardrock-hd.aac', type: 'audio/aac' },
  { id: 'alternative', label: 'Alternative Rock', detail: 'HD AAC', url: 'https://spoonradioalternativerock.ice.infomaniak.ch/spoon-alternativerock-hd.aac', type: 'audio/aac' },
  { id: 'acoustic', label: 'Acoustic Rock', detail: 'HD AAC', url: 'https://spoonradioacousticrock.ice.infomaniak.ch/spoon-acousticrock-hd.aac', type: 'audio/aac' },
  { id: 'modern', label: 'Modern Rock', detail: 'HD AAC', url: 'https://spoonradiomodernrock.ice.infomaniak.ch/spoon-modernrock-hd.aac', type: 'audio/aac' },
] as const

export function spotifyEmbedUrl(value: string): string | null {
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

export const AUDIO_REQUEST_EVENT = 'lifehub-audio-request'
export const AUDIO_PAUSE_EVENT = 'lifehub-audio-pause'
export type AudioRequest = { source: 'spoon'; stationId: string } | { source: 'spotify'; url: string }
export function requestHubAudio(detail: AudioRequest) { window.dispatchEvent(new CustomEvent(AUDIO_REQUEST_EVENT, { detail })) }
