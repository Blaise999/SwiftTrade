# ⚠️ READ THIS FIRST — Fixing the signup 500 errors

You're seeing these errors:

```
/api/auth/admin-signup        → 500
…supabase.co/auth/v1/signup   → 500
```

Both have the **same root cause: missing environment configuration.**
This project ships **without** a `.env.local` (secrets must never be
committed). Until you create one, auth cannot work.

---

## Step 1 — Create `.env.local`

In the project root, copy the example file:

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in **all three Supabase values** from
your Supabase dashboard → Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://bqmzouzbnacyznhwjkor.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the "anon / public" key>
SUPABASE_SERVICE_ROLE_KEY=<the "service_role" SECRET key>
```

> The **service_role** key is the one that fixes
> `/api/auth/admin-signup`. Without it, that route can't create users
> server-side and the app falls back to the browser signup — which is
> exactly the path that 500s (see Step 2).

Restart `npm run dev` after editing `.env.local` (Next.js only reads it
on boot).

---

## Step 2 — Fix the Supabase `/auth/v1/signup` 500

A 500 directly from `…supabase.co/auth/v1/signup` is a **Supabase-side**
error, not app code. The two usual causes:

### Cause A: Email confirmations on, but no SMTP
Supabase Dashboard → **Authentication → Providers → Email**:
- Turn **"Confirm email" OFF** (you already verify email via the in-app
  OTP, so Supabase's own confirmation is redundant), **or**
- Configure SMTP under **Authentication → Emails** so Supabase can
  actually send the confirmation mail.

With the service_role key set (Step 1), signup goes through
`/api/auth/admin-signup` which **auto-confirms** and **bypasses** this
entirely — so Step 1 alone usually resolves it.

### Cause B: A leftover trigger on `auth.users`
If you ran an older schema, an obsolete `handle_new_user` trigger may
still exist and throw on insert. Run this in the Supabase SQL editor to
check and remove it:

```sql
-- See triggers on auth.users
select tgname from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- If you see an old custom one (e.g. on_auth_user_created), drop it:
-- drop trigger on_auth_user_created on auth.users;
```

The current `01_schema.sql` does **not** add any trigger to
`auth.users`, so a fresh project won't have this problem.

---

## Step 3 — Run the SQL in order

In the Supabase SQL editor:

1. `supabase/01_schema.sql`
2. `supabase/02_seed.sql`
3. `supabase/03_admin_bootstrap.sql`

Then log in as `blaiseidoko@gmail.com` / `Blaise999`.

---

## Dev shortcut (no email setup needed)

For local testing the OTP is frozen to **`000000`** whenever
`NODE_ENV !== production`. Sign up, type `000000`, and the
admin-signup path (Step 1) creates + confirms the account so you can
log straight in.
