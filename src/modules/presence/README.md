# Présent — bibliothèque et audio

L'accueil présente les 12 séances réparties sur trois rangées horizontales. Glissement tactile, barre de défilement, clavier et flèches. Chaque carte lance sa séance. Aucun défilement automatique.

Les cinq séances vocales utilisent 34 fichiers MP3 (un par consigne), préparés localement avec Kokoro-82M/ff_siwis via kokoro-onnx, vitesse 0.80, pause de une seconde entre phrases, lecture à 0.9 avec hauteur de voix conservée. Ce sont des voix synthétiques. Le modèle et Python ne sont ni embarqués ni requis au build. Les autres pratiques restent libres ou utilisent l'audio personnel existant. La sélection de voix de l'appareil est conservée comme option ; une erreur du fichier intégré déclenche le secours système. Les consignes manquées après suspension ne sont pas mises en file d'attente. Une consigne interrompue est reprise au début de la phrase.

Six enregistrements remplacent les anciens bruits synthétiques. Sources/auteurs/licences et adaptations dans public/presence/audio-credits.html et ambience-credits.json. Fondus de démarrage/arrêt et baisse de volume pendant la parole. Boucles préparées par chevauchement de 2 secondes maximum ; la conversion MP3 peut laisser une légère jonction selon le décodeur. Aucune diffusion externe. Les imports personnels et l'historique Drive sont préservés.

Les MP3 sont précachés par Workbox (chaque fichier inférieur à 4 Mo). Attendre la fin du chargement initial pour le hors ligne. Le préchargement augmente la taille PWA d'environ 10 Mo. Durées natives des consignes dans voice-manifest.json (diviser par 0.9 pour la lecture) : toutes se terminent avant la consigne suivante. Vérifier avec node --experimental-strip-types --test tests/presence-*.test.mjs et npm run build.
