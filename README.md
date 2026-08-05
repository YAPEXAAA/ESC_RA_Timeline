# Roster

Upload a shift-schedule `.xlsx`, everyone searches their name to see when they work.

- **Search is public** — no login, anyone with the link can look up a name.
- **Upload is password-protected** — one shared password, set via an environment variable.
- **Re-uploading is safe.** For every date found in a newly uploaded file, whatever was
  stored for that exact date is wiped and replaced with the new file's data. Older dates
  not present in the new file are left untouched. So re-uploading a corrected Week 31
  file just overwrites Week 31 — nothing gets duplicated or left in a half-old state.

Built to run entirely on **Vercel's free Hobby plan** — no other accounts needed.

## Why this isn't just "write to a JSON file"

Vercel Functions don't have a persistent disk — every request can land on a fresh,
throwaway container, so anything written to the local filesystem disappears. Instead,
the one JSON "file" this app keeps (`schedules.json`) lives in **Vercel Blob**, which is
Vercel's own object storage, free on Hobby (1GB storage / 10GB transfer a month — this
app will use a tiny fraction of that). Functionally it behaves exactly like the JSON
file you'd expect: the app reads it, merges in whatever a new upload changes, and
writes the whole thing back.

## How it reads your spreadsheet

It expects the same layout as `Draft_Schedule_W31_CM.xlsx`:

- A header row containing "Nom & Prenom" (or "Name") in the first column.
- Two rows above that: one date per day, in the columns marked `I` (time in) on the
  header row. If a date cell's value is missing (e.g. it was a formula whose cached
  value got stripped), the day is inferred from the previous day + 1 automatically.
- Columns: Name, Mat, TWW ID, Skill, then an `I`/`O` (in/out) pair per day.
- Cell values: a time (shift), `R` (day off), `CP` (paid leave), or any other short
  code — anything not recognized is just displayed as-is, so new codes won't break it.
- If the workbook has multiple sheets, every sheet that matches this layout is parsed
  (so a file with several team tabs works too); sheets that don't match (like a lookup
  tab, e.g. `IDS`) are skipped automatically.
- People are matched across uploads by **TWW ID** (falls back to Mat, then name), so
  a person keeps their history even if their name is typed slightly differently in a
  later file.

## Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com), **Add New → Project**, import the repo.
   Framework Preset: "Other". No build command needed — click Deploy.
3. **Create a Blob store**: in the project dashboard, go to **Storage → Create Database
   → Blob**, then connect it to this project. Vercel automatically adds a
   `BLOB_READ_WRITE_TOKEN` environment variable for you — you don't need to touch it.
4. **Set `UPLOAD_PASSWORD`**: Project → Settings → Environment Variables. This is the
   password whoever publishes schedules will type on the upload page.
5. Redeploy (Settings changes apply on the next deployment — trigger one from the
   Deployments tab if needed).

Your site is live at the URL Vercel gives you. Share that for search, and share
`<your-url>/upload.html` only with whoever should be able to publish schedules.

## Run locally

```bash
npm install -g vercel   # if you don't have it
vercel link              # connect this folder to your Vercel project
vercel env pull .env.development.local
npm install
vercel dev
```

`vercel dev` is needed instead of plain `node` because this app is a set of serverless
functions (`/api/*.js`), not a long-running server — `vercel dev` emulates that
environment, and it also loads the Blob token for you from the pulled env file.

## Project structure

```
api/
  stats.js           GET  /api/stats              — public
  search.js           GET  /api/search?q=          — public
  employee/[id].js     GET  /api/employee/:id        — public
  upload.js             POST /api/upload               — password-protected
  history.js             GET  /api/history               — password-protected
lib/
  parser.js               Turns an .xlsx buffer into { employees, scheduleByDate }
  store.js                 Reads/writes schedules.json in Vercel Blob, wipe-then-replace merge logic
public/                   Static frontend (no build step — plain HTML/CSS/JS)
  index.html               Search page
  upload.html               Upload page
```

## Notes

- Max upload size is **3MB** (Vercel Functions cap request bodies at 4.5MB, and the
  file is sent base64-encoded, which adds ~33% overhead — 3MB of raw `.xlsx` leaves
  headroom). A real schedule spreadsheet is normally well under this.
- `.xlsx`/`.xlsm` only.
- The `schedules.json` blob is stored as **private** — it's only ever read by your
  own API functions (via the `BLOB_READ_WRITE_TOKEN`/OIDC), never exposed as a public
  URL, so schedule data isn't guessable by anyone outside the app.
- The upload page isn't linked from search, but it isn't secret either — treat the
  URL like a password-protected admin page, because that's what it is.
- If two people upload at the exact same moment, the second write wins (last-write-wins,
  no locking) — fine for an occasional manual re-upload, not built for concurrent editors.
- If you ever want to swap the shared upload password for individual logins, that's
  a bigger change (real auth + sessions) — happy to help with that later if needed.
