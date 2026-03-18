-- ============================================================
-- 016: 위험성평가 하위 테이블 — 수시평가(AI 사진분석) + 아차사고
-- ============================================================

-- ─── 수시평가 (사진 분석 기반) ───────────────────────────────
create table public.occasional_risk_assessments (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  doc_number       text,
  title            text not null default '',
  occasion_type    text not null default 'other'
    check (occasion_type in (
      'construction_change',  -- 건설물 설치·이전·변경·해체
      'equipment_new',        -- 기계·기구·설비·원재료 신규 도입·변경
      'maintenance',          -- 건설물·기계·기구·설비 정비·보수
      'method_change',        -- 작업방법·절차 신규 도입·변경
      'accident',             -- 중대산업사고·산업재해 발생
      'other'                 -- 그 밖에 사업주가 필요하다고 판단
    )),
  occasion_detail  text,       -- 수시평가 발생 사유 상세
  eval_date        date not null,
  work_location    text default '',

  -- 사진 업로드 (AI 분석)
  photos           jsonb not null default '[]',
  -- [{ url, file_name, ai_analyzed, analyzed_at }]

  -- AI 분석 + 사용자 수정 가능한 평가 항목
  risk_items       jsonb not null default '[]',
  -- [{
  --   seq, work_content,
  --   hazard_factor, hazard_type,
  --   photo_url,          ← 해당 사진 참조
  --   ai_generated,       ← AI가 생성한 원본
  --   -- 위험성 결정 (지침 제11조)
  --   probability, severity, risk_score, risk_level,
  --   -- 위험성 감소대책 (지침 제12조)
  --   measure_engineering, measure_admin, measure_ppe,
  --   measure_owner, measure_due_date, measure_done,
  --   user_edited         ← 사용자 수정 여부
  -- }]

  -- 참여자
  participants     jsonb not null default '[]',
  evaluator_name   text default '',
  approver_name    text default '',

  -- 공유·고지 (지침 제13조)
  shared_at        timestamptz,
  shared_method    text default '',   -- 게시판, TBM, 교육 등

  status           text not null default 'draft'
    check (status in ('draft','in_review','approved','archived')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_ora_company on public.occasional_risk_assessments(company_id);
create index idx_ora_date    on public.occasional_risk_assessments(eval_date desc);
create trigger trg_ora_upd before update on public.occasional_risk_assessments
  for each row execute function public.handle_updated_at();
alter table public.occasional_risk_assessments enable row level security;
create policy "ora select" on public.occasional_risk_assessments for select using (company_id = public.my_company_id());
create policy "ora insert" on public.occasional_risk_assessments for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "ora update" on public.occasional_risk_assessments for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "ora delete" on public.occasional_risk_assessments for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 아차사고 (Near-Miss) ────────────────────────────────────
create table public.near_miss_reports (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  doc_number       text,
  incident_date    date not null,
  incident_time    time,
  location         text not null default '',
  reporter_name    text default '',
  worker_count     integer default 1,
  description      text not null default '',   -- 발생 경위
  potential_injury text default '',             -- 예상 재해 형태
  photos           jsonb not null default '[]',
  hazard_factors   jsonb not null default '[]', -- 파악된 유해위험요인
  actions          jsonb not null default '[]', -- 즉시조치 사항
  -- 위험성평가 연계 여부
  linked_to_risk   boolean default false,
  linked_risk_id   uuid,
  status           text not null default 'open'
    check (status in ('open','in_review','closed')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_nm_company on public.near_miss_reports(company_id);
create trigger trg_nm_upd before update on public.near_miss_reports
  for each row execute function public.handle_updated_at();
alter table public.near_miss_reports enable row level security;
create policy "nm select" on public.near_miss_reports for select using (company_id = public.my_company_id());
create policy "nm insert" on public.near_miss_reports for insert with check (company_id = public.my_company_id());
create policy "nm update" on public.near_miss_reports for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "nm delete" on public.near_miss_reports for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
