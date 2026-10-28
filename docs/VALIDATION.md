# Validation · 28 octobre 2026

## Résultats obtenus

- Compilation ARM64 du helper C++ avec les outils Apple ; test unitaire de déprémultiplication réussi.
- **11 tests automatisés réussis** : séparation préparation/antenne, remplacement de couche, retrait automatique, pause/reprise du timer, validation de projet, comportement PNG, démarrage transparent, export/import PNG, protection des mutations HTTP, verrouillage des formats pendant la sortie et rejet de chemins/médias invalides.
- **8 vérifications du rendu Electron réel réussies** (rapport conservé dans `docs/native-render-report.json`). Aucun rendu simulé n’a remplacé le bitmap natif.
- Résolution vérifiée : **1920 × 1080**. Coins transparents à alpha zéro.
- PNG de mire : niveaux alpha **0 / 64 / 128 / 192 / 255** retrouvés exactement dans la sortie native. BGRA prémultiplié vérifié par valeurs de pixels.
- Séparation effective des modifications en préparation : SHA-256 de l’image native inchangé après édition, changé seulement après mise à jour à l’antenne.
- Sept modèles rendus individuellement et quatre couches simultanées : **50 images/s de rendu observées** pendant le test court sur ce Mac.
- Retrait immédiat : vérification de l’alpha zéro sur les **2 073 600 pixels** de l’image.
- Helper natif : lecture d’une image BGRA réelle et détection de 371 535 pixels visibles, dont 274 932 semi-transparents.
- Interface testée dans le navigateur : GO, modification hors antenne, vue Key, import d’un fichier PNG via le sélecteur, lecture du PNG importé, état des couches. Mise en page observée en vue étroite et bureau.
- Runtime Electron officiel : SHA-256 de l’archive vérifié. Application signée ad hoc et vérifiée avec `codesign --verify --deep --strict`.

## Ce qui reste à tester sur le matériel

**Aucun UltraStudio connecté n’a été détecté.** Le pilote Blackmagic était présent (15.2). Le code effectif de sortie et d’interrogation du matériel est compilé et livré, mais la sortie SDI physique n’a pas été activée ni validée.

À vérifier avec l’UltraStudio 4K original : acceptation de 1080p50 BGRA avec keying, correspondance fill/key des BNC, niveaux, alpha droit/prémultiplié côté régie, cadence SDI, éventuel genlock, compteurs de retard/perte, latence et reprise après déconnexion. Un test de rendu logiciel à 50 images/s ne démontre pas à lui seul la stabilité de la sortie SDI.

Pas de certification broadcast, pas de qualification longue durée SDI, pas de test d’une autre version de macOS ni d’un Mac Intel. La mise en veille du Mac et les pannes système ne sont pas couvertes par une garantie de maintien ou de coupure propre de l’antenne.

## Essai de l’application distribuée

Lancement de `release/graphX.app` par macOS effectué : fenêtre « graphX Engine », moteur démarré en 1080p50, ouverture du studio et détection du pilote Blackmagic confirmées. Aucun matériel connecté n’a été trouvé et la sortie SDI est restée arrêtée. Cet essai utilise le runtime embarqué, sans dépendre d’une installation Node.js système.
