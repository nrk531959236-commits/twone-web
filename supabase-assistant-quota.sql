-- Twone assistant quota v1
-- 作用：给 /assistant 增加最小可行 AI 月度配额控制
-- 执行位置：Supabase SQL Editor

create table if not exists public.assistant_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,
  request_type text not null default 'chat' check (request_type in ('chat')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists assistant_usage_user_period_idx
on public.assistant_usage (user_id, period);

alter table public.memberships
add column if not exists assistant_monthly_quota integer not null default 30 check (assistant_monthly_quota >= 0);

alter table public.assistant_usage enable row level security;

create policy if not exists "users can view own assistant usage"
on public.assistant_usage
for select
to authenticated
using (auth.uid() = user_id);

create policy if not exists "service can insert assistant usage"
on public.assistant_usage
for insert
to authenticated
with check (auth.uid() = user_id);

-- 给某个用户开通会员并设置额度
-- insert into public.memberships (user_id, plan, status, started_at, expires_at, assistant_monthly_quota)
-- values ('替换成 auth.users.id', 'pro', 'active', now(), now() + interval '30 days', 30)
-- on conflict (user_id) do update
-- set status = excluded.status,
--     plan = excluded.plan,
--     started_at = excluded.started_at,
--     expires_at = excluded.expires_at,
--     assistant_monthly_quota = excluded.assistant_monthly_quota;

-- 把测试用户额度直接压到 1 次，便于验证耗尽逻辑
-- update public.memberships
-- set assistant_monthly_quota = 1
-- where user_id = '替换成 auth.users.id';

-- 清空某个用户本月使用记录，便于重复测试
-- delete from public.assistant_usage
-- where user_id = '替换成 auth.users.id'
--   and period = to_char(timezone('utc', now()), 'YYYY-MM');
