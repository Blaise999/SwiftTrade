# 🚨 Fixing the schema errors you're seeing

You're getting errors like:
- `column trades.liquidation_price does not exist`
- `Could not find the 'country_name' column of 'bridge_requests'`

The fix is ONE FILE. Open your Supabase SQL editor and run:

## `supabase/RUN_THIS_TO_FIX_ALL_SCHEMA_ERRORS.sql`

That's it. It's idempotent (safe to run twice if you're unsure whether it worked).

Once it finishes, **wait 30 seconds** for Supabase's PostgREST to refresh its
schema cache, then refresh the page. The errors are gone.

---

## If you're setting up fresh

Run these in order in the SQL editor:
1. `01_schema.sql`
2. `02_seed.sql`
3. `03_admin_bootstrap.sql`
4. `RUN_THIS_TO_FIX_ALL_SCHEMA_ERRORS.sql`

(The numbered migrations 04–07 are split out for reference but the
"RUN_THIS" file contains all of them combined.)

---

## Final schema state (verified)

- 52 tables
- 867 columns
- 0 missing columns the app references
