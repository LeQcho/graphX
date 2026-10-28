# graphX · 0.1.0

**Le direct, simplement.** Un studio de titrage dans le navigateur, un moteur de rendu local sur Mac et une sortie native Blackmagic key + fill.

## Tester maintenant

1. Ouvrir **`release/graphX.app`**. Aucun Node.js ni terminal à installer.
2. Le studio s’ouvre dans le navigateur. Le moteur reste actif dans la barre de menus.
3. Choisir un graphique, puis **GO** ou **Espace**. **O** retire le graphique sélectionné ; **Échap** retire toutes les couches.
4. Glisser un PNG dans le conducteur, ou choisir **Importer un PNG**. Les PNG 1920 × 1080 sont centrés à 100 % pour conserver leur placement d’origine.
5. Pour la sortie matérielle : brancher l’UltraStudio → **Sortie vidéo** → **Actualiser** → choisir le périphérique, le format et le type d’alpha → **Activer Key + Fill**.

Le dossier `examples/` contient un titrage PNG transparent et une mire alpha. Voir [le guide de premier essai](docs/PREMIER-ESSAI.md).

## Inclus

- Conducteur à huit couches, sélection indépendante de l’antenne, remplacement avec transition.
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

Le studio est accessible sur le Mac hôte uniquement (127.0.0.1). Pilotage réseau distant, OGraf, vidéos avec alpha, polices importées et éditeur de formes libres ne sont pas inclus dans 0.1.0.

La version locale est signée ad hoc, sans signature Developer ID ni notarisation Apple. Elle est livrée pour essai sur ce Mac ; la distribution à d’autres machines reste à préparer.

## Données

Par défaut : `~/Library/Application Support/graphX/`. `project.json` contient le conducteur, `project.json.bak` la copie de secours et `media/` les images. Le programme à l’antenne n’est pas relancé à l’ouverture : le moteur démarre transparent et SDI arrêté.

Aucun compte, cloud ou service externe n’est nécessaire. Les images sont copiées localement. Aucun chargement de script HTML arbitraire n’est accepté.

## Développement

Node.js 22+ permet de lancer les tests et l’aperçu web :

```sh
node --test tests/*.test.cjs
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
