# graphX 0.4

Application macOS de titrage live : conducteur web, PNG avec alpha, scènes multicouches, OBS et moteur natif Blackmagic. [Guide des lots 1 et 2](docs/LOTS-1-2.md) · [Companion 0.2.2](docs/COMPANION.md).

Version de test : `release/graphX-0.4.app`. Les essais logiciels sont validés ; la qualification Key + Fill sur UltraStudio 4K reste à réaliser.

La build d’essai **`release/graphX-0.4-regie.app`** ajoute l’import de médias en prestation et les commandes vidéo. Le module Companion 0.3.0 et trois pages de 15 touches sont disponibles dans le [guide régie](docs/REGIE.md).

**Le direct, simplement.** Un studio de titrage dans le navigateur, un moteur de rendu local sur Mac et une sortie native Blackmagic key + fill.

## Tester maintenant

1. Ouvrir **`release/graphX-0.4.app`**. Aucun Node.js ni terminal à installer.
2. Le studio s’ouvre dans le navigateur. Le moteur reste actif dans la barre de menus.
3. Choisir un graphique, puis **GO** ou **Espace**. **O** retire le graphique sélectionné ; **Échap** retire toutes les couches.
4. Glisser un PNG dans le conducteur, ou choisir **Importer un PNG**. Les PNG 1920 × 1080 sont centrés à 100 % pour conserver leur placement d’origine.
5. Pour la sortie matérielle : brancher l’UltraStudio → **Sortie vidéo** → **Actualiser** → choisir le périphérique, le format et le type d’alpha → **Activer Key + Fill**.

Le dossier `examples/` contient un titrage PNG transparent et une mire alpha. Voir [le guide de premier essai](docs/PREMIER-ESSAI.md).

## Inclus

- Conducteur à huit couches, sélection indépendante de l’antenne, remplacement avec transition.
- Scènes multicouches, groupes, notes, SKIP, recherche, favoris, thèmes, CSV et annuler/rétablir.
- Préparation des médias confirmée par le moteur natif, retour de ses pixels et diagnostic exportable.
- Companion 5.1.1 : actions, feedbacks, variables et presets liés.
- Sortie OBS via source Navigateur transparente.
- Sept modèles : nom/fonction, chapitre, logo, défilement, compte à rebours, score, plein écran.
- PNG, JPEG et WebP importés ; transparence PNG préservée, position, taille et opacité ajustables.
- Preview avec fond de contrôle et programme avec vues Alpha / Fill / Key.
- Fondu, glissement ou cut ; retrait automatique après une durée.
- Sauvegarde locale automatique et export/import `.graphx` incluant les images.
- Moteur Chromium hors écran 1920 × 1080 indépendant de l’onglet de commande.
- Sortie native Blackmagic via SDK : BGRA, external keying, programmation sur l’horloge matérielle, quatre images de préchargement, compteurs de retard/perte.
- Choix 1080p25 / 30 / 50 / 59.94 / 60, sous réserve des modes exposés par le périphérique.
- Mode d’alpha prémultiplié ou droit ; réglage Level A/B si accepté par le pilote.

## Périmètre de cette version

Application construite pour **Mac Apple Silicon**, testée ici sous macOS 27.0.1. Le binaire cible macOS 12+ mais les autres versions n’ont pas été qualifiées. Blackmagic Desktop Video est requis pour le SDI. Le pilote installé lors des tests est 15.2.

**Les pixels natifs et leur alpha ont été testés. Aucune sortie physique SDI n’a pu être validée : aucun UltraStudio n’était connecté pendant la construction.** La régularité matérielle, le mapping des BNC et l’incrustation finale doivent être vérifiés à la première connexion.

Le studio est accessible sur le Mac hôte uniquement (127.0.0.1). Pilotage réseau distant, OGraf, vidéos avec alpha, polices importées et éditeur de formes libres ne sont pas inclus dans 0.4.0.

La version locale est signée ad hoc, sans signature Developer ID ni notarisation Apple. Elle est livrée pour essai sur ce Mac ; la distribution à d’autres machines reste à préparer.

## Données

Par défaut : `~/Library/Application Support/graphX/`. `project.json` contient le conducteur, `project.json.bak` la copie de secours et `media/` les images. Le programme à l’antenne n’est pas relancé à l’ouverture : le moteur démarre transparent et SDI arrêté.

Aucun compte, cloud ou service externe n’est nécessaire. Les images sont copiées localement. Aucun chargement de script HTML arbitraire n’est accepté.

## Essai vidéo alpha

Dans la build d’essai vidéo, **Importer une vidéo** ajoute un habillage WebM au conducteur. Utilise un **WebM VP9 avec alpha**, en 1920 × 1080 maximum, jusqu’à 250 Mio et 30 minutes. La lecture est muette. Sur le PC de régie, utilise Chrome ou Edge pour l’aperçu.

La prévisualisation montre la première image. Après **GO**, le panneau sous **Programme** affiche la progression et le temps restant, avec **Pause / Reprendre**, **Repartir** et **OUT**. La vidéo se retire à la fin par défaut. L’option **Boucler jusqu’au OUT** se règle dans l’inspecteur. Un export `.graphx` inclut le fichier vidéo.

Pour convertir un master qui possède déjà un canal alpha avec FFmpeg :

```sh
ffmpeg -i habillage.mov -c:v libvpx-vp9 -pix_fmt yuva420p -crf 24 -b:v 0 -an habillage.webm
```

Vérifie la transparence en prévisualisation avant le GO. [WebM avec alpha dans Chromium](https://developer.chrome.com/blog/alpha-transparency-in-chrome-video)

## Développement

Node.js 22+ permet de lancer les tests et l’aperçu web :

```sh
node --test tests/*.test.cjs companion/companion-module-graphx-studio/tests/*.test.js
node app/preview.cjs
```

Compiler le helper natif avec les outils Apple :

```sh
sh scripts/build-engine.sh
```

Le runtime Electron 45.1.0 officiel arm64 est conservé dans `build/electron/` pour cette construction. Sa somme SHA-256 a été vérifiée à partir du fichier SHASUMS256 publié avec la release. Pour reconstruire l’application :

```sh
node scripts/package.cjs
```

L’aperçu web seul n’offre pas de sortie Blackmagic. Le binaire Electron exécute `app/main.cjs`, qui lance le rendu hors écran, le serveur local et le helper `graphx-output`.

[Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md) · [Licences tierces](THIRD-PARTY-NOTICES.md)
