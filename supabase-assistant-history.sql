-- Twone assistant history v1
-- 作用：给 /assistant 增加“单个当前会话”的最小持久化能力
-- 执行位置：Supabase SQL Editor

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists assistant_sessions_user_updated_idx
on public.assistant_sessions (user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.assistant_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  title text,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists assistant_messages_user_session_created_idx
on public.assistant_messages (user_id, session_id, created_at asc);

drop trigger if exists assistant_sessions_set_updated_at on public.assistant_sessions;
create trigger assistant_sessions_set_updated_at
before update on public.assistant_sessions
for each row
execute function public.set_updated_at();

alter table public.assistant_sessions enable row level security;
alter table public.assistant_messages enable row level security;

create policy if not exists "users can view own assistant sessions"
on public.assistant_sessions
for select
to authenticated
using (auth.uid() = user_id);

create policy if not exists "users can insert own assistant sessions"
on public.assistant_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists "users can update own assistant sessions"
on public.assistant_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "users can view own assistant messages"
on public.assistant_messages
for select
to authenticated
using (
  assistant_messages.user_id = auth.uid()
  and exists (
    select 1
    from public.assistant_sessions s
    where s.id = assistant_messages.session_id
      and s.user_id = auth.uid()
  )
);

create policy if not exists "users can insert own assistant messages"
on public.assistant_messages
for insert
to authenticated
with check (
  assistant_messages.user_id = auth.uid()
  and exists (
    select 1
    from public.assistant_sessions s
    where s.id = assistant_messages.session_id
      and s.user_id = auth.uid()
  )
);

-- 可选：删除测试会话
-- delete from public.assistant_messages
-- where session_id in (
--   select id from public.assistant_sessions where user_id = '替换成 auth.users.id'
-- );
-- delete from public.assistant_sessions where user_id = '替换成 auth.users.id';
