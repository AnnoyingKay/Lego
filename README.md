# Bricks

Private LEGO collection app. Spanish interface, one Google sign in per person, each person sees only their own sets.

Version: 1.0.0
Date: 23 November 2026

## Files
- index.html, style.css, app.js, themes.js: the app
- firebase-config.js: paste the Firebase config from the Christmas app (project shelf-b5282)
- sw.js: service worker, network first, cache name "bricks-v1.0.0", only deletes caches starting "bricks-"
- manifest.webmanifest, icon-192.png, icon-512.png: installable PWA

## Set up
1. Open firebase-config.js and replace the COPIAR_DESDE_CHRISTMAS values with the ones from the Christmas app. projectId stays shelf-b5282.
2. Publish the repository root with GitHub Pages.
3. Merge the Firestore rule block for "bricks" into the master rules in the Libraries repository. There is deliberately no rules file in this repository.
4. In the app: Ajustes, Avanzado, paste the Brickset key (and the Rebrickable key if you have one). They are saved once and shared with the allowed accounts.

## Data
One collection, "bricks". Every document carries addedBy (the signed in user's uid).
- Sets: setNumber, name, theme, year, pieces, minifigs, rrp (PVP), paid, store, purchaseDate, location, notes, imageUrl (web address only), status ("wishlist", "owned" or "sold"), built (boolean), gift (boolean), resale (boolean), salePrice, saleDate
- _profile_<uid>: name, insidersNumber, cardImage (small JPEG), aspecto
- _config: bricksetKey, rebrickableKey (shared settings, written from the main account)

## For the Libraries home page
Per user, count sets with where addedBy == uid, status == "owned", gift == false, resale == false. Sum "pieces" the same way. "built" is a boolean. No composite index is needed.

## Set lookup
Brickset first (set number, name, barcode), Rebrickable as fallback. Both are optional: every set can be added by hand.
Data from Brickset and Rebrickable.

## Changelog
1.0.0 (2026-11-23): first release. Add by number, name or barcode; four library views; filters and sorting; cover with totals; profile with LEGO Insiders card; eight looks; settings with sync, export and shared API keys.
