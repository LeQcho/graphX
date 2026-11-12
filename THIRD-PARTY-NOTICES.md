# Composants tiers

- **Electron 45.1.0** : runtime officiel darwin-arm64, https://github.com/electron/electron/releases/tag/v45.1.0 . Licence MIT et avis Chromium conservés dans l’application distribuée. SHA-256 de l’archive : `002b71efcf90e247317d3da486f2d4e51860e9c2889d49f33e229ab2268b0f3b`.
- **Blackmagic Desktop Video SDK 15.3 — macOS headers and dispatch** : fichiers Blackmagic provenant du miroir MediaArea, commit `27a47e3872c58a25418701aadab448b9e6bedcd3`, chemin `DeckLinkSDK/Mac/include`. Les mentions et licences Blackmagic sont conservées intégralement. Aucun code de production MediaArea ou OBS n’est incorporé au moteur. Source : https://github.com/MediaArea/decklink-sdk-headers/tree/27a47e3872c58a25418701aadab448b9e6bedcd3/DeckLinkSDK/Mac/include . Les anciens fichiers de compatibilité non remplacés proviennent de `obsproject/obs-studio` 32.0.4 : https://github.com/obsproject/obs-studio/tree/32.0.4/plugins/decklink/mac/decklink-sdk .
- **Blackmagic Desktop Video** : pilote propriétaire installé séparément par son éditeur, non redistribué dans graphX.
- Polices : polices système du Mac, non redistribuées.

Les sources graphX sont fournies au propriétaire de ce projet. Aucune licence de redistribution publique de graphX n’est fixée à ce stade. graphX n’est pas une application officielle Blackmagic Design, H2R Graphics ou OBS.
