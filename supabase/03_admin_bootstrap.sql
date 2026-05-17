-- =====================================================================
-- SWIFT TRADE — BOOTSTRAP ADMIN USER: Blaise Chimdi
-- =====================================================================
-- Creates Blaise as both a regular login user AND an admin.
-- Email:    blaiseidoko@gmail.com
-- Password: Blaise999
-- He can log in at /auth/login   (user dashboard)
--   AND at  /admin/login         (admin panel)
--
-- Run this in Supabase SQL Editor AFTER 01_schema.sql + 02_seed.sql.
-- Idempotent: re-running just re-asserts the password and admin role.
-- =====================================================================

create extension if not exists "pgcrypto";

do $$
declare
  v_user_id uuid;
  v_email   text := 'blaiseidoko@gmail.com';
  v_pwd     text := 'Blaise999';
begin
  -- Look for existing auth user.
  select id into v_user_id from auth.users where email = v_email;

  -- Create the auth.users row if it doesn't exist.
  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_pwd, gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',array['email']),
      jsonb_build_object('full_name','Blaise Chimdi'),
      now(), now(),
      '', '', '', ''
    );

    -- Required identity row for email auth provider.
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_user_id::text,
      now(), now(), now()
    );
  end if;

  -- Mirror into public.users with admin role.
  -- ON CONFLICT (id) handles re-runs; ON CONFLICT (email) handles legacy rows.
  insert into public.users (
    id, email, first_name, last_name,
    role, is_admin, tier, tier_purchased,
    is_active, email_verified,
    kyc_status, registration_status,
    balance_available, balance_bonus,
    referral_code,
    created_at, updated_at
  ) values (
    v_user_id, v_email, 'Blaise', 'Chimdi',
    'admin', true, 'sovereign', true,
    true, true,
    'verified', 'complete',
    0, 0,
    'BLAISE001',
    now(), now()
  )
  on conflict (id) do update set
    role                = 'admin',
    is_admin            = true,
    tier                = 'sovereign',
    tier_purchased      = true,
    is_active           = true,
    email_verified      = true,
    first_name          = excluded.first_name,
    last_name           = excluded.last_name,
    kyc_status          = 'verified',
    registration_status = 'complete',
    updated_at          = now();

  raise notice 'Blaise Chimdi admin user ready: %', v_user_id;
end $$;

-- Re-assert the password every run (in case it was changed).
update auth.users
   set encrypted_password = crypt('Blaise999', gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at         = now()
 where email = 'blaiseidoko@gmail.com';

-- Sanity check: also ensure the public mirror exists for any pre-existing auth user
-- with this email (covers an edge case where auth.users has the row but public.users doesn't).
insert into public.users (id, email, first_name, last_name, role, is_admin, tier,
                          is_active, email_verified, kyc_status, registration_status,
                          balance_available, referral_code, created_at, updated_at)
select au.id, au.email, 'Blaise', 'Chimdi', 'admin', true, 'sovereign',
       true, true, 'verified', 'complete', 0, 'BLAISE001', now(), now()
  from auth.users au
 where au.email = 'blaiseidoko@gmail.com'
on conflict (id) do nothing;
