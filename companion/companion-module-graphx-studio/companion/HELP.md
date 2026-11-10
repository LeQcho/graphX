# graphX Studio — Companion 5.1+

La build graphX Régie ajoute les catégories **Bac régie — médias dynamiques** et **Vidéo — transport**. Les emplacements 1 à 8 et Dernier import sont alimentés depuis le Studio. Les touches vidéo pilotent pause, reprise, redémarrage et retrait. **TOUT COUPER** reste disponible pendant un GO en attente.

Contrôlez graphX depuis un Stream Deck ou le simulateur Companion. Ce module utilise l’API 2.2 et nécessite Companion 5.1 ou ultérieur. graphX 0.3 ou ultérieur donne accès à toutes les commandes.

## Connexion

Lancez graphX et Companion sur **le même Mac**. Ajoutez la connexion **graphX — Studio** et indiquez le port affiché dans l’URL du studio (4318 par défaut). Le module reçoit l’état en continu et se reconnecte automatiquement. Les commandes ne sont jamais mises en attente pour être rejouées après une coupure.

## Presets

Dans Buttons → Presets → votre connexion graphX :

- **Régie — kit Stream Deck** : 15 touches prêtes à déposer. GO, dernier OUT, OUT ALL, sélection précédente/suivante, armer, mode conducteur, horloge/pause, zéro, jouer/retirer la sélection, appliquer à l’antenne, état, projet, urgence.
- **Graphiques — afficher / masquer** : un bouton par graphique, généré depuis votre conducteur. Un appui affiche, un second masque.
- **Graphiques — préparer** : sélectionner sans modifier l’antenne.
- **Comptes à rebours** : affichage du temps restant, pause/reprise, reset et ±30 secondes.
- **Scores** : ±1 point par équipe, noms et scores sur les touches.
- **Couches** : OUT par couche.

Vert : sélection de travail. Ambre : prochain armé (ou timer en pause). Rouge : à l’antenne. Gris : moteur déconnecté. Les presets de graphiques utilisent l’identifiant stable : réordonner ne change pas leur cible. Supprimer un graphique ou charger un projet différent peut invalider une touche ; elle ne joue jamais une autre ligne à sa place.

## Actions et variables

Les champs de Companion 5.1 acceptent expressions et variables. La cible peut être un identifiant, un nom exact unique, `@selected`, `@next` ou `@last`. Les noms identiques sont refusés pour éviter toute ambiguïté.

Actions : conduite séquentielle, affichage/retrait/bascule, sélection/recalage, horloge, minuteurs, scores, textes, ancrage, décalage, échelle, opacité, couleurs, animation et retrait automatique. Les modifications de contenu/aspect restent en préparation sauf si **Appliquer aussi à l’antenne** est coché. Les actions de score modifient immédiatement les valeurs préparées et jouées ; ajouter du temps modifie le timer actif, ou sa durée de préparation s’il est hors antenne.

Variables globales : `connected`, `project`, `selected`, `next`, `last`, `selected_id`, `next_id`, `live_count`, `live_names`, `clock`, `clock_running`, `follow`, `fps`, `sdi`, `last_error`.

Variables de chaque graphique : `cue_<id>_name`, `_title`, `_subtitle`, `_on_air`, `_selected`, `_next`, `_layer`, `_score_home`, `_score_away`, `_timer_remaining`, `_timer_text`, `_timecode`. Des alias `slot_<numéro>_...` suivent la position dans le conducteur. Le contenu affiché est celui de la préparation ; `_on_air` indique l’état de la copie à l’antenne.

GO active le mode conducteur si nécessaire. Il joue le prochain attendu et arme le suivant ; un prochain changé par une autre fenêtre annule la commande. En fin de conducteur, aucun rejeu implicite. OUT ALL utilise les transitions ; TOUT COUPER est immédiat.

## Stream Deck

Dans **Surfaces**, autorisez Companion à prendre en charge votre Stream Deck ; affectez-lui la page où vous avez déposé les presets. Vous pouvez d’abord tout tester avec le **Simulator**. Ne faites pas piloter simultanément le même appareil par Companion et par l’application Elgato.

## Périmètre comparé à H2R Graphics

Le module reprend la conduite, le show/hide dynamique, les feedbacks, les variables de contenu, les réglages visuels, timers et scores, adaptés aux fonctions réellement présentes dans graphX. Il n’ajoute pas à graphX les types de graphiques H2R absents (Google Sheets, listes, médias vidéo/audio, réseaux sociaux, téléscripteur dessiné, routage vers quatre sorties). Le contrôle réseau depuis un second ordinateur n’est pas disponible : le moteur graphX écoute uniquement en local.

Module local indépendant, non encore publié dans le catalogue Bitfocus. Sources : https://github.com/LeQcho/graphX

## graphX 0.4 / module 0.2 — conduite et préparation

Les actions et identifiants existants sont conservés. Les presets liés de Companion 5.1 suivent les mises à jour du module.

- **Scènes multicouches** : les commandes Graphique afficher/masquer/basculer et le retour ON AIR reconnaissent la scène entière. Presets dans « 07 · Scènes multicouches ».
- **Groupes** : armer le premier élément jouable d’un groupe, sans l’envoyer. Le prochain GO conducteur le joue. Presets « 09 · Groupes ».
- **SKIP** : ignorer/réintégrer un élément pendant l’enchaînement. Un GO explicite sur cet élément reste possible. Les notes ne se jouent pas.
- **Annuler/rétablir** : modifie uniquement la préparation ; ne retire pas les copies à l’antenne et ne rembobine pas l’horloge. Historique de 50 étapes, en mémoire.
- **Préparation** : feedback à choisir parmi ready, loading, error et idle. Variables `next_ready`, `selected_ready`, `next_error`, `selected_error`, et `cue_<id>_ready/error/group/skip`.
- **Santé** : `render_fps`, `render_age_ms`, `save_error`, avec presets d’état. Ces informations concernent le logiciel ; elles ne confirment pas un signal SDI physique.

La préparation native décode les images avant le GO. Si elle échoue, le programme et le prochain élément restent en place. Les commandes en cours sont protégées du double appui ; aucun renvoi automatique après une réponse réseau perdue.

Les nouveaux presets apparaissent selon le contenu du projet connecté. Créez une scène ou renseignez un groupe dans graphX pour obtenir ses boutons. Les boutons ciblent des identifiants stables et survivent au réordonnancement ; un autre projet peut avoir d’autres identifiants.
