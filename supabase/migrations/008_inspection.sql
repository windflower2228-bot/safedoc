-- 008: 순회점검 + 합동점검 + 협의체 + 문서 버전 이력

-- 순회점검일지
create table public.inspections (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_risk_id uuid references public.risk_assessments(id) on delete set null,
  link_type text not null default 'manual' check (link_type in ('auto_from_risk','manual')),
  doc_number text,
  inspection_type text not null default 'routine' check (inspection_type in ('routine','special','safety_day')),
  inspection_date date not null,
  inspection_start time, inspection_end time,
  inspection_area text not null default '', weather text,
  inspector_name text not null default '', inspector_position text not null default '', inspector_dept text,
  check_items jsonb not null default '[]',
  overall_opinion text, follow_up_date date,
  status text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index idx_insp_company on public.inspections(company_id);
create index idx_insp_date on public.inspections(inspection_date desc);
create trigger trg_insp_upd before update on public.inspections for each row execute function public.handle_updated_at();
alter table public.inspections enable row level security;
create policy "insp select" on public.inspections for select using (company_id = public.my_company_id());
create policy "insp insert" on public.inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "insp update" on public.inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "insp delete" on public.inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- 합동안전보건점검
create table public.joint_inspections (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_risk_id uuid references public.risk_assessments(id) on delete set null,
  link_type text not null default 'manual' check (link_type in ('auto_from_risk','manual')),
  doc_number text,
  inspection_date date not null, inspection_area text not null default '',
  participants jsonb not null default '[]',
  risk_summary jsonb,
  check_items jsonb not null default '[]',
  improvement_items jsonb not null default '[]',
  overall_opinion text, follow_up_date date,
  status text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index idx_joint_company on public.joint_inspections(company_id);
create index idx_joint_date on public.joint_inspections(inspection_date desc);
create trigger trg_joint_upd before update on public.joint_inspections for each row execute function public.handle_updated_at();
alter table public.joint_inspections enable row level security;
create policy "joint select" on public.joint_inspections for select using (company_id = public.my_company_id());
create policy "joint insert" on public.joint_inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "joint update" on public.joint_inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "joint delete" on public.joint_inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- 안전보건협의체 회의록
create table public.committee_minutes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_risk_id uuid references public.risk_assessments(id) on delete set null,
  doc_number text,
  meeting_date date not null,
  meeting_start time, meeting_end time,
  meeting_place text not null default '',
  meeting_type text not null default 'regular' check (meeting_type in ('regular','extraordinary')),
  members jsonb not null default '[]',
  risk_performance jsonb,
  agenda_items jsonb not null default '[]',
  resolution text, next_meeting_date date,
  status text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index idx_committee_company on public.committee_minutes(company_id);
create index idx_committee_date on public.committee_minutes(meeting_date desc);
create trigger trg_committee_upd before update on public.committee_minutes for each row execute function public.handle_updated_at();
alter table public.committee_minutes enable row level security;
create policy "comm select" on public.committee_minutes for select using (company_id = public.my_company_id());
create policy "comm insert" on public.committee_minutes for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "comm update" on public.committee_minutes for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "comm delete" on public.committee_minutes for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- 문서 버전 이력
create table public.document_versions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null,
  doc_id uuid not null,
  doc_number text,
  version integer not null default 1,
  change_summary text not null default '',
  snapshot jsonb not null,
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now()
);
create index idx_docver_doc     on public.document_versions(doc_id);
create index idx_docver_company on public.document_versions(company_id);
create index idx_docver_type    on public.document_versions(doc_type, doc_id);
alter table public.document_versions enable row level security;
create policy "ver select" on public.document_versions for select using (company_id = public.my_company_id());
create policy "ver insert" on public.document_versions for insert with check (company_id = public.my_company_id());
