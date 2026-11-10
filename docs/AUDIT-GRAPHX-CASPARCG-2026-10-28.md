# graphX et CasparCG — comparaison et feuille de route

Audit du **28 octobre 2026** pour Quentin. Usage de référence : Mac Apple Silicon, UltraStudio **4K original**, production en **1080p**, habillages PNG, conducteur live, OBS et Companion 5.1.1. Le 1080p50 sert de scénario de qualification ; ce choix reste à confirmer avec les modes réellement acceptés par le matériel.

**Ma recommandation : continuer graphX comme outil intégré de titrage sur Mac, en donnant d’abord la priorité à la fiabilité et à la conduite.** Ensuite, ouvrir les habillages à des templates personnalisés et ajouter les médias animés. Garder la possibilité d’un moteur CasparCG distant pour les besoins de diffusion plus larges. Une réécriture immédiate autour de CasparCG ajouterait une machine et un déploiement plus complexe à ton usage actuel.

Ce document propose des évolutions. Il ne les annonce pas comme réalisées et ne lance aucune modification fonctionnelle.

**1. Ce qui a été vérifié pour cette comparaison.**

graphX : lecture du code actuel **0.3.0**, révision `eddb789`, du module Companion **0.1.0**, des tests et des rapports de rendu. Les **40 tests automatisés** ont été relancés pendant cet audit : 40 réussis, aucun échec. Les neuf contrôles de rendu natif du rapport 0.2.1 constituent une preuve antérieure, pas un nouvel essai matériel.

CasparCG : documentation et dépôts officiels consultés le 28 octobre 2026. La référence serveur est **2.5.1 stable** ; le client officiel a sa propre version, **2.3.1**. Certaines pages du wiki décrivent encore les versions 2.0 et Flash : les versions récentes et leur configuration ont été privilégiées lorsqu’elles apportaient une information différente. Aucun banc CasparCG n’a été installé ou mesuré pour cet audit. [Serveur 2.5.1](https://github.com/CasparCG/server/releases/tag/v2.5.1-stable), [versions du client](https://github.com/CasparCG/client/releases).

Les mentions « présent », « absent » et « à qualifier » distinguent le code disponible de la preuve de fonctionnement en régie. Les appréciations de priorité et de facilité ci-dessous sont mes recommandations pour ton usage.

**2. Les deux produits ne couvrent pas le même ensemble de fonctions.**

graphX réunit une interface de préparation, un conducteur, des modèles prêts à remplir, un rendu local et une sortie Blackmagic. CasparCG Server est un moteur de lecture et de composition auquel on associe un contrôleur et des templates. Son architecture combine des sources, un mélangeur et des sorties. La richesse du workflow dépend donc aussi du client choisi. [Architecture CasparCG](https://casparcg.com/docs/wiki/server/).

Le serveur officiel fonctionne sous **Windows et Linux**. Le client officiel est disponible sur Mac : cela permet de piloter un serveur distant, pas de faire tourner le moteur officiel dans macOS. Pour toi, une migration complète nécessiterait donc une machine serveur adaptée et une solution de sortie raccordée à cette machine. L’UltraStudio branché au Mac ne devient pas automatiquement une sortie du serveur distant. [Serveur : plateformes](https://github.com/CasparCG/server), [client : plateformes](https://github.com/CasparCG/client).

CasparCG bénéficie d’un historique de production beaucoup plus long. Cela ne garantit ni une configuration particulière, ni la compatibilité de ton UltraStudio original, ni une bascule de secours transparente. graphX reste un jeune logiciel dont la sortie physique doit encore être qualifiée. [Présentation officielle CasparCG](https://casparcg.com/), [validation graphX](/Users/quentincholier/Documents/GitHub/graphX/docs/VALIDATION.md).

**3. Comparaison des fonctions de création et de contenu.**

| Fonction | graphX 0.3 actuel | CasparCG et outils associés | Ce que je recommande |
|---|---|---|---|
| Titrage immédiatement utilisable | Sept modèles paramétrables, plus le type image | Dépend des templates et du client | Conserver ce point d’entrée simple |
| PNG avec transparence | Import, placement, taille, opacité | Images et composition alpha | Améliorer la bibliothèque et les contrôles avant diffusion |
| JPEG / WebP | Import comme images | Décodage d’images selon les formats de la version | Garder un périmètre clairement testé |
| Habillage animé avec alpha | Pas de lecteur vidéo | Lecture vidéo via FFmpeg | Ajouter après une étude de décodage ciblée |
| Vidéo classique | Absente | Lecture, boucle, recherche et points de lecture | Utile pour jingles ; éviter de transformer trop tôt graphX en serveur vidéo généraliste |
| Audio | Aucun chemin audio | Lecture et mixage audio | À reporter tant que le besoin est le titrage |
| Template HTML/CSS/JS personnalisé | Absent ; rendu Canvas codé dans graphX | Templates HTML contrôlables | Chantier majeur après la fiabilisation |
| Animation en plusieurs étapes | Entrée/sortie seulement | Contrôle d’étapes dans les templates | Ajouter CONTINUER, distinct du GO suivant |
| Polices livrées avec un habillage | Polices système ; pas d’import | Réalisable dans les templates HTML | Très utile pour respecter une charte |
| Éditeur graphique libre | Absent | Non fourni par le serveur ; outils externes | Commencer par un éditeur simple, pas une timeline de motion design complète |
| Thèmes réutilisables | Couleurs et réglages par élément | Dépend des templates et du client | Ajouter des kits de marque versionnés |
| Formulaires de données personnalisés | Champs fixes selon le modèle | Dépendent du template ; GDD dans certains clients | Générer les champs depuis le manifeste du template |
| Données CSV / JSON / tableur | Pas de connecteur | Intégration par le client, le template ou un service | Commencer par CSV, puis JSON ; tableur connecté ensuite |
| Informations sportives | Score à deux équipes et timer simples | Dépend du package graphique et du contrôle | Améliorer uniquement selon les sports réellement utilisés |

Les fonctions vidéo reposent sur le [producteur FFmpeg](https://casparcg.com/docs/wiki/server/producers/ffmpeg-producer). Les templates exposent des fonctions de lecture et de mise à jour via JavaScript : ce n’est pas un éditeur graphique intégré au serveur. [Templates HTML](https://casparcg.com/docs/wiki/media/html-templates). Pour les formulaires GDD et la conduite plus riche, [SuperConductor](https://github.com/SuperFlyTV/SuperConductor) est un exemple de client distinct ; ces fonctions ne doivent pas être attribuées automatiquement au client officiel.

**Le plus gros manque créatif de graphX est l’import d’habillages personnalisés dynamiques.** Ajouter vingt modèles codés en dur ne résoudrait pas cette limite. Un système de packages permettrait de livrer la création, les polices, les images, les champs de saisie et les animations ensemble.

Exemple utile pour toi : importer un package « conférence », choisir un intervenant dans une liste et obtenir automatiquement un titre conforme à la charte. Le graphiste pourrait modifier le style une fois, tandis que les noms et fonctions resteraient des données du conducteur.

**4. Comparaison de la conduite en direct.**

| Fonction | graphX 0.3 actuel | CasparCG / client | Évolution souhaitable |
|---|---|---|---|
| Préparation séparée de l’antenne | Oui, copie indépendante du graphique joué | Réalisable par chargement en attente et logique du client | Conserver et rendre les différences visibles |
| GO séquentiel | Oui, prochain élément armé | Conduite gérée par le client | Renforcer les états et le retour de commande |
| Réordonner pendant le direct | Oui, identifiants stables | Dépend du client | Garder le prochain explicitement armé |
| Navigation sans jouer | Oui | Dépend du client | Ajouter recherche, favoris et accès rapide |
| Groupes, chapitres, scènes | Pas de groupe atomique | Groupes/timeline dans certains clients | Un bouton « scène » peut jouer plusieurs couches ensemble |
| Plusieurs conducteurs | Un seul projet courant | Selon le client ; le serveur n’impose pas un conducteur unique | Préparer une deuxième émission sans charger son programme |
| Élément à ignorer / commentaire | Pas de type dédié | Selon le client | Ajouter SKIP, notes et séparateurs |
| Historique des départs | Dernier envoyé seulement | Dépend du système de contrôle | Horodatage des GO/OUT, opérateur et résultat |
| Annuler / rétablir | Pas d’historique projet | Dépend du client | Historique de préparation sans rembobiner l’antenne |
| Timecode conducteur | Horloge interne et repères indicatifs | Dépend du contrôleur et de l’intégration | Garder le mode manuel, enrichir les durées et le retard |
| Déclenchement programmé | Retrait après durée, pas d’auto-GO par repère | Préchargement/enchaînement de médias et orchestration par client | Auto-follow explicitement activé par élément |
| LTC / MTC externe | Absent | Ne pas supposer une fonction clé en main universelle | À ajouter seulement pour un show synchronisé qui l’exige |
| Préchargement avec état PRÊT | Chargement anticipé des images, sans acquittement de disponibilité | `LOADBG` prépare un média avant lecture | Créer un état PRÊT vérifié par le moteur |
| Preview d’une composition complète | Aperçu du seul élément sélectionné | Possible avec des canaux/routages et un client adapté | Preview de scène sur un fond de contrôle choisi |
| Conduite au clavier | Oui, raccourcis fixes | Selon le client | Profils configurables et aide contextuelle |
| Companion / Stream Deck | Module dédié, presets, variables et feedbacks | Module AMCP disponible | Améliorer les presets liés au conducteur et la visibilité des erreurs |
| Plusieurs opérateurs | Plusieurs clients locaux possibles, aucune attribution des rôles | Plusieurs contrôleurs possibles ; coordination à organiser | Distinguer préparation, conduite et lecture seule |

Les commandes CasparCG comprennent notamment préparation, lecture, arrêt et contrôle des templates ; elles ne constituent pas à elles seules une interface de conduite. [AMCP](https://www.casparcg.com/docs/wiki/protocols/amcp-protocol). SuperConductor ajoute groupes, modes de lecture et timeline. [Client SuperConductor](https://github.com/SuperFlyTV/SuperConductor). Le module Companion CasparCG expose des commandes AMCP ; le confort de presets n’est pas nécessairement identique à celui du module graphX. [Aide du module CasparCG](https://github.com/bitfocus/companion-module-casparcg-server/blob/master/companion/HELP.md).

Pour ton travail, le gain principal viendrait d’un conducteur qui affiche clairement **ce qui est sélectionné**, **ce qui partira au GO**, **ce qui est préparé par le moteur** et **ce qui est réellement joué**. Ces quatre notions doivent rester distinctes dans l’interface comme sur le Stream Deck.

**5. Comparaison des sorties, de la composition et de l’exploitation.**

| Fonction | graphX 0.3 actuel | CasparCG | Priorité pour toi |
|---|---|---|---|
| Composition par couches | Huit couches numérotées | Architecture de couches et de canaux plus étendue | Nommer les couches avant d’en augmenter le nombre |
| Canaux indépendants | Un programme | Plusieurs canaux | À prévoir pour écrans salle, langues ou formats différents |
| Key + fill SDI | Implémenté via keyer externe Blackmagic ; non validé physiquement ici | Sorties dédiées, selon le matériel | Qualification matérielle indispensable |
| Key en niveaux de gris | Vue de contrôle et alpha pour le keyer | Sorties/keying configurables | Ajouter une mire de validation et des profils mesurés |
| Masque en niveaux de gris fourni séparément | Pas d’association d’un média fill et d’un autre média masque | Composition avec masque issu d’une autre couche | Utile seulement si tes fournisseurs livrent ce type de fichiers |
| Alpha droit / prémultiplié | Choix de sortie, déprémultiplication côté helper | Options de composition et de sortie | Décrire le réglage attendu par chaque régie |
| Format actuel | 1920 × 1080 ; 25, 30, 50, 59,94 et 60p | Palette plus large, dont entrelacé/UHD | Rester en 1080p pour le premier périmètre fiable |
| 23,976 / 24 / 29,97 | Absents de la liste actuelle | Formats disponibles | Ajouter sur besoin explicite |
| 4K / HDR | Non implémentés | Haute résolution et HDR partiel selon le chemin | Pas une priorité pour ton usage 1080p |
| Genlock | Pas d’état de référence exposé/qualifié | Prise en charge via matériel et configuration | Mesurer le verrouillage et la phase sur le matériel réel |
| Entrée SDI / NDI | Absente | Sources de capture/réseau selon modules | Fond de preview d’abord ; mélange vidéo complet plus tard |
| Sortie OBS | Page transparente, rendu indépendant dans OBS | Possible notamment via NDI ou capture | Qualifier d’abord la source navigateur actuelle |
| NDI | Absent | Entrée/sortie disponibles | Intéressant lorsque l’image doit rejoindre une autre machine |
| Enregistrement du programme | Capture PNG technique seulement | Sortie fichier via FFmpeg | Utile pour revue et diagnostic, après les bases |
| Streaming encodé | Absent | Consumer FFmpeg | Faible priorité : OBS remplit déjà ce rôle dans ton workflow |
| Routage entre canaux | Absent | Route producer | À réserver à l’architecture multicanal |
| Crop, masques, transformations avancées | Décalage, échelle, opacité, ancrages | Mélangeur GPU plus riche | Crop/rotation utiles avant chroma et effets complexes |
| Contrôle réseau distant | Boucle locale uniquement | AMCP réseau | Réseau graphX avec authentification et rôles si nécessaire |
| Diagnostic | FPS et compteurs de sortie instantanés | Diagnostics par étape, OSC, journaux | Ajouter un historique exploitable et des alertes |
| Secours automatique | Pas de redondance | À concevoir autour du serveur et du matériel | Ne pas promettre une bascule simplement parce qu’un moteur existe |
| Livraison | App Apple Silicon signée ad hoc | Serveur et composants à déployer/configurer | Simplifier l’installation et prévoir retour à une version antérieure |

Sources techniques : [consumers](https://casparcg.com/docs/wiki/server/consumers), [sortie DeckLink](https://casparcg.com/docs/wiki/server/consumers/decklink-consumer), [NDI](https://casparcg.com/docs/wiki/server/consumers/ndi-consumer), [fichier/stream FFmpeg](https://casparcg.com/docs/wiki/server/consumers/ffmpeg-consumer), [routage](https://casparcg.com/docs/wiki/server/producers/route-producer), [mélangeur](https://casparcg.com/docs/wiki/server/mixer), [diagnostics](https://casparcg.com/docs/wiki/server/diagnostics), [OSC](https://casparcg.com/docs/wiki/protocols/osc-protocol). Les formats, modes de keyer et réglages de référence sont vérifiables dans la [configuration 2.5.1](https://github.com/CasparCG/server/blob/v2.5.1-stable/src/shell/casparcg.config). Le HDR a été introduit avec un périmètre partiel : ce n’est pas une garantie de compatibilité de toutes les sources. [Changelog](https://github.com/CasparCG/server/blob/master/CHANGELOG.md).

**Deux sorties key et fill représentent un seul programme graphique.** Une sortie salle différente de la sortie streaming nécessiterait, elle, un deuxième programme. Cette distinction évite de lancer un chantier multicanal pour un simple besoin de key/fill.

La vue Key de graphX transforme actuellement **l’alpha** en gris. Elle ne calcule pas la transparence à partir de la luminosité de l’image couleur et ne permet pas encore d’importer une image de masque indépendante. Pour les PNG déjà détourés, le chemin actuel convient ; pour un fill et un masque livrés séparément, il faudra ajouter cette association. CasparCG expose ce principe dans son mélangeur. [Composition alpha](https://casparcg.com/docs/wiki/server/mixer).

Sur ton UltraStudio original, graphX utilise aujourd’hui l’interface de keying externe du pilote. Si le périphérique n’expose pas ce mode au format demandé, graphX refuse le démarrage : il n’a pas de solution alternative utilisant deux périphériques séparés. La configuration CasparCG prévoit ce type d’alternative, mais sa faisabilité dépend toujours des sorties disponibles et de leur synchronisation. Il faut donc relever les capacités réelles de ton boîtier avant de choisir une stratégie de sortie.

**6. Les écarts les plus importants que révèle le code de graphX.**

| Constat | Conséquence possible | Correction proposée | Niveau de preuve |
|---|---|---|---|
| Le moniteur Programme du studio redessine l’état dans un canvas 960 × 540 | L’aperçu peut rester plausible alors que le rendu natif rencontre un problème | Afficher un retour du moteur natif et sa fraîcheur ; distinguer retour logiciel et retour SDI | Lecture du code |
| OBS redessine lui aussi depuis l’état partagé | Même contenu logique, mais aucune garantie d’identité image par image avec le SDI | Identifier clairement le mode ; mesurer le décalage ; prévoir une sortie issue des pixels du moteur si requis | Lecture du code |
| `preloadCues` crée des images sans état PRÊT / ERREUR remonté | GO accepté alors qu’une ressource n’est pas encore décodée | Préchargement acquitté, erreurs visibles, délai limite et blocage explicite du départ incomplet | Lecture du code |
| L’API confirme une mutation d’état, pas une image diffusée | ON AIR signifie intention de jeu, pas preuve physique | Commande acceptée → état rendu → image soumise au matériel ; retour SDI pour preuve finale | Lecture du code |
| Export des images en base64, import HTTP limité à 40 Mio | Un gros export valide peut être trop gros pour être réimporté | Archive avec médias séparés, lecture progressive, contrôle préalable de taille | Incompatibilité déduite des limites du code |
| Horloges et animations basées sur `Date.now()` | Une correction de l’heure système peut décaler l’animation ou le timer | Temps monotone interne ; heure civile séparée | Risque déduit, pas un incident observé |
| Cache d’images sans éviction explicite | La mémoire peut augmenter lors de changements répétés de projets/médias | Cache borné, budget de décodage et libération des ressources inutilisées | Lecture du code ; ampleur à mesurer |
| Sauvegarde/export/import synchrones dans le serveur | Des opérations lourdes peuvent retarder les commandes | I/O asynchrones et opérations lourdes isolées, avec progression | Risque de blocage, non benchmarké |
| Tout l’état est envoyé aux abonnés, y compris lors des changements de statut | Travail répété pour l’interface et les clients | Séparer télémétrie et projet, mises à jour partielles, cadence adaptée | Lecture du code |
| Un graphique supprimé du conducteur conserve sa copie live | Il reste visible sans ligne de conducteur pour le retrouver | Panneau permanent des instances à l’antenne avec OUT individuel | Comportement volontaire, ergonomie incomplète |
| Pas d’historique d’édition ni de gestion des conflits | Retour difficile après une erreur ; un opérateur peut écraser le travail d’un autre | Undo de préparation et contrôle de révision par élément | Lecture du code |
| Quelques messages de réussite sont affichés avant confirmation de la commande | L’opérateur peut lire une réussite prématurée | Afficher le succès après l’accusé de réception, puis l’état de rendu séparément | Lecture des handlers UI |

Fichiers examinés : [modèle](/Users/quentincholier/Documents/GitHub/graphX/app/model.cjs), [serveur](/Users/quentincholier/Documents/GitHub/graphX/app/server.cjs), [interface](/Users/quentincholier/Documents/GitHub/graphX/web/ui.js), [rendu](/Users/quentincholier/Documents/GitHub/graphX/web/render.js), [page programme/OBS](/Users/quentincholier/Documents/GitHub/graphX/web/program.js), [moteur Electron](/Users/quentincholier/Documents/GitHub/graphX/app/main.cjs), [sortie native](/Users/quentincholier/Documents/GitHub/graphX/engine/main.cpp).

Le point export mérite une correction rapide : la limite est appliquée au JSON reçu, images base64 incluses. À cause de l’encodage, environ 30 Mio de médias binaires cumulés suffisent à approcher 40 Mio de requête, avant les autres données. Ce n’est donc pas uniquement un problème de « très gros fichier PNG » ; plusieurs images ordinaires peuvent suffire.

Le mode 59,94 mérite aussi une qualification propre. Le helper utilise la cadence matérielle rationnelle, mais Chromium est demandé à 60 et le rendu alimente la dernière image disponible. Le timecode interne est non-drop, avec des étiquettes nominales à 60 images. Il ne faut pas présenter ce mécanisme comme une synchronisation SMPTE externe. À 50p, le périmètre est plus simple pour ton premier banc d’essai.

**7. Le workflow cible que je te propose.**

**Préparer une émission.** Créer un projet depuis un kit de marque, importer les PNG ou les templates, puis remplir les contenus dans une vue tableau. Un CSV de 40 intervenants génère 40 éléments ; les corrections de nom se font dans le tableau sans rouvrir chaque graphique. Le système signale les champs obligatoires vides, les textes trop longs et les médias manquants.

**Organiser le conducteur.** Regrouper par ouverture, intervenants, pauses et clôture. Ajouter des notes réservées à l’opérateur et des éléments ignorés. Un glissement déplace une ou plusieurs lignes ; le prochain départ reste visible et explicitement armé. Une recherche permet de retrouver un nom sans déplacer le point de lecture.

**Préparer les compositions.** Une scène « conférence » associe logo, bandeau et titre sur des couches nommées. Un seul GO applique la scène comme une opération cohérente. La politique de remplacement est visible : quelles couches changent, lesquelles restent. Les mises à jour d’une scène doivent être atomiques dans le modèle ; la simultanéité à l’image exige en plus une préparation du rendu.

**Répéter.** Un espace de répétition séparé permet de jouer le conducteur sans toucher au programme réel. Il partage les ressources, mais possède ses propres instances et horloges. Le mode répétition actuel n’existe pas : manipuler seulement le preview de graphX ne remplace pas ce mécanisme.

**Vérifier avant le direct.** Un écran unique montre : moteur prêt, ressources décodées, format choisi, périphérique reconnu, référence si disponible, source OBS connectée si instrumentée, touches Companion à jour. Le dernier point doit reposer sur un véritable signal de présence, pas sur une simple URL affichée.

**Conduire.** Trois zones restent toujours visibles : prochain départ, programme et conducteur. Le panneau des couches permet de retirer un logo oublié sans chercher sa ligne. La correction d’un titre affiche « modifié en préparation » avec les différences et un bouton d’application explicite. Les actions d’urgence restent immédiatement accessibles.

**Terminer et archiver.** Sauvegarder le projet avec ses ressources, un instantané de version et le journal des départs. Exporter un rapport de diagnostic si une anomalie est survenue. Au redémarrage, proposer de reprendre la position de travail, tout en conservant un démarrage transparent et une sortie arrêtée par défaut.

**8. Les ajouts fonctionnels avec le meilleur rapport utilité/effort.**

| Proposition | Exemple concret | Priorité | Taille relative |
|---|---|---|---|
| Panneau des couches live | Retirer uniquement le logo, même si sa ligne a été supprimée | P0 | Petite à moyenne |
| PRÊT vérifié + diagnostic de ressource | Refuser de jouer un PNG illisible et expliquer pourquoi | P0 | Moyenne |
| Retour moteur et état de fraîcheur | Détecter que le rendu est figé alors que le contrôle répond | P0 | Moyenne |
| Export/import fiable et sauvegardes datées | Transporter un conducteur de dizaines de PNG | P0 | Moyenne |
| Undo/redo de préparation | Annuler un déplacement, une suppression ou un remplacement | P1 | Moyenne |
| Groupes, notes, SKIP et recherche | Conduire une conférence longue sans perdre le prochain titre | P1 | Moyenne |
| Scènes multicouches | Envoyer logo + titre + bandeau d’un seul GO | P1 | Moyenne à grande |
| Bibliothèque média | Miniatures, dossiers, recherche, usages, remplacement maîtrisé | P1 | Moyenne |
| CSV et édition en tableau | Importer tous les intervenants en une opération | P1 | Moyenne |
| Thèmes et polices embarquées | Réutiliser une identité visuelle sur plusieurs émissions | P1 | Moyenne |
| Placement direct dans le preview | Déplacer/redimensionner avec guides et valeurs précises | P1 | Moyenne |
| Templates HTML / OGraf | Importer des créations animées avec champs personnalisés | P2 | Grande |
| Vidéo alpha qualifiée | Jouer un jingle animé transparent fourni par un graphiste | P2 | Grande |
| Pilotage LAN avec rôles | Un assistant prépare, le réalisateur conduit | P2 | Grande |
| NDI | Envoyer le programme à un autre ordinateur | P2 conditionnelle | Grande |
| Plusieurs programmes indépendants | Habillage différent pour stream et écran salle | P3 conditionnelle | Très grande |
| Moteur CasparCG optionnel | Utiliser un serveur de régie déjà équipé | P3 conditionnelle | Grande à très grande |

P0 = socle de confiance ; P1 = gain quotidien ; P2 = extension créative/intégration ; P3 = besoin d’exploitation plus large. Les tailles sont relatives et incluent conception, code, tests et documentation. Elles ne constituent pas un calendrier : une étude de décodage vidéo ou une validation matérielle peut changer fortement la charge.

**Companion doit rester une surface de conduite cohérente avec l’application.** Je propose d’y ajouter le texte d’erreur, PRÊT/CHARGEMENT/ERREUR, les scènes, CONTINUER pour les étapes d’un template, les noms de couches, une page par groupe et un indicateur de version du projet. Les macros concernant aussi OBS ou un mélangeur peuvent rester dans Companion. Une suite de commandes vers plusieurs applications n’est toutefois pas une transaction synchronisée à l’image ; graphX doit gérer lui-même l’atomicité de ses propres scènes.

Les actions à risque de répétition doivent avoir un identifiant unique et un résultat consultable. Après perte d’une réponse, l’opérateur doit pouvoir savoir si un GO a été accepté, sans le renvoyer aveuglément. Le module actuel évite déjà le rejeu automatique ; la prochaine étape est de rendre le résultat déterminable côté serveur.

**9. Templates : préparer l’ouverture avec OGraf, sans promettre une compatibilité magique.**

L’EBU publie désormais **OGraf v1**, avec une spécification graphique et une API serveur annoncées stables. C’est une référence plus intéressante pour un nouveau format de package qu’un format graphX entièrement fermé. [État du standard OGraf](https://ograf.ebu.io/).

La spécification décrit notamment le chargement prêt à recevoir des actions, les données, les étapes et les actions personnalisées. Cela correspond bien aux besoins de graphX : précharger, afficher un formulaire, jouer une animation, continuer une étape et retirer proprement. [Spécification graphique](https://ograf.ebu.io/v1/specification/docs/Specification.html).

Je découperais le chantier : d’abord importer un package et valider son manifeste ; ensuite héberger son rendu dans un environnement isolé ; puis générer les champs de saisie et les contrôles ; enfin envisager l’API serveur standardisée pour les contrôleurs externes. Jouer un package compatible et exposer l’API OGraf sont deux engagements distincts. [API serveur](https://ograf.ebu.io/v1/specification/open-api/docs/index.html).

**Le verrou technique est la composition avec les modèles Canvas actuels.** Un template HTML animé ne se dessine pas simplement dans le canvas existant. Il faudra choisir une scène de composition Chromium commune ou des surfaces rendues séparément puis composées. Cette décision influence l’alpha, les performances, l’isolation et la correspondance OBS/SDI : elle mérite un prototype mesuré avant de construire toute la bibliothèque.

Un ancien template CasparCG expose des fonctions différentes de celles d’OGraf. Un adaptateur peut couvrir une partie du patrimoine, mais il faudra qualifier chaque package et ses dépendances. Aucune compatibilité universelle, aucun support natif OGraf du serveur CasparCG ne sont supposés dans cette recommandation.

Pour les vidéos alpha, je commencerais par **un profil de livraison précis** et un fichier de référence. ProRes 4444 ou WebM alpha sont des candidats à évaluer avec le décodeur choisi ; le support effectif, les bords semi-transparents, la boucle et la cadence doivent être testés. La présence de Chromium ne garantit pas à elle seule la lecture de tous les codecs professionnels. Un décodeur natif ou FFmpeg constitue un chantier distinct.

**10. Optimiser les performances à partir de mesures utiles.**

Le chemin natif actuel est : rendu Chromium → copie BGRA → pipe → helper C++ → programmation Blackmagic. Une image 1920 × 1080 × 4 représente 8 294 400 octets ; à 50 images/s, **414,72 Mo/s**, soit environ 395,5 Mio/s, avant les copies supplémentaires. C’est un calcul de volume de pixels, pas une mesure de bande passante réellement consommée. [Architecture locale](/Users/quentincholier/Documents/GitHub/graphX/docs/ARCHITECTURE.md).

L’architecture évite déjà une accumulation illimitée : une écriture en vol côté Electron, dernière image complète côté helper. Cela borne la file mais peut abandonner des images sous charge. La priorité est de mesurer la fréquence et les causes de ces abandons.

Je mesurerais quatre délais : bouton → commande acceptée ; commande → première image rendue ; image rendue → soumission matérielle ; bouton → image visible en sortie capturée. Un FPS moyen correct ne répond pas à ces quatre questions. Les compteurs doivent distinguer image de rendu ignorée, répétition volontaire, retard matériel et perte matérielle.

Ordre d’optimisation proposé :

1. **Mesurer** durée des frames, mémoire, file de commandes, âge de la dernière image et comportement sur une longue session.
2. **Économiser l’interface** : previews à cadence réduite lorsqu’elle n’a pas besoin de 60 Hz, redessins uniquement utiles pour les scènes statiques, arrêt des previews masquées. Les tickers et timers continuent de s’animer.
3. **Isoler les opérations lourdes** : import, export, décodage et sauvegarde ; bornes de mémoire et cache évictable.
4. **Précharger les prochains éléments** avec budget explicite et résultat PRÊT, au lieu de conserver sans limite tous les médias décodés.
5. **Réduire les copies** si le profilage les désigne comme goulot : buffers réutilisés, puis étude mémoire partagée / textures. Ne pas annoncer du zéro-copie avant mesure et intégration réelle.
6. **Ajuster la profondeur de file SDI** après qualification. Les quatre images de préchargement représentent quatre périodes, soit 80 ms à 50p ; ce n’est pas une mesure de la latence complète ni une valeur à réduire sans essai.

CasparCG dispose de diagnostics séparant production, mélange et sortie, ce qui est un bon modèle d’observabilité à reprendre. Cela ne prouve pas qu’il serait plus rapide sur une machine différente ou avec un autre template. [Diagnostics CasparCG](https://casparcg.com/docs/wiki/server/diagnostics).

**11. Plan de qualification avant une utilisation exigeante.**

| Essai proposé | Ce qu’on cherche à démontrer | Condition de validation |
|---|---|---|
| UltraStudio 4K original, 1080p choisi | Le pilote accepte réellement BGRA + keying externe | Mode accepté et deux signaux identifiés sur les bonnes prises |
| Mire alpha graduée, contours et ombres | Niveau du key et interprétation de l’alpha | Bords sans halo sur plusieurs fonds de mélange |
| Mire couleurs / gris | Niveaux et conversions de la chaîne | Résultat mesuré au scope/capture selon le profil de régie |
| Mouvement continu et numérotation des frames | Régularité et synchronisation du key/fill | Absence de glissement relatif ; pertes/répétitions comptées |
| GO instrumenté | Latence et variabilité | Valeurs documentées pour une configuration donnée ; seuil convenu après mesure |
| Session longue de 4 h, puis une journée de répétition | Mémoire, chauffe, ressources et stabilité | Pas de croissance continue ni de perte inexpliquée |
| Bibliothèque lourde et huit couches | Tenue de la charge annoncée | Budget mémoire respecté et aucune erreur de ressource silencieuse |
| OBS + SDI + Companion simultanés | Cohérence du workflow complet | Résultat visuel correct et écarts temporels connus |
| Coupures de contrôle / fermeture de navigateur | Indépendance du moteur | Aucun rejeu intempestif, retour d’état correct à la reconnexion |
| Panne du renderer / helper / retrait matériel | Comportement de panne | État explicite et procédure de reprise ; comportement physique observé |
| Export/import sur dossier vierge | Portabilité réelle | Tous les médias et contenus retrouvés ; aucun chemin externe requis |
| Changement d’heure et 59,94 si utilisé | Robustesse des horloges | Temps écoulé stable et convention timecode clairement annoncée |

La preuve logicielle, le retour du helper et la capture SDI sont trois niveaux différents. La validation matérielle ne peut pas être remplacée par les tests automatisés. Les essais de panne doivent être faits hors production ; le comportement souhaité — conserver la dernière image ou passer transparent — doit être défini et testé, sans garantie sur une panne électrique ou un pilote bloqué.

**12. Trois stratégies possibles.**

| Stratégie | Ce qu’on conserve | Ce qu’on gagne | Coût / contrainte | Mon avis |
|---|---|---|---|---|
| A — graphX autonome renforcé | Mac, interface actuelle, UltraStudio, OBS, Companion | Simplicité, workflow ciblé, ouverture progressive | Développer et qualifier le moteur et les nouveaux médias | **À choisir maintenant** |
| B — graphX contrôleur de CasparCG optionnel | Interface et conducteur graphX | Accès à un serveur de diffusion plus large | Machine Windows/Linux, transfert des ressources, traduction des commandes, retour d’état | À étudier sur un besoin concret |
| C — CasparCG + client existant | Méthode de production et créations exportables | Écosystème immédiatement plus large | Nouvel environnement, adaptation des templates et de l’exploitation | Pertinent si le besoin devient principalement vidéo/multicanal |

Avec B, envoyer seulement une URL graphX à CasparCG peut servir de prototype de rendu, mais ne donne pas automatiquement des couches pilotables indépendamment, une gestion des médias ou une synchronisation fiable. Une intégration durable exige une traduction du modèle de scène, des ressources disponibles côté serveur et des états réconciliés après reconnexion. L’écoute locale actuelle de graphX impose également de concevoir l’accès réseau.

Si graphX est distribué plus largement, il faudra aussi fixer sa licence, sa signature/notarisation et les règles de redistribution des composants. L’assemblage de composants CasparCG, d’un SDK NDI ou d’un décodeur devra être étudié selon le mode de distribution retenu ; cet audit ne conclut pas à une autorisation de redistribution.

**13. Feuille de route proposée à valider.**

| Lot | Livrable concret | Dépendances | Critère de sortie |
|---|---|---|---|
| 1 — Confiance dans le direct | PRÊT/ERREUR, retour moteur, couches live, exports fiables, historique diagnostic | Banc UltraStudio et jeux de médias | Qualification documentée du 1080p choisi, pas de faux succès ni de ressource silencieusement absente |
| 2 — Conducteur et préparation | Groupes, notes, SKIP, recherche, undo, CSV, thèmes, scènes, presets Companion correspondants | Modèle de commandes stable du lot 1 | Préparer puis conduire une émission complète avec PNG et intervenants sans manipulations répétitives |
| 3 — Habillages personnalisés | Prototype de composition HTML/Canvas, packages, polices, formulaires, étapes | Mesures du lot 1 et modèle scène du lot 2 | Plusieurs packages réels, chargement hors antenne, update/continue/out et alpha validés |
| 4 — Médias animés et sorties | Profil vidéo alpha, préchargement/boucle ; NDI ou second programme selon le besoin | Choix du décodeur et budgets mesurés | Session longue avec les médias de production et sorties choisies |
| 5 — Régie étendue, si utile | Rôles réseau et/ou moteur CasparCG distant | Besoin multi-opérateur ou multicanal confirmé | Reconnexion maîtrisée, ressources synchronisées et comportement de secours défini |

Le réseau peut avancer avant les vidéos si un deuxième opérateur devient prioritaire. L’import CSV et les premiers thèmes peuvent être livrés rapidement pendant que le banc matériel du lot 1 est organisé. En revanche, les essais SDI conditionnent la qualification de la sortie, même si l’interface évolue en parallèle.

Je reporterais la 4K/HDR, l’audio multicanal, le mélange vidéo généraliste, l’éditeur d’animation complet, l’automation de chaîne et la redondance sans interruption. Ces sujets demandent une architecture et une exploitation plus larges que ton besoin immédiat. Je ne chercherais pas non plus à porter le serveur CasparCG sur macOS comme première étape du projet.

**Décisions à prendre ensemble :** confirmer graphX autonome comme cible principale ; choisir le contenu des lots 1 et 2 ; déterminer si le premier saut créatif attendu est le template dynamique ou la vidéo alpha ; préciser si OBS et le SDI doivent seulement présenter le même habillage ou être alignés à l’image ; enfin, prévoir le créneau de qualification avec l’UltraStudio réel.

Ma proposition de validation est **A + lots 1 et 2**, puis un prototype OGraf mesuré avant de s’engager sur l’ensemble du lot 3. Tu obtiendrais d’abord un outil plus sûr et beaucoup plus agréable à conduire, avec une base qui permet ensuite d’élargir les créations sans refaire tout le logiciel.
