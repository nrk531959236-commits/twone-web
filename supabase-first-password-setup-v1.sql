create table if not exists public.membership_password_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  application_id uuid references public.member_applications (id) on delete set null,
  plan text,
  assistant_monthly_quota integer,
  status text not null default 'active' check (status in ('active', 'used', 'revoked', 'expired')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  created_by text,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists membership_password_setup_tokens_user_id_idx
  on public.membership_password_setup_tokens (user_id);

create index if not exists membership_password_setup_tokens_application_id_idx
  on public.membership_password_setup_tokens (application_id);

create index if not exists membership_password_setup_tokens_status_expires_idx
  on public.membership_password_setup_tokens (status, expires_at desc);

create or replace function public.touch_membership_password_setup_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_membership_password_setup_tokens_updated_at on public.membership_password_setup_tokens;
create trigger trg_membership_password_setup_tokens_updated_at
before update on public.membership_password_setup_tokens
for each row
execute function public.touch_membership_password_setup_tokens_updated_at();

alter table public.membership_password_setup_tokens enable row level security;

revoke all on public.membership_password_setup_tokens from anon, authenticated;
