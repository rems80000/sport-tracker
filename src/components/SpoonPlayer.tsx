import { ExternalLink, Radio } from 'lucide-react'

const SPOON_STREAM_URL = 'https://spoonradio.ice.infomaniak.ch/spoonradio-hd.mp3'

export function SpoonPlayer() {
  return (
    <section className="overflow-hidden rounded-2xl border border-rose-700/30 bg-rose-950/30 p-3">
      <div className="mb-2 flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}final-rems-flag.png`} alt="Spoon Radio" className="h-10 w-10 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-black text-rose-300"><Radio size={14} /> Spoon Radio</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Rock en direct · 192 kbit/s</p>
        </div>
        <a href="https://www.spoonradio.com/" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le site Spoon Radio" className="rounded-lg p-2 text-rose-500 hover:bg-rose-900/40"><ExternalLink size={15} /></a>
      </div>
      <audio controls preload="none" className="h-10 w-full" aria-label="Lecteur Spoon Radio en direct">
        <source src={SPOON_STREAM_URL} type="audio/mpeg" />
        Votre navigateur ne prend pas en charge la lecture audio.
      </audio>
    </section>
  )
}
