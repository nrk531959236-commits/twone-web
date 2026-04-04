-- Twone email approval v1
-- 目标：允许管理员按邮箱先审批，再由用户未来首次用该邮箱登录时自动兑现 membership
-- 执行位置：Supabase SQL Editor

create table if not exists public.membership_email_approvals (
  email text primary key,
  plan text not null default 'free',
  status text not null default 'active' check (status in ('inactive', 'active')),
  assistant_monthly_quota integer not null default 2 check (assistant_monthly_quota >= 0),
  started_at timestamptz,
  expires_at timestamptz,
  approved_application_id uuid references public.member_applications (id) on delete set null,
  approved_at timestamptz not null default timezone('utc', now()),
  approved_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists membership_email_approvals_email_lower_idx
  on public.membership_email_approvals ((lower(email)));

alter table public.membership_email_approvals enable row level security;

create policy if not exists "service role manages membership_email_approvals"
on public.membership_email_approvals
as permissive
for all
to service_role
using (true)
with check (true);

create or replace function public.set_membership_email_approvals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists membership_email_approvals_set_updated_at on public.membership_email_approvals;
create trigger membership_email_approvals_set_updated_at
before insert or update on public.membership_email_approvals
for each row
execute function public.set_membership_email_approvals_updated_at();
