# Audit graphX pour la régie

10 novembre 2026 · version locale 0.4 avant l’ajout vidéo. Scénario de référence avec un Mac Apple Silicon, un UltraStudio 4K d’origine, OBS, Companion et un PC Windows pour les essais.

## Ce qui est déjà en place

Le conducteur sépare préparation et antenne. Il gère huit couches, les scènes multicouches, les groupes, SKIP, les notes, les favoris et le CSV intervenants. Les archives transportent le conducteur et ses médias. Les sauvegardes datées, le retour de pixels Electron et le journal de diagnostic sont livrés. Companion expose les commandes de conduite et des retours d’état. [Guide 0.4](LOTS-1-2.md)

La suite de **58 tests** a réussi, ainsi que les **13 contrôles du rendu Electron**, dont les niveaux alpha exacts d’une mire PNG et une mesure courte à **50 images/s avec quatre couches**. Le pilote Blackmagic a répondu sans périphérique détecté. Les prises SDI, le mélangeur, la composition dans OBS Studio et le PC Windows restent à essayer sur la configuration de régie.

## À régler avant un direct

| Priorité | Constat | Critère de validation proposé |
| --- | --- | --- |
| P0 | **L’effacement d’urgence attend le GO en cours.** Avec une préparation volontairement bloquée, après 650 ms le premier titre est toujours dans le programme et l’effacement attend. Le GO et l’effacement sont acceptés dans cet ordre après déblocage. Le navigateur sérialise aussi ses commandes. | Une commande d’urgence prioritaire coupe le programme même pendant un chargement. Les GO déjà en attente sont invalidés pour éviter qu’un titre réapparaisse. L’interface attend une confirmation avant d’annoncer le retrait. |
| P0 | **La page programme continue sur son dernier état après une coupure.** Avec le script de la page et une coupure simulée, il transmet toujours le dernier titre au rendu après 60 s. Le délai de reconnexion réel dans OBS Studio reste à mesurer. | Alerter l’opérateur, tenir brièvement le dernier état, puis passer au transparent après un délai défini. Tester l’arrivée d’un état complet au retour de la connexion. |
| P0 | **Le SDI peut rester indiqué actif sans preuve récente de progression.** Le helper annonce le démarrage et transmet des compteurs. La lecture du code ne montre pas de surveillance de la fraîcheur des compteurs après le démarrage. | Distinguer rendu bloqué, helper sans réponse et images SDI qui cessent d’être terminées. Tester ces pannes et l’arrêt contrôlé au banc. |
| P1 | **« Prêt » a un sens différent en aperçu web.** Un PNG tronqué de 24 octets a été déclaré prêt et son GO accepté via l’API web. Le moteur natif rejette ce cas après décodage. | Exposer distinctement la présence du fichier et la confirmation de décodage par la sortie qui le diffuse. Un média illisible ne remplace pas le programme. |

Sources dans le dépôt · [file des commandes et préparation](../app/server.cjs#L13), [file du navigateur](../web/ui.js#L11), [état programme](../web/program.js), [cycle du helper](../app/native.cjs#L8).

## Qualification en régie

1. **UltraStudio et mélangeur.** Détecter le périphérique et les modes réellement disponibles, puis identifier les prises Fill et Key. Essayer le 1080p50 si proposé, vérifier les niveaux, l’alpha et les halos avec la mire. Mesurer latence et synchro sur un motif animé. Faire une répétition de deux heures avec le conducteur réel, puis tester la déconnexion et la reprise sur le circuit de contrôle. [Guide du premier essai](PREMIER-ESSAI.md)
2. **OBS et Windows.** Créer une scène d’essai, composer la source navigateur sur une caméra, changer de scène et redémarrer le moteur. Vérifier la transparence, l’URL conservée et la reprise. Tester l’installation et l’import d’une archive sur le PC de régie. Vérifier les options de cycle de vie de la source dans OBS. [Documentation OBS](https://obsproject.com/kb/browser-source)
3. **Commandes.** Faire une répétition au Stream Deck avec un second opérateur. Simuler un média manquant, deux appuis GO, une déconnexion Companion et un effacement pendant la préparation. Vérifier ensemble l’antenne et le retour sur les touches.

## Ordre des prochains ajouts

| Lot | Contenu |
| --- | --- |
| **1 · Conduite** | Effacement prioritaire, états de sortie fiables et bouton **Vérifier le conducteur** avec liste des médias manquants ou illisibles. Ajouter un mode répétition où les commandes sont exécutées sur une sortie de contrôle séparée. |
| **2 · Poste de régie** | ZIP Windows avec runtime et lanceur, port stable pour OBS et Companion, et accès LAN sur activation explicite avec rôles distincts pour le contrôle et le retour. Le LAN permettrait de piloter depuis le PC le Mac qui porte la sortie SDI. |
| **3 · Habillage** | **Vidéo alpha** avec première image, durée, temps restant et transport. Ensuite, kit de marque réutilisable avec police, logo, couleurs, zones sûres et champs personnalisés. Un titre intervenant constitue un bon premier cas. |
| **4 · Interopérabilité** | Essayer un package OGraf isolé avec champs de données et actions jouer, mettre à jour et retirer. Prioriser une intégration LTC si un show exige des tops synchronisés, et NDI si un second poste doit recevoir l’image. |

Le besoin de vidéo alpha a été retenu pendant l’audit. Pour le kit de marque, l’éditeur visuel d’H2R donne un repère concret avec texte, formes, images et polices. Pour les templates interchangeables, OGraf définit le manifeste, le composant et ses ressources. [Éditeur H2R](https://h2r.graphics/docs/graphics/build/), [spécification EBU OGraf](https://ograf.ebu.io/v1/specification/docs/Specification.html)
