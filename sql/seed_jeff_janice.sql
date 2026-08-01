-- ============================================================================
-- seed_jeff_janice.sql — creates a fully-loaded test account.
--
-- Login:  jeff.janice@swifttrade.test   /   Test1234!
--
-- Safe to run more than once (idempotent). It ADAPTS to your real columns via
-- information_schema, because your repo has conflicting schema versions
-- (crypto_positions.avg_buy_price vs average_price, etc.).
--
-- If the auth.users insert fails (Supabase versions differ), the script raises a
-- notice — in that case create the user once in Dashboard → Authentication →
-- Add user (email above), copy their UID into v_uid below, and re-run.
-- ============================================================================
create extension if not exists pgcrypto;

do $$
declare
  v_uid uuid := 'a1e7c0de-0000-4a5b-8c1d-6a1e77e5ff01';  -- fixed test UID
  v_email text := 'jeff.janice@swifttrade.test';
begin
  -- ---------------------------------------------------------------- auth user
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt('Test1234!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{"first_name":"Jeff","last_name":"Janice"}',
      false, '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_uid::text, v_uid,
      json_build_object('sub', v_uid::text, 'email', v_email),
      'email', now(), now(), now()
    ) on conflict do nothing;
  exception when others then
    raise notice 'auth.users seed skipped (%). Create the user in the Dashboard, put its UID in v_uid, and re-run.', sqlerrm;
  end;

  -- ---------------------------------------------------------------- profile
  insert into public.users (id, email, first_name, last_name)
  values (v_uid, v_email, 'Jeff', 'Janice')
  on conflict (id) do nothing;

  -- balances + flags (only set columns that exist)
  update public.users set
    balance_available = 25000,
    balance_bonus     = 500,
    updated_at        = now()
  where id = v_uid;

  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='balance_pending';
  if found then update public.users set balance_pending = 1500 where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='total_deposited';
  if found then update public.users set total_deposited = 40000 where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='shield_mode';
  if found then update public.users set shield_mode = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='kyc_status';
  if found then update public.users set kyc_status = 'verified' where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='email_verified';
  if found then update public.users set email_verified = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='is_active';
  if found then update public.users set is_active = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='tier';
  if found then update public.users set tier = 'pro' where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='tier_purchased';
  if found then update public.users set tier_purchased = true where id = v_uid; end if;
  perform 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='referral_code';
  if found then update public.users set referral_code = 'JEFFJAN' where id = v_uid
             and not exists (select 1 from public.users where referral_code='JEFFJAN' and id<>v_uid); end if;

  -- ---------------------------------------------------------------- crypto positions (adaptive)
  if exists (select 1 from information_schema.columns where table_name='crypto_positions' and column_name='avg_buy_price') then
    insert into public.crypto_positions (user_id, symbol, quantity, avg_buy_price)
    select v_uid,'BTC',0.35,61000 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='BTC');
    insert into public.crypto_positions (user_id, symbol, quantity, avg_buy_price)
    select v_uid,'ETH',4.2,2950 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='ETH');
  elsif exists (select 1 from information_schema.columns where table_name='crypto_positions' and column_name='average_price') then
    insert into public.crypto_positions (user_id, symbol, quantity, average_price, total_cost_basis)
    select v_uid,'BTC',0.35,61000,21350 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='BTC');
    insert into public.crypto_positions (user_id, symbol, quantity, average_price, total_cost_basis)
    select v_uid,'ETH',4.2,2950,12390 where not exists (select 1 from public.crypto_positions where user_id=v_uid and symbol='ETH');
  end if;
  if exists (select 1 from information_schema.columns where table_name='crypto_positions' and column_name='shield_enabled') then
    update public.crypto_positions set shield_enabled = true where user_id = v_uid and symbol = 'BTC';
  end if;

  -- ---------------------------------------------------------------- equities (only if the table exists)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='positions') then
    if exists (select 1 from information_schema.columns where table_name='positions' and column_name='avg_entry_price') then
      insert into public.positions (user_id, symbol, asset_type, quantity, avg_entry_price)
      select v_uid,'AAPL','stock',15,205 where not exists (select 1 from public.positions where user_id=v_uid and symbol='AAPL');
      insert into public.positions (user_id, symbol, asset_type, quantity, avg_entry_price)
      select v_uid,'TSLA','stock',8,240 where not exists (select 1 from public.positions where user_id=v_uid and symbol='TSLA');
    end if;
  end if;

  -- ---------------------------------------------------------------- transactions (real cols)
  if exists (select 1 from information_schema.columns where table_name='transactions' and column_name='balance_after') then
    insert into public.transactions (user_id, type, amount, currency, balance_after, description, status)
    select v_uid,'deposit',40000,'USD',40000,'Initial funding','completed'
    where not exists (select 1 from public.transactions where user_id=v_uid and description='Initial funding');
  end if;

  -- ---------------------------------------------------------------- deposits
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='deposits') then
    insert into public.deposits (user_id, method, amount, currency, network, status)
    select v_uid,'crypto',40000,'USD','ERC-20','confirmed'
    where not exists (select 1 from public.deposits where user_id=v_uid and amount=40000);
  end if;

  -- ---------------------------------------------------------------- withdrawals
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='withdrawals') then
    insert into public.withdrawals (user_id, method, amount, currency, network, address, status, net_amount)
    select v_uid,'crypto',5000,'USD','ERC-20','0xJEFF00000000000000000000000000000000TEST','completed',4990
    where not exists (select 1 from public.withdrawals where user_id=v_uid and amount=5000);
  end if;

  -- ---------------------------------------------------------------- SwiftBridge (real cols)
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='bridge_countries') then
    insert into public.bridge_countries (code, name, currency, currency_symbol, is_active)
    values ('NG','Nigeria','NGN','₦',true) on conflict (code) do nothing;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='bridge_requests') then
    -- one completed
    insert into public.bridge_requests (user_id, country_code, local_currency, local_amount, target_asset, fx_rate, estimated_usd, status, final_credit_usd)
    select v_uid,'NG','NGN',1600000,'USDT',1600,1000,'completed',1000
    where not exists (select 1 from public.bridge_requests where user_id=v_uid and status='completed');
    -- one in progress
    insert into public.bridge_requests (user_id, country_code, local_currency, local_amount, target_asset, fx_rate, estimated_usd, status)
    select v_uid,'NG','NGN',800000,'USDT',1600,500,'awaiting_admin'
    where not exists (select 1 from public.bridge_requests where user_id=v_uid and status='awaiting_admin');
  end if;

  raise notice 'Seeded Jeff Janice (%). Login: % / Test1234!', v_uid, v_email;
end $$;
