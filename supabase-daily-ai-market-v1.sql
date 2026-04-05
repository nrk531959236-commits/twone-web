create extension if not exists pgcrypto;

create table if not exists public.daily_ai_market_analyses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  analysis_date date not null unique,
  publish_at_jst timestamptz not null,
  status text not null check (status in ('draft', 'scheduled', 'published')) default 'draft',
  source text not null check (source in ('manual-seed', 'admin', 'auto')) default 'admin',
  payload jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists daily_ai_market_analyses_status_publish_idx
  on public.daily_ai_market_analyses (status, publish_at_jst desc);

create or replace function public.set_daily_ai_market_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_daily_ai_market_analyses_updated_at on public.daily_ai_market_analyses;
create trigger trg_daily_ai_market_analyses_updated_at
before update on public.daily_ai_market_analyses
for each row
execute function public.set_daily_ai_market_updated_at();

alter table public.daily_ai_market_analyses enable row level security;

create policy "public can read published daily ai market analyses"
  on public.daily_ai_market_analyses
  for select
  to anon, authenticated
  using (status = 'published');

comment on table public.daily_ai_market_analyses is
  'Twone 每日 AI 行情分析正式数据源。首页 / API 读取最新 published，后台或定时任务写入。';
