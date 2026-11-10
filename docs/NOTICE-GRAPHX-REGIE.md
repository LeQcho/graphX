# graphX Régie · Notice opérateur

**Build 0.4 Régie · Module Companion 0.3.0**

graphX compose les habillages d’une émission en 1920 × 1080. Tu les prépares dans le **Studio**, tu les joues depuis le **conducteur** ou le **Stream Deck**, puis tu contrôles le résultat dans le **Programme**. Le programme peut alimenter une source Navigateur dans OBS ou une incrustation **Key + Fill** via le moteur Blackmagic sur Mac.

- [Démarrage en cinq minutes](#démarrage-en-cinq-minutes)
- [Préparer la prestation](#préparer-la-prestation)
- [Configurer les sorties](#configurer-les-sorties)
- [Installer et utiliser le Stream Deck](#installer-et-utiliser-le-stream-deck)
- [Conduire la prestation](#conduire-la-prestation)
- [Cas d’usage](#cas-dusage)
- [Sauvegarder et clôturer](#sauvegarder-et-clôturer)
- [Dépannage](#dépannage)

## Démarrage en cinq minutes

| Poste | Mise en route |
| --- | --- |
| **Mac Apple Silicon** | Ferme l’ancienne instance si elle tourne, puis ouvre [graphX-0.4-regie.app](../release/graphX-0.4-regie.app). Le moteur ouvre le Studio dans le navigateur et reste accessible dans la barre de menus. Adresse habituelle `http://127.0.0.1:4318`. |
| **Windows** | Installe **Node.js 22 ou plus récent**, décompresse le [pack Windows](../release/graphX-Regie-Windows.zip), puis double-clique sur `Lancer graphX.cmd`. Garde la fenêtre ouverte et ouvre `http://127.0.0.1:4317` dans Chrome ou Edge. [Téléchargement officiel de Node.js](https://nodejs.org/en/download) |

Le Studio, OBS et le moteur Companion utilisent l’adresse locale du poste où tourne graphX. Sur Windows, utilise la source Navigateur dans OBS. Pour une sortie Blackmagic physique, utilise l’application Mac et **Blackmagic Desktop Video**.

1. Sur une première ouverture, sélectionne **01 · Présentation** dans le conducteur de démonstration. Si tu as déjà un projet ouvert, choisis un titre d’essai sur un programme de contrôle.
2. Modifie le nom dans l’inspecteur. La **Prévisualisation** montre ta version de travail.
3. Laisse **Mode conducteur** décoché pour cet essai, puis clique sur **GO**. Le titre apparaît dans le **Programme**.
4. Change à nouveau le nom. Le programme garde le premier texte. Clique sur **Mettre à jour à l’antenne** pour envoyer la correction.
5. Clique sur **OUT** pour retirer le titre avec son animation. **Tout couper** efface toutes les couches immédiatement.

### Les zones à connaître

| Zone | Ce que tu y fais |
| --- | --- |
| **Prévisualisation** | Vérifier la copie de travail, le placement et le contraste sur un fond de contrôle. |
| **Programme** | Contrôler les graphiques à l’antenne et les vues **Alpha**, **Fill** et **Key**. Sur Mac, le retour provient du rendu du moteur. Le signal physique se contrôle au mélangeur. |
| **Conducteur** | Organiser l’ordre, les notes et les groupes. En mode conducteur, la ligne armée est le prochain départ. |
| **Inspecteur · Le graphique** | Modifier le texte, l’ancrage, les décalages, la taille, l’opacité, la couche et la transition de la sélection. |
| **Couches à l’antenne** | Voir et retirer chaque instance diffusée, même si sa ligne a été supprimée du conducteur. |
| **Bac régie** | Importer des médias en prestation et les rendre accessibles sur huit touches Stream Deck, plus **Dernier import**. |

## Préparer la prestation

### Construire le conducteur

1. Nomme la production dans **Projet & sauvegarde**. Exporte une copie du projet déjà ouvert si tu dois le remplacer.
2. Avec **Ajouter**, prépare les modèles nécessaires. Tu as le titre intervenant, le chapitre, le logo, le bandeau défilant, le compte à rebours, le score et le plein écran.
3. Donne aux lignes des noms faciles à reconnaître, par exemple `Ouverture · Logo + titre` ou `Interview · Camille Dupont`. Regroupe-les par séquence et ajoute une **Note régie** pour les tops sans habillage.
4. Déplace les lignes avec la poignée **⠿**. Recherche, filtre par groupe ou utilise **★** pour retrouver les favoris. Les filtres changent la liste visible. Le GO séquentiel suit l’ordre global.
5. Utilise **Thèmes** pour appliquer des couleurs à la sélection, à un groupe ou à tout le projet. **Annuler / Rétablir** agit sur la préparation. Pour retirer un élément déjà joué, utilise **OUT**.

### Organiser les couches et les scènes

Les couches **1 à 8** se superposent de la plus basse à la plus haute. Jouer un graphique sur une couche occupée remplace son contenu, avec la transition choisie. Une couche différente permet d’ajouter un élément au programme. Tu peux les renommer via **Couches à l’antenne → Nommer les couches**.

Une répartition simple réserve **C1** au fond ou à l’interlude, **C3** aux intervenants, **C4** au score, **C6** au logo et **C7** aux médias de dernière minute. Les **emplacements Stream Deck** du Bac régie sont des raccourcis indépendants de ces couches.

Pour jouer plusieurs éléments d’un coup, crée chacun sur une couche différente. Choisis **Ajouter → Scène multicouche**, puis coche les éléments. **GO** joue la scène et préserve les autres couches. **OUT** retire les éléments lancés par la scène. Si tu changes les membres d’une scène déjà diffusée, rejoue-la pour appliquer la nouvelle composition.

Pour un graphique seul, règle la taille, l’opacité et la transition dans l’inspecteur, ou glisse-le directement dans la prévisualisation pour le placer. Sur un titre ou une image, **Retrait automatique** règle la durée d’affichage en secondes. À zéro, tu commandes le retrait. Si tu changes la couche d’un graphique déjà diffusé, retire l’ancienne instance puis joue-le sur la nouvelle couche.

### Préparer les fichiers

| Média | Import et contrôle |
| --- | --- |
| **PNG, JPEG, WebP** | **Importer un PNG** ou glisser-déposer. Un PNG transparent 1920 × 1080, centré à 100 %, conserve son placement. Limites de 25 Mio, 8192 px par côté et 32 mégapixels. **Médiathèque** permet de réutiliser une image importée. |
| **WebM avec alpha** | **Importer une vidéo** ou glisser-déposer. Utilise un WebM VP9 avec alpha, au maximum 1920 × 1080, 250 Mio et 30 minutes. La lecture est muette et l’aperçu montre la première image. |
| **CSV d’intervenants** | **Importer CSV**, choisis le fichier ou colle le texte, puis **Préparer l’import** et **Ajouter au conducteur** après relecture. graphX accepte la virgule ou le point-virgule. Utilise `nom` comme en-tête de la colonne des intervenants. |

Voici un CSV à coller dans le Studio.

```csv
nom;fonction;groupe;notes
Camille Dupont;Invitée;Interview;Au top du réalisateur
Sam Rivera;Expert;Interview;Après Camille
```

Pour convertir un master déjà transparent en WebM, lance cette commande si FFmpeg est installé.

```sh
ffmpeg -i habillage.mov -c:v libvpx-vp9 -pix_fmt yuva420p -crf 24 -b:v 0 -an habillage.webm
```

**Prêt** signifie que le moteur a confirmé la préparation. En aperçu web, **Fichier présent** indique que le serveur a trouvé le média. Un GO depuis le Studio web vérifie aussi le décodage dans le navigateur. En cas d’**Erreur**, lis le message avant de jouer. Le conducteur accepte jusqu’à **250 éléments**.

**Remplacer l’image** ou **Remplacer la vidéo** modifie le média en préparation. Pour passer à un nouveau clip ou appliquer un changement de boucle, fais un nouveau **GO**.

Pour tes essais, le dépôt contient une [mire alpha](../examples/Mire-alpha-1080.png), un [titrage PNG transparent](../examples/Titrage-transparent-1080.png) et un [CSV d’exemple](../examples/Intervenants.csv).

## Configurer les sorties

### OBS sur le poste graphX

1. Dans graphX, ouvre **Sortie OBS → Copier le lien OBS**. L’URL utilise le port affiché dans le Studio et se termine par `/obs.html`.
2. Dans une scène OBS de contrôle, ajoute une source **Navigateur** au-dessus de la caméra ou du fond. Laisse **Fichier local** décoché, colle l’URL et renseigne **1920 × 1080**.
3. Fais correspondre la cadence à celle indiquée dans graphX. À **59,94 i/s**, règle la cadence vidéo globale d’OBS et laisse la cadence personnalisée de la source désactivée. Laisse désactivés l’arrêt de la source lorsqu’elle est masquée et son rechargement au changement de scène.
4. Joue la mire ou un titre, puis fais **OUT**. Vérifie dans OBS que le fond reste visible au travers des zones transparentes. La source présente le programme sans l’interface du Studio. [Documentation OBS](https://obsproject.com/kb/browser-source)

### Key + Fill Blackmagic sur Mac

Le **Fill** transporte la couleur et le **Key** transporte le masque issu de l’alpha. Les deux signaux rejoignent les entrées dédiées du mélangeur.

1. Sur un circuit de contrôle, branche l’UltraStudio en Thunderbolt et vérifie sa détection dans **Blackmagic Desktop Video Setup**.
2. Dans le Studio, ouvre **Sortie vidéo → Actualiser**. Choisis le périphérique et un format accepté par la chaîne. Les options affichées sont **1080p25, 30, 50, 59,94 et 60**. Vérifie le support du mode avec le keying externe.
3. Fais correspondre **Prémultiplié** ou **Droit / Straight** au réglage du mélangeur. Règle **Level A/B** selon la chaîne SDI 3G, puis clique sur **Activer Key + Fill**.
4. Joue la mire. Identifie les prises Fill et Key, puis vérifie l’incrustation sur des fonds clair et sombre. Observe les compteurs **terminées / tardives / perdues** dans **Sortie vidéo**. Les images terminées doivent continuer d’augmenter.
5. Avec **Tout couper**, le programme devient transparent. Avec **Sortie vidéo → Arrêter**, le moteur libère le matériel et le signal SDI peut être interrompu.

OBS et le SDI peuvent suivre le même programme. Vérifie le calage de chaque sortie dans sa chaîne si tu les utilises ensemble. Le rendu logiciel a été testé. Le Key + Fill physique, les modes de l’UltraStudio et la tenue en régie restent à qualifier sur ton installation.

## Installer et utiliser le Stream Deck

1. Décompresse le [pack Stream Deck](../release/graphX-Regie-Stream-Deck.zip). Ouvre **Modules → Import module package** dans Companion et importe `graphx-studio-0.3.0.tgz`. [Documentation Bitfocus](https://companion.free/user-guide/beta/config/modules/)
2. Crée ou mets à niveau la connexion **graphx** vers la version **0.3.0**. Renseigne le port du moteur, généralement **4318 sur Mac** et **4317 sur Windows**.
3. Dans **Import / Export**, importe les trois fichiers `.companionconfig` sur des pages libres. Les numéros suggérés sont **110 à 112**. Associe les trois pages à la même connexion **graphx**.
4. Dans **Buttons**, utilise **Press** pour tester les touches en regardant le Programme dans le Studio. Ensuite, dans **Surfaces**, sélectionne le Stream Deck et affecte-lui la page de départ.

| Page | Quand l’utiliser | Touches principales |
| --- | --- | --- |
| **LIVE PRO** | Conduite principale | GO suivant, OUT dernier, OUT ALL, sélection précédente/suivante, armer, horloge, GO sélection, actualisation à l’antenne, dernier média, pause vidéo et santé. |
| **MÉDIAS** | Ajouts de dernière minute et clips | Huit touches média qui basculent entre GO et OUT, préparation/GO/OUT du dernier import, pause/reprise avec temps restant, repartir et OUT vidéo. |
| **COUCHES** | Surveillance et retrait ciblé | OUT de chaque couche avec son nom et son contenu, état du prochain graphique, temps restant vidéo et santé du moteur. |

**TOUT COUPER** se trouve en bas à droite sur les trois pages de 15 touches. Sur les touches médias, le rouge indique l’antenne, l’ambre un état à surveiller et le vert un média prêt. Le gris signale une connexion hors ligne. Lis aussi le texte de la touche.

Pour un score, une scène ou un clip précis, ouvre **Buttons → Presets → graphx** et dépose le preset sur une touche libre. Les presets liés à un graphique suivent son identifiant lors d’un réordonnancement. Les commandes vidéo génériques de **MÉDIAS** visent la dernière vidéo mise à l’antenne. Si tu joues plusieurs clips, utilise une touche dédiée pour en viser un.

## Conduire la prestation

### Avant le premier top

- Vérifie la sortie sur la destination réelle, OBS ou mélangeur. Affiche un titre et retire-le.
- Vérifie les noms du premier et du prochain graphique et l’état des médias. Teste **GO**, **OUT** et **TOUT COUPER** sur le circuit de contrôle.
- Exporte une archive `.graphx` de la version répétée.

### Pendant le direct

Active **Mode conducteur** depuis le Studio, ou utilise **GO** sur la page **LIVE PRO** pour l’activer et avancer. Chaque GO joue le prochain élément armé, puis arme le suivant. Les notes et les lignes **SKIP** sont sautées. Tu peux préparer une autre ligne pendant que le prochain départ reste armé.

- **Recaler ici** ou **G** arme la sélection. **Armer le groupe** arme le premier élément jouable du groupe choisi. La suite continue dans l’ordre global au-delà de ce groupe.
- Le bouton **↗** d’une ligne joue ce graphique directement et laisse le prochain GO séquentiel en place. Cette commande peut aussi jouer un élément **SKIP**.
- **OUT** retire le dernier élément envoyé en mode conducteur, ou la sélection en mode manuel. Pour retirer une instance précise, passe par **Couches à l’antenne**.
- **OUT ALL** applique les transitions de sortie. **Tout couper** efface immédiatement le programme et annule les GO en attente. Vérifie le retrait sur la sortie.
- L’**Horloge conducteur** et les repères `HH:MM:SS:FF` donnent une avance ou un retard indicatifs. À 50 i/s, `00:02:30:25` correspond à 2 minutes, 30 secondes et 25 images. Tu déclenches chaque départ au top voulu.

### Raccourcis Studio

| Touche | Action |
| --- | --- |
| **Espace** | Joue la sélection en mode manuel, ou le prochain élément armé en mode conducteur. |
| **Maj + Espace** | En mode manuel, joue la sélection puis passe à la suivante. |
| **O** | OUT de la sélection ou du dernier élément envoyé, selon le mode. |
| **↑ / ↓** | Change la sélection. |
| **Maj + ↑ / ↓** | Déplace la ligne sélectionnée dans le conducteur. |
| **G** | Recale le prochain départ sur la sélection en mode conducteur. |
| **T** | Démarre ou met en pause l’horloge conducteur. |
| **Échap** | Tout couper. Si une boîte de dialogue est ouverte, Échap ferme d’abord la boîte. |
| **Ctrl ou ⌘ + Z** | Annule une action de préparation. Ajoute **Maj** pour rétablir. |

Les raccourcis de conduite sont suspendus dans les champs de saisie et les dialogues. **Échap** reste disponible dans un champ hors dialogue.

## Cas d’usage

### Conférence avec plusieurs intervenants

1. Importe les noms et fonctions par CSV. Regroupe les lignes par séquence et vérifie l’orthographe dans la prévisualisation.
2. Place le logo sur **C6**. Compose une scène d’ouverture avec le logo et un titre de chapitre sur **C2**.
3. Au top, joue la scène. Pour retirer seulement le chapitre tout en gardant le logo, utilise **OUT C2** depuis **COUCHES**.
4. Arme le premier intervenant. Joue les titres sur **C3** à chaque top. Pour corriger une fonction déjà visible, modifie le texte puis clique sur **Mettre à jour à l’antenne**.

### Logo partenaire reçu pendant la presta

1. Choisis **Bac régie → Importer en régie**, puis le PNG. Il est ajouté à la fin du conducteur avec **SKIP**. La sélection, le prochain GO et le programme restent en place.
2. Dans le bac, clique sur **Préparer**. Choisis une couche libre dans l’inspecteur, par exemple **C7**, et vérifie l’aperçu. Le numéro de la touche Stream Deck est indépendant de la couche.
3. Envoie-le avec sa touche **MÉDIA** ou **GO MÉDIA** si c’est le dernier import. Appuie à nouveau sur sa touche d’emplacement pour le retirer.
4. **Libérer** rend la touche disponible et conserve le média dans le conducteur. Pour l’intégrer à l’enchaînement, place sa ligne et décoche **SKIP**. Si les huit emplacements sont occupés, le dernier média reste accessible via **Dernier import**.

### Stinger transparent ou animation de pause

1. Importe ton WebM. Vérifie sa première image sur le fond de prévisualisation et choisis la couche qui doit le recevoir.
2. Pour un stinger, laisse **Boucler jusqu’au OUT** décoché. Fais **GO** et suis le temps restant sous le Programme ou sur le Stream Deck. Le clip se retire à la fin.
3. Pour une animation qui doit rester à l’écran, coche **Boucler jusqu’au OUT** avant le GO. Le compteur indique le temps avant la prochaine boucle. Utilise **Pause / Reprendre**, **Repartir** ou **OUT VIDÉO** selon le top.

### Score et compte à rebours

1. Ajoute un **Tableau de score**, renseigne les équipes et place-le sur **C4**. Prépare un **Compte à rebours** sur une autre couche.
2. Dans les presets Companion, dépose les touches de score **+1** et **−1** des deux équipes et les touches du compte à rebours. Vérifie les cibles dans le simulateur.
3. Joue le score puis ajuste-le avec les touches dédiées. Pour une pause, joue le compte à rebours et pilote sa pause, sa reprise ou sa durée. Le compte à rebours diffusé est distinct de l’horloge du conducteur.

## Sauvegarder et clôturer

- **Exporter .graphx** dans **Projet & sauvegarde** crée une archive qui emporte conducteur, médias et affectations du Bac régie, jusqu’à 2 Gio. Garde une copie de la version répétée et une de fin de prestation.
- Pour transférer le projet, copie cette archive sur l’autre poste et utilise **Projet & sauvegarde → Ouvrir un projet**. Retire les éléments et arrête le SDI avant de charger ou restaurer.
- **Sauvegardes datées** restaure le conducteur à partir du stockage local. Les fichiers médias restent dans ce stockage. Sur Mac, les données se trouvent par défaut dans `~/Library/Application Support/graphX/`. Le lanceur Windows utilise `.runtime/preview/` dans le dossier décompressé.
- En fin de prestation, retire les graphiques et vérifie le programme transparent. Si tu utilises le SDI, arrête ensuite la sortie. Ferme enfin le moteur Mac ou la fenêtre du lanceur Windows. Au redémarrage, le programme repart transparent et le SDI arrêté.

## Dépannage

| Symptôme | À vérifier |
| --- | --- |
| **Le Studio ou Companion est déconnecté** | Vérifie que le moteur tourne et que la connexion vise son port réel. L’adresse `127.0.0.1` désigne le poste sur lequel tu l’ouvres. |
| **Le prochain GO ne joue rien** | Vérifie que le bon élément est armé, qu’il est jouable et que le conducteur est encore en cours. En cas d’erreur média, lis son détail, puis réimporte ou remplace le fichier si nécessaire. |
| **Le clip est noir, opaque ou invisible** | Vérifie l’aperçu dans Chrome ou Edge et le Programme. Confirme que le master possède de l’alpha et que l’export est bien un WebM VP9 avec alpha. Certains clips commencent par une image transparente. |
| **La touche Dernier import a changé de nom** | Elle vise le dernier fichier du dernier lot. Pour un média récurrent, utilise un emplacement fixe. Si Companion signale un changement au moment de l’appui, relis la cible puis appuie à nouveau. |
| **La source OBS devient transparente** | Vérifie si le programme est vide ou si le moteur a perdu la connexion. La source se vide après environ cinq secondes sans nouvelles du moteur et reprend quand elle reçoit un état complet. Contrôle le programme à la reprise. |
| **Key + Fill absent ou halo sur les bords** | Vérifie Desktop Video Setup, les prises, la cadence, le support du keying externe, le Level A/B et la correspondance prémultiplié/droit. Rejoue la mire et observe le mélangeur. |
| **Le compteur SDI stagne ou la sauvegarde échoue** | Ouvre **Santé du moteur**, actualise et utilise **Exporter le diagnostic**. Note l’heure, le média et la commande en cours. Une image fixe peut produire peu de nouvelles images de rendu alors que le signal de vie et les compteurs SDI progressent. |

Les trois pages et leurs boutons ont été essayés dans Companion 5.1.1. Les essais du Stream Deck physique, du lanceur sur Windows et de la composition sur le mélangeur SDI restent à faire en régie.
