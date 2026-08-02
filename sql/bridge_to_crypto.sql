-- =====================================================================
-- SwiftBridge -> CRYPTO: on completion, credit the chosen crypto (target_asset)
-- to the user's crypto holdings (user_trading_data.spot_crypto_state) instead of
-- USD, so it tops the dashboard. Idempotent via crypto_credited flag.
-- =====================================================================
alter table public.bridge_requests add column if not exists credited_amount_usd numeric(20,2);
alter table public.bridge_requests add column if not exists credited_asset text;
alter table public.bridge_requests add column if not exists credited_amount numeric(30,12);
alter table public.bridge_requests add column if not exists crypto_credited boolean default false;

create or replace function public.tg_bridge_credit_crypto()
returns trigger language plpgsql security definer as $$
declare
  v_sym text; v_qty numeric; v_usd numeric;
  v_state jsonb; v_positions jsonb; v_new jsonb := '[]'::jsonb;
  v_found boolean := false; elem jsonb;
begin
  if new.status <> 'completed' then return new; end if;
  if coalesce(new.crypto_credited,false) then return new; end if;

  v_sym := upper(coalesce(new.target_asset,'USDT'));
  v_usd := coalesce(new.final_credit_usd, new.credited_amount_usd, new.estimated_usd, 0);
  v_qty := coalesce(new.final_credit_target, new.estimated_target, v_usd, 0);
  if v_qty <= 0 then return new; end if;

  insert into public.user_trading_data (user_id) values (new.user_id) on conflict (user_id) do nothing;
  select coalesce(spot_crypto_state,'{}'::jsonb) into v_state from public.user_trading_data where user_id=new.user_id;
  v_positions := coalesce(v_state->'positions','[]'::jsonb);

  for elem in select * from jsonb_array_elements(v_positions) loop
    if upper(coalesce(elem->>'symbol','')) = v_sym then
      elem := jsonb_set(elem,'{quantity}', to_jsonb(coalesce((elem->>'quantity')::numeric,0) + v_qty));
      v_found := true;
    end if;
    v_new := v_new || elem;
  end loop;
  if not v_found then
    v_new := v_new || jsonb_build_object('symbol',v_sym,'name',v_sym,'quantity',v_qty,
             'avgBuyPrice', case when v_qty>0 then v_usd/v_qty else 0 end);
  end if;

  update public.user_trading_data
     set spot_crypto_state = jsonb_set(coalesce(v_state,'{}'::jsonb),'{positions}',v_new), updated_at=now()
   where user_id = new.user_id;
  update public.bridge_requests set crypto_credited = true where id = new.id;
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_bridge_credit_crypto on public.bridge_requests;
create trigger trg_bridge_credit_crypto after insert or update of status on public.bridge_requests
for each row execute function public.tg_bridge_credit_crypto();
