# Bricks

Private LEGO collection app. Spanish interface, one Google sign in per person, each person sees only their own sets.

Version: 1.3.0
Date: 25 November 2026

## Files
- index.html, style.css, app.js, themes.js: the app
- firebase-config.js: paste the Firebase config from the Christmas app (project shelf-b5282)
- sw.js: service worker, network first, cache name "bricks-v1.3.0", only deletes caches starting "bricks-"
- manifest.webmanifest, icon-192.png, icon-512.png: installable PWA

## Set up
1. Open firebase-config.js and replace the COPIAR_DESDE_CHRISTMAS values with the ones from the Christmas app. projectId stays shelf-b5282.
2. Publish the repository root with GitHub Pages.
3. Merge the Firestore rule block for "bricks" into the master rules in the Libraries repository. There is deliberately no rules file in this repository.
4. In the app: Ajustes, Avanzado, paste the Brickset key (and the Rebrickable key if you have one). They are saved once and shared with the allowed accounts.

## Data
Sets live in the collection "bricks". Every set carries addedBy (the signed in user's uid). Profile and shared settings live in "bricksMeta", so "bricks" holds only sets.
- Sets: setNumber, name, theme, year, pieces, minifigs, rrp (PVP), paid, store, purchaseDate, location, notes, imageUrl (web address only), photo (small JPEG of your own set, optional), status ("wishlist", "owned" or "sold"), built (boolean), gift (boolean), resale (boolean), used (boolean, second hand), salePrice, saleDate
- bricksMeta/<uid>: name, insidersNumber, cardImage (small JPEG), aspecto
- bricksMeta/config: bricksetKey, rebrickableKey (shared settings, written from the owner account)

## For the Libraries home page
Per user, count sets with where addedBy == uid, status == "owned", gift == false, resale == false. Sum "pieces" the same way. "built" is a boolean. No composite index is needed.

## Set lookup
Brickset first (set number, name, barcode), Rebrickable as fallback. Both are optional: every set can be added by hand.
Data from Brickset and Rebrickable.

## Changelog
1.3.0 (2026-11-25): bigger box icon for unbuilt sets; sort by Estado; new Segunda mano checkbox with badge and filter; opening a set no longer fails if index.html is out of date.

1.2.1 (2026-11-25): the "Por montar" marker on library pictures is now a small box icon.

1.2.0 (2026-11-25): library pictures show a "Por montar" box (owned, not built) and the piece count; link to the LEGO building instructions page in the set sheet, built from the set number.

1.1.0 (2026-11-23): new Estantería view showing built sets on shelf planks, grouped by where they are displayed; optional photo of your own set (camera or gallery, shrunk and saved in the set); Dónde está is now a dropdown like the store.
1.0.3 (2026-11-23): name searches no longer show LEGO branded video games or other items with no pieces (Gear). Searching by set number is unchanged.
1.0.2 (2026-11-23): store dropdown with Otros and a typing box; X at the top right of the add and filter sheets; add button moved to the bottom right with a different shape per look.
1.0.1 (2026-11-23): profile and shared keys moved to their own collection "bricksMeta", so "bricks" holds only sets.
1.0.0 (2026-11-23): first release. Add by number, name or barcode; four library views; filters and sorting; cover with totals; profile with LEGO Insiders card; eight looks; settings with sync, export and shared API keys.
