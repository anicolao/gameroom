# LauncherUI shared Firestore project

The PR preview uses project `launcherui` for rooms and the existing `Applications`
catalog. `launcherui-before.rules` is the source read from production ruleset
`d86a4b0b-857c-434e-a442-fc421dd52ae6` on 2026-11-05. It uses protected
`users/{uid}.catalogueEditor` flags; the deployed permissions differ from the
current local ttlauncher rules, so those local rules were not substituted.

`launcherui.rules` preserves existing room and protected user permissions, and
extends catalogue writes to `WebURL` and `GameroomEnabled`. `Hidden` applies only
to tabletop; missing GameroomEnabled means disabled. Enabled surfaces require
their own HTTPS URL. The explicitly requested Cribbage example is the only
production catalogue addition; there is no bulk migration. Deploy this combined
file, never ttlauncher's standalone catalogue rules over the shared project.

Before deploying, run all unit/rules/E2E checks. Then, with the Firebase CLI signed
into an authorized account:

```sh
node scripts/deploy-shared-rules.cjs
```

The guard reads current production rules and stops if they changed from the
reviewed source. It does not blindly replace other applications' permissions.
The standalone `firestore.rules` is for independent Gameroom projects/emulators,
not for overwriting `launcherui`. Future shared-project deployments must retain
both applications' rule blocks and repeat the preservation tests.

GitHub preview builds receive only public Firebase web configuration through
repository secrets, never a service-account key, Admin SDK token, or refresh token.
