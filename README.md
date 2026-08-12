# Safari Quotes — Admin App

A CRUD app for building, reviewing, and translating safari itineraries, backed by Supabase.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your Supabase project URL + publishable key
npm run dev
```

Get your credentials from Supabase Dashboard → Project Settings → API.

## Before first use

Storage buckets (`hero-images`, `hotel-images`) and their access policies are already
created on the live `safari-quotes` project — nothing to do there.

Still manual:

1. **Authentication → Users** — manually create your operator and supervisor accounts
   (email + password) in the Supabase Dashboard. Every new user gets an `operator` role by
   default in the `profiles` table — promote your supervisor account by running, in the
   SQL Editor:
   ```sql
   update profiles set role = 'supervisor' where id = 'THEIR_USER_UUID';
   ```

## Publishing pipeline (static page → Hostinger)

When a supervisor clicks Publish, the app sets `itineraries.status = 'published'` and
generates a `slug`. From there, a chain of three systems builds the public page and
pushes it to Hostinger automatically:

```
Publish click → Postgres trigger → Edge Function → GitHub Action → FTP → Hostinger
```

**Why an Edge Function sits in the middle:** Supabase's native Database Webhooks always
send their own fixed payload shape — there's no way to make that match what GitHub's
`repository_dispatch` API requires. The Edge Function at
`supabase/functions/notify-publish/index.ts` is the adapter: it receives the raw trigger
payload, checks whether this update was actually the publish moment, and if so re-shapes
it into what GitHub expects.

Already done on the live project (nothing to repeat):
- `pg_net` extension enabled
- Postgres trigger `on_itinerary_status_change` created — fires the Edge Function on every
  itineraries update (confirmed non-blocking: normal saves succeed instantly even before
  the function exists)

Still needed from you — see the full walkthrough below for exact steps:
1. Deploy the Edge Function (one paste into the Supabase Dashboard)
2. Set 3 secrets on it: `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_PAT`
3. Push this repo to GitHub, add 6 Actions secrets
4. Set up Hostinger: subdomain, FTP account, SSL

### Testing without the full pipeline

You can always generate a page locally without any of the above, useful while developing
the template itself:

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... PUBLIC_SITE_BASE_URL=... \
  node scripts/generate-page.mjs --slug=some-published-trip-slug
```

Writes to `dist-public/safari/<slug>.html` — open it directly in a browser to preview.



```bash
npm run build
```

This outputs static files to `dist/`. Upload the *contents* of `dist/` (not the folder itself)
to your Hostinger subdomain's `public_html` via FTP or the Hostinger File Manager.

Because this is a client-side single-page app, you'll also want a catch-all rewrite so
client-side routes (like `/builder/:id`) don't 404 on refresh. On Hostinger (Apache), add
this `.htaccess` file to the same folder as your uploaded `dist/` contents:

```
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## What's implemented

- Supabase auth (email/password) with operator/supervisor roles
- Dashboard: list + create itineraries, routes to Builder (drafts) or Review (everything else)
- Builder: header fields, hero image upload, 21-day accordion with rich text blocks,
  activity checkboxes, hotel description + image carousel (with reusable hotel library
  picker and upload-new-image flow), inclusions/exclusions two-column editor
  (add/remove/reset to defaults), pricing (3 tiers), "Submit for review" action
- Review: full day-by-day summary (all days shown, no truncation), automatic issue
  detection (empty hotel description, no activities, missing pricing tiers, missing hero
  image, empty itinerary text) that gates the Publish button until resolved, a single
  review notes box that lists detected issues plus a free-text note, inline day editing
  (click the pencil icon — reuses the same accordion editor as the Builder), Publish
  (supervisor-only, enforced both in the UI and by RLS)
- Translate: dropdown for Polish/German/French, duplicates the itinerary and all its
  content via `createTranslation()`, then opens a side-by-side editor — original
  read-only on the left, translated copy editable on the right, matched day-by-day and
  block-by-block. Saves back to its own itinerary row and returns to Review when done.
- All data reads/writes go through `src/lib/itineraries.js`

## Not yet built (next steps)

- Published public page generation (static HTML template + the GitHub Actions →
  FTP-to-Hostinger publish pipeline discussed earlier)
- Drag-to-reorder for inclusions/exclusions (currently add/remove only)
- Code-splitting (the production bundle is ~850KB; fine to ship, worth revisiting later
  with route-based `React.lazy()` if load time becomes noticeable)
