# LauncherUI shared Firestore project

The preview and production use project `launcherui` for rooms and the existing
`Applications` catalog. `launcherui-before.rules` is the exact production source
reviewed on 2026-11-26, including the reserved BGA protocol 3 rules.

`launcherui.rules` preserves the current Applications, catalog editor and protected
user permissions verbatim. It adds protocol 4 shared-game decisions and validates
the nullable current-game index atomically with the canonical event and command
acknowledgement. Versions 1–3 remain supported until a room upgrades; protocol
versions cannot subsequently decrease. No production catalog records are changed
by this update.

Run the unit, rules, build and real-emulator E2E checks before publishing the
application. With the Firebase CLI signed into an authorized account, deploy
only the combined rules through the guard:

```sh
node scripts/deploy-shared-rules.cjs
```

The guard reads current production rules and accepts only the exact reviewed
before or after source. It stops if production changed in the meantime. Future
updates must read and merge the actual production source again, preserving both
applications’ rules and repeating the preservation tests. Never deploy standalone
`firestore.rules` or ttlauncher's standalone catalog rules over this shared project.

The protocol 4 rules were deployed on 2026-11-26 and read back byte-for-byte.
GitHub preview builds receive only public Firebase web configuration, never a
service-account key, Admin SDK token or refresh token. The historical, separately
requested Cribbage catalog addition is recorded in `cribbage-application.json`.
