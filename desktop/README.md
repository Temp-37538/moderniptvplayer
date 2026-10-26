# ModernIPTV Desktop (spike)

Test d'une appli de bureau pour Windows : **Tauri 2 + libmpv**. mpv lit tout
(HEVC, AC3, E-AC3, DTS, 4K, live) avec l'IP de l'utilisateur, ce que le
navigateur ne sait pas faire. Cette PR ne contient **que le prototype** : une
page de test, pas l'application complète.

## Ce qui est vérifié, et ce qui ne l'est pas

- `mpv-engine/` (la couche Rust qui pilote libmpv) a une suite de tests qui
  tourne contre un vrai libmpv : codecs, redirections, reprise, seek, fermeture
  de la connexion, refus du fournisseur, HLS, playlist hostile. Voir
  `cargo test` plus bas.
- **La fenêtre Windows n'est pas testée** (vidéo sous la fenêtre web
  transparente, redimensionnement, plein écran). C'est le but de ce prototype :
  tu le lances et tu me renvoies le rapport (bouton "Copy report").

## Prérequis (Windows 10 ou 11)

1. **WebView2** : déjà présent sur Windows 11 et sur les Windows 10 à jour.
2. **Rust** : <https://rustup.rs>, toolchain `stable-x86_64-pc-windows-msvc`.
3. **Outils de build C++** : Visual Studio Build Tools 2022, charge de travail
   "Développement Desktop en C++".
4. **Node.js 20 ou plus**.
5. **libmpv-2.dll** (non commité) :
   - ouvre <https://github.com/zhongfly/mpv-winbuild/releases> (dernière version) ;
   - télécharge l'archive `mpv-dev-lgpl-x86_64-<date>-git-<hash>.7z` (la variante
     LGPL, sans `v3` sauf si ton processeur est récent). Je n'ai pas pu lister les
     fichiers de la page depuis mon environnement : si le nom diffère, prends
     l'archive "mpv-dev" `x86_64` ;
   - avec 7-Zip, copie `libmpv-2.dll` dans `desktop\src-tauri\lib\`.

   Si Windows refuse de charger la DLL (message qui parle de `vulkan-1.dll`),
   c'est un problème connu de certains builds récents : mets à jour le pilote
   de ta carte graphique (il fournit le chargeur Vulkan) ou essaie une autre
   version de l'archive.

## Lancer

```powershell
cd desktop
npm install
npm run setup        # génère les icônes (une fois)
npm run tauri dev    # la première compilation Rust est longue
```

## Tester

1. **Start (separate mpv window)** : mpv ouvre sa propre fenêtre. C'est le test
   le plus simple : il valide le décodage et le réseau même si l'intégration
   échoue.
2. **Start (embedded video)** : mpv dessine dans la fenêtre de l'appli, la page
   laisse un rectangle transparent. C'est ce qu'il faut valider.
3. Colle une URL de flux de ton fournisseur, **Load**. Essaie :
   - un film en H.264 + AC3 (ton Spider-Man, sans son dans le navigateur) ;
   - une série en HEVC + E-AC3 (ton Daredevil, illisible dans le navigateur) ;
   - une chaîne live (HLS ou `.ts`) ;
   - la reprise ("Start at" à 600 s), le seek, le changement de piste audio.
4. **Copy report**, colle le résultat dans la conversation. Il contient les
   versions, les codecs vus par mpv, le décodage matériel utilisé, les images
   perdues et les dernières lignes du journal. Les URL y sont réduites à leur
   hôte : ni identifiants ni chemin.

Si le mode intégré ne montre pas la vidéo ou cache l'interface, dis-le moi avec
le rapport : le mode "fenêtre séparée" continue de fonctionner.

## Sécurité

- La page est locale et ne charge rien de distant.
- Les commandes sont celles de `src-tauri/src/main.rs` : charger une URL, pause,
  seek, volume, pistes. **Il n'y a pas de canal de commandes mpv brutes** (mpv
  peut lancer des programmes).
- `Player::load` n'accepte que `http` et `https`. mpv est lancé sans
  configuration utilisateur, scripts ni youtube-dl, avec une liste blanche de
  protocoles : une playlist HLS ne peut pas lui faire lire un fichier local.
- Rien n'est enregistré : l'URL reste en mémoire.

## Tests de la couche moteur

```bash
cd desktop
bash scripts/make-fixtures.sh fixtures      # a besoin de ffmpeg
cd mpv-engine
MPV_LIB=/chemin/libmpv.so.2 MPV_FIXTURES=../fixtures cargo test -- --test-threads=1
cargo test -- --ignored                     # test lourd : 4K HEVC en logiciel
```

Sous Windows, les tests de la couche moteur ne sont pas nécessaires.

## Licence de libmpv

Livre une compilation **LGPL** de `libmpv-2.dll` à côté de l'exécutable (liaison
dynamique, jamais statique), avec la mention de la licence. Les builds
"GPL" de mpv ne conviennent pas à une distribution.
