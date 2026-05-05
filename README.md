# Sport Tracker — Suivi de programme sport maison

Application web progressive (PWA) pour suivre un programme de sport à domicile.
Utilisable sur PC, tablette et smartphone.

## Stack technique

- **React 19 + TypeScript** (Vite 8)
- **Tailwind CSS v4**
- **React Router v7**
- **localStorage** (persistance locale, sans backend)
- **vite-plugin-pwa** (service worker, installable)

## Lancer l'application

```bash
npm install
npm run dev
```

Disponible sur `http://localhost:5173`

## Build production

```bash
npm run build
npm run preview
```

## Installation PWA sur téléphone

### Servir depuis le réseau local
```bash
npm run dev -- --host
# puis ouvrir http://192.168.x.x:5173 sur le téléphone (même Wi-Fi)
```

- **iOS (Safari)** : Partager → "Sur l'écran d'accueil"
- **Android (Chrome)** : Menu ⋮ → "Ajouter à l'écran d'accueil"

---

## Synchronisation multi-appareils (Google Drive)

Pas de backend. Synchro manuelle via export/import JSON.

**Dossier Drive partagé :**  
https://drive.google.com/drive/folders/1uxLqfrhpZkEqY7aFvFYfkeSLjSxP3ZLZ

### PC → Téléphone
1. Réglages → **Exporter JSON** → fichier `sport-tracker-backup.json`
2. Déposer dans le dossier Google Drive
3. Sur le téléphone : télécharger depuis Drive
4. Réglages → **Importer** → sélectionner le JSON

### Téléphone → PC
1. Réglages → **Exporter JSON**
2. Partager vers l'app Google Drive mobile
3. Sur le PC : télécharger depuis Drive
4. Réglages → **Importer** → sélectionner le JSON

> ⚠️ Ne pas héberger l'app via Google Drive (Drive ne sert pas de serveur web).  
> Nommer les exports avec la date : `sport-tracker-2026-05-05.json`

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Tableau de bord | `/` | Semaine en cours, statut des séances, streak |
| Programme | `/programme` | Détail des 4 séances + règle de progression |
| Lancer séance | `/seance` | Choix de la séance à démarrer |
| Séance active | `/seance/:id` | Mode séance avec timer sticky |
| Historique | `/historique` | Toutes les séances groupées par semaine |
| Progression | `/progression` | Stats, records, graphique hebdomadaire |
| Réglages | `/parametres` | Timer, thème, export/import JSON |

---

## Fonctionnalités

### Timer de repos
- Affichage circulaire mm:ss grand format
- Lancement automatique après validation d'une série
- Boutons : Play/Pause · Reset · Passer · +15s · -15s
- Presets : 30s / 45s / 60s / 90s / 2m
- Signal sonore (Web Audio API) + vibration mobile à la fin

### Mode séance
- Timer compact sticky en haut de l'écran
- Saisie par série : reps réelles, charge kg, durée, commentaire
- Barre de progression globale
- Validation complète ou courte (≥ 10 min)
- Ressenti : facile / normal / difficile / très difficile
- Reprise automatique si la page est fermée

### Données
- Tout en `localStorage` (aucun compte, aucun serveur)
- Export JSON pour sauvegarde ou transfert PC ↔ téléphone
- Import JSON pour restauration

### Programme intégré
- **Lundi** — Force : Rameur · Squat goblet · Pompes · Rowing · Gainage
- **Mardi** — Cardio : Rameur fractionné · Circuit 4 tours
- **Jeudi** — Renforcement : Fentes · Épaules · Rowing · Planche · Gainage latéral
- **Vendredi** — Optionnel : Rattrapage / Mobilité / Express

---

## Structure du code

```
src/
├── types/index.ts          # Types TypeScript
├── data/program.ts         # Programme (exercices, séries, temps de repos)
├── store/useStore.ts       # État global (useReducer + localStorage)
├── utils/storage.ts        # Persistance, export/import, utilitaires date
├── components/
│   ├── Timer.tsx           # Timer de repos (mode complet + compact)
│   ├── Navigation.tsx      # Barre de navigation bas d'écran
│   └── SessionCard.tsx     # Carte de séance (dashboard)
└── pages/
    ├── Dashboard.tsx       # Tableau de bord
    ├── Program.tsx         # Programme détaillé
    ├── SessionStarter.tsx  # Sélection de séance
    ├── ActiveSession.tsx   # Mode séance actif
    ├── History.tsx         # Historique
    ├── Progress.tsx        # Statistiques & progression
    └── Settings.tsx        # Réglages & export/import
```
