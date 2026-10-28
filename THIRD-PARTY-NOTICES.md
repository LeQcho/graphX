# Composants tiers

- **Electron 45.1.0** : runtime officiel darwin-arm64, https://github.com/electron/electron/releases/tag/v45.1.0 . Licence MIT et avis Chromium conservés dans l’application distribuée. SHA-256 de l’archive : `002b71efcf90e247317d3da486f2d4e51860e9c2889d49f33e229ab2268b0f3b`.
- **Blackmagic DeckLink API headers and dispatch** : fichiers provenant de `obsproject/obs-studio`, tag `32.0.4`, chemin `plugins/decklink/mac/decklink-sdk`. Les licences Blackmagic présentes en tête des fichiers sont conservées intégralement. Seuls ces fichiers du SDK sont utilisés ; aucun code de production OBS n’est incorporé au moteur graphX. Source : https://github.com/obsproject/obs-studio/tree/32.0.4/plugins/decklink/mac/decklink-sdk .
- **Blackmagic Desktop Video** : pilote propriétaire installé séparément par son éditeur, non redistribué dans graphX.
- Polices : polices système du Mac, non redistribuées.

Les sources graphX sont fournies au propriétaire de ce projet. Aucune licence de redistribution publique de graphX n’est fixée à ce stade. graphX n’est pas une application officielle Blackmagic Design, H2R Graphics ou OBS.
