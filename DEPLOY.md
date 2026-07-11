# Deploying Mirna Beauty Salon ERP

The app is a single Node.js process with no external database — it stores data
in a JSON file (`data/db.json` by default, or wherever `MERP_DATA_DIR` points).
That makes deployment trivial, with one thing to plan for: **the data file
must live on a persistent disk**, otherwise your bookings and invoices reset
whenever the host restarts or redeploys the app.

| Platform | Effort | Free tier | Persistent data on free tier |
| --- | --- | --- | --- |
| **Railway** | Easiest | $5 trial credit | ✅ Yes (volumes) |
| **Fly.io** | Easy (CLI) | Pay-as-you-go, ~free at this size | ✅ Yes (volumes) |
| **Render** | Easiest | ✅ Yes | ❌ No — disk resets on restart, app sleeps after 15 min idle |

**Recommendation:** Railway for the least friction with real persistence.
Render's free tier is fine for a throwaway demo but not for real salon data.

---

## Option 1 — Railway (recommended)

1. Sign up at [railway.app](https://railway.app) with your GitHub account.
2. **New Project → Deploy from GitHub repo** and pick this repository
   (grant Railway access to it when prompted). Railway detects the
   `Dockerfile` and builds automatically.
3. Add a persistent volume: open the service → **Settings → Volumes →
   Add Volume**, set the mount path to `/data`.
4. Add an environment variable: **Variables → New Variable**
   `MERP_DATA_DIR` = `/data`.
5. **Settings → Networking → Generate Domain** — this gives you the public
   URL (something like `mirna-salon-erp.up.railway.app`).

Every push to the deployed branch redeploys automatically.

## Option 2 — Fly.io

1. Install the CLI ([fly.io/docs/flyctl/install](https://fly.io/docs/flyctl/install/))
   and run `fly auth signup`.
2. From the repository root (the included `fly.toml` is preconfigured,
   Johannesburg region, volume mounted at `/data`):

   ```bash
   fly launch --no-deploy --copy-config   # accept the existing fly.toml
   fly volumes create merp_data --size 1
   fly deploy
   ```

3. `fly open` shows your live URL (`https://mirna-salon-erp.fly.dev`).

## Option 3 — Render (demo only)

1. Sign up at [render.com](https://render.com) with GitHub.
2. **New → Blueprint**, pick this repo — Render reads `render.yaml` and
   creates the service.
3. Done: you get `https://mirna-salon-erp.onrender.com`.

Caveats on the free plan: the app sleeps after 15 minutes of inactivity
(first visit takes ~30 s to wake) and **all data resets on every restart or
deploy**. Persistent disks require a paid plan (then attach a disk at `/data`
and set `MERP_DATA_DIR=/data`).

---

## Notes for any host

- The server listens on `PORT` (defaults to 3000); every platform above sets
  this automatically.
- Set `MERP_DATA_DIR` to the mounted volume path so `db.json` survives
  restarts.
- The app currently has **no login** — anyone with the URL can use it. Keep
  the URL private, or ask for authentication to be added before using it
  with real client data.
- Back up by downloading `db.json` from the volume (or use the CSV exports
  in Reports).
