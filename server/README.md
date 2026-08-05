# Parkline cloud backend

This is the "cloud driver-app backend" the project report calls for in §3.4.1,
and the thing `admin/api`'s `cloud_sync.py` has been waiting for at
`CLOUD_API_URL` since before this existed. It's a single Node/Express process
that serves both the JSON REST API (`/api/...`) *and* the static driver-app
frontend (`public/`) from one origin -- no build step, no separate frontend
host, no CORS to configure.

Storage is plain JSON files under `data/` (git-ignored, created automatically
on first run) -- no database server to install. Fine at this project's scale;
see the caveat about Render's free tier below before relying on it for
anything that needs to survive a redeploy.

## Running locally

```
cd parkline-client/server
npm install
npm start
```

Then open http://localhost:4000 -- that's the whole app, frontend and API
together, exactly how Render will run it in production.

`GET /api/health` is a quick liveness check.

## Deploying to Render (free tier)

Render gives this a public HTTPS URL without any router/tunnel setup on your
end -- needed because GitHub Pages can't execute server code, and a purely
local server isn't reachable from the internet without port forwarding.

**Blueprint (recommended):** `parkline-client/render.yaml` at the repo root
already describes the service (root dir `server`, `npm install`,
`node server.js`, free plan). On Render: **New → Blueprint**, connect this
repo, and it configures itself from that file.

**Manual fallback:** **New → Web Service** → connect this repo → set
**Root Directory** to `parkline-client/server` → Build Command `npm install`
→ Start Command `node server.js` → Free plan.

Once deployed you get a `*.onrender.com` URL (or a custom domain if you add
one later) -- that single URL serves the whole app.

**Caveat:** Render's free-tier filesystem is ephemeral across redeploys (it
survives sleep/wake, not a fresh build) -- so JSON-file storage means
signed-up accounts and reservations reset whenever the service redeploys.
Fine for a student demo; swap in a real database (e.g. Render's free
Postgres) later if that becomes a problem.

## Wiring the edge unit to this

Once deployed (or running locally on the same machine as the edge unit, for
testing), set in `admin/.env`:

```
CLOUD_API_URL=https://<your-service>.onrender.com
```

then restart/redeploy the `admin/api` container. Its existing sync loop
(`admin/api/app/services/cloud_sync.py`) will start pulling
`/api/reservations/active` and `/api/users/registered` from here, and pushing
`/api/sync/occupancy` / `/api/sync/access-event` updates back -- no code
changes needed on the edge side, since this backend's `routes/sync.js` was
built to match exactly what that file already expects. You can also trigger a
sync immediately from the edge dashboard's sync control instead of waiting
for the next interval.

## What's a placeholder (matching admin/README.md's own convention)

- **`routes/sync.js` has no auth** -- it's a plain, unauthenticated HTTP
  endpoint the edge unit calls server-to-server, same posture `admin/api`
  itself takes for its barrier-open call. Fine while only the edge unit knows
  this URL; add a shared secret before that stops being true.
- **No password reset / email verification** -- signup just creates the
  account. Matches the project's demo scope, not a production auth system.
