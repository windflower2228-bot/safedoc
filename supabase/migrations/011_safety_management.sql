-- ============================================================
-- 011: 안전보건관리체제 문서 + 연간 이사회 보고
-- ============================================================

create table public.safety_documents (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  role_id          text not null,
  doc_type         text not null default '지정서',
  doc_number       text,
  person_name      text not null default '',
  person_affiliation text not null default '',
  person_position  text not null default '',
  person_dept      text not null default '',
  person_contact   text,
  legal_basis      text not null default '',
  duties           jsonb not null default '[]',
  work_scope       text,
  effective_date   date not null,
  expiry_date      date,
  issuer_name      text not null default '',
  issuer_position  text not null default '',
  issuer_company   text not null default '',
  status           text not null default 'active' check (status in ('active','expired','revoked')),
  notes            text,
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_sdoc_company on public.safety_documents(company_id);
create index idx_sdoc_role    on public.safety_documents(role_id);
create index idx_sdoc_status  on public.safety_documents(status);
create trigger trg_sdoc_upd before update on public.safety_documents
  for each row execute function public.handle_updated_at();
alter table public.safety_documents enable row level security;
create policy "sdoc select" on public.safety_documents for select using (company_id = public.my_company_id());
create policy "sdoc insert" on public.safety_documents for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "sdoc update" on public.safety_documents for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "sdoc delete" on public.safety_documents for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 연간 이사회 보고 ─────────────────────────────────────────
create table public.board_reports (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  doc_number      text,
  report_year     integer not null,
  report_date     date not null,
  meeting_type    text not null default 'board' check (meeting_type in ('board','audit','general')),
  agenda_items    jsonb not null default '[]',
  -- [{ seq, title, content, resolution, attachments }]
  safety_plan_summary     text,  -- 안전보건 계획 요약
  investment_budget       integer,  -- 안전보건 투자 예산 (원)
  accident_stats          jsonb,    -- 재해 통계
  approval_status         text not null default 'draft' check (approval_status in ('draft','approved','rejected')),
  approver_name           text,
  approved_at             timestamptz,
  status          text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id       uuid not null references public.user_profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_board_company on public.board_reports(company_id);
create index idx_board_year    on public.board_reports(report_year desc);
create trigger trg_board_upd before update on public.board_reports
  for each row execute function public.handle_updated_at();
alter table public.board_reports enable row level security;
create policy "board select" on public.board_reports for select using (company_id = public.my_company_id());
create policy "board insert" on public.board_reports for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "board update" on public.board_reports for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "board delete" on public.board_reports for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
