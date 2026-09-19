import { useState } from 'react'
import { BookOpen, Dumbbell, House, NotebookPen, Library } from 'lucide-react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { preparation, sources, techniques } from './data'
import type { Technique } from './data'
import { TechniqueIllustration } from './TechniqueIllustration'
import './karate.css'

const NOTE_KEY = 'life_hub_karate_notes_v1'
function loadNotes(): Record<string, string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(NOTE_KEY) || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([id, note]) => techniques.some(t => t.id === id) && typeof note === 'string'))
  } catch { return {} }
}
const menu = [
  { to: '/karate', label: 'Accueil', icon: House },
  { to: '/karate/fiches', label: 'Fiches', icon: BookOpen },
  { to: '/karate/preparation', label: 'Préparation', icon: Dumbbell },
  { to: '/karate/documentation', label: 'Repères', icon: Library },
  { to: '/karate/corrections', label: 'David', icon: NotebookPen },
]

export function KarateApp() {
  const [notes, setNotes] = useState(loadNotes)
  const [saveStatus, setSaveStatus] = useState('')
  function saveNote(id: string, value: string) {
    const next = { ...notes, [id]: value }
    setNotes(next)
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(next)); setSaveStatus('Notes enregistrées sur cet appareil.') }
    catch { setSaveStatus('Enregistrement impossible : copiez vos notes avant de quitter cette page.') }
  }
  function correction(technique: Technique) {
    return <div className="karate-correction"><h3>Corrections de David</h3><p>{technique.david || 'Aucune correction spécifique rapportée pour cette fiche. À compléter après le cours.'}</p><label htmlFor={`note-${technique.id}`}>Mes notes de cours · {technique.name}</label><textarea id={`note-${technique.id}`} rows={3} maxLength={5000} value={notes[technique.id] || ''} placeholder="Date, consigne exacte de David, point à retravailler…" onChange={event => saveNote(technique.id, event.target.value)} /></div>
  }
  return <div className="karate-app">
    <aside className="karate-sidebar"><Link className="karate-brand" to="/karate">空手 <span>KARATÉ<small>Le geste juste, pas à pas.</small></span></Link><nav aria-label="Navigation KARATÉ">{menu.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/karate'}><Icon size={20}/><span>{label}</span></NavLink>)}</nav><p className="karate-sidebar-note">Observer au dojo.<br/>Pratiquer lentement.<br/>Revenir aux appuis.</p><Link to="/">Ouvrir TRAINHARD ↗</Link></aside>
    <div className="karate-main"><header><p className="karate-eyebrow">LIFE HUB · WADO-RYU</p><p className="karate-rule"><strong>David est la référence.</strong> Ses corrections priment sur les ressources génériques. Les fiches proposent des repères à adapter à son enseignement.</p></header>
      <Routes>
        <Route index element={<><section className="karate-hero"><p className="karate-eyebrow">MON DOJO PERSONNEL</p><h1>Des appuis stables.<br/>Un geste à la fois.</h1><p>Retrouver les sensations du cours, comprendre les bases et garder les corrections de David à portée de main.</p><Link className="karate-button" to="/karate/fiches">Explorer les six fiches →</Link><span className="karate-seal" aria-hidden="true">道</span></section><div className="karate-grid"><article className="karate-card"><p className="karate-eyebrow">LE REPÈRE DE DAVID</p><h2>Deux pieds, deux rails.</h2><Rails/><p>Un appui de chaque côté : retrouver cette largeur à chaque arrivée en Junzuki dachi.</p></article><article className="karate-card"><p className="karate-eyebrow">PRATIQUE DE BASE</p><h2>Une courte répétition</h2><ol><li>Yoi : trois respirations, épaules relâchées.</li><li>Junzuki dachi : trois pas lents sur les rails.</li><li>Gedan Barai puis Junzuki : isoler les gestes.</li><li>Noter une seule correction à retenir.</li></ol><Link to="/karate/preparation">Ajouter une préparation légère →</Link></article></div><article className="karate-card"><h2>Mon premier kata</h2><p>La version exacte reste à confirmer avec David. Conserver les fragments appris au cours avant de mémoriser un tracé trouvé en ligne.</p><Link to="/karate/fiches#first-basic-kata">Consulter la fiche →</Link></article></>} />
        <Route path="fiches" element={<><h1>Les fondamentaux.</h1><p>Des repères de travail lent, sans impact. Ouvrir une fiche puis noter les ajustements du cours.</p><div className="karate-chips">{techniques.map(t => <a href={`#${t.id}`} key={t.id}>{t.name}</a>)}</div>{techniques.map(t => <article className="karate-card" id={t.id} key={t.id}><p className="karate-eyebrow">FICHE TECHNIQUE</p><h2>{t.name}</h2><p>{t.subtitle}</p><TechniqueIllustration techniqueId={t.id} /><dl className="karate-details">{[['Pieds et écartement', t.feet], ['Jambes et genoux', t.legs], ['Buste, tête et regard', t.torso], ['Bras et mains', t.arms], ['Erreurs fréquentes', t.errors], ['Exercice de base', t.drill]].map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>{correction(t)}</article>)}</>} />
        <Route path="preparation" element={<><h1>Préparer le corps.</h1><p>Un tour léger, une à deux fois par semaine pour commencer, selon votre récupération et les séances TRAINHARD. Privilégier le contrôle ; arrêter en cas de douleur.</p><p>Commencer par marcher doucement et mobiliser les chevilles. Choisir trois ou quatre exercices si la journée est déjà chargée.</p><div className="karate-grid">{preparation.map((exercise, index) => <article className="karate-card" key={exercise.name}><p className="karate-eyebrow">{String(index + 1).padStart(2, '0')} · {exercise.dose}</p><h2>{exercise.name}</h2><p>{exercise.cue}</p><p><strong>Plus facile :</strong> {exercise.easier}</p></article>)}</div><Link className="karate-button" to="/">Retrouver mon programme TRAINHARD ↗</Link><p>Ce bloc est disponible ici, sans ajouter automatiquement une séance à votre historique TRAINHARD.</p></>} />
        <Route path="documentation" element={<><h1>Comprendre la pratique.</h1><div className="karate-grid"><article className="karate-card"><h2>Quelques mots du dojo</h2><dl><dt>Kihon</dt><dd>Travail des techniques fondamentales.</dd><dt>Kata</dt><dd>Enchaînement codifié : directions, postures et techniques.</dd><dt>Kumite</dt><dd>Travail avec un partenaire, dans le cadre donné par le professeur.</dd><dt>Hikite</dt><dd>Action de ramener la main.</dd><dt>Chudan / Gedan</dt><dd>Niveau moyen / niveau bas.</dd><dt>Yoi</dt><dd>Se préparer, être prêt.</dd></dl></article><article className="karate-card"><h2>Les racines du Wado-Ryu</h2><p>Hironori Otsuka fonde le Wado-Ryu en 1934. Son parcours en jujutsu Shinto Yoshin-Ryu nourrit cette école de karaté : les déplacements du corps ont une place importante dans sa pratique.</p><p>Les lignées peuvent employer des formes préparatoires différentes. « First Basic Kata », « Kihon Kata » et « Taikyoku Shodan » ne sont donc pas à traiter comme des noms systématiquement interchangeables.</p><p>Au dojo : saluer, écouter la consigne et travailler avec contrôle. À la maison : un geste lent déjà appris vaut mieux qu’une séquence devinée.</p></article></div><article className="karate-card"><h2>Documentation et ressources visuelles</h2><p>Liens externes : accès internet nécessaire. Comparer leurs variantes avec la démonstration de David.</p><ul>{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul></article></>} />
        <Route path="corrections" element={<><h1>Le carnet de David.</h1><p>La seule correction précise rapportée pour l’instant concerne les deux rails. Les autres consignes restent à noter après le cours.</p><p>Notes conservées sur cet appareil uniquement, hors sauvegarde Google Drive.</p>{techniques.map(t => <article className="karate-card" key={t.id}><h2>{t.name}</h2>{correction(t)}</article>)}</>} />
        <Route path="*" element={<><h1>Retrouver le dojo.</h1><Link to="/karate">Retour à l’accueil KARATÉ</Link></>} />
      </Routes><p role="status">{saveStatus}</p>
    </div>
  </div>
}

function Rails() {
  return <figure className="karate-rails"><svg viewBox="0 0 320 180" role="img" aria-label="Vue du dessus : pied gauche en avant sur le rail gauche, pied droit en arrière sur le rail droit. Écartement illustratif, non à l’échelle."><path d="M105 35v130M215 35v130" stroke="currentColor" strokeDasharray="5 5" opacity=".4"/><path d="M160 45V15m-7 8 7-8 7 8" fill="none" stroke="currentColor" strokeWidth="2"/><rect x="92" y="50" width="26" height="48" rx="12" fill="#a34f35"/><rect x="202" y="112" width="26" height="48" rx="12" fill="#72554c" transform="rotate(12 215 136)"/><text x="58" y="80" fill="currentColor">G</text><text x="252" y="143" fill="currentColor">D</text></svg><figcaption>Vue du dessus · écartement illustratif à régler avec David.</figcaption></figure>
}
