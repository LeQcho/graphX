# Nouveautés graphX 0.4

Ouvrez `graphX-0.4.app`. Le guide [LOTS-1-2.md](LOTS-1-2.md) détaille les scènes, CSV, groupes, sauvegardes, états de préparation et Companion 0.2.2. Qualification physique de l’UltraStudio toujours à effectuer.

# Premier essai · graphX

## Sans matériel

Ouvrir `graphX-0.4.app`, puis le studio. Le moteur peut rester ouvert derrière le navigateur.

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

## Nouveautés 0.2 — conduite du live

Activez **Mode conducteur** : la sélection actuelle devient le prochain départ. **Espace** joue ce prochain élément et arme le suivant. La fin du conducteur arrête l’avancement ; elle ne rejoue pas le dernier élément. Vous pouvez préparer un autre graphique pendant la conduite : le prochain départ reste indépendant de votre sélection.

| Touche | Action |
| --- | --- |
| Espace | Enchaîner le prochain élément en mode conducteur ; jouer la sélection hors de ce mode |
| O | Retirer le dernier envoyé en mode conducteur ; retirer la sélection hors de ce mode |
| ↑ / ↓ | Parcourir et préparer les graphiques |
| G | Recaler le prochain départ sur la sélection, sans le jouer |
| Maj + ↑ / ↓ | Monter ou descendre la sélection dans le conducteur |
| T | Démarrer / mettre en pause l’horloge |
| Échap | Retirer immédiatement toutes les couches |
| Maj + Espace | Hors mode conducteur : jouer puis sélectionner le suivant |

Les raccourcis restent suspendus dans les champs de saisie et les fenêtres de dialogue. Les touches maintenues ne répètent pas les départs. Les petits boutons ↗ restent des départs manuels indépendants de la progression du conducteur. Les différentes couches restent cumulables, comme avant.

Déplacez les éléments avec la poignée **⠿** à gauche du numéro, même lorsqu’ils sont à l’antenne. Le trait vert indique la destination. La copie déjà jouée et le prochain départ restent liés au graphique, pas à sa position. Approchez le pointeur du bord pour faire défiler les conducteurs longs. Maj + flèches offre une alternative au glissement.

L’horloge **HH:MM:SS:FF** propose départ, pause/reprise et retour à zéro (arrêté). Chaque graphique accepte un repère dans son panneau : par exemple **00:02:30:25** pour 2 min 30 s et 25 images à 50 fps. Les repères sont enregistrés dans le projet et inclus à l’export. Ils affichent une avance ou un retard indicatif, sans déclenchement automatique. À 59,94 fps, le comptage est non-drop. L’horloge est commune aux fenêtres du studio et revient à zéro au redémarrage du moteur ou au chargement d’un projet.

Les curseurs restent en place pendant les mises à jour du moteur ; leur prévisualisation suit immédiatement le déplacement. Les modifications restent hors antenne jusqu’au GO ou au bouton de mise à jour explicite.

## Sortie OBS (depuis 0.2.1)

Dans graphX, cliquez sur **Sortie OBS → Copier le lien OBS**. Dans OBS sur ce même Mac, ajoutez une source **Navigateur** au-dessus de vos caméras, laissez « Fichier local » décoché et collez le lien. Réglez la taille sur **1920 × 1080** et la cadence sur celle indiquée dans graphX (50 images/s par défaut). Conservez le CSS transparent par défaut : aucun chroma key n’est nécessaire.

Laissez « Arrêter la source lorsqu’elle n’est pas visible » et « Actualiser le navigateur lorsque la scène devient active » décochés pour éviter les rechargements au changement de scène. À 59,94 images/s, utilisez la cadence globale correspondante d’OBS plutôt que la cadence personnalisée entière de la source.

Le lien habituel est `http://127.0.0.1:4318/obs.html`. Copiez toujours celui affiché dans graphX, car le port peut changer si un autre programme occupe 4318. La page affiche seulement le programme à l’antenne ; elle est transparente lorsque toutes les couches sont retirées. Les brouillons, le conducteur et l’interface ne sont pas transmis. Gardez graphX Engine ouvert.

OBS et Key + Fill peuvent fonctionner ensemble, sans obligation d’activer les SDI. Les deux sorties utilisent les mêmes commandes et le même moteur graphique, mais les rendus navigateur et SDI ne sont pas synchronisés image par image. Ce lien local fonctionne uniquement sur le Mac de graphX ; cette version n’ajoute pas de transport NDI, RTMP ou réseau vers un second ordinateur.

Référence : [Source Navigateur — documentation OBS](https://obsproject.com/kb/browser-source).
