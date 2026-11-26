# Shelf conveyor animation lab

Run `bun run dev:lab`, then open http://localhost:5299/dev/shelves.
`/dev/animations` is an alias. Vite hot reloads the lab for rapid iteration.

This is an isolated rendering study. It uses eight local game fixtures and the
existing cover paintings. It does not mount the room app, authenticate, subscribe
to the catalogue, or write Firestore. The production launcher uses the same renderer with the live catalog.

- Wheel / trackpad or horizontal drag: move the conveyor.
- Run / pause: continuous transport; Space also toggles it.
- Bottom slider: freeze and scrub two catalogue cycles.
- Arrow keys / buttons: coast by one box. Sidebar buttons move four at a time.
- Click a real 3D box: lift it. The game buttons are keyboard equivalents and
  bring the chosen cover to the front of the upper shelf.
- Cutaway: expose the concealed rear run and both return bends.
- Orbit camera: drag and zoom for inspection; turn off to restore conveyor input.
- View, spacing, box scale, light, speed and coast controls are live.
- Copy setup link: a URL containing the current study settings.
- Hide controls: scene-only view; Escape returns to the lab.

`src/lib/cabinet/conveyor.ts` is the pure path sampler and damped transport motion. `CabinetScene`
contains the reusable Threlte scene; `GameBox` is actual beveled geometry with
front, back, side and cardboard materials. Box changes at the loop seam happen
behind the wall. The conveyor texture and boxes use the same travel distance.
Wall geometry occludes the rear run rather than fading or clipping the boxes.

The lab follows the sibling Cribbage and Can’t Stop pattern: pinned Threlte /
Three versions, on-demand rendering, physical materials, a local HDR environment,
mesh interaction and accessible HTML controls outside the scene. Material source
and CC0 provenance are in `public/materials/SOURCES.md`.

The lab remains a fixture-only study. Product E2E stories verify the shared
enclosed cabinet with native mesh clicks, wheel, keyboard and touch browsing.

## Alternative studies

The **Study version** selector keeps the motion controls shared across three
presentations. Direct links open each with its intended initial camera:

- `http://localhost:5299/dev/shelves?variant=magic`: exposed racetracks with a
  walnut-and-brass tunnel around the rear catalogue seam. A complete box enters
  the tunnel before its fixture changes; it returns as another game. **Remove
  tunnel cover** reveals the seam for inspection. The tunnel clearance and row
  pitch accommodate the box-size control.
- `http://localhost:5299/dev/shelves?variant=cabinet`: a wider backing, enclosed
  top, rear and sides, and wider front cheeks. The backing overlaps the side
  panels, concealing the return run and its distracting slivers. **Reveal behind
  the wall** remains available as a diagnostic cutaway.
- `http://localhost:5299/dev/shelves?variant=wall`: the original wall study for
  comparison.

Copy setup link includes the chosen variant along with the camera and motion
settings. These alternatives remain available for iteration; product baselines cover the
enclosed cabinet in the launcher.

## Game frame study

`/dev/frames` (development only) mounts the real room UI with a **Frame study**
control below the room/game controls. Choose a catalog game, then use **Try … in
room** to load its exact WebURL in an overlaid sandboxed iframe. This is a manual
visual study, not a group launch or an assertion that the game supports embedding.
It does not append a launch intent or change the existing separate-tab flow.
The catalog still uses the configured shared adapter; room actions remain real.

The game fills the entire app window. A small **⋯** control in the bottom-left
corner overlays the iframe; its visible circle is 28px with a 44px touch target.
It opens **Return to room** (hide without unloading) and **Close game** (remove
the frame). A native modal dialog keeps keyboard focus out of the covered room.
Escape closes the menu first, then returns to the room. The room stays mounted.
Use the standard local demo environment for multi-profile room experiments; loading a production game URL uses that game's normal backend.
Some external games may prohibit framing or require additional auth support.

`window.close()` does not close an iframe. A cooperating game may request local
frame dismissal with:

```js
window.parent.postMessage(
  {type: 'gameroom:close', version: 1},
  'http://127.0.0.1:5599', // Exact parent origin for this local study.
);
```

The parent accepts this only from the currently framed window at the configured
game origin. This is only a UI dismissal, not a room/table leave event.
The overlay's close control always works without any game-side integration. No window.close
shim, credentials bridge, or automatic embed capability detection is installed.
