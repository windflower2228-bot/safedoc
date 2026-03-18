-- ============================================================
-- 013: 작업 시작 전 합동안전점검 (산안법 시행령 제66조 + 시행규칙 제94조)
-- ============================================================

-- 점검표 마스터
create table public.pre_work_inspections (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  doc_number        text,

  -- 기본 정보
  machine_type      text not null,   -- 기계·기구 종류 (시행령 제66조 각호)
  machine_type_code text not null,   -- tower_crane | excavator | pile_driver | aerial_work | lift | concrete_pump | cargo_hoist | demolition | other
  machine_name      text not null,   -- 기계명 (예: 타워크레인 TC-600)
  machine_model     text,            -- 모델/형식
  machine_serial    text,            -- 제조번호·등록번호
  machine_capacity  text,            -- 정격하중·최대작업높이 등
  safety_cert_no    text,            -- 안전검사 합격번호
  safety_cert_expiry date,           -- 안전검사 유효기간

  -- 점검 일시·장소
  inspection_date   date not null,
  inspection_time   time,
  work_location     text not null,   -- 작업 위치·구역
  work_description  text,            -- 작업 내용

  -- 참여자
  participants      jsonb not null default '[]',
  -- [{ seq, name, position, affiliation, role('owner'|'lessee'|'contractor'|'worker'), sign }]
  -- owner: 소유자, lessee: 임차인/대여자, contractor: 도급인, worker: 작업자

  -- 점검 항목 (기계별 커스터마이징)
  check_items       jsonb not null default '[]',
  -- [{ seq, category, item, result('pass'|'fail'|'na'), defect_detail, action_required, is_resolved }]

  -- 작업계획서 확인
  work_plan_exists         boolean default false,   -- 작업계획서 작성 여부
  worker_qualification_ok  boolean default false,   -- 자격·면허 확인 여부
  work_plan_confirmed_by   text,                   -- 확인자

  -- 작업 중지 여부
  work_stopped      boolean default false,
  stop_reason       text,

  overall_opinion   text,
  follow_up_date    date,
  status            text not null default 'draft'
    check (status in ('draft','completed','archived')),
  author_id         uuid not null references public.user_profiles(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_pwi_company on public.pre_work_inspections(company_id);
create index idx_pwi_date    on public.pre_work_inspections(inspection_date desc);
create index idx_pwi_type    on public.pre_work_inspections(machine_type_code);

create trigger trg_pwi_upd before update on public.pre_work_inspections
  for each row execute function public.handle_updated_at();

alter table public.pre_work_inspections enable row level security;
create policy "pwi select" on public.pre_work_inspections for select using (company_id = public.my_company_id());
create policy "pwi insert" on public.pre_work_inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "pwi update" on public.pre_work_inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "pwi delete" on public.pre_work_inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
