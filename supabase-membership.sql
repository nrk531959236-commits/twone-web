-- Twone membership v1
-- 作用：给 /assistant 增加最小可行会员状态校验
-- 执行位置：Supabase SQL Editor

create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text default 'member',
  status text not null default 'inactive' check (status in ('inactive', 'active', 'canceled')),
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
before update on public.memberships
for each row
execute function public.set_updated_at();

alter table public.memberships enable row level security;

create policy if not exists "users can view own membership"
on public.memberships
for select
to authenticated
using (auth.uid() = user_id);

-- 如需让前端/后台直接更新，可继续补管理端策略；当前 v1 仅要求服务端读取，所以先不给 authenticated 开 update 权限。

-- 测试数据 1：把某个用户设为非会员（已登录但不可用）
-- insert into public.memberships (user_id, plan, status, started_at, expires_at)
-- values ('替换成 auth.users.id', 'member', 'inactive', now(), null)
-- on conflict (user_id) do update
-- set status = excluded.status,
--     plan = excluded.plan,
--     started_at = excluded.started_at,
--     expires_at = excluded.expires_at;

-- 测试数据 2：把某个用户设为有效会员（可用）
-- insert into public.memberships (user_id, plan, status, started_at, expires_at)
-- values ('替换成 auth.users.id', 'pro', 'active', now(), now() + interval '30 days')
-- on conflict (user_id) do update
-- set status = excluded.status,
--     plan = excluded.plan,
--     started_at = excluded.started_at,
--     expires_at = excluded.expires_at;
