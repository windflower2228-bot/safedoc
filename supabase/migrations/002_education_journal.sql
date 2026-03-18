-- ============================================================
-- 002: 안전보건교육일지 테이블 추가
-- ============================================================

-- ─── 안전보건교육일지 헤더 ────────────────────────────────────

create table public.education_journals (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  project_id          uuid references public.projects(id) on delete set null,

  -- 소스 문서 (위험성평가 연계)
  source_risk_id      uuid references public.risk_assessments(id) on delete set null,
  link_type           text not null default 'manual'
                        check (link_type in ('auto_from_risk', 'manual')),

  -- 교육 기본정보
  title               text not null,
  edu_type            text not null default 'regular'
                        check (edu_type in (
                          'onboarding',   -- 채용 시 교육
                          'regular',      -- 정기교육
                          'special',      -- 특별교육
                          'job_specific', -- 작업내용 변경 교육
                          'accident',     -- 사고 후 교육
                          'other'
                        )),
  edu_date            date not null,
  edu_start_time      time,
  edu_end_time        time,
  edu_duration_hours  numeric(4,1),        -- 교육 시간 (시간)
  edu_location        text,

  -- 강사 정보
  instructor_name     text,
  instructor_position text,
  instructor_affil    text,                -- 소속기관

  -- 내용
  edu_content         text,               -- 교육 내용 요약
  edu_items           jsonb not null default '[]', -- 교육 항목 배열

  -- 참석자
  attendees           jsonb not null default '[]',
  attendee_count      integer default 0,

  -- 상태
  status              text not null default 'draft'
                        check (status in ('draft','completed','archived')),
  author_id           uuid not null references public.user_profiles(id),

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─── 교육일지 항목 (위험요인별 교육내용) ─────────────────────

-- edu_items JSON 스키마:
-- [
--   {
--     "seq": 1,
--     "source_risk_item_id": "uuid | null",   ← 위험성평가 항목 ID
--     "work_content":    "작업 내용",
--     "hazard_factor":   "유해·위험요인",
--     "hazard_type":     "fall | fire | ...",
--     "risk_level":      "high | medium | low",
--     "edu_point":       "교육 핵심 포인트",
--     "legal_basis":     "산업안전보건법 제○○조",
--     "countermeasure":  "감소대책 요약"
--   }
-- ]

-- ─── 참석자 JSON 스키마 ─────────────────────────────────────

-- attendees JSON 스키마:
-- [
--   {
--     "seq": 1,
--     "name": "홍길동",
--     "position": "용접공",
--     "department": "철골팀",
--     "sign": null   ← 서명 URL (추후)
--   }
-- ]

-- ─── 인덱스 ──────────────────────────────────────────────────

create index idx_education_journals_company    on public.education_journals(company_id);
create index idx_education_journals_risk       on public.education_journals(source_risk_id);
create index idx_education_journals_date       on public.education_journals(edu_date desc);
create index idx_education_journals_status     on public.education_journals(status);

-- ─── updated_at 트리거 ───────────────────────────────────────

create trigger trg_education_journals_updated_at
  before update on public.education_journals
  for each row execute function public.handle_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

alter table public.education_journals enable row level security;

create policy "같은 회사 교육일지 조회"
  on public.education_journals for select
  using (company_id = public.my_company_id());

create policy "manager 이상 교육일지 작성"
  on public.education_journals for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "작성자·admin이 수정"
  on public.education_journals for update
  using (
    company_id = public.my_company_id()
    and (
      author_id = auth.uid()
      or public.my_role() in ('super_admin','company_admin')
    )
  );

create policy "admin만 삭제"
  on public.education_journals for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );
