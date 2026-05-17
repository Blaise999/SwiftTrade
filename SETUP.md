# Setup

Total time: **~10 minutes**.

## Prerequisites

- Node 18+ (or 20+) with `pnpm` (or `npm`/`yarn`)
- Free Supabase account at https://supabase.com

## 1. Create a Supabase project

1. New project at https://app.supabase.com — name it "Swift Trade".
2. Wait for it to provision (~2 min).
3. Settings → API:
   - `Project URL`        → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key    → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key   → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Run the SQL — in this order

In Supabase → **SQL Editor → New query**, paste each file and click **Run**:

| Order | File                              | What it does                        |
|-------|-----------------------------------|-------------------------------------|
| 1     | `supabase/01_schema.sql`          | All tables, RLS, storage, realtime  |
| 2     | `supabase/02_seed.sql`            | 31 SwiftBridge countries (HK + SG first) |
| 3     | `supabase/03_admin_bootstrap.sql` | Creates **Blaise Chimdi** admin user |

After step 3:

| Field    | Value                       |
|----------|-----------------------------|
| Email    | `blaiseidoko@gmail.com`     |
| Password | `Blaise999`                 |

Login works at:
- **`/auth/login`** — trader console
- **`/admin/login`** — operations panel

Same credentials. Same user.

## 3. Configure environment

```bash
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL / KEY / SERVICE_ROLE
```

## 4. Install + run

```bash
pnpm install
pnpm dev
# → http://localhost:3000
```

## 5. Verify

- Landing page → editorial, sapphire/champagne/pearl, Hong Kong skyline.
- `/auth/login` with Blaise's credentials → drops into `/dashboard`.
- `/admin/login` with the same credentials → drops into `/admin`.
- `/dashboard/bridge` → SwiftBridge UI (HK, SG, JP top of country list).
- `/admin/bridge` → realtime queue (empty until first request comes in).

## Optional environment

| Variable                    | Purpose                                   |
|-----------------------------|-------------------------------------------|
| `RESEND_API_KEY`            | Transactional emails                      |
| `ADMIN_NOTIFICATION_EMAIL`  | Pinged on every new SwiftBridge request   |
| `FINNHUB_API_KEY`           | Live US equity prices                     |

## Deploy

- **Vercel**: `vercel deploy` and add the env vars in project settings.
- Set `NEXT_PUBLIC_SITE_URL` to your production URL.
- Supabase: nothing more — the database is already live.

## Troubleshooting

**"User profile not found" on login**
→ The `auth.users` row exists but the `public.users` row doesn't. Re-run `03_admin_bootstrap.sql`.

**"Access denied" at `/admin/login`**
→ User exists but `role` isn't `admin`. Run:
```sql
update public.users set role = 'admin' where email = 'blaiseidoko@gmail.com';
```

**Country picker on `/dashboard/bridge` is empty**
→ `02_seed.sql` didn't run. Run it.

**Realtime alerts not arriving in `/admin/bridge`**
→ Supabase → Database → Replication → confirm `bridge_requests`, `admin_alerts`, `user_notifications` are in the `supabase_realtime` publication.

**`pgcrypto` error during `03_admin_bootstrap.sql`**
→ The first line of the file enables `pgcrypto`. If it fails, run manually first:
```sql
create extension if not exists "pgcrypto";
```
