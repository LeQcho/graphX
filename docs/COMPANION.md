# graphX × Companion 5.1.1

Le module **graphX Studio 0.1.0** est installé dans Companion. La connexion `graphx` utilise le port **4318** du moteur graphX sur ce Mac. Lancez `release/graphX-0.3.app` pour disposer de toutes les commandes, notamment les scores et les ajustements de durée.

## Tester maintenant

1. Ouvrez Companion : http://127.0.0.1:8000/buttons/100.
2. La page **100 · graphX · LIVE** contient les 15 commandes de conduite. Dans l’éditeur Buttons, choisissez l’outil **Press** pour les essayer à la souris.
3. **GO** active le mode conducteur si nécessaire, joue le prochain élément et arme le suivant. **OUT** retire le dernier joué. Les flèches changent la sélection de préparation ; **ARMER** recale explicitement le prochain départ sur cette sélection.
4. La page **101 · graphX · GRAPHIQUES** contient les dix graphiques du projet actuel, PNG compris. Appuyer affiche ; appuyer à nouveau retire. Rouge signifie à l’antenne, ambre prochain départ, vert sélectionné.
5. Pour votre Stream Deck, ouvrez **Surfaces**, sélectionnez l’appareil et choisissez la page 100 ou 101. L’appareil était signalé hors ligne lors de notre vérification ; les commandes ont été testées depuis les boutons logiciels de Companion.

## Ajouter des touches

Dans **Buttons → Presets → graphx**, les boutons sont générés depuis le conducteur. Le projet actuel propose **55 presets** répartis entre conduite, affichage, préparation, comptes à rebours, scores et couches.

Déposez un preset sur une touche. Les presets liés suivent leurs définitions et utilisent l’identifiant du graphique : réordonner le conducteur ne change pas leur cible. Un nouveau graphique apparaît dans les presets, mais n’est pas ajouté automatiquement à une page déjà composée. Après changement de projet ou suppression d’un graphique, remplacez les touches devenues invalides.

Les actions permettent aussi de modifier les textes, position, échelle, opacité, couleurs et animations. L’option d’application à l’antenne est explicite. Les touches de score et de durée agissent directement sur les valeurs actives.

## Réinstaller ou transporter

Le dossier `release/Companion` contient :

- `graphx-studio-0.1.0.tgz` : module autonome à importer depuis **Modules → Import module package** ; aucun Node.js à installer séparément.
- `graphX-LIVE.companionconfig` : page de 15 touches réutilisable avec un autre projet.
- `graphX-GRAPHIQUES.companionconfig` : page liée aux identifiants des dix graphiques de ce projet.

Importez les pages depuis **Import / Export** et associez-les à la connexion `graphx`. Les exports contiennent uniquement cette connexion, sur le port 4318, sans secrets. Le module n’est pas encore publié au catalogue Bitfocus.

## Portée

Companion et graphX doivent tourner sur le même Mac. Le module reçoit l’état en continu, se reconnecte et ne rejoue jamais une commande après une coupure. Le timecode affiché sur les touches est rafraîchi quatre fois par seconde.

Cette intégration couvre les fonctions de graphX : elle ne crée pas les fonctions H2R absentes du logiciel, comme Google Sheets, les médias vidéo/audio ou le routage vers quatre sorties. Voir [l’aide complète du module](../companion/companion-module-graphx-studio/companion/HELP.md).

Références : [Companion pour H2R](https://h2r.graphics/docs/api/companion/), [presets Companion](https://companion.free/for-developers/module-development/connection-basics/presets/).
