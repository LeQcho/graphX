# ATEM Mini Extreme ISO G2 · sortie Thunderbolt

Depuis graphX 0.4.1, le même moteur Key + Fill prend en charge l’UltraStudio et la liaison Thunderbolt directe de l’ATEM Mini Extreme ISO G2.

1. Quitter l’ancienne version et ouvrir `release/graphX-0.4.1.app`.
2. Relier le port Thunderbolt de l’ATEM au Mac avec un câble Thunderbolt. Vérifier le périphérique dans Desktop Video Setup.
3. Dans **Sortie vidéo → Actualiser**, sélectionner **ATEM Mini Extreme ISO G2**. Seules les cadences 1080p acceptées avec alpha sont activées. Choisir la même cadence que celle de la régie ATEM.
4. Choisir **Prémultiplié**, puis **Activer Key + Fill**. Le statut indique le format réellement retenu, normalement **YUVA 10 bits**. Le réglage SDI Level A/B est masqué pour l’ATEM.
5. Dans ATEM Software Control, configurer l’incrustation avec les sources **Thunderbolt Fill** et **Thunderbolt Key**. Faire correspondre son option d’alpha prémultiplié à celle de graphX ; si la régie utilise de l’alpha droit, choisir **Droit / Straight** dans graphX.
6. Jouer un titre ou `Mire-alpha-1080.png`, puis vérifier dans le mélangeur le fond transparent, les paliers d’alpha et les contours. Activer l’incrustation dans l’ATEM pour la mettre au programme.

GraphX transmet le fill et le key ; il ne modifie pas les réglages d’incrustation ni la mise à l’antenne de l’ATEM.

## Correction du refus BGRA

Le moteur précédent interrogeait exclusivement `bmdVideoConnectionSDI` et `bmdFormat8BitBGRA`. La liaison de l’ATEM est une connexion `bmdVideoConnectionInternal` dans le SDK. Le moteur utilise désormais les attributs du périphérique et négocie un format avec alpha via `DoesSupportVideoMode`, avec `bmdSupportedVideoModeKeying`, sans conversion implicite de cadence.

Pour une liaison intégrée, YUVA 10 bits est essayé en premier. Pour les autres sorties, BGRA puis ARGB sont préférés avant YUVA. L’alpha est conservé sur toute sa plage, la couleur est convertie en Rec.709 4:2:2, les lignes suivent l’alignement demandé par le pilote et l’accès mémoire utilise `IDeckLinkVideoBuffer::StartAccess/EndAccess`. L’activation utilise toujours `IDeckLinkKeyer::Enable(true)` et `SetLevel(255)`.

Le code est compilé avec les en-têtes SDK 15.3. Le pilote Desktop Video 15.2 présent sur ce Mac reconnaît l’ATEM et accepte déjà le YUVA. Mettre à jour Desktop Video si l’appareil n’apparaît pas ou si aucun format avec alpha n’est proposé ; une mise à jour n’est pas imposée par graphX lorsque le pilote installé accepte les interfaces et formats requis.

## Vérification du 12 novembre 2026

- 51 tests logiciels réussis, dont négociation ATEM/UltraStudio, refus des formats sans alpha et des conversions de cadence, vecteurs couleur Ay10, rampe des 256 valeurs d’alpha et alignement mémoire.
- ATEM Mini Extreme ISO G2 réellement détecté en Thunderbolt, keying externe disponible, cadences annoncées : 25, 30, 50, 59,94 et 60 images/s ; format retenu : YUVA 10 bits.
- Essai matériel bref avec signal entièrement transparent, demande 1080p50 : démarrage confirmé, 23 puis 48 images terminées aux deux relevés, zéro retard, zéro perte, zéro erreur, puis arrêt propre. Ces compteurs confirment la programmation matérielle mais ne qualifient pas la cadence réelle ni la stabilité en charge.
- Les tests de connexion n’ont envoyé aucun graphique visible et n’ont pas modifié les réglages d’incrustation ATEM. Le rendu final et la cadence doivent encore être contrôlés sur le mélangeur avec un graphique animé ; l’UltraStudio n’était pas connecté pour ce test.

## Références Blackmagic

- [Keyer et liste des matériels, dont l’ATEM Mini Extreme ISO G2](https://sdk-doc.blackmagicdesign.com/decklink-sdk/DeckLinkAPI/interfaces/idecklinkkeyer.html)
- [Négociation des modes et alignement des buffers](https://sdk-doc.blackmagicdesign.com/decklink-sdk/DeckLinkAPI/interfaces/idecklinkoutput.html)
- [Formats de pixels, dont Ay10 / YUVA](https://sdk-doc.blackmagicdesign.com/decklink-sdk/DeckLinkAPI/enums/bmdpixelformat.html)
- [Connexions vidéo, dont les liaisons internes](https://sdk-doc.blackmagicdesign.com/decklink-sdk/DeckLinkAPI/enums/bmdvideoconnection.html)
