-- Twone member_applications review status v1
-- Run once in Supabase SQL editor.

alter table public.member_applications
  add column if not exists review_status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;

update public.member_applications
set review_status = 'pending'
where review_status is null;

alter table public.member_applications
  drop constraint if exists member_applications_review_status_check;

alter table public.member_applications
  add constraint member_applications_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));

create index if not exists member_applications_review_status_idx
  on public.member_applications (review_status, created_at desc);
