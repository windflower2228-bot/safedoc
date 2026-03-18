-- ============================================================
-- 018: 보건조치 5개 프로그램 테이블
-- ============================================================

-- ─── 공통 HELPER ─────────────────────────────────────────────
-- ─── 1. 건강증진프로그램 ──────────────────────────────────────
CREATE TABLE public.wellness_programs (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number    text,
  title         text NOT NULL DEFAULT '',
  year          integer NOT NULL DEFAULT date_part('year', now())::integer,
  plan_items    jsonb NOT NULL DEFAULT '[]',
  -- [{seq, category, program_name, target, start_date, end_date, budget, responsible, status, results}]
  participants_total integer DEFAULT 0,
  budget_total  integer DEFAULT 0,
  notes         text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  author_id     uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ─── 2. 근골격계 유해요인조사 ────────────────────────────────
CREATE TABLE public.musculoskeletal_assessments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  survey_type     text NOT NULL DEFAULT 'regular' CHECK (survey_type IN ('initial','regular','immediate')),
  -- initial: 최초(신설 1년 이내), regular: 정기(3년마다), immediate: 수시
  survey_date     date NOT NULL,
  dept_name       text NOT NULL DEFAULT '',
  work_name       text NOT NULL DEFAULT '',
  -- 부담작업 해당 여부 체크 (11가지)
  burden_work_check jsonb NOT NULL DEFAULT '[]',
  -- [{seq, description, is_applicable, work_hours_per_day, notes}]
  -- 유해요인 기본조사
  basic_survey    jsonb NOT NULL DEFAULT '{}',
  -- {work_situation:{equipment,process,volume,speed}, work_condition:{time,posture,method}, symptoms_present:bool}
  -- 증상 조사
  symptom_survey  jsonb NOT NULL DEFAULT '[]',
  -- [{worker_name, dept, age, sex, career_years, body_parts:[{part,pain_level,frequency,duration}], special_note}]
  -- 작업환경 개선계획
  improvement_plan jsonb NOT NULL DEFAULT '[]',
  -- [{priority, target_work, hazard, measure, responsible, due_date, done, result}]
  next_survey_date date,
  program_required boolean DEFAULT false,  -- 예방관리프로그램 시행 필요 여부
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','completed','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 3. 밀폐공간작업프로그램 ─────────────────────────────────
CREATE TABLE public.confined_space_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  -- 사업장 내 밀폐공간 목록 (제619조 제1호)
  space_inventory jsonb NOT NULL DEFAULT '[]',
  -- [{seq, location, space_type, hazard_gases, access_type, last_inspection, is_prohibited}]
  -- 작업별 안전확인 절차 (제619조 제3호)
  work_procedures jsonb NOT NULL DEFAULT '[]',
  -- [{work_id, space_location, work_content, o2_check, gas_check, ventilation, supervisor, watchers, ppe}]
  -- 교육훈련 계획 (제619조 제4호)
  training_plan   jsonb NOT NULL DEFAULT '[]',
  -- [{training_date, type, target, content, instructor, attendees_count, done}]
  -- 긴급구조계획
  emergency_plan  text DEFAULT '',
  equipment_list  jsonb NOT NULL DEFAULT '[]',
  -- [{name, qty, location, inspection_date, condition}] - 측정기·환기장치·구조장비
  effective_date  date,
  revision_date   date,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 밀폐공간 작업허가서 (별도 운영기록) ───────────────────────
CREATE TABLE public.confined_space_permits (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  program_id      uuid REFERENCES public.confined_space_programs(id) ON DELETE SET NULL,
  permit_number   text,
  work_date       date NOT NULL,
  work_time_start time,
  work_time_end   time,
  space_location  text NOT NULL DEFAULT '',
  work_content    text NOT NULL DEFAULT '',
  supervisor_name text DEFAULT '',
  workers         jsonb NOT NULL DEFAULT '[]',
  -- [{name, position, ppe_checked}]
  pre_checks      jsonb NOT NULL DEFAULT '[]',
  -- [{item, result, value, pass}] - 산소/가스 농도, 환기상태 등
  o2_level        numeric(5,1),    -- 산소 농도 %
  co_level        numeric(6,1),    -- CO 농도 ppm
  h2s_level       numeric(6,1),    -- H2S 농도 ppm
  is_approved     boolean DEFAULT false,
  approver_name   text DEFAULT '',
  notes           text,
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 4. 청력보존프로그램 ─────────────────────────────────────
CREATE TABLE public.hearing_conservation_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  effective_date  date,
  -- 소음 노출 현황 (노출 평가)
  noise_surveys   jsonb NOT NULL DEFAULT '[]',
  -- [{dept, work_name, measurement_date, twae_db, max_db, is_over_85, is_over_90, action_required}]
  -- 공학적 대책 (안전보건규칙 제513조)
  engineering_measures jsonb NOT NULL DEFAULT '[]',
  -- [{location, current_db, measure_type, measure_content, expected_db, responsible, due_date, done}]
  -- 청력보호구 지급 현황
  ppe_records     jsonb NOT NULL DEFAULT '[]',
  -- [{dept, worker_count, ppe_type, ppe_spec, issued_date, snr_db, notes}]
  -- 정기 청력검사 결과 (특수건강진단)
  hearing_tests   jsonb NOT NULL DEFAULT '[]',
  -- [{test_date, test_agency, worker_count, d1_count, d2_count, c1_count, c2_count, action_taken}]
  -- 교육 기록
  education_records jsonb NOT NULL DEFAULT '[]',
  -- [{date, type, target_dept, content, instructor, attendee_count, done}]
  annual_review_date date,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 5. 호흡기보호프로그램 ───────────────────────────────────
CREATE TABLE public.respiratory_protection_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  effective_date  date,
  -- 유해물질·분진 노출 현황
  exposure_survey jsonb NOT NULL DEFAULT '[]',
  -- [{dept, work_name, hazard_name, cas_no, measurement_date, concentration, twa, stel, is_over_limit, action}]
  -- 호흡용 보호구 선정 및 지급
  respirator_records jsonb NOT NULL DEFAULT '[]',
  -- [{work_type, hazard, respirator_type, filter_type, protection_factor, issued_to_dept, qty, issued_date, kcs_no}]
  -- 밀착도 검사 (Fit Test)
  fit_test_records jsonb NOT NULL DEFAULT '[]',
  -- [{worker_name, dept, date, respirator_type, test_method, result, next_test_date}]
  -- 점검 및 유지관리 계획
  maintenance_plan jsonb NOT NULL DEFAULT '[]',
  -- [{check_type, frequency, responsible, last_date, next_date, notes}]
  -- 교육 기록
  education_records jsonb NOT NULL DEFAULT '[]',
  annual_review_date date,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 트리거 & RLS ─────────────────────────────────────────────
DO $$ 
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wellness_programs','musculoskeletal_assessments',
    'confined_space_programs','confined_space_permits',
    'hearing_conservation_programs','respiratory_protection_programs'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t, t);
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s sel" ON public.%s FOR SELECT USING (company_id = public.my_company_id())', t, t);
    EXECUTE format('CREATE POLICY "%s ins" ON public.%s FOR INSERT WITH CHECK (company_id = public.my_company_id() AND public.my_role() IN (''super_admin'',''company_admin'',''manager''))', t, t);
    EXECUTE format('CREATE POLICY "%s upd" ON public.%s FOR UPDATE USING (company_id = public.my_company_id() AND (author_id = auth.uid() OR public.my_role() IN (''super_admin'',''company_admin'')))', t, t);
    EXECUTE format('CREATE POLICY "%s del" ON public.%s FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN (''super_admin'',''company_admin''))', t, t);
  END LOOP;
END $$;

-- 인덱스
CREATE INDEX idx_wp_company  ON public.wellness_programs(company_id);
CREATE INDEX idx_msa_company ON public.musculoskeletal_assessments(company_id);
CREATE INDEX idx_csp_company ON public.confined_space_programs(company_id);
CREATE INDEX idx_permit_company ON public.confined_space_permits(company_id);
CREATE INDEX idx_hcp_company ON public.hearing_conservation_programs(company_id);
CREATE INDEX idx_rpp_company ON public.respiratory_protection_programs(company_id);
