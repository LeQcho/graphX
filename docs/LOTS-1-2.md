# graphX 0.4 — fiabilité et conduite

Livraison du 29 octobre 2026. Stratégie A : graphX reste autonome sur Mac. Ce lot couvre la préparation, le conducteur, les scènes et Companion. NDI, vidéo alpha et packages HTML/OGraf restent hors périmètre.

## Essayer

Ouvrir `release/graphX-0.4.app`, puis le studio indiqué dans la fenêtre Engine (normalement http://127.0.0.1:4318). Les projets existants sont repris ; les nouvelles propriétés ont des valeurs par défaut. Le moteur démarre transparent, horloge arrêtée et SDI désactivé.

### Préparer une émission

1. Importer les PNG ou réutiliser une image dans **Médiathèque**. Le conducteur reste limité à 250 éléments ; PNG, JPEG et WebP sont acceptés, jusqu’à 25 Mio par image, 8192 pixels par côté et 32 mégapixels au décodage.
2. Utiliser **Importer CSV** pour une liste d’intervenants. Colonnes : `nom;fonction;groupe;notes`, avec éventuellement `label`, `type`, `skip`. Les noms et fonctions sont éditables avant confirmation. Voir `examples/Intervenants.csv`.
3. Renseigner un **groupe**, des **notes**, les **favoris** et les repères de timecode dans l’inspecteur. Ajouter une **Note régie** pour un top non diffusé.
4. Utiliser recherche et filtres. Ils changent la vue, jamais l’ordre ni le prochain élément. Le glisser-déposer conserve les identifiants ; en vue filtrée, les éléments restent insérés dans l’ordre global, et un dépôt après la dernière ligne les place en fin de conducteur.
5. Appliquer un **thème** à la sélection, au groupe de la sélection ou à tout le conducteur. Enregistrer les trois couleurs d’un élément comme thème du projet. Les copies à l’antenne ne changent pas.
6. **Annuler / rétablir** ou ⌘Z / ⌘⇧Z revient sur la préparation. L’historique conserve 50 étapes en mémoire, regroupe les mouvements continus d’un curseur et disparaît au redémarrage ou au changement de projet. Il ne retire pas les copies diffusées, ne rembobine pas l’horloge et ne change pas les réglages SDI. Dans un champ de texte, le raccourci reste celui du champ.

### Composer et conduire

**Ajouter → Scène multicouche** : cocher jusqu’à huit graphiques, chacun sur une couche différente. Pas de scènes imbriquées. Le GO prépare toutes les ressources puis démarre les membres avec le même instant de référence. Les autres couches restent actives. OUT retire les instances de cette scène. Modifier sa composition exige un nouveau GO ; une simple mise à jour des contenus peut utiliser **Mettre à jour à l’antenne**.

Le **mode conducteur** joue un élément par Espace ou GO Companion. Les notes et les éléments **SKIP** sont sautés. SKIP n’interdit pas un GO manuel explicite. **Armer le groupe** prépare son premier élément jouable ; cela ne diffuse rien. L’enchaînement continue ensuite dans l’ordre global, au-delà de la fin du groupe. **G** recale le prochain sur la sélection.

Le volet **Couches à l’antenne** montre les huit couches et leur nom. Chaque instance dispose d’un OUT, même si sa ligne a été supprimée du conducteur. La prévisualisation permet de déplacer la copie de travail en la faisant glisser ; le programme ne change qu’au GO ou lors d’une mise à jour explicite.

## Fiabilité livrée

- **À préparer / Chargement / Prêt / Erreur** : la sélection et le prochain sont préparés en arrière-plan. Avant GO, avancer ou actualiser, le moteur natif confirme le décodage des médias. Un échec laisse le programme et le prochain en place. « Prêt » reflète la dernière vérification des ressources ; le contrôle est refait au GO. L’aperçu web vérifie la présence des fichiers ; la validation native requiert l’application macOS.
- Le cache d’images applique un budget de 256 Mio décodés ; les ressources à l’antenne sont protégées. Une composition trop volumineuse est refusée. Ce budget ne représente pas toute la mémoire du processus Chromium.
- **Retour du moteur** : le programme du studio natif reçoit les pixels de la fenêtre de rendu, en proxy 960 × 540 jusqu’à 5 images/s. Alpha, Fill et Key restent consultables. Un signal de vie du rendu distingue une image immobile d’un moteur bloqué ; son absence pendant plus de deux secondes est signalée. Le nombre de nouvelles images peut être nul sur un programme statique. Ce proxy n’est ni un retour SDI ni un contrôle de synchronisation physique.
- **Horloge** : calcul monotone dans le moteur et interpolation locale ; changer l’heure du Mac ne fait pas sauter les durées pendant la session.
- **Commandes** : traitement sérialisé et identifiant de requête. Les 500 derniers résultats réussis sont conservés en mémoire pour reconnaître une répétition identique. Companion ne renvoie jamais automatiquement une commande dont la réponse est perdue. Cette protection ne remplace pas une transaction durable après redémarrage.
- **Sauvegardes** : écriture asynchrone du projet, fichier de secours et 30 copies datées, au maximum une par minute. Restauration hors antenne et sortie SDI arrêtée.
- **Archives** : nouvel export binaire `.graphx` avec médias et contrôle SHA-256 à l’import, jusqu’à 2 Gio. Il évite l’expansion base64 et le plafond JSON de 40 Mo. L’import des anciens exports JSON reste accepté. Les archives 0.4 ne sont pas lisibles par graphX 0.3 ; conserver une copie de l’ancien projet avant retour en arrière.
- **Diagnostic** : les 120 dernières mesures de rendu/sortie et les événements récents sont exportables depuis Santé du moteur. Un journal local tourne à 2 Mio avec un fichier précédent ; les événements ne sont pas un historique permanent de toutes les modifications.

## Companion 5.1.1

Installer `release/Companion/graphx-studio-0.2.2.tgz` dans Modules puis choisir **0.2.2** sur la connexion existante `graphx`. Garder le port du moteur, normalement 4318. Les 19 actions historiques conservent leurs identifiants ; les actions groupe, SKIP et historique portent le total à 22.

Les presets proposent conduite, graphiques, comptes à rebours, scores, couches, scènes, SKIP, groupes et préparation. Scènes et groupes apparaissent quand le projet connecté en contient. Les boutons liés de Companion 5.1 reçoivent les nouvelles définitions. Les boutons personnalisés gardent leurs réglages ; les nouveaux feedbacks peuvent y être ajoutés.

Variables nouvelles : `selected_ready`, `next_ready`, `selected_error`, `next_error`, `render_fps`, `render_age_ms`, `save_error`, `undo_count`, `redo_count`, et `cue_<id>_group/skip/ready/error`. Les états bruts sont `ready`, `loading`, `error`, `idle`, `note`, ou `unknown` si le moteur ancien ne les expose pas. Feedbacks : préparation, SKIP, rendu absent/figé et erreur de sauvegarde.

## Validation et limites

58 tests automatisés couvrent le modèle, la conduite, le serveur, le CSV, les archives et Companion. Ils incluent le double appui concurrent, les scènes invalides, le refus des médias absents, l’undo hors antenne, une archive de 45 Mio importée dans un dossier vierge et une archive corrompue refusée sans remplacer le projet. Les gros fichiers du test d’archive sont synthétiques ; le décodage d’images réelles est testé séparément dans le moteur.

13 contrôles du moteur Electron 1920 × 1080 ont réussi : pixels transparents, alpha PNG 0/64/128/192/255, BGRA prémultiplié, arrivée OBS sur le programme existant, séparation préparation/antenne, sept modèles, quatre couches à 50 images/s lors de la mesure, GO scène, proxy natif et refus d’un PNG corrompu avant diffusion.

La sortie **UltraStudio 4K d’origine n’est pas qualifiée matériellement** : le pilote est détecté mais aucun périphérique n’était connecté lors des essais. Restent à mesurer sur l’appareil : modes 1080p effectivement disponibles en key externe, sorties physiques Fill/Key, niveaux et type d’alpha, cadence, synchronisation et tenue prolongée. L’OBS navigateur suit les commandes mais sa synchronisation image par image avec le SDI n’est pas garantie.
