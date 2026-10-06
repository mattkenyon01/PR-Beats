# PR Beats — copy through to Cloudflare

This folder is a self-contained Worker + D1 setup. Copy the whole `cloudflare` folder into your Cloudflare workers workspace (or deploy from here).

## 1. Copy static site into `public/`

From the PR Beats repo root, copy these into `cloudflare/public/`:

- `index.html`
- `login.html`
- `admin.html`
- `styles.css`
- `firebase-config.js`
- `js/` (entire folder)
- `images/` (entire folder)

Also copy:

- `cloudflare/js-client/api.js` → `cloudflare/public/js/api.js`

## 2. Install + log in

```bash
cd cloudflare
npm install
npx wrangler login
```

## 3. Create D1 and paste the id

```bash
npx wrangler d1 create prbeats-db
```

Copy the returned `database_id` into `wrangler.jsonc` → `d1_databases[0].database_id`.

Apply migrations:

```bash
npm run db:local
npm run db:remote
```

## 4. Firebase

In Firebase Console → Authentication → Settings → Authorized domains, add:

- `localhost`
- your Worker domain (e.g. `prbeats.<account>.workers.dev`)
- any custom domain you attach

`FIREBASE_PROJECT_ID` in `wrangler.jsonc` is already set to `prbeats-996dd`.

## 5. Run locally

```bash
npm run dev
```

Open the printed localhost URL → `/login.html` → admin.

## 6. Deploy next to your other Workers

```bash
npm run deploy
```

This creates/updates Worker name `prbeats` in the **same Cloudflare account** as your other Workers. It does **not** share their D1 databases.

## API (already in the Worker)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | no | health check |
| GET | `/api/announcements` | Firebase Bearer | load rows for signed-in user |
| POST or PUT | `/api/announcements` | Firebase Bearer | replace all rows for signed-in user |

If saves return **405**, make sure `wrangler.jsonc` has `assets.run_worker_first: ["/api/*"]` and redeploy. Without that, Cloudflare’s static asset server handles `/api/*` and rejects POST/PUT.

### Wire save/load in `admin.html` (manual)

After Firebase `onAuthStateChanged` has a user:

```js
import { loadAnnouncements, saveAnnouncements } from "./js/api.js";

const token = await user.getIdToken();
const data = await loadAnnouncements(token);
// data = { columns, rows }
```

Add a **Save** button that does:

```js
const token = await auth.currentUser.getIdToken();
await saveAnnouncements(token, currentTable.rows);
```

## Files in this folder

```
cloudflare/
  COPY-THROUGH.md      ← this file
  package.json
  wrangler.jsonc
  migrations/0001_init.sql
  src/prbeats.js       ← single-file Worker (paste this alone in the dashboard)
  js-client/api.js     ← copy into public/js/api.js
  public/              ← put your static site here
```

If you use the Cloudflare dashboard editor, paste **only** `src/prbeats.js`. It has no `auth.js` / `db.js` imports.
