# Seamless MVP design

Status: proposed architecture, not implemented. Platform documentation checked
25 November 2026. This design carries forward the product vision: friends gather
in a persistent room, then repeatedly choose games without rebuilding the group.

## Decision

Ship **one installable web app (PWA)** for iPhone, iPad, Android phones, macOS and
ChromeOS. Keep the room mounted and run supported games in **isolated,
cross-origin game frames inside the app**. Start with Cribbage; certify Can’t Stop
next. Give people a durable identity and an invitation inbox.

Installation alone does not solve the current launch problem. A host’s click
cannot supply user activation to a friend’s browser; opening a new window from a
remote event is subject to popup blocking. The supported path must therefore
create no new windows. See [browser popup requirements](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#description).

This deliberately proposes changing the current separate-tab policy in
`AGENTS.md`. Independent game deployments, game-owned identities and logs, and
the persistent gathering remain requirements. Implementation must update that
policy and its tests explicitly; this document changes no running behavior.
Existing URL integrations continue working during migration.

## What seamless means

After installing and identifying themselves once on a device, a player can:

1. Open Gameroom from its icon and see their rooms and invitations.
2. Create a room and invite friends, or accept an invitation with one Join tap.
3. Choose a game and selected participants. Available friends are selected by
   default. One player presses Play; every selected participant currently in the
   foreground room gets the same table automatically, without another launch tap.
4. Play, open room chat, and choose another game without leaving the gathering,
   signing in to games, copying table links or managing browser tabs.
5. Close the app and later reopen it to the same rooms and resumable tables.

Joining a room consents to its coordinated game launches. A player can mark
themselves unavailable or leave; an excluded player is never pulled into a game.
Game rules may still require ordinary choices such as readying up or dealing.

The guarantee covers certified games, an online connection and a foreground app.
Installation, initial identity verification and optional media permission prompts
are explicit setup steps. Signing out, deleting app data, or using a new device
requires identity verification again. A suspended or closed app catches up when
opened; Gameroom cannot force itself onscreen or promise execution while the OS
suspends it.

## Installation on every target

Production entry point: `https://gameroom.boardgamescafe.org/`. Provide a manifest
with a stable app ID, standalone display, icons, root start URL and scope, plus a
service worker. Show short instructions appropriate to the device. Installation
must happen from the system browser, not an email/social app’s embedded browser.
The setup page explains how to open that browser when necessary.

| Target | One-time setup | Everyday use |
| --- | --- | --- |
| iPhone | Open in Safari → Share → Add to Home Screen; enable Open as Web App where offered. Launch the new icon, then verify identity. | Home Screen icon → rooms/invitations; game fills the content area with a persistent Room control. |
| iPad | Same Safari Home Screen installation. | Icon → rooms; room panel and game side by side when space permits, otherwise the phone layout. |
| Android phone | Open in Chrome → Install from its install UI/menu; launch the installed app and verify identity. | App launcher icon → rooms; phone layout. |
| macOS | Safari on macOS Sonoma 14 or later → File → Add to Dock; Chrome installation is an alternative. Verify identity in the installed app. | Dock/Applications icon → rooms; resizable room/game layout. |
| ChromeOS | Install through Chrome’s install UI/menu and pin the app if desired; verify identity. | Launcher/shelf icon → rooms; desktop or compact layout according to available space. No Android subsystem dependency. |

These are supported installation routes, not a promise of identical browser menu
wording. Apple documents [iPhone installation](https://support.apple.com/en-az/guide/iphone/iphea86e5236/ios),
[iPad installation](https://support.apple.com/en-mo/guide/ipad/ipad8f1f7a29/ipados)
and [Mac web apps](https://support.apple.com/en-us/104996); Google documents
[Android](https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DAndroid)
and [desktop/Chromebook web apps](https://support.google.com/chrome/answer/9658361?hl=en).

Initial qualification targets are iOS/iPadOS 18 or later, macOS 14 or later,
Android 10 or later with a supported current Chrome, and supported ChromeOS with
current stable Chrome. These are proposed support floors, not validated claims.
Qualify both the oldest supported configuration and current stable releases;
record exact hardware, OS and browser builds. Managed devices that prohibit app
installation are outside the installed-app guarantee.

Do not depend on an external invitation link always opening the installed app.
Browser preferences and link routing vary. The invitation must also be waiting
inside Gameroom when the recipient opens its icon.

## Identity and invitations that survive installation

Anonymous Firebase Auth remains the immediate entry point. Persistent invitations
and recovery need an additional, recoverable identity: an anonymous browser UID
alone cannot identify someone in a fresh installed app or on another device.
Apple’s [Mac documentation](https://support.apple.com/en-us/104996) explicitly
describes separate browser and web-app data; never assume a browser session is
transferred during installation on any target.

The MVP adds **email verification by a short-lived code entered in Gameroom**.
No password, OAuth popup, magic-link app routing, contacts permission or per-game
account is required. This is a proposed extension to today’s anonymous-only
identity policy and needs its own implementation review.

- Install first, then enter an email address and its code inside the app. Persist
  the resulting Firebase session in first-party app storage.
- A narrow authentication service verifies the code and binds the first verified
  address to the existing anonymous UID. It returns a Firebase custom token for
  that same UID. On another installation, verified ownership resolves to the
  existing UID. Never merge histories just because display names match.
- If verification finds an existing account, explain the account switch; do not
  silently reassign the temporary identity’s history or memberships. Guest
  exploration remains possible, but durable invitations require verification.
- Build code delivery through a transactional email provider. Hash codes, expire
  them, limit attempts/resends per address and source, use uniform responses to
  prevent account enumeration, and keep addresses and credentials out of URLs,
  room logs and telemetry. Bind challenges to their requesting session. Firebase
  does not supply this proposed email-code flow automatically: the service must
  be built and tested. Its token exchange uses [Firebase custom authentication](https://firebase.google.com/docs/auth/web/custom-auth).

The host invites an existing friend by account, or a new friend by email. The
recipient has a pending invitation even before installing. The invitation email
links to setup/the room; after installation and verification with that address,
Gameroom shows the pending invitation without needing the original link again.
An invitation grants permission to accept; it does not automatically join a
person, expose room history or grant game credentials.

Accepted invitations establish reusable friend entries without uploading address
books. The home screen separates pending invitations from joined rooms. Room
owners can revoke invitations and remove access; recipients can decline and
block invitations. Authorization is checked again on acceptance and launch.
Inviting someone never silently adds them to the current game.

Account-directed invitations are the reliable MVP path. A generic room share
link can remain available, but an unknown recipient must claim it while signed
in, or reopen the original link after setup. We do not claim portable, automatic
deferred deep linking for an unclaimed anonymous invitation.

## The persistent room and game surface

The room owns presence, chat and any room call. Switching between room and game
views must not unmount that room or recreate its connections. Keep a visible,
accessible Room control, unread messages and participant state above the game.
Use accessible HTML controls around the existing cozy den artwork. Support touch,
keyboard, screen readers, rotation, safe areas and the on-screen keyboard.

On phones, the game and room occupy alternating foreground views; preserve the
game frame when showing chat. On larger screens, offer a room panel beside the
game. Pause decorative 3D animation while playing to conserve mobile resources.
Load one active game frame per participant; release it after leaving that table.
Leaving a game and leaving the gathering are separate explicit actions.

Text chat is mandatory for this MVP. Keep the shell ready to own a single voice
session; voice/video implementation is a separate delivery milestone, not a
prerequisite for reliable launching. When added, request mic/camera only after
the player chooses that feature, keep the call independent of game changes, and
test it in the foreground on every target. Do not promise uninterrupted locked-
screen/background calls from a PWA. Respect autoplay rules: start room audio from
a user action and keep game audio muted until unlocked if necessary.

Optional push notifications can announce invitations and invite a user back;
notification permission is never required to join or play. On Apple mobile
platforms [Web Push is available to installed Home Screen apps](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
Notification delivery is not a game-launch acknowledgement or a guarantee that
an app is running. Opening the app always reconciles current state without push.

## A certified game integration

Simply putting today’s URL in an iframe is insufficient. Each certified game
must implement the following explicit contract while retaining its standalone
create/join URLs and independent deployment.

### Hosting and isolation

Serve an embed entry point on an origin different from Gameroom, preferably a
controlled game-specific HTTPS subdomain such as
`cribbage.play.boardgamescafe.org`. This is a proposed deployment, not existing
infrastructure. Each game’s own pipeline publishes it. Use hosting with control
over response headers, for example Firebase Hosting; do not assume existing
GitHub Pages hosting can provide the required embedding policy.

Allow framing only from reviewed Gameroom origins using CSP `frame-ancestors`;
restrict Gameroom’s `frame-src` to approved game origins. Sandbox the frame with
only necessary script and origin permissions, without top navigation, popups,
mic or camera permissions. Because the game has a different origin, it cannot
read room DOM, Firebase session or chat. Do not proxy arbitrary games onto the
Gameroom origin or expose a general privileged JavaScript bridge.

Use a versioned `postMessage`/MessageChannel handshake: ready, bootstrap, loaded,
recoverable error. Validate the exact sender origin, source window, message
schema and launch ID; never use wildcard targets for credentials. See
[postMessage security guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns).

### Game identity without storage prompts

Embedded cross-site storage is restricted/partitioned in WebKit. Requiring a
Storage Access prompt or changing tracking protection would fail the setup goal.
See [WebKit’s storage policy](https://webkit.org/tracking-prevention/).

A small launch coordinator and a game-owned redemption endpoint replace reliance
on an existing browser login:

1. After a canonical launch intent commits, the coordinator verifies the caller’s
   room membership and selected participation. Reserve the game table once using
   the stable launch ID. A game-owned endpoint creates/resolves it idempotently,
   so guests do not depend on the host’s frame completing setup first.
2. Issue a short-lived, one-use join grant bound to the participant, game,
   launch/table and permitted operation. Deliver it to the verified frame through
   the handshake, never a query string. Gameroom’s Firebase token stays in
   Gameroom; its service identity is not a game login.
3. The game redeems the grant server-side and maps an opaque per-game participant
   identifier to a **game-local Firebase UID**. Return its custom auth token
   directly to the frame. Do not give Gameroom game tokens or game Admin keys.
4. In embed mode use [in-memory Firebase Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence),
   with no dependency on persistent frame storage. Reloads obtain a fresh grant
   for the same game-local UID/table. Repeated redemption is rejected; interrupted
   exchanges recover through a fresh authorized grant, not a duplicate seat.

The coordinator needs an authenticated server deployment, such as Cloud Run or
Cloud Functions, with narrow service-to-service permissions and managed secrets.
Game authority remains in each game’s backend and event log. A display name is
only a preference. Logout/removal cancels outstanding grants and tears down the
frame; game authorization must also enforce revoked access rather than trusting
an already-issued Firebase token indefinitely.

### Catalog and readiness

Preserve the shared catalog’s IDs and existing fields. `GameroomEnabled` continues
to mean disabled, integrated or new-tab; `Hidden` remains tabletop-only and
Gameroom continues to use `WebURL`.

Add an explicitly versioned embed capability to the typed catalog/manifest
contract and editor. `integrated` plus an advertised, validated embed contract is
required for seamless launch. An existing integrated URL is not evidence of
embedding support. Never infer capability from a hostname, title or document ID.
Define the metadata, rules and migration in the implementation PR before any
reviewed production edits; this design does not seed or bulk-edit the catalog.

The default seamless collection contains only certified games. Existing URL-only
and new-tab entries may remain in a clearly separate external-games view, with
an honest description of their extra steps. BGA and its paused extension work
are outside this MVP: they are not independently verified embed integrations.

## State, failures and updates

Keep the ordered immutable versioned intent log and pure reducer canonical.
Record invite/accept/revoke and launch decisions with stable command IDs,
expected revisions and attribution. Private invitation decisions belong in
access-controlled account/invitation streams; room membership decisions belong
in room history. Inbox/membership indexes are rebuildable from those decisions,
not alternative sources of truth. Email delivery status, grant redemption,
reservation receipts, presence and frame readiness are operational records,
not room snapshots or external game outcomes.

Choose a fresh protocol version after checking both main and the paused BGA
branch; do not reuse a reserved version or change old replay semantics.

A launch records intended participation. Show local loading/error state and
Retry without claiming that everyone has successfully joined. Bounded timeouts
identify unavailable games. Retrying uses the same table/launch ID, and recurring
launches get new IDs. Reload/replay restores the current frame once instead of
creating another table. Actual membership and gameplay remain game-owned.

On network loss show reconnecting; do not silently queue new launches offline.
On resume, replay room history, reauthorize participation and recover the game
through its own log. Do not steal an active seat across devices silently: offer
an explicit takeover that invalidates the old game session.

Cache the shell and versioned assets, not credentials or private API responses.
Service worker updates must not force reload a live room/game. Negotiate protocol
compatibility and apply incompatible updates at an explicit safe point.
Production installation uses the stable root manifest. Preview builds at `/prN/`
need distinct manifest IDs and path-scoped workers/caches; a production worker
must exclude preview paths from navigation handling. Paths do not isolate auth
or scripts: previews remain on the trusted production origin by existing owner
choice, and only validated artifacts from the trusted publisher may run there.

## Delivery and proof before rollout

Deliver in this order; each step must leave a reproducible test command and exact
manual device steps with expected results. A mocked frame demonstration is not
proof of real game integration.

1. **Prove the hard part first.** Build the smallest real Cribbage embed and
   game-local auth/grant exchange. Serve controlled HTTPS test origins and use
   two real independent identities. Demonstrate automatic remote launch on an
   installed iPhone app and Android app with default privacy/popup settings.
   Reload both and recover the same seats. If this fails, revise the architecture
   before building onboarding or migrating the cabinet.
2. **Complete installation and invitations.** Add manifest/worker, email-code
   identity and directed inbox. Invite a fresh address before installation;
   install, verify inside the app and join from the inbox. Repeat after clearing
   browser state and with a second device. Use guarded demo projects, a test mail
   sink and real Auth/Firestore emulators in automation.
3. **Integrate the persistent shell.** Replace the certified launch path, retain
   legacy URL behavior, and exercise chat while starting, rejoining and switching
   games. Certify Can’t Stop to prove the contract is not Cribbage-specific.
4. **Qualify all five targets.** Execute the matrix below on physical hardware,
   recording builds, steps, results and any screen recordings. Desktop browser
   automation and Playwright WebKit do not establish installed iOS behavior.
   Publish no platform-wide seamless claim until every target passes.

| Required scenario | iPhone | iPad | Android phone | macOS | ChromeOS |
| --- | --- | --- | --- | --- | --- |
| Fresh install, identity, directed invite waiting before install | Required | Required | Required | Required | Required |
| Host Play automatically displays same table for foreground guests | Required | Required | Required | Required | Required |
| Chat stays usable; second game; same-name players; excluded player stays in room | Required | Required | Required | Required | Required |
| Reload, offline/reconnect, background/resume, OS termination and reopen | Required | Required | Required | Required | Required |
| Denied notifications/media, default popup blocking and storage restrictions | Required | Required | Required | Required | Required |
| Rotation/keyboard/safe areas or resize; accessible room/game navigation | Required | Required | Required | Required | Required |

Also automate duplicate/reordered commands, concurrent table reservation, expired
or replayed grants, wrong-origin/source messages, removed members, invitation
revocation, login conflicts, wrong-account links, game outages, safe updates and
multiple devices. Keep unauthorized email/account data and all tokens out of
logs, screenshots and other players’ views.

Use the existing Bun checks and real emulator integration. For launch changes run
`bun run check`, `bun run test:unit`, `bun run test:rules`, `bun run build` and
`bun run test:e2e`. E2E uses `TestStepHelper`, independent browsers and captures
of the actor and affected observers. Preserve the real HTTP-origin capability
regression, the pinned Linux ARM64 environment, exact decoded RGBA comparisons,
desktop 1180×820 and complete mobile captures at 390×844. Any new screenshot
references require local visual review first and explicit generation followed by
a separate ordinary verification run. Installed-device evidence supplements CI.

**Release criterion:** after initial setup, an evening of creating/joining rooms
and repeatedly playing certified games requires no copied game links, popup
exceptions, per-game accounts, extension installation or browser-tab management
on any of the five targets. A failure of that criterion blocks the seamless MVP;
it is not relabeled as a successful launch because an external page opened.

## Why not start with native wrappers?

The PWA plus explicit game contract addresses the launch boundary with one
client and ordinary installation routes. A native wrapper would still need game
identity, permissions, safe remote content and invitations; it would not make
arbitrary external sites integrable. Native distribution remains a fallback if
the physical-device proof fails or background calling later requires it, with
its own platform/security/distribution design. Do not incur that work before
proving the smaller cross-platform path.
