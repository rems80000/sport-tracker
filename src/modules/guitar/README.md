# Guitare — Life Hub

## Backing tracks

Trois boucles originales synthétisées de huit mesures sont incluses : La mineur (90 BPM), Mi mineur (100 BPM), Do majeur (105 BPM). Les pistes comportent basse, accords et batterie ; elles sont générées par `npm run generate:backings`, sans enregistrement tiers. Chaque WAV mono 24 kHz pèse environ 0,9 à 1 Mo et entre dans le précache PWA existant. Les fichiers générés sont versionnés : le build ne les régénère pas.

Lecture en boucle, vitesse de 0,75× à 1,25× avec préservation de hauteur selon les capacités du navigateur. La lecture se met en pause en masquant le Hub ou en ouvrant une autre source audio. Les notes pentatoniques et une position de départ sont affichées pour chaque piste.

Les fichiers personnels sont importés dans IndexedDB (40 Mo maximum par fichier). Les titres et tonalités sont conservés dans localStorage. Ils ne sont ni envoyés à Google ni synchronisés avec Drive. Un effacement du stockage du navigateur efface les imports ; conserver les fichiers originaux.

## Tablatures

Les anciennes fiches texte restent compatibles. Une fiche peut aussi associer un PDF, une image PNG/JPG/WEBP ou les deux représentations texte + document. Le fichier est enregistré localement dans IndexedDB ; seul son identifiant, son nom et son type sont associés à la fiche dans localStorage.

Le PDF utilise le lecteur natif du navigateur, avec accès en grand et téléchargement en repli pour mobile. Le défilement automatique reste disponible pour le texte et l’image, et le zoom pour l’image. Il n’y a pas de synchronisation des pages PDF avec la musique.

## Validation

`node --experimental-strip-types --test tests/guitar*.test.mjs` vérifie l’accordeur, les formats d’import et les trois pistes WAV (durée de huit mesures, niveau sonore, absence de saturation et taille compatible avec le précache).
