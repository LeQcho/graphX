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

## Version 0.2 — conducteur

28 tests automatisés réussis : modèle, API locales, export/import des PNG, ordre stable pendant le direct, prochain départ indépendant de la sélection, refus d’un GO désynchronisé, fin sans répétition, suppression, horloge pause/reprise et conversion timecode aux 5 cadences.

Vérification navigateur : Espace sur le bouton GO envoie un seul élément, O retire le dernier envoyé, saisie du repère, horloge pause/reprise, glissement d’une signature à l’antenne vers une autre position sans retrait du programme, curseur de taille déplacé de 100 % à 152 % en conservant le contrôle actif.

Rendu natif 0.2 : 8 contrôles réussis, alpha PNG conservé exactement, 50 images/s observées avec quatre couches. Rapport : native-render-report-v02.json. Aucun périphérique SDI connecté pendant ces vérifications.

## Version 0.2.1 — OBS

29 tests automatisés réussis. Un nouveau client de sortie rejoint le programme en cours sans modifier son état ni celui des SDI. La page OBS utilise le même rendu transparent que la sortie native.

9 vérifications de rendu réussies dans Electron, dont le chargement de la page OBS sur un programme déjà à l’antenne et la conservation exacte des alphas PNG 0/64/128/192/255. Panneau OBS et bouton de copie vérifiés dans le navigateur. Rapport : native-render-report-v021.json.

La composition réelle dans OBS reste à valider : l’ouverture de l’OBS installé a présenté une fenêtre de médias manquants de la collection existante, puis a quitté après annulation. Aucune scène ni source existante n’a été modifiée. Le fonctionnement simultané sur les prises SDI physiques reste non vérifié en l’absence de périphérique connecté.

## Version 0.3 — Companion

31 tests graphX et 9 tests du module Companion réussis. Les nouveaux contrôles atomiques couvrent l’ajustement des scores et du temps restant, y compris un minuteur en pause. Le module vérifie les cibles stables, les noms ambigus, la séparation préparation/antenne, le refus d’un GO obsolète, les variables, les presets, la reconnexion et l’absence de répétition après une réponse réseau perdue.

Module 0.1.0 construit pour l’API Companion 2.2 et chargé dans **Companion 5.1.1**. Essai depuis les vrais boutons Companion sur un moteur isolé : deux GO successifs, OUT du dernier élément, démarrage/pause de l’horloge ; état graphX vérifié après les commandes et retours visuels observés sur les touches.

Application graphX 0.3 empaquetée, signature ad hoc vérifiée, puis démarrée avec le projet existant sur 4318 : rendu natif 1920 × 1080 à 50 images/s observé. Connexion Companion remise sur 4318 ; 55 presets issus des dix graphiques du projet. Pages 100 LIVE (15 touches) et 101 GRAPHIQUES (10 touches directes) créées et exportées. Le Stream Deck physique était hors ligne ; son fonctionnement matériel et les sorties SDI restent à vérifier.
