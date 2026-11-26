# Bricks

Private LEGO collection app. Spanish interface, one Google sign in per person, each person sees only their own sets.

Version: 1.17.0
Date: 25 November 2026

## Files
- index.html, style.css, app.js, themes.js: the app
- firebase-config.js: paste the Firebase config from the Christmas app (project shelf-b5282)
- sw.js: service worker, network first, cache name "bricks-v1.17.0", only deletes caches starting "bricks-"
- manifest.webmanifest, icon-192.png, icon-512.png: installable PWA

## Set up
1. Open firebase-config.js and replace the COPIAR_DESDE_CHRISTMAS values with the ones from the Christmas app. projectId stays shelf-b5282.
2. Publish the repository root with GitHub Pages.
3. Merge the Firestore rule block for "bricks" into the master rules in the Libraries repository. There is deliberately no rules file in this repository.
4. In the app: Ajustes, Avanzado, paste the Brickset key (and the Rebrickable key if you have one). They are saved once and shared with the allowed accounts.

## Data
Sets live in the collection "bricks". Every set carries addedBy (the signed in user's uid). Profile and shared settings live in "bricksMeta", so "bricks" holds only sets.
- Sets: setNumber, name, theme, year, pieces, minifigs, rrp (PVP), paid, store, purchaseDate, location, notes, imageUrl (web address only), photo (small JPEG of your own set, optional), status ("wishlist", "owned" or "sold"), built (boolean), building (boolean, being built now), gift (boolean), resale (boolean), potPrice (planned selling price), used (boolean, second hand), salePrice, saleDate
- bricksMeta/<uid>: name, insidersNumber, cardImage (small JPEG), aspecto
- bricksMeta/config: bricksetKey, rebrickableKey (shared settings, written from the owner account)

## For the Libraries home page
Per user, count sets with where addedBy == uid, status == "owned", gift == false, resale == false. Sum "pieces" the same way. "built" is a boolean. No composite index is needed.

## Set lookup
Brickset first (set number, name, barcode), Rebrickable as fallback. Both are optional: every set can be added by hand.
Data from Brickset and Rebrickable.

## Changelog
1.17.0 (2026-11-26): Creación reads the LEGO Pick a Brick CSV (elementId,quantity). Element numbers are translated to part and colour through the Rebrickable API (needs the Rebrickable key, one request per element, saved on the device so each element is asked once); untranslated ones show as "Elemento NNN" and count as missing.

1.16.0 (2026-11-26): Creación: quick selection of the sets to use (all, only unbuilt, only built); wishlist, gift and resale sets are never included by it.

1.15.0 (2026-11-26): Creación: saved creations show as a row of chips (icon, name, % same colour and % any colour) and you pick one to view it; Limpiar only empties the screen so you can load another, nothing is deleted (each creation still has its own Eliminar creación).

1.14.0 (2026-11-26): Creación tab: import a Studio .io, Rebrickable CSV/TSV or BrickLink XML and see what % you can build with your parts (same colour and any colour), what to buy and which sets the pieces come from; sets you do not want to dismount can be left out (moc.js, colors.js: colour equivalences built in, no Rebrickable key needed). Each creation shows a small icon (the model thumbnail from a .io), BrickLink XML is read too (part numbers that differ from Rebrickable count as missing), and on computer view the tabs sit in a left sidebar.

1.13.0 (2026-11-26): own icons for theme headers (themeicons.js); red heart on wishlist sets; Piezas renamed Cajón with list, grid and by set views plus a part reference search; phone, tablet and computer layouts with a manual choice in Ajustes.

1.12.1 (2026-11-25): the gift box icon sits top right, next to the unbuilt box icon.

1.12.0 (2026-11-25): "Duplicar este set" button (copies the data, starts unbuilt and not for gift or scalper) and a ×N copies label when you own the same set more than once.

1.11.1 (2026-11-25): gift box icon for sets marked Para regalar (top left of the picture in the grids, and inside the Regalo label).

1.11.0 (2026-11-25): view buttons carry a name and a note says what each view shows; home cards for Vendidos and Deseos; every home card opens the matching filtered view, with a chip to clear the filter.

1.10.0 (2026-11-25): new Deseos tab. Wanted sets live there and no longer appear in Biblioteca, the home strip or its filters. "Ya lo tengo" moves one into your collection.

1.9.0 (2026-11-25): Scalper sets get a planned selling price with the expected profit and percentage, in the sheet, the library and the home totals.

1.8.1 (2026-11-25): theme suggestions checked against the LEGO.com themes page; 14 current themes added.

1.8.0 (2026-11-25): sort by Tema with theme headers and a picture; saving % in green or over PVP in red, and profit or loss for sold sets; list of LEGO themes in the form; new Piezas tab with the full parts inventory from Rebrickable (kept on this device), filtered by built, unbuilt, in process, wanted, collection or set.

1.7.0 (2026-11-25): "Montado" badge in green, new red "Por montar" badge, red box icon; the lookup says when the source has no PVP.

1.6.0 (2026-11-25): "Mostrar tarjeta" now draws a digital member card (your sign in email and a Code 128 barcode made from your number) with no photo needed. The photo, if saved, shows under it.

1.5.1 (2026-11-25): the "En proceso" badge now has its own amber colour.

1.5.0 (2026-11-25): new "En proceso de montaje" option for sets you are building now, with its own icon, badge, filter, sort position and count.

1.4.1 (2026-11-25): tapping outside the set sheet or the filters closes them; the manual button no longer keeps the previous set when adding a new one.

1.4.0 (2026-11-25): the manual button asks Brickset (getInstructions2) for the direct PDF and uses it when found, otherwise it opens the LEGO instructions page.

1.3.0 (2026-11-25): bigger box icon for unbuilt sets; sort by Estado; new Segunda mano checkbox with badge and filter; opening a set no longer fails if index.html is out of date.

1.2.1 (2026-11-25): the "Por montar" marker on library pictures is now a small box icon.

1.2.0 (2026-11-25): library pictures show a "Por montar" box (owned, not built) and the piece count; link to the LEGO building instructions page in the set sheet, built from the set number.

1.1.0 (2026-11-23): new Estantería view showing built sets on shelf planks, grouped by where they are displayed; optional photo of your own set (camera or gallery, shrunk and saved in the set); Dónde está is now a dropdown like the store.
1.0.3 (2026-11-23): name searches no longer show LEGO branded video games or other items with no pieces (Gear). Searching by set number is unchanged.
1.0.2 (2026-11-23): store dropdown with Otros and a typing box; X at the top right of the add and filter sheets; add button moved to the bottom right with a different shape per look.
1.0.1 (2026-11-23): profile and shared keys moved to their own collection "bricksMeta", so "bricks" holds only sets.
1.0.0 (2026-11-23): first release. Add by number, name or barcode; four library views; filters and sorting; cover with totals; profile with LEGO Insiders card; eight looks; settings with sync, export and shared API keys.
