-- ============================================================
-- 014: 유해위험기계 — 안전인증·자율안전확인 인증서, 안전검사 관리
-- ============================================================

-- ─── 인증서 (안전인증 + 자율안전확인 통합) ──────────────────
create table public.machinery_certificates (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  cert_type        text not null check (cert_type in ('safety_cert','voluntary_cert')),
  -- safety_cert: 안전인증(KCs), voluntary_cert: 자율안전확인신고(KCs)
  machine_category text not null default '',   -- 기계·기구 분류
  machine_name     text not null default '',   -- 기계명
  model_no         text,                       -- 모델·형식번호
  manufacturer     text,                       -- 제조사
  cert_no          text not null default '',   -- 인증번호
  cert_date        date,                       -- 인증일
  expiry_date      date,                       -- 유효기간 (해당 시)
  file_url         text,                       -- 업로드된 인증서 파일 URL
  file_name        text,                       -- 원본 파일명
  file_size        integer,                    -- 파일 크기 (bytes)
  notes            text,
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_mcert_company   on public.machinery_certificates(company_id);
create index idx_mcert_type      on public.machinery_certificates(cert_type);
create trigger trg_mcert_upd before update on public.machinery_certificates
  for each row execute function public.handle_updated_at();
alter table public.machinery_certificates enable row level security;
create policy "mcert select" on public.machinery_certificates for select using (company_id = public.my_company_id());
create policy "mcert insert" on public.machinery_certificates for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "mcert update" on public.machinery_certificates for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "mcert delete" on public.machinery_certificates for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 안전검사 대상 기계 등록 및 검사이력 ─────────────────────
create table public.safety_inspections (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  machine_type        text not null,         -- 법정 기계 종류 코드
  machine_name        text not null default '', -- 기계명 (사업장 내 식별명)
  model_no            text,
  serial_no           text,
  manufacturer        text,
  install_date        date,                  -- 설치(최초등록)일
  location            text,                  -- 설치 위치
  is_applicable       boolean not null default true,  -- 해당 사업장 보유 여부
  inapplicable_reason text,                  -- 해당 없음 사유

  -- 검사 이력 (array of jsonb)
  inspection_records  jsonb not null default '[]',
  -- [{ seq, inspection_date, result('pass'|'fail'|'conditional'), cert_no, agency, next_due_date, notes }]

  -- 계산된 값 (latest)
  last_inspection_date date,
  next_due_date        date,
  inspection_cycle     text,                 -- '6개월' | '1년' | '2년' | '4년'
  inspection_status    text not null default 'pending'
    check (inspection_status in ('pending','valid','expiring_soon','overdue','inapplicable')),

  -- 활동계획표 연계
  plan_item_id         uuid references public.activity_plans(id) on delete set null,
  notes                text,
  author_id            uuid not null references public.user_profiles(id),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create index idx_si_company on public.safety_inspections(company_id);
create index idx_si_type    on public.safety_inspections(machine_type);
create index idx_si_status  on public.safety_inspections(inspection_status);
create trigger trg_si_upd before update on public.safety_inspections
  for each row execute function public.handle_updated_at();
alter table public.safety_inspections enable row level security;
create policy "si select" on public.safety_inspections for select using (company_id = public.my_company_id());
create policy "si insert" on public.safety_inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "si update" on public.safety_inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "si delete" on public.safety_inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
