import { useId } from 'react'

type Pose = 'yoi' | 'stance' | 'punch-left' | 'punch-right' | 'block-prep' | 'block-end' | 'kick-ready' | 'kick-chamber' | 'kick-extend' | 'kick-return'
type Step = { pose: Pose; title: string; caption: string }
const sequences: Record<string, { steps: Step[]; note: string }> = {
  yoi: { steps: [{ pose: 'yoi', title: 'Position de préparation · vue de face', caption: 'Buste droit, épaules basses, genoux disponibles. Mains devant le bassin dans cette variante.' }], note: 'Exemple de Yoi pieds écartés : adapte l’ouverture des pieds et les mains à la forme montrée par David.' },
  'junzuki-dachi': { steps: [{ pose: 'stance', title: 'Position d’arrivée · vue de profil', caption: 'Genou avant dans l’axe du pied, talon arrière posé. Les mains aux hanches servent ici à isoler les appuis.' }], note: 'Le profil montre la flexion ; la vue du dessus montre la largeur. Le genou arrière reste disponible, sans verrouillage. L’écartement se règle au dojo.' },
  junzuki: { steps: [
    { pose: 'punch-left', title: 'Avant · gauche devant', caption: 'Pied gauche et poing gauche devant. Le pied droit, en arrière, prépare l’avancée.' },
    { pose: 'punch-right', title: 'Après · droite devant', caption: 'Avancer le pied droit et frapper du poing droit. Le poing gauche revient à la hanche.' },
  ], note: 'Exemple d’un pas à droite : le pied et le poing du même côté arrivent ensemble. Faire aussi l’autre côté, sans verrouiller le coude. L’orange repère le côté droit sur les deux images.' },
  'gedan-barai': { steps: [
    { pose: 'block-prep', title: 'Avant · armer le bras', caption: 'Le poing du bras qui va balayer se prépare vers l’épaule opposée ; l’autre bras est placé devant.' },
    { pose: 'block-end', title: 'Après · balayer vers le bas', caption: 'Le bras descend devant la cuisse sans la toucher. L’autre poing revient à la hanche.' },
  ], note: 'Décomposition sur place, du même côté. L’arc indique le sens général du balayage ; le croisement et le point d’arrivée précis restent ceux montrés par David.' },
  'mae-geri': { steps: [
    { pose: 'kick-ready', title: '1 · Avant', caption: 'Appuis stables. Préparer la jambe arrière, garder les mains en garde.' },
    { pose: 'kick-chamber', title: '2 · Monter le genou', caption: 'Lever le genou devant soi, jambe repliée. Le genou d’appui reste souple.' },
    { pose: 'kick-extend', title: '3 · Déplier', caption: 'Étendre la jambe vers l’avant, sans claquer le genou. Avant du pied présenté, orteils relevés.' },
    { pose: 'kick-return', title: '4 · Après la frappe : replier', caption: 'Ramener le talon sous le genou avant de reposer le pied avec contrôle.' },
  ], note: 'Le retour fait partie du geste. Commencer bas ; la hauteur dessinée ne constitue pas un objectif. Le placement des mains et la surface de frappe sont à vérifier au cours.' },
  'first-basic-kata': { steps: [{ pose: 'yoi', title: 'Repère isolé · se préparer', caption: 'Retrouver une posture disponible avant de répéter un fragment appris au dojo.' }], note: 'Cette image n’est pas le début certifié du kata. Le tracé, les positions de départ et de fin, et l’ordre des mouvements attendent la confirmation de David.' },
}

export function TechniqueIllustration({ techniqueId }: { techniqueId: string }) {
  const sequence = sequences[techniqueId]
  if (!sequence) return null
  return <section className="karate-visual" aria-label="Illustration de la technique">
    <div className="karate-visual-heading"><span>LE GESTE EN IMAGES</span><small>Schémas de repérage · proportions indicatives</small></div>
    <div className={`karate-frames ${sequence.steps.length === 1 ? 'karate-frame-single' : ''}`}>
      {sequence.steps.map(step => <figure key={step.pose} className="karate-frame"><h3>{step.title}</h3><Position pose={step.pose} label={`${step.title}. ${step.caption}`} /><figcaption>{step.caption}</figcaption></figure>)}
    </div><p className="karate-visual-note">{sequence.note}</p>
  </section>
}

type Point = [number, number]
const ink = '#59473f', paper = '#fffdf8', far = '#e0d8cb', accent = '#ac5839', skin = '#dfb597'
function Limb({ points, color = paper, width = 18 }: { points: Point[]; color?: string; width?: number }) {
  const d = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={d} stroke={ink} strokeWidth={width + 3} /><path d={d} stroke={color} strokeWidth={width} /></g>
}
function Fist({ at, orange = false }: { at: Point; orange?: boolean }) {
  return <g transform={`translate(${at[0]} ${at[1]})`}><rect x="-6" y="-6" width="13" height="12" rx="4" fill={orange ? accent : skin} stroke={ink} strokeWidth="1.5" /><path d="M-2 -4v4M2 -4v4" stroke={ink} strokeWidth=".8" /></g>
}
function Foot({ at, color = skin, kick = false }: { at: Point; color?: string; kick?: boolean }) {
  return <path transform={`translate(${at[0]} ${at[1]})`} d={kick ? 'M-5 -8 L1 -9 L7 -3 L7 5 L2 8 L-5 4 Z' : 'M-7 -7 L4 -7 Q8 -2 15 -1 L17 5 L-8 5 Z'} fill={color} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
}

function RailsInset({ rightAhead }: { rightAhead: boolean }) {
  return <g transform="translate(246 151)"><rect x="-14" y="-20" width="66" height="103" rx="10" fill="#f1e6d4" /><text x="19" y="-5" textAnchor="middle" fontSize="8" fill={ink}>DESSUS</text><path d="M2 5v59M33 5v59" stroke="#b9a99a" strokeDasharray="3 4" /><rect x="-3" y={rightAhead ? 40 : 9} width="11" height="23" rx="5" fill="#c7b9a9" /><rect x="28" y={rightAhead ? 9 : 40} width="11" height="23" rx="5" fill={accent} /><text x="2" y="76" textAnchor="middle" fontSize="10" fill={ink}>G</text><text x="33" y="76" textAnchor="middle" fontSize="10" fill={ink}>D</text></g>
}

function Position({ pose, label }: { pose: Pose; label: string }) {
  const id = useId().replaceAll(':', '')
  const yoi = pose === 'yoi', kick = pose.startsWith('kick'), raised = kick && pose !== 'kick-ready'
  const punching = pose.startsWith('punch'), rightPunch = pose === 'punch-right'
  const chamber = pose === 'kick-chamber' || pose === 'kick-return', extended = pose === 'kick-extend'
  const block = pose === 'block-prep' || pose === 'block-end'
  const hip: Point = [139, 158]
  const support: Point[] = raised ? [hip, [132, 207], [123, 253]] : pose === 'kick-ready' ? [hip, [185, 208], [182, 253]] : [hip, [103, 204], [70, 252]]
  const front: Point[] = chamber ? [hip, [186, 153], [167, 199]] : extended ? [hip, [192, 156], [245, 147]] : pose === 'kick-ready' ? [hip, [103, 204], [70, 252]] : [hip, [185, 208], [182, 253]]
  const hand: Point = punching ? [227, 116] : pose === 'block-prep' ? [131, 93] : pose === 'block-end' ? [198, 191] : kick ? [185, 108] : [155, 147]
  const elbow: Point = punching ? [189, 117] : pose === 'block-prep' ? [184, 121] : pose === 'block-end' ? [177, 151] : kick ? [170, 138] : [180, 121]
  return <svg viewBox="0 0 320 285" role="img" aria-labelledby={`${id}-title`} className="karate-pose"><title id={`${id}-title`}>{label}</title>
    <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke={accent} strokeWidth="1.5" /></marker></defs>
    <ellipse cx="151" cy="261" rx="106" ry="8" fill="#e8ddcd" /><path d="M30 264h260" stroke="#d7c7b6" />
    {yoi ? <g>
      <Limb points={[[141, 165], [128, 211], [124, 250]]} width={22} /><Limb points={[[163, 165], [178, 211], [182, 250]]} width={22} />
      <path d="M117 246l12 2 1 11-25 4-3-5zM176 248l12-2 14 12-3 5-25-4z" fill={skin} stroke={ink} strokeWidth="1.7" />
      <path d="M132 92Q151 85 171 92L180 170Q153 176 124 170Z" fill={paper} stroke={ink} strokeWidth="2" />
      <Limb points={[[130, 102], [119, 139], [128, 172]]} width={16} /><Limb points={[[172, 102], [183, 139], [174, 172]]} width={16} />
      <Fist at={[128, 179]} /><Fist at={[174, 179]} /><path d="M140 90l18 44 12-42M132 146l40 2" fill="none" stroke="#bda998" strokeWidth="2" />
      <path d="M128 150h45M151 150l-4 28M155 151l8 22" stroke={accent} strokeWidth="6" fill="none" />
      <path d="M146 81v10M160 81v10" stroke={skin} strokeWidth="7" /><ellipse cx="153" cy="65" rx="17" ry="22" fill={skin} stroke={ink} strokeWidth="1.8" /><path d="M136 60Q136 38 153 40Q172 40 170 60L163 50Q150 57 141 50Z" fill={ink} />
      <path d="M143 65h3M160 65h3M149 76h8" stroke={ink} strokeWidth="1.5" /><path d="M74 99h38M195 99h39" stroke="#c4b3a1" strokeDasharray="4 4" /><text x="153" y="23" fill={ink} textAnchor="middle" fontSize="10">Regard devant · épaules relâchées</text>
    </g> : <g>
      <Limb points={support} width={22} color={punching && !rightPunch ? '#edd0bf' : far} /><Foot at={support[2]} color={punching && !rightPunch ? accent : skin} />
      <Limb points={front} width={22} color={kick || rightPunch ? '#f4e1d0' : paper} /><Foot at={front[2]} color={kick || rightPunch ? accent : skin} kick={extended || chamber} />
      {!kick && pose !== 'block-prep' && <><Limb points={[[133, 98], [112, 131], [137, 143]]} color={far} width={15} /><Fist at={[142, 143]} orange={punching && !rightPunch} /></>}
      <path d="M128 89Q142 86 158 95L164 166Q143 174 122 164L126 119Z" fill={paper} stroke={ink} strokeWidth="2" /><path d="M133 92l20 36 5-29M127 145l31 2" fill="none" stroke="#bba492" strokeWidth="2" />
      <path d="M123 151l37 2M143 154l-3 24M148 154l9 20" stroke={accent} strokeWidth="6" fill="none" />
      <path d="M139 80v11M151 79v13" stroke={skin} strokeWidth="8" /><path d="M130 54Q132 39 146 40Q161 40 160 57L166 65L160 68Q163 85 147 87Q134 87 130 73Z" fill={skin} stroke={ink} strokeWidth="1.8" /><path d="M130 66Q125 48 137 41Q158 34 161 52L144 50L138 67Z" fill={ink} /><path d="M155 58h3M157 74h4" stroke={ink} strokeWidth="1.4" />
      {pose === 'block-prep' && <><Limb points={[[132, 106], [167, 147], [193, 164]]} color={far} width={13} /><Fist at={[199, 168]} /></>}
      <Limb points={[[155, 101], elbow, hand]} color={rightPunch || block || kick ? '#f4e1d0' : paper} width={16} /><Fist at={hand} orange={rightPunch || block} />
      {kick && <><Limb points={[[132, 107], [143, 133], [160, 110]]} color={far} width={13} /><Fist at={[163, 105]} /></>}
      <path d="M177 54h36" stroke="#b7a590" strokeDasharray="4 4" /><path d="M211 51l4 3-4 3" fill="none" stroke="#b7a590" />
      {(pose === 'stance' || punching) && <RailsInset rightAhead={rightPunch} />}
      {punching && <text x="158" y="25" textAnchor="middle" fontSize="11" fill={ink}>{rightPunch ? 'Pied D + poing D' : 'Pied G + poing G'}</text>}
      {pose === 'block-end' && <path d="M206 103Q239 138 216 180" fill="none" stroke={accent} strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />}
      {pose === 'kick-chamber' && <path d="M211 218Q225 187 211 162" fill="none" stroke={accent} strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />}
      {extended && <path d="M202 133l36-6" stroke={accent} strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />}
      {pose === 'kick-return' && <path d="M238 173Q225 208 188 211" fill="none" stroke={accent} strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />}
      {pose === 'stance' && <><path d="M184 208v48" stroke={accent} strokeDasharray="3 3" strokeWidth="1.5" /><circle cx="184" cy="208" r="4" fill={accent} /><text x="76" y="281" fontSize="9" textAnchor="middle" fill={ink}>Talon posé</text></>}
    </g>}
  </svg>
}
