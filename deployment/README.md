# LauncherUI shared Firestore project

The PR preview uses project `launcherui` for rooms and the existing `Applications`
catalog. `launcherui-before.rules` is the source read from production ruleset
`220e9d90-fd96-4066-aa74-39fce302839d` on 2026-11-05. It uses protected
`users/{uid}.catalogueEditor` flags; the deployed permissions differ from the
current local ttlauncher rules, so those local rules were not substituted.

`launcherui.rules` adds only the Gameroom room functions and `rooms/**` matches.
The existing catalog and user rules remain unchanged, including protection against
self-granting catalog editor status. No Applications migration or write is needed.

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
