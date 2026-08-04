-- Per-user withdrawal address (admin-managed). Idempotent.
alter table public.users add column if not exists withdrawal_address text;
alter table public.users add column if not exists withdrawal_network text;
