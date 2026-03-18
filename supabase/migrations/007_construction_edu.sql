-- ============================================================
-- 007: 건설업 기초안전보건교육 이수증 관리 테이블
-- ============================================================

create table public.construction_edu_uploads (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  upload_date   date not null default current_date,
  image_url     text,
  image_name    text,
  note          text,
  author_id     uuid not null references public.user_profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table public.construction_edu_records (
  id            uuid primary key default uuid_generate_v4(),
  upload_id     uuid not null references public.construction_edu_uploads(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  -- OCR 인식 필드
  person_name       text not null default '',
  birth_date        text default '',   -- 생년월일 (텍스트로 보관 — 형식 다양)
  register_date     text default '',   -- 등록일자
  completion_date   text default '',   -- 이수일자
  -- 추가 메타
  course_name       text default '건설업 기초안전보건교육',
  issuer            text default '',
  raw_ocr_text      text,              -- OCR 원문 (디버그용)
  is_verified       boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_constr_edu_uploads_company on public.construction_edu_uploads(company_id);
create index idx_constr_edu_records_upload  on public.construction_edu_records(upload_id);
create index idx_constr_edu_records_company on public.construction_edu_records(company_id);

create trigger trg_constr_edu_uploads_updated_at
  before update on public.construction_edu_uploads
  for each row execute function public.handle_updated_at();

create trigger trg_constr_edu_records_updated_at
  before update on public.construction_edu_records
  for each row execute function public.handle_updated_at();

alter table public.construction_edu_uploads enable row level security;
alter table public.construction_edu_records enable row level security;

create policy "같은 회사 업로드 조회"
  on public.construction_edu_uploads for select
  using (company_id = public.my_company_id());
create policy "manager 이상 업로드"
  on public.construction_edu_uploads for insert
  with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "작성자·admin 수정"
  on public.construction_edu_uploads for update
  using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "admin 삭제"
  on public.construction_edu_uploads for delete
  using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

create policy "같은 회사 이수 기록 조회"
  on public.construction_edu_records for select
  using (company_id = public.my_company_id());
create policy "manager 이상 이수 기록 CRUD"
  on public.construction_edu_records for all
  using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
