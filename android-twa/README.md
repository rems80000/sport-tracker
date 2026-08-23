# Remy Life Hub pour Android

Ce dossier contient le projet **Trusted Web Activity** de Remy Life Hub, généré avec Bubblewrap 1.24.1.

- Identifiant Android : `fr.remy.lifehub`
- Site lancé : `https://rems80000.github.io/sport-tracker/`
- Version initiale : `1` (`versionCode 1`)
- Android minimum : 5.0 (API 21)
- Android cible : API 36

## Pourquoi une TWA

La TWA conserve l'application web actuelle, son stockage, Google Drive et les lecteurs audio tout en permettant de produire un APK et un AAB Android. La validation Digital Asset Links retire la barre Chrome et garantit que seule l'application signée peut ouvrir le site en plein écran de confiance.

## Étapes de publication

1. Créer et conserver hors de Git une clé de signature `android.keystore` avec l'alias `android`.
2. Remplacer l'empreinte dans `assetlinks.template.json`, puis publier le résultat à l'adresse exacte `https://rems80000.github.io/.well-known/assetlinks.json`.
3. Construire l'APK/AAB signé avec Bubblewrap ou Gradle, puis conserver la clé et ses mots de passe dans un coffre sécurisé.

Le fichier de clé, les mots de passe et les sorties de compilation sont ignorés par Git. Ne jamais les committer.

## Régénération

Depuis ce dossier, après installation de Bubblewrap :

```bash
bubblewrap update
bubblewrap build
```

Le dépôt GitHub Pages racine `rems80000/rems80000.github.io` est nécessaire pour servir `/.well-known/assetlinks.json`. Un fichier placé sous `/sport-tracker/.well-known/` ne suffit pas à valider le domaine.
