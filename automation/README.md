# Assistant vocal Life Hub

## Ce qui fonctionne

Le téléphone, la Galaxy Watch6 et les enceintes créent des tâches via Google. Le Hub les lit dans Google Tasks. Un script Google Apps Script examine la liste par défaut toutes les cinq minutes environ, même avec le navigateur fermé. La fréquence n'est pas une garantie d'exécution à la seconde : Google applique ses quotas et peut retarder les déclencheurs.

- Tâche ordinaire : conserve la tâche et son rappel Google, sans réécrire son échéance.
- « Acheter du lait et des pommes » : deux entrées dans **Commissions — Life Hub**.
- « Note : idée de week-end à Lille » : une entrée dans **Notes — Life Hub**.
- « Rendez-vous garage le 25/09/2026 de 14 h à 15 h » : événement dans le calendrier principal, sans invités ni emails.
- Demande ambiguë, conditionnelle, récurrente, date invalide ou rendez-vous incomplet : **À préciser**. Le formulaire du Hub transmet la correction au prochain passage.

Il s'agit de règles explicites, pas d'une IA conversationnelle. Aucune clé OpenAI et aucun abonnement supplémentaire ne sont nécessaires à cette version. Le script ne transmet les données à aucun autre service que Google Tasks et Google Calendar. Google Keep n'est pas utilisé : son API n'est pas adaptée à ce compte personnel.

Les sources converties avec succès en note, commissions ou événement sont marquées terminées. Une tâche ordinaire reste à faire. Les notes d'origine sont conservées ; un bloc technique est ajouté à la fin pour retrouver le résultat et éviter les doublons. Ne pas modifier ce bloc à la main. Les sorties sont identifiées par source et position ; les événements ont un identifiant stable. Après interruption, les résultats déjà créés sont retrouvés avant toute nouvelle création.

## Activation Google

Le projet préparé dans le compte de Rémy :
https://script.google.com/home/projects/1Cw_Aziy1XGdqfTlTePG_Q1JszmdBb91GIVrTp9-7EgomhmupzBcKoBgv/edit

1. Générer les fichiers : `node scripts/build-automation.mjs` (également inclus dans `npm run build`).
2. Dans Apps Script, remplacer **Code.gs** par `public/automation/LifeHub.gs`.
3. Paramètres du projet → afficher **appsscript.json**. Remplacer son contenu par `automation/appsscript.json`. Cela active les services avancés Tasks et Calendar et définit Europe/Paris.
4. Sélectionner et exécuter **installer**. Autoriser Google Tasks, les événements Calendar et la gestion des déclencheurs de ce script. Aucun déploiement web ni lien public n'est requis.
5. Ouvrir le Hub → Assistant → **Connecter Google**, avec le même compte. Le statut doit indiquer que le traitement est installé.
6. Créer une nouvelle tâche de test, puis exécuter **traiterDemandes** ou attendre un passage. Vérifier les sorties réelles et la date du dernier passage dans le Hub.

Dans un projet Apps Script avec projet Google Cloud standard personnalisé, activer également les API Tasks et Calendar dans Google Cloud. Les projets Apps Script par défaut gèrent normalement cette activation avec les services avancés.

`installer` peut être exécuté plusieurs fois sans recréer les listes ni multiplier les déclencheurs. `arreter` supprime uniquement le déclencheur `traiterDemandes` et conserve toutes les données. Les droits Google peuvent ensuite être révoqués depuis les paramètres du compte.

## Limites à connaître

- **Heure du rappel inaccessible** : l'API Tasks ne donne que le jour d'échéance. Le script n'utilise jamais ce champ pour déduire l'heure d'un rendez-vous. Sur l'enceinte, l'heure demandée par Google sert au rappel ; elle n'est pas une preuve de l'heure de l'événement.
- **Pas de distinction voix/clavier** : toutes les tâches nouvelles ou modifiées dans la liste source sont concernées. Les tâches antérieures à l'installation sont laissées telles quelles, sauf correction explicite via le Hub. Une tâche déjà traitée n'est pas reconvertie automatiquement après édition.
- **Rendez-vous** : dates ISO, jour/mois/année, aujourd'hui et demain ; deux heures explicites `de 14 h à 15 h`. Les jours nommés, dates sans année, récurrences et événements à cheval sur minuit nécessitent une précision manuelle. Les heures ambiguës ou inexistantes au changement d'heure sont refusées. Si Google a retiré les dates du texte dicté, compléter le formulaire.
- **Formulations** : aucune compréhension libre de phrases complexes. « Prendre rendez-vous » ne doit pas créer un événement sans date ; les ambiguïtés restent à préciser. Les corrections d'une sortie déjà créée se font dans Google Tasks/Calendar.
- **Synchronisation** : le Hub actualise les listes toutes les minutes lorsqu'il est visible et connecté. Un jeton expiré demande une reconnexion. L'automatisation utilise sa propre autorisation et continue indépendamment.
- **Brouillons** : conservés sur l'appareil, envoyés uniquement par une action explicite. Les listes Google ne sont pas stockées hors ligne par ce module. Les anciens projets restent dans leur sauvegarde Drive existante et sont consultables/exportables.

## Vérification développeur

`npm run test:voice` couvre classification, dates Paris/DST, pagination, édition concurrente, absence d'automatisation, conservation des notes, réinstallation, reprise après incident et prévention des doubles créations. Les services Google sont simulés dans ces tests. Une validation réelle après autorisation du compte reste nécessaire.
