# BGA Boss preview test

Open the PR preview with `?bga=1`. The preview contains a downloadable unpacked
extension and [install instructions](docs/bga-boss-install.html). Only the host
installs BGA Boss. Create a fresh room on that preview, invite another browser
profile and use the BGA test launcher below the regular game controls.

The host approves a request in extension UI, then creates a Can't Stop table
through BGA's own controls. Gameroom picks up the managed tab's table URL and
shares it automatically with the selected friends. Blocked popups retain the
normal explicit Open control. The room and its conversation stay open.

This version does not automate BGA creation, invite accounts, change table
privacy or start games. It never copies login/session/access tokens. If BGA's
private invitation requires an additional token, report that limitation rather
than opening public matchmaking. The fixed test adapter is independent of the
shared catalog; no catalog records were modified.

## Automated checks

Use Bun. Run `bun run check`, `bun run test:unit`, `bun run test:rules`,
`bun run build` and `bun run test:e2e`.

`bun x playwright test --config playwright.bridge.config.ts` runs the standalone
unpacked-extension bridge test without emulators. It checks approval, denial,
conflicting requests, client binding, reload, service-worker restart, tab closure
and narrow URL capture. BGA DNS is disabled and subsequent tab navigations use
explicit synthetic fixtures; no live BGA table is created.

The BGA room story uses the real extension plus Auth/Firestore emulators and two
independent browser profiles. TestStepHelper captures the actor and observer at
each step, compares all RGBA bytes, and verifies popup fallback, exact shared
URLs, opener isolation, no duplicate tabs on reload, and continuing chat. New
references require explicit `bun run test:e2e:update`, image inspection and a
separate ordinary verification. CI keeps the pinned Linux ARM64 browser image.

## Live acceptance — pending user test

- [ ] Install the preview ZIP unpacked in Chrome; enter its extension ID.
- [ ] Host and friend sign into independent BGA accounts.
- [ ] Select the intended players, set up Can't Stop, and approve only this request.
- [ ] Create an unadvertised realtime table on BGA, checking its actual privacy/access settings.
- [ ] Confirm automatic URL capture and that the friend can reach and join that exact table.
- [ ] Confirm nobody was added to public matchmaking and that BGA permits the chosen accounts.
- [ ] Reload Gameroom, reopen the table and continue chatting without duplicate tabs.
- [ ] Deny a second request; close an approved managed tab; confirm neither opens a replacement.

Actual table creation, privacy, invitation access and seating have not been
verified with signed-in live BGA accounts by the automated fixture tests.
