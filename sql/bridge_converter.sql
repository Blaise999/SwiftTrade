-- =====================================================================
-- SwiftBridge converter support + clearer notifications.
-- usd_rate: admin-set "1 USD = X local" per country (converter falls back to
-- a live rate if unset). And restate bridge notifications with sent/received.
-- =====================================================================
alter table public.bridge_countries add column if not exists usd_rate numeric(20,6);

create or replace function public.tg_bridge_notify()
returns trigger language plpgsql security definer as $$
declare v_label text; v_msg text;
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  v_label := case new.status
    when 'awaiting_admin'        then 'SwiftBridge — request received'
    when 'awaiting_payment'      then 'SwiftBridge — payment details ready'
    when 'awaiting_verification' then 'SwiftBridge — verifying your payment'
    when 'completed'             then 'SwiftBridge — completed'
    when 'rejected'              then 'SwiftBridge — request rejected'
    when 'expired'               then 'SwiftBridge — request expired'
    when 'cancelled'             then 'SwiftBridge — request cancelled'
    else 'SwiftBridge — update' end;

  if new.status = 'completed' then
    v_msg := 'Sent ' || coalesce(new.local_amount::text,'') || ' ' || coalesce(new.local_currency,'')
          || ' · received ' || coalesce(new.final_credit_target, new.estimated_target, 0)::text || ' ' || coalesce(new.target_asset,'')
          || case when coalesce(new.final_credit_usd,new.estimated_usd) is not null
                  then ' (~$' || coalesce(new.final_credit_usd,new.estimated_usd)::text || ')' else '' end;
  else
    v_msg := trim(coalesce(new.local_amount::text,'') || ' ' || coalesce(new.local_currency,'')
          || ' → ' || coalesce(new.target_asset,''));
  end if;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (new.user_id, 'bridge', v_label, v_msg,
          jsonb_build_object('request_id', new.id, 'status', new.status, 'source','bridge'));
  return new;
exception when others then return new;
end; $$;
drop trigger if exists trg_bridge_notify on public.bridge_requests;
create trigger trg_bridge_notify after insert or update on public.bridge_requests
for each row execute function public.tg_bridge_notify();
