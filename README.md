# gameroom

Read [the product vision](VISION.md) for the experience we are building toward.

Persistent rooms for friends, with games opened in full-window overlays. Room history
and chat use an immutable Firestore intent log. The bookshelf reads the same
`Applications` catalog as [ttlauncher](https://github.com/anicolao/ttlauncher).

The proposed installed-app experience is specified in
[Seamless MVP design](SEAMLESS_MVP_DESIGN.md). It is a design proposal; the
current implementation opens games in full-window overlays above the persistent room.

## PR preview

[PR #2 preview](https://gameroom.boardgamescafe.org/pr2/) uses the existing
`launcherui` production Firebase project for both the catalog and room history.
Anonymous Firebase authentication stays invisible. No admin credentials are sent
to the browser. This preview creates real rooms and messages when you use it.

The catalog is read-only here. `Title`, `Icon`, and document IDs are shared.
`Hidden` controls tabletop visibility (missing or false means enabled), and
`GameroomEnabled` is `disabled`, `integrated`, or `new-tab`. Missing values are disabled. Tabletop uses
`URL`; Gameroom uses only `WebURL`, with no fallback between them. An enabled
surface requires its own HTTPS launch URL. Existing records stay tabletop-only
until an editor enables Gameroom and supplies `WebURL`.

`integrated` entries use the shared create/join URL protocol for group launch,
regardless of URL, title, or document ID. The legacy `new-tab` catalog value now
means URL-only: **Open {title}** loads the exact WebURL in the same overlay for
that profile, without adding group-join parameters. All games use frames; there
is no new-tab fallback. The **Shared sessions**
filter shows supported integrations. Game boxes are real 3D meshes with painted fronts, printed spines and cardboard
backs. The selected title appears beside the cabinet.

Cribbage and Can’t Stop are integrated production examples: `Hidden: true`,
`GameroomEnabled: integrated`, with their independently deployed HTTPS `WebURL`.
Enable either or both surfaces in the ttlauncher catalogue editor. Automated tests and development seed only emulators.

The Cribbage group adapter merged in [Cribbage PR #11](https://github.com/anicolao/cribbage/pull/11).
CI pins that reviewed adapter and renderer with the secure-ID fix from
[Cribbage PR #14](https://github.com/anicolao/cribbage/pull/14), so a real HTTP
ancestor also works without a crypto shim. Group launches use the canonical game URL.

## Local development

Requires Bun 1.3.10, Node 24, Java 21, and the Cribbage worktree containing the URL
adapter. Override the default `../cribbage-gameroom` with `CRIBBAGE_PATH` if needed.

```sh
bun install --frozen-lockfile
cd ../cribbage-gameroom
bun install --frozen-lockfile
cd ../gameroom
bun run dev:local
```

Open <http://127.0.0.1:5199> in two profiles. Create a room and share its invitation.
Every present room member is included in a launch. One **Play** action commits
the shared launch intent; every member automatically opens their own
create/join URL in a full-window sandboxed iframe. No popup permission is needed.
A rendered walnut-and-brass menu sits at the bottom-right edge, with a 44px touch
target. Its only action is **Close game**, which returns every member to the room.
Closing records a shared-view decision; Gameroom does not distinguish a completed
game from one the group might resume later. **Recent games** reopens the original
game URLs for everyone, preserving the original creator and external game code.
Selecting **Play {title}** from the bookshelf starts a new game for the whole room.
There are no player-selection checkboxes, table controls or local return bubbles.
A late arrival joins the room's current game; existing members' frames stay loaded.
The gathering and its chat persist across these choices.


Local development runs real Auth/Firestore emulators, with separate room, game,
and catalog demo projects. Its four Applications records are emulator fixtures,
not the production data source. The same catalog adapter is used in both modes.
Room/game data are exported to ignored `.firebase/local/` on clean shutdown.
Integrated Cribbage uses <http://127.0.0.1:5397>; override `GAMEROOM_CRIBBAGE_PORT`
when necessary. Startup checks its capability manifest to reject legacy builds.

For a live build, configure `.env.local` from `.env.example`. Use the same public
web configuration as ttlauncher in both Firebase configuration groups to share
its production project. `PUBLIC_BASE_PATH` supports PR-specific hosting paths.

## Event model and isolation

The canonical room state is replayed from ordered immutable
`rooms/{roomCode}/events/{sequence}` records:

```ts
{ version: 4, id, sequence, actor, intent }
```

Choices are room creation, joining/leaving, launching/closing/reopening the room’s
game, and sending a message. Acknowledgement documents preserve command IDs
across ambiguous retries; expected revisions serialize concurrent choices.
Metadata indexes membership and revision for atomic validation, without replacing
the log. Catalog snapshots and game outcomes do not enter the room event stream.
Names are preferences; Firebase UIDs remain game-specific identities.

Protocol 4 gives each room one current game. `game/launched` records the chosen
catalog identity, title, URL, mode and generated external game code. `game/closed`
and `game/reopened` reference that original launch's sequence number. Reopening
uses the saved address and creator, even if the catalog has subsequently changed.
The metadata `game` field is a nullable launch-sequence index, validated atomically
with the event and command acknowledgement. The reducer rebuilds all game history
from intents; no game outcomes or computed room snapshots are stored.

Versions 1 and 2 retain their original replay semantics. Their historical game
launches appear as recent links in the new UI; no historical records are rewritten.
The first v4 reopen or launch selects one game for the entire room. Closed games
stay closed on reload; an open room game reopens automatically in one iframe.
Legacy return URLs remain accepted, while new game URLs omit them.

Games keep a different origin from Gameroom. The iframe sandbox permits scripts,
its own origin and forms, without popups, top navigation, microphone or camera.
A game can request closing the shared view with a versioned `gameroom:close` message;
the parent validates both the source window and exact game origin. `window.close()`
does not remove a frame. Sites which refuse embedding remain unsupported in this
experience; Gameroom does not open a separate tab as a fallback.


## Shared production rules

Do **not** deploy standalone `firestore.rules` over ttlauncher's production rules.
The additive, reviewed shared-project rules and their deployment guard are
explained in [deployment/README.md](deployment/README.md). They preserve the
existing catalog editor flags, Applications permissions, and protected user data.

## Verification

```sh
bun run check
bun run test:unit
bun run test:rules
bun run build
bun run test:e2e
```

All automated tests use local emulators only: Auth 9299, Firestore 8199, and demo
project IDs. They run alongside development without stopping it or clearing its
room data. Rules tests cover both standalone and combined production rules.

E2E uses full Chromium with its native popup blocker, plus a separate explicitly
permitted-popup case. Both verify that frame launches create no tabs. Stories
cover automatic whole-room launch, shared close and recent-game reopening, URL-only
frames, names, privacy after a real deal, continued room chat, late arrivals, reload,
recurring games, same-name profiles, mobile search, a genuine insecure HTTP
origin without a UUID shim, and live catalog hide/update behavior and native 3D cabinet interactions. The
URL-only test observes the exact iframe request without pretending that an unknown
external game implements group seating. Captures include the parent overlay and
real embedded game, after both documents report readiness.

Every decoded RGBA byte must match. There are no masks, tolerance, or retries.
Reference generation is explicit with `bun run test:e2e:update`; review its
images, then run an ordinary verification command. Linux references use the
pinned ARM64 Playwright container. `E2E_GREP` selects a focused story. Production
catalog access is checked separately from automated emulator tests.

When another workspace occupies the default test emulator ports, set
`GAMEROOM_TEST_EMULATOR_CONFIG` to a local Firebase config with free ports and the
same room rules. Test builds and catalog fixtures use the Auth/Firestore addresses
provided by `emulators:exec`. Leave running development services and their data
untouched. The normal config remains `firebase.test.json`.

## License

GNU GPL version 3. See [LICENSE](LICENSE).

E2E servers build into `.firebase/e2e-build` in each repository, separate from
production `dist`. A regular build cannot change the running tests' Firebase
configuration or replace their rendered assets.

## Cabinet artwork and browsing

All nine configured games have painted covers: the original atlas serves
Cribbage, Jaipur, Istanbul and Robo Rally. New
original covers for DRM, Got Five, Pantheon and Rebel Princess are served from
`public/art/covers/`. They were generated with the built-in image_gen tool;
[the complete prompt set](public/art/covers/prompts.json) is stored with them.
Known cover mappings supply presentation only and do not imply group support.

The dark walnut cabinet uses three equally spaced infinite conveyor shelves. Each shelf doubles
its game sequence until it has at least eight carriers, then repeats indefinitely
in either direction. At most twenty-four physical boxes are rendered at once, even for
large catalogs. Repeated boxes keep one accessible game choice per document.

Wheel or horizontal drag browses without visible arrows or a slider. Keyboard
users can focus the cabinet and use the arrow keys or Page Up / Page Down;
focusable HTML game buttons support selection. Vertical touch scrolling stays
available. Filtering resets the position, and empty collections retain the
cabinet. Thin walnut end panels reveal games turning into the return path. A
perspective camera and a joined wooden cap keep the top consistent with the room.
The cabinet has no exterior light fixtures. Its backing ends before real corner
openings, and the belts pass through slots beneath it. Selected boxes settle
onto the belt before turning. Shared geometry and full-loop box/wood clearance
tests keep the boxes from penetrating the backing or corner borders.

Rendering is shared with the fixture-only [animation lab](src/lab/README.md),
available through `bun run dev:lab` at `/dev/shelves?variant=cabinet`. The renderer
uses three equally spaced shelves and keeps at most 24 box meshes active and caches up to 32 game materials, loading
external icons on demand and painting a readable fallback when an icon fails.
Wood maps and the studio environment are CC0; provenance is recorded in
[public/materials/SOURCES.md](public/materials/SOURCES.md).

E2E uses its own Cribbage endpoint at 4397, separate from other local game
processes. References wait for textures, fonts, replay and motion to finish,
then compare every decoded RGBA byte at the normal renderer quality.

## Catalog launch modes and replay

New `game/launched` decisions use protocol 4 and record the selected catalog
identity, title, WebURL and explicit launch mode. All present members participate.
Reopening and replay use that recorded destination and original game creator,
even if the catalog changes. Versions 1 and 2, and the reserved BGA version 3, retain their original meaning;
histories can upgrade to version 4 but cannot downgrade. No external game results
enter the room log.

Can’t Stop already implements `launch=create|join`, `table`, and `name`. Tests
run the reviewed game checkout in `../cantstop-gameroom-review` (override with
`CANTSTOP_PATH`) at port 4499, against its own demo Firebase project. The browser
story checks separate identities, one shared game, replay and a shared close back
to the persistent room. Its generated cover and exact prompt are documented in
[design/cantstop-cover.txt](design/cantstop-cover.txt).

The requested production edit is reproducible with
`node scripts/update-launch-modes.cjs` (dry run) or `--apply`. It targets only the
eight named web entries plus the new Can’t Stop record, preserves tabletop
fields, and uses update-time preconditions. Missing modes remain disabled; no
unrelated catalog records are rewritten. The shared rules accept only the three
mode strings for editor writes.

## Publishing main and PR previews

Production is https://gameroom.boardgamescafe.org/. Preview N is
`https://gameroom.boardgamescafe.org/prN/`, built with Vite base `/prN/`.
Historical `/pr-N/` URLs redirect to the canonical numbered path.

The PR preview workflow builds same-repository PRs with a read-only repository
token and uploads website files as `preview-site`. It does not deploy Pages or
receive a deploy key. The publisher runs from `main`, validates the completed
build's repository, workflow, PR head SHA, and artifact identity, safely extracts
website data, and updates only `/prN/`. It never checks out or executes PR code
with deployment credentials. Automatic publication skips stale or closed PRs.
A manual dispatch of `publish.yml` with `preview_run_id` can publish a validated
archived build, including a merged PR. Without that input it publishes `main`.

Production refreshes preserve numbered previews; preview refreshes preserve the
production root and all neighboring previews. Publication uses one concurrency
group. The `github-pages` environment permits only `main`, including the trusted
`workflow_run` publisher. Each build includes `deployment.json` identifying its
source commit and Actions run.

## Custom domain and BGA Boss

Cloudflare DNS has a DNS-only CNAME to `anicolao.github.io`; GitHub Pages manages
TLS issuance and HTTPS enforcement. Production uses Vite base `/`. The repository
Pages setting is authoritative; `public/CNAME` records the intended hostname.
Cloudflare credentials belong in ignored `.env`, never Vite `VITE_*` variables,
build artifacts, or repository files.

The custom hostname is a separate browser origin from `anicolao.github.io`.
However, **production and `/prN/` previews deliberately share one origin and trust
boundary** so BGA Boss can be tested on previews. They also share origin-scoped
browser storage and Firebase anonymous identity. Path-specific client approvals
are useful to prevent accidental actions, but do not isolate a malicious or
compromised preview from production. Use independent browser profiles when
separate identities are needed. Do not publish untrusted fork previews here.

BGA Boss should support explicitly approved production and preview client paths
on `https://gameroom.boardgamescafe.org`, with preview grants disabled until the
user enables them. This policy is an action guard, not a separate security origin.
The former `anicolao/gameroom-previews` site remains an archive; current preview
publication uses the app domain and needs no cross-repository deploy key.
