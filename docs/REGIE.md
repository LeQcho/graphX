# graphX en régie

## Importer pendant une prestation

Ouvre **Bac régie → Importer en régie**, puis sélectionne tes PNG, JPEG, WebP et WebM. Les nouveaux médias sont ajoutés ensemble à la fin du conducteur et marqués **SKIP**. L’antenne, la sélection et le prochain départ restent en place. L’import classique et le glisser-déposer utilisent aussi ce comportement lorsque des éléments sont à l’antenne ou que le SDI tourne.

Les huit emplacements prennent les nouveaux médias dans l’ordre des places libres. Leur affectation reste stable quand tu réordonnes le conducteur. Si les huit places sont prises, **Dernier import** reste disponible. **Libérer** rend l’emplacement disponible et conserve le média dans le conducteur. L’inspecteur permet d’affecter un autre emplacement. Pour intégrer un média à la conduite séquentielle, décoche **SKIP**.

Un projet exporté en `.graphx` emporte les médias et les affectations. **Prêt** indique un décodage confirmé par le moteur natif. En aperçu web, **Fichier présent** indique que le serveur a trouvé le fichier. Le GO depuis le Studio web vérifie aussi le décodage dans son navigateur.

## Installer le pack Stream Deck

1. Lance la build **graphX Régie**. Companion tourne sur la même machine que graphX. Le port habituel est **4318** pour l’app Mac et **4317** pour l’aperçu web.
2. Dans Companion, ouvre **Modules → Import module package** et importe `graphx-studio-0.3.0.tgz`. Sélectionne **0.3.0** sur la connexion `graphx`, ou crée-la, puis règle son port. [Documentation Bitfocus](https://companion.free/user-guide/beta/config/modules/)
3. Dans **Import / Export**, charge les trois fichiers `.companionconfig` sur des pages libres et associe-les à la même connexion `graphx`. Les numéros 110 à 112 sont les numéros suggérés. Depuis **Surfaces**, assigne la page souhaitée au Stream Deck.

| Page | Touches |
| --- | --- |
| **LIVE PRO** | GO suivant, OUT dernier, OUT ALL, navigation, armer, horloge, actualiser l’antenne, GO et OUT du dernier import, pause vidéo, santé, **TOUT COUPER**. |
| **MÉDIAS** | Huit touches qui affichent ou retirent leur média, préparation et GO/OUT du dernier import, pause/reprise avec temps restant, repartir du début, OUT vidéo, **TOUT COUPER**. |
| **COUCHES** | OUT individuel des huit couches avec leur nom et le contenu actuel, compteur des graphiques, temps restant vidéo, état de préparation, santé, **TOUT COUPER**. |

Le rouge signale un élément à l’antenne, l’ambre attire l’attention sur un chargement, une pause ou une erreur, et le vert signale un média prêt. Les touches dynamiques suivent les noms de leurs emplacements. Si un emplacement ou la vidéo active change entre l’appui et l’exécution de la commande, Companion demande un nouvel appui.

## Retrait et perte de connexion

- **TOUT COUPER** dans Companion ou le Studio passe avant une préparation en attente. Les GO en cours ou déjà en file sont annulés. **Échap** déclenche le retrait depuis le Studio, sauf dans une boîte de dialogue ouverte.
- La source navigateur passe au transparent après cinq secondes sans nouvelles du moteur. Elle attend un état complet avant de reprendre.
- Le SDI signale un défaut si le helper cesse de transmettre ses compteurs ou si les images terminées cessent de progresser. L’état du pilote et le signal au mélangeur se vérifient sur le matériel de régie.
