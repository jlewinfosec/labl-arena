# Installing LABL Arena on the tablet

The app is published from this repo with GitHub Pages:

**https://jlewinfosec.github.io/labl-arena/**

## First install (Chrome on Android)

1. Open the link above in Chrome on the tablet. Wait for the first-run screen to appear.
2. Tap Chrome's ⋮ menu → **Add to Home screen** (or **Install app**) → **Install**.
3. Close Chrome and open **LABL** from the home screen. It runs full screen, and from now on it opens
   with or without a signal: everything it needs is cached on the tablet.
4. Set the Board Member PIN on the first-run screen.
5. Board Member panel › **Settings** › Backup: check that *Storage* says **Protected**. If it says
   *Not protected*, make sure you opened the app from the home-screen icon (not a Chrome tab) and
   check again after the next launch.

## Bring old data in (restore a backup)

If the league's data lives on another copy of the app (the old HTML file, or another tablet):

1. On the old copy: Board Member panel › Settings › **Backup (JSON)** (or **Send to Google Drive**).
   Get the `labl-backup-YYYY-MM-DD.json` file onto this tablet (Drive, email, USB).
2. In the installed app: Settings › **Restore a backup** → pick the file → **Restore**.
   The app reloads with the roster, teams, rounds and settings from the backup.

## Updates

A new build goes live when `docs/` is pushed to `main`. The tablet picks it up the next time it has
a signal: a banner **New version ready. Restart to update.** appears on the Board Member panel
(never on the run screen). Tap it, or just close and reopen the app. Saved data is kept through
updates — it lives in the browser's storage for this address, not in the page file.

## Backups every event day

Settings › **Send to Google Drive** shares the backup JSON and this event's results CSV together.
Pick **Drive** in the Android share sheet and choose the LABL folder. The same button appears on
the run screen when the day's last item is done. On a device without the share sheet the two files
go to Downloads instead.

## Publishing (one-time setup for the repo)

GitHub → repo **Settings** → **Pages** → *Build and deployment*: Source **Deploy from a branch**,
Branch **main**, folder **/docs** → Save. The site appears at the address above within a few minutes.
