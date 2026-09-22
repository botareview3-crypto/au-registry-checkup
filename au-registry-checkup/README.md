# AU Registry Checkup

Daily registry checklist, shared across every phone, with a log of who
checked off what — backed by a small Node/Express server and, for real
persistence, the project's own GitHub repo (free, no expiring database).

## What's in this version

- **Shared state** — `GET/POST` to the server, not `localStorage` alone, so
  every phone sees the same checkmarks.
- **Who-checked-what log** — the first time someone opens the app it asks
  for a name (kept in that browser's `localStorage`). Every check/uncheck
  is recorded with that name and a timestamp.
  - A bell icon in the top bar opens a slide-over **Activity** panel with
    the recent history, newest first, with a red dot when there's something
    you haven't seen.
  - A small **toast** pops up in-app when someone else checks/unchecks
    something while you have the page open (polling every 20s).
  - This is an *in-app* notification system — it only fires while the page
    is open in a tab/browser, same as the live activity feed. True push
    notifications that arrive even when the app/browser is closed need a
    service worker + Web Push (VAPID keys) and per-device subscriptions;
    that's a bigger, separate piece of work — say the word if you want it
    added.
- **Free, durable persistence** — see below. Solves the "don't lose the
  data" part for real, including across redeploys, at $0.
- **Self-ping** — pings its own `/healthz` every 10 minutes so the free
  Render instance never idles long enough to spin down.
- **Mobile polish** — safe-area padding, "add to home screen" tags, bigger
  tap targets.

## Saving the data — free, and durable across redeploys

Render's free web services have **no persistent disk**: a fresh deploy (or
occasional Render-side restart) boots with an empty disk, so a plain
`data/state.json` file doesn't survive that, even with self-ping running.
Render's own free database options don't solve it either — the free
Postgres expires and is deleted 30 days after creation, and the free
Key Value (Redis) instance doesn't include persistence.

So this app backs the checklist up to **a branch of your own GitHub repo**
(`data-store` by default) as a plain JSON file. No new account, no
expiring database, no card on file — you already have GitHub for
deploying. On every check/uncheck the server commits the update to that
branch; on startup (including after a fresh deploy) it reads the latest
commit back. That branch is never built or deployed by Render — it's
just used as a free, versioned data store.

### One-time setup

1. On GitHub: **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token.**
   - Repository access: **Only select repositories** → your
     `au-registry-checkup` repo.
   - Permissions: **Contents → Read and write.** Nothing else needed.
   - Copy the token — you won't see it again.
2. On Render, open your service → **Environment**, and add:
   - `GITHUB_TOKEN` = the token you just copied
   - `GITHUB_REPO` = `yourname/au-registry-checkup`
   - (`GITHUB_DATA_BRANCH` is already set to `data-store` via
     `render.yaml` — only add it if you want a different branch name)
3. Redeploy. The server logs `[github-store] connected...` on startup, and
   from then on every check/uncheck is backed up automatically.

Without this set up, the app still works fine — it just falls back to the
same local-file-only behavior as before (survives spin-down, not redeploys).

## Run it locally

```powershell
npm install
npm start
```

Open http://localhost:3000. `RENDER_EXTERNAL_URL` won't be set locally, so
self-ping simply stays off, and `GITHUB_TOKEN`/`GITHUB_REPO` are optional
locally too (state just lives in `data/state.json`).

## Deploy to Render (one-time setup)

Render only deploys from a connected GitHub or GitLab repo — there's no
direct "git push straight to Render". So the flow is: push to GitHub →
Render (already connected) redeploys automatically.

1. Create an empty repo on GitHub, e.g. `au-registry-checkup`.
2. From this project folder, run the included PowerShell script:
   ```powershell
   .\deploy.ps1 -RemoteUrl "https://github.com/<you>/au-registry-checkup.git"
   ```
   This does `git init` (if needed), commits everything, and pushes to
   GitHub.
3. On [dashboard.render.com](https://dashboard.render.com), click
   **New → Blueprint**, pick the repo you just pushed. Render reads
   `render.yaml` and creates the web service (free plan, health check on
   `/healthz`, auto-deploy on). It'll prompt you for `GITHUB_TOKEN` and
   `GITHUB_REPO` at that point — see the setup steps above.
   - Alternatively: **New → Web Service** → pick the repo → build command
     `npm install`, start command `npm start`, then add the env vars
     manually under **Environment**.
4. Wait for the first deploy, then open the `*.onrender.com` URL — that's
   the link to use on your phones.

## Redeploying later

From this folder:
```powershell
.\deploy.ps1
# or with a custom commit message:
.\deploy.ps1 -Message "tweak colors"
```
Render picks up the push and redeploys within a minute or two. Your
checklist data is unaffected — it lives on the `data-store` branch, not
in the deploy.

## Why self-ping is set to 10 minutes

Render's free web services spin down after ~15 minutes with no inbound
traffic; the next visitor then waits ~30-60s for a cold start. Pinging its
own public URL every 10 minutes (under that window) counts as normal
traffic, so the instance never goes idle long enough to sleep. As a
backup, it's worth also pointing a free external pinger (e.g.
[cron-job.org](https://cron-job.org) or UptimeRobot) at
`https://<your-app>.onrender.com/healthz` every 10 minutes, in case the
instance ever restarts for another reason and the internal timer resets
along with it.

## Files

```
server.js            Express server: shared state, activity log, self-ping
lib/github-store.js  Free durable backup: commits state.json to a GitHub branch
package.json
render.yaml           Render Blueprint (infra as code)
deploy.ps1            PowerShell push helper
public/
  index.html
  styles.css
  app.js
data/                 state.json cache written here at runtime (gitignored)
AU_Registries.xlsx    original source data (not used at runtime)
```
