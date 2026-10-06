type AudioPreferenceKey = 'presence_voice_v2' | 'presence_ambience_v1'

export function readAudioPreference(key: AudioPreferenceKey): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function rememberAudioPreference(key: AudioPreferenceKey, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* The current session keeps its settings in React state. */ }
}
