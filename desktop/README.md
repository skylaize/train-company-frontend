# Réseau pour Windows

Une fenêtre qui affiche https://compagnie.skhost.fr, avec le statut Discord
(Rich Presence). **Aucun code du jeu n'est embarqué** : mettre le site à jour
met l'application à jour.

## Publier une version

1. Une seule fois : dans Discord Developer Portal, ouvrez l'application
   « Réseau » (celle de la connexion Discord), copiez son *Application ID*,
   puis sur GitHub : Settings > Secrets and variables > Actions > Variables >
   `DISCORD_CLIENT_ID`. Dans Rich Presence > Art Assets, ajoutez une image
   nommée `logo` (512×512).
2. Changez `version` dans `src-tauri/tauri.conf.json` si besoin.
3. Onglet Actions > « Application Windows » > Run workflow.

L'installeur est publié dans les Releases du dépôt ; le site le propose aux
joueurs Windows à cette adresse fixe :
https://github.com/skylaize/train-company-frontend/releases/latest/download/Reseau-Setup.exe

## Sécurité

- La page ne peut appeler que trois commandes (statut Discord, l'effacer,
  ouvrir un lien https dans le navigateur), et seulement depuis
  compagnie.skhost.fr (`src-tauri/capabilities/main.json`).
- La fenêtre n'affiche que le jeu, son API, la connexion Discord/Google et
  Stripe ; le reste s'ouvre dans le navigateur (`allowed_inside` dans
  `src-tauri/src/main.rs`).
- Version compilée sans outils de développement ni symboles.
