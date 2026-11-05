# CATALOGUE

Real Firestore and Auth emulators; independent browser identities. Desktop captures are 1180×820 at 1×; mobile captures are 390×844 with full-page capture. Every decoded RGBA byte must match. No masks, pixel tolerance, screenshot resizing or retries. Baselines are generated explicitly and verified in a separate run.

## A catalog document arrives through the Firestore subscription

Viewpoint: **Reader**

![A catalog document arrives through the Firestore subscription](./screenshots/000-live-entry-reader-darwin.png)

- [x] Five games produce two shelves without scrolling the desktop room

## The same cabinet browses a larger collection

Viewpoint: **Reader**

![The same cabinet browses a larger collection](./screenshots/001-next-shelf-reader-darwin.png)

- [x] The second shelf contains Robo Rally

## A URL-only entry opens separately without invented group support

Viewpoint: **Reader**

![A URL-only entry opens separately without invented group support](./screenshots/002-url-only-reader-darwin.png)

- [x] The original room stays open and no group table was recorded

## Hidden and invalid entries disappear without rewriting catalog data

Viewpoint: **Reader**

![Hidden and invalid entries disappear without rewriting catalog data](./screenshots/003-hidden-and-invalid-reader-darwin.png)

- [x] Only the four valid visible entries remain
