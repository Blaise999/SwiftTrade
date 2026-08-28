# Rate alerts — scheduling options

Alerts are checked **three ways**. You only need one, and option 1 needs no setup at all.

## 1. Opportunistic (default, zero setup)

Every call to `/api/holdings`, `/api/pulse`, or `/api/bridge/alerts` triggers a
background check, throttled to **once per 5 minutes** globally. As long as
anyone is using the app, alerts get checked.

Trade-off: if nobody opens the app for a day, nothing is checked until someone does.
For most consumer apps this is fine — the person who set the alert is usually the
one opening the app.

## 2. GitHub Actions (recommended — free, reliable)

`.github/workflows/rate-alerts.yml` is already in the repo. To activate:

1. Repo → **Settings → Secrets and variables → Actions**
2. Add `APP_URL` = `https://your-domain.com`
3. Add `CRON_SECRET` = the same value you set in Vercel

Runs every 15 minutes. You can also trigger it by hand from the Actions tab.

> GitHub may pause scheduled workflows on repos with no activity for 60 days.
> A single commit re-activates them.

## 3. External uptime pinger

Any of these work — point them at:

```
https://your-domain.com/api/cron/rate-alerts?secret=YOUR_CRON_SECRET
```

- **cron-job.org** — free, down to 1-minute intervals
- **UptimeRobot** — free 5-minute monitors
- **EasyCron**, **Cronitor**, etc.

The endpoint accepts the secret as `?secret=`, an `x-cron-secret` header, or a
Bearer token, and responds to both GET and POST — so it fits whatever the
scheduler sends.

## Vercel cron (not recommended here)

Vercel's Hobby plan runs cron **once per day**, which is too slow for rate
alerts. If you're on Pro and want it anyway, add to `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/rate-alerts", "schedule": "*/15 * * * *" }] }
```

## Safety

Concurrent runs can't double-notify: an alert is deactivated with a conditional
update (`.eq('active', true)`) before any notification is sent, so whichever run
claims it first is the only one that fires.
