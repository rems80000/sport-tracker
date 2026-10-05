# Routine Google Tasks — Life Hub

## Ce qui fonctionne

Le téléphone, la Galaxy Watch6 et les enceintes créent des tâches via Google. La liste par défaut sert d’inbox globale. Si elle se nommait « Notes à la volée », elle est renommée « Inbox — Life Hub » sans modifier ses tâches. Un script Google Apps Script examine la liste par défaut toutes les cinq minutes environ, même avec le navigateur fermé. La fréquence n'est pas une garantie d'exécution à la seconde : Google applique ses quotas et peut retarder les déclencheurs.

- Tâche ordinaire : conserve la tâche et son rappel Google, sans réécrire son échéance.
- « Acheter du lait et des pommes » : deux entrées dans **Commissions — Life Hub**.
- « Note : idée de week-end à Lille » : une entrée dans **Notes — Life Hub**.
- « Rendez-vous garage le 25/09/2026 de 14 h à 15 h » : événement dans le calendrier principal, sans invités ni emails.
- Demande ambiguë, conditionnelle, récurrente, date invalide ou rendez-vous incomplet : **À préciser**. Créez une nouvelle tâche explicitement formulée dans Google Tasks pour la relancer.

Il s'agit de règles explicites, pas d'une IA conversationnelle. Aucune clé OpenAI et aucun abonnement supplémentaire ne sont nécessaires à cette version. Le script ne transmet les données à aucun autre service que Google Tasks et Google Calendar. Google Keep n'est pas utilisé : son API n'est pas adaptée à ce compte personnel.

Les sources converties avec succès en note, commissions ou événement sont marquées terminées. Une tâche ordinaire reste à faire. Les notes d'origine sont conservées ; un bloc technique est ajouté à la fin pour retrouver le résultat et éviter les doublons. Ne pas modifier ce bloc à la main. Les sorties sont identifiées par source et position ; les événements ont un identifiant stable. Après interruption, les résultats déjà créés sont retrouvés avant toute nouvelle création.

## Activation Google

Le projet préparé dans le compte de Rémy :
https://script.google.com/home/projects/1Cw_Aziy1XGdqfTlTePG_Q1JszmdBb91GIVrTp9-7EgomhmupzBcKoBgv/edit

1. Générer les fichiers : `node scripts/build-automation.mjs` (également inclus dans `npm run build`).
2. Dans Apps Script, remplacer **Code.gs** par `public/automation/LifeHub.gs`.
3. Paramètres du projet → afficher **appsscript.json**. Remplacer son contenu par `automation/appsscript.json`. Cela active les services avancés Tasks et Calendar et définit Europe/Paris.
4. Sélectionner et exécuter **installer**. Autoriser Google Tasks, les événements Calendar et la gestion des déclencheurs de ce script. Aucun déploiement web ni lien public n'est requis.
5. Ouvrir le Hub → Réglages → **Routine Google Tasks** (connexion Google en haut), avec le même compte. Le statut doit indiquer que le traitement est installé.
6. Créer une nouvelle tâche de test, puis exécuter **traiterDemandes** ou attendre un passage. Vérifier les sorties réelles et la date du dernier passage dans Réglages → Routine Google Tasks.

Dans un projet Apps Script avec projet Google Cloud standard personnalisé, activer également les API Tasks et Calendar dans Google Cloud. Les projets Apps Script par défaut gèrent normalement cette activation avec les services avancés.

`installer` peut être exécuté plusieurs fois sans recréer les listes ni multiplier les déclencheurs. `arreter` supprime uniquement le déclencheur `traiterDemandes` et conserve toutes les données. Les droits Google peuvent ensuite être révoqués depuis les paramètres du compte.

## Limites à connaître

- **Heure du rappel inaccessible** : l'API Tasks ne donne que le jour d'échéance. Le script n'utilise jamais ce champ pour déduire l'heure d'un rendez-vous. Sur l'enceinte, l'heure demandée par Google sert au rappel ; elle n'est pas une preuve de l'heure de l'événement.
- **Pas de distinction voix/clavier** : toutes les tâches nouvelles ou modifiées dans la liste source sont concernées. Les tâches antérieures à l'installation sont laissées telles quelles, sauf demande explicitement préparée. Une tâche déjà traitée n'est pas reconvertie automatiquement après édition.
- **Rendez-vous** : dates ISO, jour/mois/année, aujourd'hui et demain ; deux heures explicites `de 14 h à 15 h`. Les jours nommés, dates sans année, récurrences et événements à cheval sur minuit nécessitent une précision manuelle. Les heures ambiguës ou inexistantes au changement d'heure sont refusées. Si Google a retiré les dates du texte dicté, créer une nouvelle tâche avec la date dans son titre.
- **Formulations** : aucune compréhension libre de phrases complexes. « Prendre rendez-vous » ne doit pas créer un événement sans date ; les ambiguïtés restent à préciser. Les corrections d'une sortie déjà créée se font dans Google Tasks/Calendar.
- **Synchronisation** : le Hub actualise les listes toutes les minutes lorsqu'il est visible et connecté. Un jeton expiré demande une reconnexion. L'automatisation utilise sa propre autorisation et continue indépendamment.
- **Capture** : utilisez la commande vocale Google/Gemini ou la dictée du clavier dans Google Tasks. Le module Assistant et la capture de notes du Hub ont été retirés. Vérifiez une fois sur chaque appareil la liste dans laquelle Google crée la tâche.

## Vérification développeur

`npm run test:voice` couvre classification, dates Paris/DST, pagination, édition concurrente, absence d'automatisation, conservation des notes, réinstallation, reprise après incident et prévention des doubles créations. Les services Google sont simulés dans ces tests. Une validation réelle après autorisation du compte reste nécessaire.

## Listes et dates de planification

Le Hub affiche le jour transmis par Google Tasks, sans inventer l'heure ni la répétition (non exposées par cette API). Les dates sont lues comme des jours calendaires, sans conversion de fuseau, et les tâches sont triées par date.

Au premier passage du script mis à jour, six listes sont créées ou retrouvées sans déplacer les anciennes commissions : Commission Grande Surface, Commission Leroy Merlin, Commission Norauto, Commission animalerie, Commission pharmacie, Films et séries à regarder. Aucun nouveau droit ni déclencheur n'est nécessaire.

Dicter par exemple « Acheter des vis chez Leroy Merlin » / « Regarder le film Dune ». Le préfixe exact « Commission pharmacie : savon » fonctionne aussi. Les demandes sans magasin restent dans les commissions générales ; aucun magasin n'est déduit uniquement d'un article. Les éléments ajoutés aux listes conservent la date Google de la demande source.


Les listes Notes, Commissions, service et destinations spécialisées sont retrouvées ou recréées à chaque passage si elles ont été supprimées. Les identifiants périmés sont remplacés. La réinstallation conserve le début de traitement et ne crée pas de second déclencheur. Aucune clé IA, nouveau client OAuth ou extension de droits n’est ajouté. Les heures de rappels Google ne sont pas exposées par l’API Tasks : les tâches ordinaires restent dans l’inbox afin de conserver leurs rappels.
