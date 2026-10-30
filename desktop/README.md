# ModernIPTV Desktop

Appli de bureau pour Windows : **Tauri 2 + libmpv**. La fenêtre ouvre le site
ModernIPTV (celui de Vercel, ou `localhost` en développement) ; mpv lit tout
(HEVC, AC3, E-AC3, DTS, 4K, live) avec l'IP de l'utilisateur, ce que le
navigateur ne sait pas faire.

Cette coque ne change rien au site. Le lecteur du site continue d'utiliser le
lecteur web tant qu'il ne parle pas à la passerelle `window.iptvDesktop`
(voir plus bas), ce qui viendra dans une PR côté `apps/web`.

## Quel site la fenêtre ouvre

`src-tauri/site.json` est la seule source :

```json
{ "development": "http://localhost:3001", "production": null }
```

- Build de développement (`npm run tauri dev`) : `development`. Lance d'abord le
  site (`pnpm dev` à la racine du dépôt, port 3001).
- Build de release : `production`. **Tant qu'elle vaut `null`, la fenêtre ouvre
  la page de test locale** (le prototype d'origine, voir plus bas).
- `MODERNIPTV_BENCH=1` force la page de test locale, quel que soit le build.

Les adresses sont vérifiées à la compilation (`build.rs`) : `https`
obligatoire (`http` seulement pour `localhost`), l'adresse du site sans chemin,
sans identifiants. C'est aussi `build.rs` qui en déduit les droits donnés au
site : changer `site.json` suffit, rien d'autre à synchroniser.

## Sécurité

Le site a des droits natifs, donc la barrière est stricte :

- **Les droits sont attachés à l'origine du site**, pas à la fenêtre. Une autre
  origine chargée dans la même fenêtre (redirection de connexion, lien
  externe) n'a accès à rien : ses appels sont refusés par l'ACL de Tauri.
- **Seules les commandes de lecture sont accordées** au site : `mpv_init`,
  `mpv_load`, `mpv_pause`, `mpv_seek`, `mpv_stop`, `mpv_volume`,
  `mpv_audio_track`, `mpv_sub_track`, `mpv_video_margins`, plus l'écoute des
  événements du lecteur. Pas de diagnostics (`mpv_info`, `mpv_report`), pas
  d'accès au système de fichiers, pas de shell. **Il n'y a pas de canal de
  commandes mpv brutes** (mpv peut lancer des programmes).
- Toutes les commandes sont déclarées dans un manifeste d'appli (`build.rs`) :
  une commande est refusée tant qu'une capability ne l'accorde pas.
  `capabilities/default.json` les accorde à la page de test locale ;
  `capabilities/site.generated.json` (généré, non commité) en accorde un
  sous-ensemble au site.
- `Player::load` n'accepte que `http` et `https`. mpv est lancé sans
  configuration utilisateur, scripts ni youtube-dl, avec une liste blanche de
  protocoles : une playlist HLS ne peut pas lui faire lire un fichier local.
- La fenêtre n'accepte de naviguer que vers des adresses `http` et `https`.
- Une faille XSS du site donnerait les droits ci-dessus à l'attaquant : lire
  une URL via mpv, avec l'IP de l'utilisateur. C'est pourquoi la liste est
  aussi courte. Garde-la courte.

Vérifié sous Linux (écran virtuel, vrai libmpv, faux site local) : la
passerelle n'existe que sur l'origine autorisée, `mpv_info` et `mpv_report`
sont refusés au site même en appelant Tauri directement, et une autre origine
n'a aucun accès. **Non vérifié sous Windows** : l'affichage de la vidéo sous un
site distant transparent, la connexion par un fournisseur OAuth (certains
refusent les vues web intégrées, la connexion par e-mail n'a pas ce problème),
les liens `target="_blank"`.

## La passerelle `window.iptvDesktop`

Injectée avant le chargement de la page, **uniquement** sur les origines de
`site.json`. Le site ne dépend d'aucune API de Tauri :

```ts
type DesktopBridge = {
  version: 1;
  /** Une des commandes ci-dessus ; toute autre est rejetée. */
  invoke(command: string, args?: Record<string, unknown>): Promise<unknown>;
  /** Événements du lecteur : propriétés (time-pos, duration, pause),
   *  file-loaded (pistes), end-file, log. Renvoie la fonction qui arrête l'écoute. */
  onMpvEvent(listener: (event: MpvEvent) => void): () => void;
};
```

Les arguments et les événements sont ceux de `src-tauri/src/main.rs` (la page
de test de `src/main.ts` en est un exemple d'usage). Pour la vidéo intégrée,
la page garde un rectangle transparent et envoie ses marges à
`mpv_video_margins` ; la fenêtre est créée transparente.

## La page de test locale : ce qui est vérifié

- `mpv-engine/` (la couche Rust qui pilote libmpv) a une suite de tests qui
  tourne contre un vrai libmpv : codecs, redirections, reprise, seek, fermeture
  de la connexion, refus du fournisseur, HLS, playlist hostile. Voir
  `cargo test` plus bas.
- Le prototype a été testé sous Windows avec un vrai fournisseur : H.264,
  HEVC 10 bits en 4K, HLS live, E-AC3, reprise, changement de piste, décodage
  matériel et redimensionnement fonctionnent en mode intégré.

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

Page de test locale (`MODERNIPTV_BENCH=1`), ou le site si `site.json` le permet :

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
