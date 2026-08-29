-- Lets the UI render the right asset logo / currency flag on each notification.
alter table public.notifications add column if not exists symbol text;
alter table public.notifications add column if not exists metadata jsonb default '{}'::jsonb;

-- allow the new notification types
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c' and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
end $$;
