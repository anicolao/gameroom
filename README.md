# gameroom

Persistent rooms for friends, with games opened in separate tabs. Room history
and chat use an immutable Firestore intent log. The bookshelf reads the same
`Applications` catalog as [ttlauncher](https://github.com/anicolao/ttlauncher).

## PR preview

[PR #2 preview](https://anicolao.github.io/gameroom-previews/pr-2/) uses the existing
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
regardless of URL, title, or document ID. `new-tab` entries have
**Open {title}**, which opens the exact WebURL separately. The **Group launch**
filter shows supported integrations. Game boxes are real 3D meshes with painted fronts, printed spines and cardboard
backs. The selected title appears beside the cabinet.

Cribbage and Can’t Stop are integrated production examples: `Hidden: true`,
`GameroomEnabled: integrated`, with their independently deployed HTTPS `WebURL`.
Enable either or both surfaces in the ttlauncher catalogue editor. Automated tests and development seed only emulators.

The Cribbage group adapter merged in [Cribbage PR #11](https://github.com/anicolao/cribbage/pull/11).
CI pins its reviewed merge commit; group launches use the canonical game URL.

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
Available friends are included in a Cribbage launch. The host opens a blank tab
from the Play click before waiting for Firestore; guests try when the committed
launch arrives. A blocked profile gets **Open Cribbage**. The room and chat stay
open, and games need no back link. The host clicks **Deal** once everyone is seated.
**Open Cribbage** also reopens a closed game tab. **Leave table** returns a player
to the room; **Close table** lets the group choose again.

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
{ version: 1, id, sequence, actor, intent }
```

Choices are room creation, joining/leaving, launching/closing a game table,
returning, and sending a message. Acknowledgement documents preserve command IDs
across ambiguous retries; expected revisions serialize concurrent choices.
Metadata indexes membership and revision for atomic validation, without replacing
the log. Catalog snapshots and game outcomes do not enter the room event stream.
Names are preferences; Firebase UIDs remain game-specific identities.

Tab receipts are local to a profile, room, and table. An opened or blocked attempt
is not repeated on replay/reload. Explicit reopening remains available. A new
table permits a new attempt. Each game loses its opener before navigation.
Opening a tab does not prove that a remote game loaded or that a player joined.
Historical return URLs remain supported, but new launches do not send one.

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
permitted-popup case. Stories cover group launch, blocked fallback, names,
privacy after a real deal, continued room chat, reopen/reload, simultaneous leave,
recurring launches, same-name profiles, mobile search, a genuine insecure HTTP
origin without a UUID shim, and live catalog hide/update behavior and native 3D cabinet interactions. The
URL-only test observes the exact outbound browser request without pretending
that an unknown external game implements group seating.

Every decoded RGBA byte must match. There are no masks, tolerance, or retries.
Reference generation is explicit with `bun run test:e2e:update`; review its
images, then run an ordinary verification command. Linux references use the
pinned ARM64 Playwright container. `E2E_GREP` selects a focused story. Production
catalog access is checked separately from automated emulator tests.

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

New `table/catalog-launched` decisions use protocol 2 and record the selected
catalog document ID, title, WebURL, and intended participants. Reopening and
replay use that recorded destination even if the catalog changes. Protocol-1
Cribbage history retains its original meaning; histories may upgrade to version
2 but cannot downgrade. No external game results enter the room log.

Can’t Stop already implements `launch=create|join`, `table`, and `name`. Tests
run the reviewed game checkout in `../cantstop-gameroom-review` (override with
`CANTSTOP_PATH`) at port 4499, against its own demo Firebase project. The browser
story checks separate identities, the common table, replay, and the room staying
open. Its generated cover and exact prompt are documented in
[design/cantstop-cover.txt](design/cantstop-cover.txt).

The requested production edit is reproducible with
`node scripts/update-launch-modes.cjs` (dry run) or `--apply`. It targets only the
eight named web entries plus the new Can’t Stop record, preserves tabletop
fields, and uses update-time preconditions. Missing modes remain disabled; no
unrelated catalog records are rewritten. The shared rules accept only the three
mode strings for editor writes.

## Publishing main and PR previews

The Publish Pages workflow publishes merged `main` to
https://gameroom.boardgamescafe.org/ on every push to main. Its manual dispatch
also publishes main, even when dispatched from a workflow-fix branch. PR events
publish only their own `/pr-N/` directory in the separate
`anicolao/gameroom-previews` repository, using a deploy key scoped to that repo.
Previews are served from `anicolao.github.io`; production is served from the
custom hostname. Both routes share one deployment concurrency group. Each build includes a
`deployment.json` identifying its source commit and Actions run.

## Custom domain

Production is https://gameroom.boardgamescafe.org/ (GitHub Pages). Cloudflare DNS
uses a DNS-only CNAME to `anicolao.github.io`; GitHub owns TLS issuance and HTTPS
enforcement. Production builds use `/`; PR previews use `/gameroom-previews/pr-N/`
as their Vite base. The Pages repository setting is authoritative for this Actions-hosted
site; `public/CNAME` records the intended hostname in source.

This is a separate browser origin from `anicolao.github.io`, with separate local
Auth and preference storage. Existing room invitation codes remain valid, but
visiting from the new origin signs in with a new anonymous browser identity; it
does not migrate the old origin's local identity or popup receipts. BGA Boss must
explicitly approve the new HTTPS origin. PR previews run on the separate `anicolao.github.io` origin. Historical
production `/pr-N/` paths contain only redirects to that preview origin; no
preview JavaScript remains hosted on the trusted production origin. BGA Boss
should allow only the production HTTPS origin by default.

Cloudflare credentials belong in ignored `.env`, never in Vite `VITE_*` variables,
the published artifact, or repository files.
