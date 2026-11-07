# gameroom

Use Bun. Keep the gathering persistent across independent games; Cribbage is the
first URL integration. The cozy game den is the visual direction. Keep controls
as accessible HTML over environmental artwork.

## State and integration

- Use Firestore and anonymous Firebase Auth. Do not introduce SQLite.
- The ordered, immutable, versioned intent log is canonical. Record decisions,
  never computed room snapshots or external game outcomes. Rebuild with the pure
  reducer. Metadata is an index for atomic writes, not an alternate source of truth.
- Preserve command IDs across retries, expected revisions, attribution and immutable
  history. Change the protocol version before changing existing replay semantics.
- Games remain independently deployed apps. Coordinate via create/join URLs;
  preserve legacy return URLs without requiring back links. Names are preferences,
  never identities. Keep game-specific Firebase
  UIDs and event logs inside each game.
- A launch records intended participation. Do not label it as verified game activity.
- Include available friends by default. Keep Gameroom open while games use separate
  tabs. Attempt opening for every selected profile; if blocked, offer Open Cribbage
  from a direct user click. Open the host's blank tab before awaiting Firestore.
  Sever the opener before navigating games. Keep an explicit reopen control and
  per-table attempt receipts so replay/reload never spawns duplicate tabs. Games
  must not need a back link. Test actual browser popup blocking, permitted popups,
  recurring launches, continued room chat and profiles sharing a display name.
- Use a Git worktree for sibling-game changes; preserve other active branches and
  their untracked artifacts. Follow each sibling’s AGENTS.md.

## Verification

For visual adjustments, serve the change locally and ask the user to review it
before regenerating screenshot references or updating the PR. Keep the dev server
running and provide its URL for that review.

Run `bun run check`, `bun run test:unit`, `bun run test:rules`, `bun run build`,
and `bun run test:e2e` for changes to the launch flow. Tests use their own emulator
ports and demo project IDs; do not stop the user’s development server or clear
its Firestore data when running tests.

Visual stories seed UUIDs to stabilize screenshots. Preserve the separate real
HTTP-origin regression, which has no crypto shim and verifies the missing-native-
UUID path. Browser capability assumptions need coverage outside seeded stories.

Use `TestStepHelper` for E2E stories with real independent browsers, checking and
capturing the actor and all affected observers after actions. Use real Auth and
Firestore emulators for integration. Keep desktop captures at 1180×820, scale 1.
Keep mobile viewport at 390×844 and capture the complete scrollable page.

Compare every decoded RGBA byte. Never increase tolerance, mask content, shrink
screenshots or enable retries to make a test pass. Wait for actual assets, fonts,
replay and animation readiness. Reference generation must be explicit through
`bun run test:e2e:update`; inspect its images and run a separate ordinary
verification command. Preserve the pinned Linux ARM64 Playwright container in CI.

## Shared catalog and preview

- Read ttlauncher's existing LauncherUI `Applications` collection through the typed
  catalog adapter. Preserve `Title`, `URL`, `WebURL`, `Icon`, `Hidden`, `GameroomEnabled`, and document IDs. `Hidden` applies only to tabletop; GameroomEnabled is `disabled`, `integrated`, or `new-tab`; missing values are disabled. Gameroom uses only `WebURL`.
  Never seed or bulk-modify production catalog data. Development/test fixture
  records belong only to guarded local demo projects.
- Launch behavior comes only from GameroomEnabled. Never infer integration from
  a URL, title or document ID, or invent metadata absent from the shared source.
- PR previews use the shared production project. Deploy additive reviewed rules
  through `scripts/deploy-shared-rules.cjs`, preserving the actual current catalog
  editor/user rules. Never overwrite that project with standalone room rules.
