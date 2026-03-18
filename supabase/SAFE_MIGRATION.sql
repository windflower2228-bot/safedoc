-- SafeDoc 안전 마이그레이션 (이미 실행된 것 건너뜀)

-- 017: 위험성평가 4가지 방법 컬럼
ALTER TABLE public.risk_assessments
  ADD COLUMN IF NOT EXISTS eval_method    text DEFAULT 'matrix',
  ADD COLUMN IF NOT EXISTS matrix_size    integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS checklist_items  jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS three_level_items jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ops_items        jsonb DEFAULT '[]';

-- 018: 보건조치 5개 프로그램 테이블
CREATE TABLE IF NOT EXISTS public.wellness_programs (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number    text,
  title         text NOT NULL DEFAULT '',
  year          integer NOT NULL DEFAULT date_part('year', now())::integer,
  plan_items    jsonb NOT NULL DEFAULT '[]',
  participants_total integer DEFAULT 0,
  budget_total  integer DEFAULT 0,
  notes         text,
  status        text NOT NULL DEFAULT 'draft',
  author_id     uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.musculoskeletal_assessments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  survey_type     text NOT NULL DEFAULT 'regular',
  survey_date     date NOT NULL DEFAULT CURRENT_DATE,
  dept_name       text NOT NULL DEFAULT '',
  work_name       text NOT NULL DEFAULT '',
  burden_work_check jsonb NOT NULL DEFAULT '[]',
  basic_survey    jsonb NOT NULL DEFAULT '{}',
  symptom_survey  jsonb NOT NULL DEFAULT '[]',
  improvement_plan jsonb NOT NULL DEFAULT '[]',
  next_survey_date date,
  program_required boolean DEFAULT false,
  status          text NOT NULL DEFAULT 'draft',
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.confined_space_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  space_inventory jsonb NOT NULL DEFAULT '[]',
  work_procedures jsonb NOT NULL DEFAULT '[]',
  training_plan   jsonb NOT NULL DEFAULT '[]',
  emergency_plan  text DEFAULT '',
  equipment_list  jsonb NOT NULL DEFAULT '[]',
  effective_date  date,
  revision_date   date,
  status          text NOT NULL DEFAULT 'draft',
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.confined_space_permits (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  program_id      uuid REFERENCES public.confined_space_programs(id) ON DELETE SET NULL,
  permit_number   text,
  work_date       date NOT NULL DEFAULT CURRENT_DATE,
  work_time_start time,
  work_time_end   time,
  space_location  text NOT NULL DEFAULT '',
  work_content    text NOT NULL DEFAULT '',
  supervisor_name text DEFAULT '',
  workers         jsonb NOT NULL DEFAULT '[]',
  pre_checks      jsonb NOT NULL DEFAULT '[]',
  o2_level        numeric(5,1),
  co_level        numeric(6,1),
  h2s_level       numeric(6,1),
  is_approved     boolean DEFAULT false,
  approver_name   text DEFAULT '',
  notes           text,
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hearing_conservation_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  effective_date  date,
  noise_surveys   jsonb NOT NULL DEFAULT '[]',
  engineering_measures jsonb NOT NULL DEFAULT '[]',
  ppe_records     jsonb NOT NULL DEFAULT '[]',
  hearing_tests   jsonb NOT NULL DEFAULT '[]',
  education_records jsonb NOT NULL DEFAULT '[]',
  annual_review_date date,
  status          text NOT NULL DEFAULT 'draft',
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.respiratory_protection_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  effective_date  date,
  exposure_survey jsonb NOT NULL DEFAULT '[]',
  respirator_records jsonb NOT NULL DEFAULT '[]',
  fit_test_records jsonb NOT NULL DEFAULT '[]',
  maintenance_plan jsonb NOT NULL DEFAULT '[]',
  education_records jsonb NOT NULL DEFAULT '[]',
  annual_review_date date,
  status          text NOT NULL DEFAULT 'draft',
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 019: MSDS 법적 분류 + 경고표지 컬럼
ALTER TABLE public.msds_records
  ADD COLUMN IF NOT EXISTS legal_regulation_raw    text,
  ADD COLUMN IF NOT EXISTS legal_classification    jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hazard_label            jsonb DEFAULT '{}'::jsonb;

-- 019: 특별관리물질 취급일지
CREATE TABLE IF NOT EXISTS public.special_substance_logs (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  msds_id          uuid REFERENCES public.msds_records(id) ON DELETE SET NULL,
  work_date        date NOT NULL DEFAULT CURRENT_DATE,
  worker_name      text NOT NULL DEFAULT '',
  substance_name   text NOT NULL DEFAULT '',
  usage_amount     text NOT NULL DEFAULT '',
  work_content     text NOT NULL DEFAULT '',
  ppe_worn         text NOT NULL DEFAULT '',
  incident_content text DEFAULT '',
  incident_occurred boolean DEFAULT false,
  dept_name        text DEFAULT '',
  work_location    text DEFAULT '',
  work_duration    text DEFAULT '',
  cmr_types        text[] DEFAULT '{}',
  author_id        uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.special_substance_notices (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  msds_id          uuid REFERENCES public.msds_records(id) ON DELETE SET NULL,
  substance_name   text NOT NULL DEFAULT '',
  cmr_types        text[] DEFAULT '{}',
  notice_content   text DEFAULT '',
  posted_at        date DEFAULT CURRENT_DATE,
  posted_location  text DEFAULT '',
  notified_workers jsonb DEFAULT '[]',
  is_active        boolean DEFAULT true,
  html_content     text DEFAULT '',
  author_id        uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 020: 교육일지 근무형태 컬럼
ALTER TABLE public.education_journals
  ADD COLUMN IF NOT EXISTS worker_type text;

-- RLS 활성화 (IF NOT EXISTS 없으므로 오류 무시됨)
DO $$
BEGIN
  -- wellness_programs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wellness_programs' AND policyname='wellness_programs sel') THEN
    ALTER TABLE public.wellness_programs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "wellness_programs sel" ON public.wellness_programs FOR SELECT USING (company_id = public.my_company_id());
    CREATE POLICY "wellness_programs ins" ON public.wellness_programs FOR INSERT WITH CHECK (company_id = public.my_company_id());
    CREATE POLICY "wellness_programs upd" ON public.wellness_programs FOR UPDATE USING (company_id = public.my_company_id());
    CREATE POLICY "wellness_programs del" ON public.wellness_programs FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN ('super_admin','company_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='musculoskeletal_assessments' AND policyname='musculoskeletal_assessments sel') THEN
    ALTER TABLE public.musculoskeletal_assessments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "musculoskeletal_assessments sel" ON public.musculoskeletal_assessments FOR SELECT USING (company_id = public.my_company_id());
    CREATE POLICY "musculoskeletal_assessments ins" ON public.musculoskeletal_assessments FOR INSERT WITH CHECK (company_id = public.my_company_id());
    CREATE POLICY "musculoskeletal_assessments upd" ON public.musculoskeletal_assessments FOR UPDATE USING (company_id = public.my_company_id());
    CREATE POLICY "musculoskeletal_assessments del" ON public.musculoskeletal_assessments FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN ('super_admin','company_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='confined_space_programs' AND policyname='confined_space_programs sel') THEN
    ALTER TABLE public.confined_space_programs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "confined_space_programs sel" ON public.confined_space_programs FOR SELECT USING (company_id = public.my_company_id());
    CREATE POLICY "confined_space_programs ins" ON public.confined_space_programs FOR INSERT WITH CHECK (company_id = public.my_company_id());
    CREATE POLICY "confined_space_programs upd" ON public.confined_space_programs FOR UPDATE USING (company_id = public.my_company_id());
    CREATE POLICY "confined_space_programs del" ON public.confined_space_programs FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN ('super_admin','company_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hearing_conservation_programs' AND policyname='hearing_conservation_programs sel') THEN
    ALTER TABLE public.hearing_conservation_programs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "hearing_conservation_programs sel" ON public.hearing_conservation_programs FOR SELECT USING (company_id = public.my_company_id());
    CREATE POLICY "hearing_conservation_programs ins" ON public.hearing_conservation_programs FOR INSERT WITH CHECK (company_id = public.my_company_id());
    CREATE POLICY "hearing_conservation_programs upd" ON public.hearing_conservation_programs FOR UPDATE USING (company_id = public.my_company_id());
    CREATE POLICY "hearing_conservation_programs del" ON public.hearing_conservation_programs FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN ('super_admin','company_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='respiratory_protection_programs' AND policyname='respiratory_protection_programs sel') THEN
    ALTER TABLE public.respiratory_protection_programs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "respiratory_protection_programs sel" ON public.respiratory_protection_programs FOR SELECT USING (company_id = public.my_company_id());
    CREATE POLICY "respiratory_protection_programs ins" ON public.respiratory_protection_programs FOR INSERT WITH CHECK (company_id = public.my_company_id());
    CREATE POLICY "respiratory_protection_programs upd" ON public.respiratory_protection_programs FOR UPDATE USING (company_id = public.my_company_id());
    CREATE POLICY "respiratory_protection_programs del" ON public.respiratory_protection_programs FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN ('super_admin','company_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='special_substance_logs' AND policyname='special_substance_logs_sel') THEN
    ALTER TABLE public.special_substance_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "special_substance_logs_sel" ON public.special_substance_logs FOR SELECT USING (company_id = public.my_company_id());
    CREATE POLICY "special_substance_logs_ins" ON public.special_substance_logs FOR INSERT WITH CHECK (company_id = public.my_company_id());
    CREATE POLICY "special_substance_logs_upd" ON public.special_substance_logs FOR UPDATE USING (company_id = public.my_company_id());
    CREATE POLICY "special_substance_logs_del" ON public.special_substance_logs FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN ('super_admin','company_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='special_substance_notices' AND policyname='special_substance_notices_sel') THEN
    ALTER TABLE public.special_substance_notices ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "special_substance_notices_sel" ON public.special_substance_notices FOR SELECT USING (company_id = public.my_company_id());
    CREATE POLICY "special_substance_notices_ins" ON public.special_substance_notices FOR INSERT WITH CHECK (company_id = public.my_company_id());
    CREATE POLICY "special_substance_notices_upd" ON public.special_substance_notices FOR UPDATE USING (company_id = public.my_company_id());
    CREATE POLICY "special_substance_notices_del" ON public.special_substance_notices FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN ('super_admin','company_admin'));
  END IF;
END $$;

SELECT 'Migration complete!' as result;
