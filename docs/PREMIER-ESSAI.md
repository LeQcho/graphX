# Premier essai · graphX

## Sans matériel

Ouvrir `graphX.app`, puis le studio. Le moteur peut rester ouvert derrière le navigateur.

1. Le conducteur contient sept modèles prêts à jouer. Sélectionner **01 · Présentation** puis **GO**.
2. Modifier le nom dans l’inspecteur. L’aperçu change ; le programme conserve l’ancien nom. Cliquer **Mettre à jour à l’antenne** pour appliquer le changement.
3. Jouer le logo et le bandeau défilant : leurs couches sont distinctes.
4. **OUT** retire le graphique sélectionné avec son animation. **Tout retirer / Échap** efface immédiatement toutes les couches.
5. Importer `Titrage-transparent-1080.png` depuis le dossier Exemples. Le graphique conserve le vide transparent, son ombre et son emplacement. Lancer **GO**, puis comparer **Alpha**, **Fill** et **Key**.
6. Exporter le projet depuis **Projet & sauvegarde**. Le fichier `.graphx` contient les images. L’ouverture d’un autre projet exige que les couches soient retirées et que la sortie SDI soit arrêtée.

Les champs texte restent en préparation ; ils ne modifient jamais implicitement l’antenne. Le compte à rebours propose pause/reprise et réinitialisation une fois joué. Changer la couche d’un graphique en préparation ne le déplace pas à l’antenne lors d’une simple mise à jour : un nouveau GO applique ce changement.

## Avec ton UltraStudio 4K original

1. Brancher l’UltraStudio au Mac par Thunderbolt, avec le câble/adaptateur adapté. Vérifier qu’il apparaît dans **Blackmagic Desktop Video Setup**.
2. Fermer les applications pouvant occuper sa sortie (OBS, autre logiciel de titrage, etc.).
3. Relier les sorties SDI dédiées au fill et au key aux deux entrées du mélangeur. Identifier les deux signaux avec la mire : l’un est en couleur, l’autre est le masque en niveaux de gris.
4. Dans graphX : **Sortie vidéo → Actualiser**. Choisir l’UltraStudio et la cadence de la régie. Par défaut graphX propose **1080p50** ; le matériel doit explicitement accepter ce mode avec keying.
5. Choisir **Prémultiplié** si le mélangeur est configuré ainsi ; sinon choisir **Droit / Straight** des deux côtés. Ajuster **Level A/B** à la chaîne vidéo.
6. Cliquer **Activer Key + Fill**. Le moteur doit indiquer **Key + Fill actif**, et les compteurs d’images terminées doivent augmenter. Les compteurs de retard et de perte sont à surveiller.
7. Jouer `Mire-alpha-1080.png`. Vérifier la transparence totale, les paliers partiels, le blanc opaque et l’absence de halo sur le titrage d’exemple.
8. Jouer un défilement, puis quitter uniquement l’onglet navigateur. Les sorties doivent continuer. Rouvrir le studio via la barre de menus graphX.
9. Tester **Tout retirer**, puis **Arrêter** la sortie. « Tout retirer » conserve un signal vidéo transparent ; « Arrêter » libère le matériel et peut interrompre le signal.

**Premier essai sur un circuit de contrôle.** Aucun test physique de ces deux sorties n’a été réalisé pendant la construction, faute de périphérique connecté. Vérifier le résultat réel dans le mélangeur avant une prestation.

## En cas de problème

- **Périphérique absent** : vérifier Desktop Video Setup, la connexion Thunderbolt et son alimentation, puis Actualiser. La compatibilité d’un ancien UltraStudio avec le Mac et le pilote doit être confirmée sur cette configuration.
- **Impossible d’ouvrir la sortie** : une autre application peut l’occuper, ou le format demandé peut ne pas être accepté en keying.
- **Halo sombre/clair** : vérifier d’abord la correspondance alpha prémultiplié / droit. Ne pas transformer l’image couleur en niveaux de gris pour créer le key.
- **Rendu saccadé** : regarder les compteurs du moteur ; essayer 1080p25 pour isoler un problème de charge, puis adapter l’ensemble de la régie à la même cadence.
- **Fenêtre fermée** : le moteur continue. Quitter graphX via son menu arrête le moteur et les sorties.
- **Données** : le menu Projet permet un export transportable. La sauvegarde automatique est stockée localement dans le dossier Application Support/graphX.

La vue Programme est le rendu logiciel de contrôle ; elle ne mesure pas le signal qui sort du BNC. Le diagnostic JSON contient les modes détectés et les compteurs utiles pour la suite.
