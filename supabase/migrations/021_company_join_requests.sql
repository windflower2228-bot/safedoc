-- 회사 합류 신청(관리자 승인형) 워크플로우

create table if not exists public.company_join_requests (
  id                    uuid primary key default uuid_generate_v4(),
  company_id            uuid not null references public.companies(id) on delete cascade,
  user_id               uuid not null references public.user_profiles(id) on delete cascade,
  requester_email       text not null,
  requester_name        text not null,
  requester_position    text not null default '',
  requester_department  text,
  requester_phone       text,
  requested_role        text not null default 'viewer'
                          check (requested_role in ('company_admin','manager','viewer')),
  status                text not null default 'pending'
                          check (status in ('pending','approved','rejected','cancelled')),
  requested_at          timestamptz not null default now(),
  reviewed_at           timestamptz,
  reviewed_by           uuid references public.user_profiles(id),
  reviewer_memo         text
);

create index if not exists idx_company_join_requests_company_status
  on public.company_join_requests(company_id, status, requested_at desc);

create index if not exists idx_company_join_requests_user_status
  on public.company_join_requests(user_id, status, requested_at desc);

create unique index if not exists uq_company_join_requests_pending
  on public.company_join_requests(company_id, user_id)
  where status = 'pending';

alter table public.company_join_requests enable row level security;

create policy "관리자는 같은 회사 신청 조회"
  on public.company_join_requests for select
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin', 'company_admin')
  );

create policy "관리자는 같은 회사 신청 상태 변경"
  on public.company_join_requests for update
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin', 'company_admin')
  );
