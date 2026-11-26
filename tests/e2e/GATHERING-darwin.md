# GATHERING

Real Firestore and Auth emulators; independent browser identities. Desktop captures are 1180×820 at 1×; mobile captures are 390×844 with full-page capture. Every decoded RGBA byte must match. No masks, pixel tolerance, screenshot resizing or retries. Baselines are generated explicitly and verified in a separate run.

## The cozy den opens with a browsable collection

Viewpoint: **Alex**

![The cozy den opens with a browsable collection](./screenshots/000-welcome-alex-darwin.png)

- [x] The collection and room form are ready

## The whole room plays together

Viewpoint: **Alex**

![The whole room plays together](./screenshots/001-friends-arrive-alex-darwin.png)

- [x] Both members are present with no player-selection controls

## The whole room plays together

Viewpoint: **Sam**

![The whole room plays together](./screenshots/002-friends-arrive-sam-darwin.png)

- [x] Both members are present with no player-selection controls

## One Play action opens the same game for both members

Viewpoint: **Alex**

![One Play action opens the same game for both members](./screenshots/003-frame-seated-alex-darwin.png)

- [x] URL-named seats share one game and only its original creator can deal

## One Play action opens the same game for both members

Viewpoint: **Sam**

![One Play action opens the same game for both members](./screenshots/004-frame-seated-sam-darwin.png)

- [x] URL-named seats share one game and only its original creator can deal

## The guest closes the game for the entire room

Viewpoint: **Alex**

![The guest closes the game for the entire room](./screenshots/005-shared-close-alex-darwin.png)

- [x] Both members return to one recent game link

## The guest closes the game for the entire room

Viewpoint: **Sam**

![The guest closes the game for the entire room](./screenshots/006-shared-close-sam-darwin.png)

- [x] Both members return to one recent game link

## Chat belongs to the persistent room

Viewpoint: **Alex**

![Chat belongs to the persistent room](./screenshots/007-room-chat-alex-darwin.png)

- [x] The message and recent game are shared without reopening a game

## Chat belongs to the persistent room

Viewpoint: **Sam**

![Chat belongs to the persistent room](./screenshots/008-room-chat-sam-darwin.png)

- [x] The message and recent game are shared without reopening a game

## A recent game reopens its original URL for everyone

Viewpoint: **Alex**

![A recent game reopens its original URL for everyone](./screenshots/009-game-reopened-alex-darwin.png)

- [x] The same two seats return to the same game code with no extra tabs

## A recent game reopens its original URL for everyone

Viewpoint: **Sam**

![A recent game reopens its original URL for everyone](./screenshots/010-game-reopened-sam-darwin.png)

- [x] The same two seats return to the same game code with no extra tabs

## The reopened game can deal a real private hand

Viewpoint: **Alex**

![The reopened game can deal a real private hand](./screenshots/011-frame-hand-alex-darwin.png)

- [x] The other hand has six face-down cards

## The reopened game can deal a real private hand

Viewpoint: **Sam**

![The reopened game can deal a real private hand](./screenshots/012-frame-hand-sam-darwin.png)

- [x] The other hand has six face-down cards

## Reload follows the room’s current game

Viewpoint: **Alex**

![Reload follows the room’s current game](./screenshots/013-frame-reload-alex-darwin.png)

- [x] The original URLs, seats and dealt hand survive

## Reload follows the room’s current game

Viewpoint: **Sam**

![Reload follows the room’s current game](./screenshots/014-frame-reload-sam-darwin.png)

- [x] The original URLs, seats and dealt hand survive

## A shared close stays closed after reload

Viewpoint: **Alex**

![A shared close stays closed after reload](./screenshots/015-closed-game-reload-alex-darwin.png)

- [x] The game remains a recent link without a finished-versus-resumable status

## A shared close stays closed after reload

Viewpoint: **Sam**

![A shared close stays closed after reload](./screenshots/016-closed-game-reload-sam-darwin.png)

- [x] The game remains a recent link without a finished-versus-resumable status

## The bookshelf starts a new game for the same room

Viewpoint: **Alex**

![The bookshelf starts a new game for the same room](./screenshots/017-new-room-game-alex-darwin.png)

- [x] A fresh game code opens for both profiles and the previous game stays in history

## The bookshelf starts a new game for the same room

Viewpoint: **Sam**

![The bookshelf starts a new game for the same room](./screenshots/018-new-room-game-sam-darwin.png)

- [x] A fresh game code opens for both profiles and the previous game stays in history
