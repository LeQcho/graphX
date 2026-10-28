# Architecture · graphX 0.1

## Flux

Navigateur → HTTP local + SSE → état autoritaire du moteur → Canvas2D dans Chromium hors écran → NativeImage BGRA prémultiplié → pipe binaire borné → helper C++ → SDK Blackmagic → sortie SDI key/fill.

Le contrôle web et le rendu utilisent le même `web/render.js`. Le programme natif a une surface de 1920 × 1080, un facteur d’échelle forcé à 1, un fond transparent et aucun élément d’interface. Les polices sont celles du système. Les ressources sont servies exclusivement depuis le moteur local. Le choix de Canvas2D simplifie la cohérence géométrique des modèles et le traitement des PNG pour cette première version ; un moteur HTML/OGraf n’est pas encore intégré.

## Contrôle et persistance

`app/model.cjs` valide et applique les commandes. Les éléments live sont des copies des éléments du conducteur. Une édition ne modifie pas implicitement le programme. Une mise à jour explicite conserve l’horloge et la couche de l’instance live. Un nouveau GO applique un changement de couche et redémarre son animation.

`app/storage.cjs` écrit un fichier temporaire puis le renomme ; le dernier fichier valide est conservé en `.bak`. La récupération depuis ce fichier est signalée dans l’état. Le live n’est pas sauvegardé. Les projets importés sont validés ; les fichiers média sont adressés par SHA-256 et limités à PNG/JPEG/WebP. Les PNG sont limités à 8192 pixels par dimension.

`app/server.cjs` écoute uniquement sur 127.0.0.1, contrôle Host et Origin, impose JSON aux mutations et n’expose pas de CORS permissif. Le port nominal est 4318 ; l’app choisit un port disponible en cas de conflit. 32 abonnements SSE maximum. Le contrôle LAN n’est pas livré dans cette version.

## Sortie native

`engine/main.cpp` utilise les interfaces Blackmagic SDK redistribuables vendues avec OBS 32.0.4. Il détecte les périphériques, interroge le keying externe et `DoesSupportVideoMode` avec SDI/BGRA/keying, puis active `IDeckLinkKeyer` en mode externe. Le chemin repose sur l’API de sortie déjà présente dans Desktop Video 15.2 ; aucun pilote système n’est installé par graphX.

Quatre images transparentes préchargent la sortie. Les callbacks matériels réutilisent un pool d’images et programment l’image suivante à partir de la cadence exacte obtenue du périphérique. Si le rendu ne change pas, la dernière image reste diffusée. La cadence 59.94 est représentée par le mode matériel rationnel ; Chromium est demandé à 60 et peut fournir des images répétées/sautées par la conversion de cadence.

Le pipe n’accumule pas une file sans limite : au plus une écriture d’image est en vol côté Electron. Les images rendues pendant qu’elle est bloquée sont comptées comme non transférées. Le helper garde seulement la dernière image complète, sous mutex, et diffuse suivant l’horloge Blackmagic. Les compteurs de transfert ignoré, retard matériel et perte matérielle sont distincts.

Cette première version utilise une copie GPU→CPU, puis un pipe de pixels. En 1080p50 BGRA, les pixels représentent environ 415 Mo/s avant les copies. Le partage de textures GPU est une évolution éventuelle ; il n’est pas annoncé comme implémenté. La cadence du rendu logiciel n’est pas une preuve de la cadence SDI réelle.

Le format brut attendu est BGRA prémultiplié. Le test natif contrôle les valeurs RGBA/alpha d’une mire puis vérifie le bitmap transmis. Le mode droit déprémultiplie les trois canaux couleur dans le helper. L’alpha nul force RGB à zéro.

## Arrêt et limites

Tout retirer produit de l’alpha zéro sans arrêter la sortie. L’arrêt demandé ferme le pipe ; le helper envoie du transparent pendant 160 ms, puis désactive la sortie. Aucun comportement de secours physique n’est garanti en cas de panne du processus, du pilote ou du Mac.

Le moteur Chromium reste indépendant des fenêtres de commande. Le throttling d’arrière-plan est désactivé sur sa fenêtre hors écran. Un blocage de la suspension applicative est actif pendant une sortie SDI intentionnelle ; une mise en veille forcée ou la fermeture du capot n’est pas une configuration de diffusion garantie.
