# NEXT-GAME

Real Firestore and Auth emulators; independent browser identities. Desktop captures are 1180×820 at 1×; mobile captures are 390×844 with full-page capture. Every decoded RGBA byte must match. No masks, pixel tolerance, screenshot resizing or retries. Baselines are generated explicitly and verified in a separate run.

## The room keeps one recent link after a shared close

Viewpoint: **Alex**

![The room keeps one recent link after a shared close](./screenshots/000-first-game-closed-alex-linux.png)

- [x] Both profiles are back in the same room with no game frame

## The room keeps one recent link after a shared close

Viewpoint: **Sam**

![The room keeps one recent link after a shared close](./screenshots/001-first-game-closed-sam-linux.png)

- [x] Both profiles are back in the same room with no game frame

## URL-only games open their exact address for everyone

Viewpoint: **Alex**

![URL-only games open their exact address for everyone](./screenshots/002-other-url-game-alex-linux.png)

- [x] Both room members keep the same saved link without invented joining parameters

## URL-only games open their exact address for everyone

Viewpoint: **Sam**

![URL-only games open their exact address for everyone](./screenshots/003-other-url-game-sam-linux.png)

- [x] Both room members keep the same saved link without invented joining parameters

## The next game uses the whole room

Viewpoint: **Alex**

![The next game uses the whole room](./screenshots/004-next-group-selection-alex-linux.png)

- [x] The game has its own Play action with no player selection or table controls

## One Play action opens the next game for both profiles

Viewpoint: **Alex**

![One Play action opens the next game for both profiles](./screenshots/005-next-different-game-alex-linux.png)

- [x] The guest reload restores the same two seats and a new game code

## One Play action opens the next game for both profiles

Viewpoint: **Sam**

![One Play action opens the next game for both profiles](./screenshots/006-next-different-game-sam-linux.png)

- [x] The guest reload restores the same two seats and a new game code

## A new room member joins the current game automatically

Viewpoint: **Alex**

![A new room member joins the current game automatically](./screenshots/007-late-member-alex-linux.png)

- [x] All three profiles share one game without restarting its existing windows

## A new room member joins the current game automatically

Viewpoint: **Sam**

![A new room member joins the current game automatically](./screenshots/008-late-member-sam-linux.png)

- [x] All three profiles share one game without restarting its existing windows

## A new room member joins the current game automatically

Viewpoint: **Lee**

![A new room member joins the current game automatically](./screenshots/009-late-member-lee-linux.png)

- [x] All three profiles share one game without restarting its existing windows

## A late arrival can close the game for the entire room

Viewpoint: **Alex**

![A late arrival can close the game for the entire room](./screenshots/010-late-member-close-alex-linux.png)

- [x] The three recent links remain available with no ended-versus-resumable classification

## A late arrival can close the game for the entire room

Viewpoint: **Sam**

![A late arrival can close the game for the entire room](./screenshots/011-late-member-close-sam-linux.png)

- [x] The three recent links remain available with no ended-versus-resumable classification

## A late arrival can close the game for the entire room

Viewpoint: **Lee**

![A late arrival can close the game for the entire room](./screenshots/012-late-member-close-lee-linux.png)

- [x] The three recent links remain available with no ended-versus-resumable classification

## Reopening a recent game restores its original URLs for everyone

Viewpoint: **Alex**

![Reopening a recent game restores its original URLs for everyone](./screenshots/013-late-member-reopen-alex-linux.png)

- [x] The original creator stays the creator and every member returns to their existing seat

## Reopening a recent game restores its original URLs for everyone

Viewpoint: **Sam**

![Reopening a recent game restores its original URLs for everyone](./screenshots/014-late-member-reopen-sam-linux.png)

- [x] The original creator stays the creator and every member returns to their existing seat

## Reopening a recent game restores its original URLs for everyone

Viewpoint: **Lee**

![Reopening a recent game restores its original URLs for everyone](./screenshots/015-late-member-reopen-lee-linux.png)

- [x] The original creator stays the creator and every member returns to their existing seat
