# External Cron Setup (Vercel Hobby workaround)

## Why this exists

Vercel's **Hobby plan cron limits** (verified from Vercel docs):

| Plan       | Cron jobs | Schedule                                    |
|------------|-----------|---------------------------------------------|
| **Hobby**  | 2 max     | **once per day only**, fired at a random minute within the hour |
| Pro        | 40        | any frequency, fires within the minute      |
| Enterprise | 100       | any frequency                               |

A once-a-day job that might fire anytime in a 60-minute window is
useless for FX price ticking or processing recurring investments. So
**this project does not use Vercel cron at all.** Instead it exposes
secured HTTP endpoints that *any* external scheduler can call on *any*
schedule.

## The endpoints

All require the secret (set `CRON_SECRET` in your env). Pass it as
`?key=...`, header `x-cron-key`, or `Authorization: Bearer ...`.

| Endpoint                          | What it does                              | Suggested frequency |
|-----------------------------------|-------------------------------------------|---------------------|
| `GET /api/cron/run`               | **Runs everything** (recommended)         | every 2–5 min       |
| `GET /api/cron/run?only=recurring`| Just recurring investments                | every 5 min         |
| `GET /api/cron/demo-fx`           | Demo-FX autopilot price tick              | every 10–30 sec     |
| `GET /api/cron/recurring`         | Recurring investments sweep only          | every 5 min         |

`/api/cron/run` returns a per-job JSON report so you can see what ran.

## Step 1 — set the secret

In Vercel → Project → Settings → Environment Variables (and your local
`.env.local`):

```
CRON_SECRET=<a long random string, e.g. `openssl rand -hex 32`>
```

Also make sure these are set (used by the jobs):

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Step 2 — pick an external scheduler

### Option A — cron-job.org (free, no code)

1. Create a free account at https://cron-job.org
2. New cron job →
   URL: `https://your-domain.com/api/cron/run?key=YOUR_CRON_SECRET`
   Schedule: every 5 minutes
3. Save. Done.

### Option B — GitHub Actions (free, included)

A workflow is already in this repo at
`.github/workflows/cron.yml`. Just add a repository **secret**:

- GitHub repo → Settings → Secrets and variables → Actions → New secret
  - `CRON_ENDPOINT` = `https://your-domain.com/api/cron/run`
  - `CRON_SECRET`   = the same secret value

It runs every 5 minutes automatically once pushed.

> Note: GitHub Actions scheduled workflows can be delayed a few minutes
> under load — fine for recurring sweeps, not ideal for sub-minute FX
> ticks. For tight FX ticking use cron-job.org or EasyCron with a
> 10–30s schedule on `/api/cron/demo-fx`.

### Option C — EasyCron / Render Cron / Runhooks

Any of these work the same way — point them at the URL with `?key=`.

## Step 3 — verify

```bash
curl "https://your-domain.com/api/cron/run?key=YOUR_CRON_SECRET"
```

You should get:

```json
{ "ok": true, "ranAt": "…", "jobs": [
  { "job": "recurring", "ok": true, "detail": { "processed": 0 }, "ms": 42 },
  { "job": "demofx",    "ok": true, "detail": { … }, "ms": 88 },
  { "job": "bridge-expire", "ok": true, "detail": { "expired": 0 }, "ms": 31 }
]}
```

A `401` means the secret is wrong; `503` means `CRON_SECRET` isn't set
on the server.

## Security notes

- Endpoints **fail closed**: if `CRON_SECRET` is unset the route refuses
  to run (503), so it can't be triggered anonymously.
- The secret is checked in constant comparison against header/query.
- These routes are `force-dynamic` and never cached.
