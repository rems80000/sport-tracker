# Activer la synchronisation Google Drive

La synchronisation utilise un **Client ID public** OAuth 2.0. Aucun Client Secret ne doit être placé dans l'application.

## 1. Créer le projet Google

1. Ouvrir [Google Cloud Console](https://console.cloud.google.com/).
2. Créer un projet, par exemple `Remy Life Hub`.
3. Dans **API et services > Bibliothèque**, activer **Google Drive API**.

## 2. Configurer l'autorisation

1. Ouvrir **Google Auth Platform**.
2. Donner un nom à l'application, par exemple `Remy Life Hub`.
3. Choisir un usage externe et ajouter votre propre adresse Google comme utilisateur de test si Google le demande.
4. Ajouter le scope `https://www.googleapis.com/auth/drive.file`.

Ce scope limite TRAINHARD aux fichiers qu'il crée ou que vous lui ouvrez explicitement.

## 3. Créer le Client ID

1. Dans **Clients**, créer un client OAuth.
2. Type : **Application Web**.
3. Ajouter les origines JavaScript utilisées par TRAINHARD, sans chemin final :
   - l'origine de production de l'application ;
   - `http://localhost:5173` pour les essais locaux.
4. Copier le Client ID se terminant par `.apps.googleusercontent.com`.

## 4. Configurer TRAINHARD

Créer `.env.local` à la racine à partir de `.env.example` :

```env
VITE_GOOGLE_CLIENT_ID=VOTRE_CLIENT_ID.apps.googleusercontent.com
```

Pour un hébergeur, ajouter la même variable dans ses réglages d'environnement avant de reconstruire l'application.

## 5. Première connexion

1. Ouvrir n'importe quel écran du Hub, sur ordinateur ou mobile.
2. Appuyer sur **Connecter Google**, dans la barre fixe en haut de l'écran.
3. Autoriser l'accès demandé.

TRAINHARD créera `remy-life-hub.json` dans Mon Drive. Les futures applications Présence et Projets utiliseront le même fichier, chacune dans son module indépendant.

## Rappel facultatif au démarrage

Dans les **Options de connexion Google** (bouton à droite de la barre), cocher **Me proposer la connexion au démarrage**. Ce choix est désactivé par défaut et conservé sur cet appareil. À chaque nouveau chargement de l'application, une invitation propose **Connecter Google** ou **Plus tard**. Changer de page ou revenir simplement à l'application sans la recharger ne réaffiche pas cette invitation.

Ce rappel n'ouvre jamais la fenêtre Google sans un clic. Il ne prolonge pas l'autorisation : à expiration, la barre indique de nouveau que Google n'est pas connecté. Aucun serveur supplémentaire ni abonnement n'est nécessaire.
