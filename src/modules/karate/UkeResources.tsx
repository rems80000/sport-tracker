import { Link } from 'react-router-dom'
import { ukeGuides, ukeResources } from './data'

export function UkeResourceLinks({ techniqueId }: { techniqueId: string }) {
  const guide = ukeGuides.find(item => item.id === techniqueId)
  if (!guide) return null
  return <div className="karate-technique-sources"><h3>Pour observer ce geste</h3><p>{guide.watch}</p><ul>{ukeResources.filter(resource => guide.sources.includes(resource.id)).map(resource => <li key={resource.id}><a href={resource.url} target="_blank" rel="noreferrer">{resource.title} ↗</a><small>{resource.publisher} · {resource.format}</small></li>)}</ul></div>
}

export function UkeResources() {
  return <>
    <p className="karate-eyebrow">UKE WAZA · LES DÉFENSES</p>
    <h1>Comprendre les uke.</h1>
    <p>Reconnaître le geste, observer sa préparation, puis retrouver la version du cours. Commence par Gedan Barai et Jodan Age Uke, puis explore les autres techniques avec David.</p>
    <article className="karate-card karate-uke-note"><h2>Soto ou Uchi ? Regarder le trajet.</h2><p>Les appellations ne sont pas uniformes : <a href="https://bushidokaratecarros.fr/Techniques/defenses/defensesdetails.html" target="_blank" rel="noreferrer">Carros</a> présente Soto de l’extérieur vers l’intérieur, tandis que <a href="https://www.bushi.org.uk/club-grade-syllabus/" target="_blank" rel="noreferrer">Bushi</a> nomme Soto le mouvement vers l’extérieur. Note le nom et le trajet employés par David pour ne pas mélanger les variantes.</p></article>
    <div className="karate-grid">{ukeGuides.map(guide => <article className="karate-card karate-uke-card" key={guide.id}><span className="karate-resource-kind">{guide.level}</span><h2>{guide.name}</h2><p><strong>{guide.cue}</strong></p><p>{guide.watch}</p><Link className="karate-button" to={`/karate/fiches#${guide.id}`}>Ouvrir la fiche · {guide.name} →</Link></article>)}</div>
    <article className="karate-card"><h2>Une petite routine d’observation</h2><ol><li>Choisir un seul uke déjà abordé au dojo.</li><li>Observer la préparation, le trajet et l’arrivée dans une ressource.</li><li>Répéter trois fois lentement, à vide, de chaque côté.</li><li>Noter une question pour David : hauteur, croisement des bras, appuis ou nom du geste.</li></ol><p>La répétition sert à retrouver une consigne connue. Le contact, la distance et le timing se vérifient au cours.</p></article>
    <UkeLibrary />
  </>
}

export function UkeLibrary() {
  return <section aria-label="Ressources pour les uke"><h2>Observer et approfondir</h2><p>Ressources externes consultées en septembre 2026. Les liens nécessitent internet ; les repères et tes notes restent dans le Hub. Les vidéos peuvent demander l’accord aux cookies sur le site source.</p><div className="karate-grid">{ukeResources.map(resource => <article className="karate-card karate-resource-card" key={resource.id}><span className="karate-resource-kind">{resource.format}</span><h3>{resource.title}</h3><small>{resource.publisher}</small><p>{resource.description}</p><p><strong>À observer :</strong> {resource.observe}</p><a href={resource.url} target="_blank" rel="noreferrer">Consulter la ressource ↗</a></article>)}</div></section>
}
