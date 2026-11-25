# BGA Boss — paused handoff

**Paused by the owner on 2026-11-25. Keep PR #7 open as a draft. Do not resume
implementation or live BGA actions until asked.** The owner stopped because too
many manual steps remain, and there is no proven, reproducible live acceptance
plan or verified path to automated BGA table creation/access.

## Where the work lives

- PR: https://github.com/anicolao/gameroom/pull/7
- Branch: `codex/bga-integration`
- Worktree: `/Users/anicolao/projects/games/gameroom-bga`
- Last implementation/test commit before these notes:
  `81a8535775d5ca070e1bb63e22e885d448de94bd`.
- Preview: https://gameroom.boardgamescafe.org/pr7/?bga=1
- Install guide: https://gameroom.boardgamescafe.org/pr7/bga-boss-install.html
- Extension ZIP: https://gameroom.boardgamescafe.org/pr7/bga-boss.zip
- Check the actually served commit at `/pr7/deployment.json`. At pause it reported
  `9bc8658ac95aaa61f40a83cbafa901dd46882b85`; `81a8535` adds test-port handling and
  reviewed Linux references, not a different launch implementation. A later
  documentation-only preview publication may advance that metadata.

The main checkout is separate from the BGA worktree. BGA integration is **not
merged into main**. Preserve sibling worktrees and their artifacts. The original
untracked sketch in the main checkout was an exact prefix of the tracked
`BGA_BOSS_DESIGN_SKETCH.md`, already present in the initial PR commit `845d768`;
removing the duplicate does not remove that design or its history.

## What is implemented

This is a **managed-tab URL-capture bridge**, not an automated BGA launcher.

1. Opt-in `?bga=1` adds a separate Can't Stop test launcher. It does not alter the
   shared `Applications` catalog or infer capabilities from a game URL/title.
2. Gameroom detects BGA Boss through Chrome native external messaging using its
   stable manifest-key-derived ID, `fbadnhkmgjgimiknbkdfcinnedipldln`. No ID entry,
   registration, WebSocket server or page injection is needed. Returning to the
   page rechecks the connection. The earlier ID-entry screen was removed.
3. `tables.prepare` requires approval in extension-owned UI and opens one managed
   tab at `https://boardgamearena.com/gamepanel?game=cantstop` (explicit game 11).
4. The host must log in, create the table, choose access settings and start play
   through BGA's own UI. The extension does **not** perform those actions.
5. The extension observes `/table?table=NUMBER` in the managed tab and returns a
   canonical, token-free BGA URL. Gameroom publishes intended participation as a
   version 3 `table/bga-launched` decision. Guests use ordinary tab opening and
   popup fallback; they do not need the extension. Room chat remains open.

The shipped API is `capabilities.get`, `tables.prepare`, `operations.get`.
`tables.create`, invites and automatic match start are **not implemented**. The
extension is version 0.1.1 in the checkout; the user's installed version was not
recorded. Its earlier 0.1.0 API is compatible with automatic detection.

The local journal binds each request to the observed client path/browser tab,
rejects conflicting payloads, survives service-worker restarts, and avoids
opening a second managed tab for the same request. Interrupted opening is
unknown, not an instruction to retry creation. The extension has `storage` and
BGA host permissions, with no scripting, cookie, debugger, general tabs or
Firebase permission. Only the configured HTTPS Gameroom origin, top frame and
explicit root/numbered-preview paths may call it. Production and previews
intentionally share an origin; path checks do not isolate hostile same-origin
code.

## Exact live checkpoint

The user confirmed:

- BGA Boss was installed in Chrome.
- Gameroom displayed that it was connected.
- With **no second player selected**, clicking setup opened the Can't Stop BGA
  game-panel URL above.

The user did **not** report creating a BGA table, seeing its URL captured,
sharing it with another profile, joining seats, confirming privacy/access, or
starting a game. Account/Premium/friend setup was not recorded. Do not mark those
steps complete or infer that the full live integration works.

Participants are frozen when setup starts. Adding someone to the room afterward
does not add them to that existing request. A future group test needs both room
participants present/selected **before** a fresh preparation. Check existing BGA
tabs before discarding an old request or starting another; preserve any actual
table the user may have created outside this conversation.

## What tests establish

Existing tests are reproducible **fixture tests** of our bridge and room
protocol. They are not a reproducible live-BGA test plan or proof of an automated
creation/invitation adapter.

Last full implementation CI, on `81a8535`, is green:
https://github.com/anicolao/gameroom/actions/runs/45381237775

- Type checking and production build passed.
- 50 unit tests passed, including the stable extension ID/public-key check.
- Firestore rules passed: 9 checks in the first run and 8 against combined shared
  rules in the second.
- All 10 E2E stories passed in the pinned Linux ARM64 Playwright container.
- macOS/Linux references were explicitly generated and inspected. Ordinary
  verification compares every decoded RGBA byte, without tolerance, masks,
  screenshot resizing or retries.

`tests/e2e/bga-bridge.spec.ts` uses the real unpacked extension and native external
messaging. It covers approval/denial, duplicate/conflicting requests, client
binding, reload, service-worker restart and closed-tab recovery.
`tests/e2e/bga-room.spec.ts` uses real independent persistent Chrome profiles and
Auth/Firestore emulators. It covers automatic detection with/without the
extension, sharing one captured URL, opener isolation, popup fallback, replay/
reload, continued chat and mobile controls. BGA DNS is blocked and explicit
synthetic BGA pages are served. **No real BGA table is created by these tests.**

Earlier Linux runs hung capturing the guest after a cross-site popup. The final
story uses a separate persistent guest profile, actual approval popup, explicit
fixture readiness and no redundant navigation racing Gameroom. The cabinet
requests a fresh on-demand WebGL frame on return to the page. The final full CI
run above passed; do not describe the older failures as still unresolved.

## Reproduce the existing fixture checks

Use Bun. From the BGA worktree:

```sh
bun install --frozen-lockfile
bun run check
bun run test:unit
bun run test:rules
bun run build
bun run test:e2e
```

The standalone native bridge test needs no emulators:

```sh
bun x playwright test --config playwright.bridge.config.ts
```

The full suite needs installed sibling dependencies. Defaults are
`../cribbage-gameroom` and `../cantstop-gameroom-review`; override with
`CRIBBAGE_PATH`/`CANTSTOP_PATH`. CI pins Cribbage
`6e542da6fb5d36f1f1941965bc8fa8004e422d37` and Can't Stop
`43b5e61ab0a86dadba1f74b22c860fb170c056cf`.

Default test emulator ports are Auth 9299, Firestore 8199, websocket 9300, hub
4401 and logging 4501. Test app/game servers use 4199/4397/4499. Other projects
were occupying some default emulator ports during local verification. **Do not
stop their servers or clear their data.** Tests accept an isolated config via
`GAMEROOM_TEST_FIREBASE_CONFIG`, and test builds inherit the actual emulator
ports. `catalogue.spec.ts` was fixed to use that same guarded local endpoint.

An ignored `.firebase/isolated-test.json` currently exists locally. Recreate it
if the worktree moves, since the rules path is absolute:

```sh
bun -e 'const c=await Bun.file("firebase.test.json").json();c.firestore.rules=process.cwd()+"/firestore.rules";for(const [s,p] of Object.entries({auth:9359,firestore:8159,hub:4459,logging:4559}))c.emulators[s].port=p;c.emulators.firestore.websocketPort=9350;await Bun.write(".firebase/isolated-test.json",JSON.stringify(c));'
GAMEROOM_TEST_FIREBASE_CONFIG=.firebase/isolated-test.json bun run test:rules
GAMEROOM_TEST_FIREBASE_CONFIG=.firebase/isolated-test.json bun run test:e2e
```

Check that the chosen ports are free first. Screenshot updates remain explicit:
`bun run test:e2e:update`, inspect the resulting images, then run a separate
ordinary verification. Do not regenerate references just to hide a failure.

## Changes already deployed outside PR #7

- Additive protocol 3 room rules were deployed to shared production project
  `launcherui` using `scripts/deploy-shared-rules.cjs`. Catalog/editor/user rules
  were preserved. No production catalog records were added or modified for BGA.
- Hosting fixes [PR #8](https://github.com/anicolao/gameroom/pull/8) and
  [PR #9](https://github.com/anicolao/gameroom/pull/9) are merged into main
  (`ad3519e67a61ff2f72d8c6e0efcc8ab085f21b11`). They use REST Pages artifact
  discovery and complete upload before a separate deployment job. Publishing
  succeeded afterward. Do not reapply them or merge PR #7 to fix hosting.
- Preview builds remain read-only; the trusted main-branch publisher validates
  and publishes their static artifacts. Same-origin `/prN/` previews remain by
  the owner's choice. Do not publish fork previews on that origin.
- The preview creates real room events/messages in shared production Firestore.
  Do not treat it as disposable seeded data. Older main clients cannot replay a
  room after it receives protocol 3 events; use a fresh preview room for testing.
- The BGA lab's own Auth/Firestore emulators were still running at pause on
  9397/8297 for `demo-gameroom-bga-lab`; the review server on 5499 was no longer
  running. Those are separate from other projects and the test config above.
  No user browser tabs, extension installation or emulator data were cleared.

## Resume decision and next investigation

Do not send the owner through another ad-hoc manual walkthrough first. Agree on
a small success contract and an implementation path before more UI work:

1. Define one repeatable live scenario: an approved local host action creates
   one unadvertised Can't Stop table; an independently signed-in friend already
   in the room receives a URL that actually permits joining that same table;
   room/chat stay open. Record setup, exact actions, observations and failures.
2. Prove how creation and access can be automated. The original sketch discusses
   a fixed bundled BGA adapter and an undocumented creation endpoint; neither
   is implemented or verified against signed-in live BGA here. Decide between
   narrowly scoped BGA UI automation and a verified request adapter based on
   evidence. Automatic creation may require additional permissions and
   account-bound approval, which this preparation-only bridge intentionally
   does not have. No generic script/URL execution API or WebSocket server.
3. Establish private-table invitation semantics. The current capture strips
   extra query parameters, including access tokens; a numeric table URL may not
   grant the intended access. Do not silently switch to public matchmaking.
4. Turn the verified adapter behavior into deterministic fixtures and explicit
   live acceptance steps. Include login/Premium failures, denial, changed
   account, privacy/access rejection and interruption after dispatch. Keep
   credentials/request tokens inside BGA/the extension, never in room events.
5. Only then implement `tables.create`/invitation support with a durable
   operation journal: record before dispatch, reuse IDs, reconcile ambiguous
   results and never blindly repeat a side effect. Keep remote room replay from
   dispatching extension creation. Extend versioned room decisions only when
   their semantics require it.

The earlier design sketch is a proposal, not proof that this path works. Its
implemented-bridge section and this note take precedence when describing the
current state. Consult `BGA_BOSS_TESTING.md` for the fixture and live checklists;
its unchecked live items are still unchecked.
