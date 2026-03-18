# SafeDoc v6 — 산업안전보건 문서 통합관리 플랫폼

> 위험성평가를 허브로 삼아 교육일지·작업계획서·점검일지·협의체까지  
> 자동 연계·생성·출력하는 한국 현장 실무 전용 SaaS + PWA

---

## 빠른 시작

```bash
unzip SafeDoc_v6_최종.zip && cd safedoc
npm install
cp .env.example .env.local   # 값 입력
npm run dev  →  http://localhost:3000
```

**DB 마이그레이션** — Supabase SQL Editor에서 001 → 009 순서대로 실행

**Supabase Storage 버킷** (대시보드 → Storage → New bucket):
- `msds-files` (비공개)
- `edu-certificates` (비공개)
- `company-assets` (공개) ← 로고용

---

## 전체 기능 (v6 최종)

### 핵심 문서
| 기능 | 설명 | 출력 |
|------|------|------|
| 위험성평가 (허브) | 4종·위험도 자동계산·승인 워크플로·모든 문서 자동 연계 | XLSX |
| 작업일보 분석 (NEW) | Claude AI 공종 감지·안전서류 자동 추천 | — |

### 안전보건교육
| 기능 | 설명 | 출력 |
|------|------|------|
| 안전보건교육일지 | 위험성평가·MSDS 자동 연계 생성 | XLSX |
| 건설업 기초안전보건교육 | 이수증 사진 → OCR 자동 리스트업 | CSV |

### 현장 점검·회의
| 기능 | 설명 | 출력 |
|------|------|------|
| 순회점검일지 | 위험성평가 연계·高위험 자동 불량 설정 | XLSX |
| 합동안전보건점검 | 위험성평가 운영 실적·개선 요구사항 연계 | XLSX |
| 안전보건협의체 회의록 | 위험성평가 실적 자동 의안 생성 | — |

### 문서·서류 관리
| 기능 | 설명 | 출력 |
|------|------|------|
| MSDS 관리대장 | GHS 9종·파일 업로드·교육일지 변환 | — |
| 지정서·선임서 | 8종 직위·법령 자동 입력·PDF | PDF |
| 작업계획서 | 감소대책 자동 반영·체크리스트 10종 | XLSX |

### 일정·시스템
| 기능 | 설명 |
|------|------|
| 활동계획표 | 달력+월간+연간 3뷰·D-day·카카오 알림톡 |
| 문서 버전 이력 (NEW) | 전체 문서 수정 이력 자동 기록·스냅샷 |
| 회사 로고·설정 (NEW) | 로고 업로드·문서 헤더 자동 반영 |
| 모바일 PWA (NEW) | 홈 화면 추가·오프라인·하단 네비 |
| 사용자 관리 | 초대·권한·활성/비활성 |

---

## 문서 자동 연계 구조

```
작업일보 (텍스트)
  └─► Claude AI → 공종 분석 → 위험성평가·교육·계획서 자동 추천

위험성평가 (허브)
  ├─► 안전보건교육일지  자동 생성
  ├─► 작업계획서        자동 생성
  ├─► 순회점검일지      고위험→불량 자동 설정
  ├─► 합동안전보건점검  운영 실적 연계
  ├─► 안전보건협의체    운영 실적 의안 자동 생성
  └─► 활동계획표        이행여부 자동 체크

MSDS → 교육일지 1클릭 변환
이수증 사진 → OCR → 인라인 편집·CSV
모든 문서 수정 → 버전 이력 자동 저장
회사 로고 → 모든 출력물 헤더 자동 반영
```

---

## API 전체 목록

| 경로 | 기능 |
|------|------|
| `GET/PATCH /api/company` | 회사 정보·로고 조회·수정 |
| `POST /api/worklog/analyze` | 작업일보 Claude AI 분석 |
| `GET /api/worklog` | 작업일보 분석 이력 |
| `GET/POST /api/documents/inspection` | 순회점검 목록·생성 |
| `POST /api/documents/inspection/generate` | 위험성평가→순회점검 초안 |
| `GET/POST /api/documents/joint-inspection` | 합동점검 목록·생성 |
| `GET/POST /api/documents/committee` | 협의체 회의록 목록·생성 |
| `GET /api/history` | 문서 버전 이력 목록 |
| `GET /api/history/:id` | 버전 스냅샷 상세 |
| `POST /api/documents/construction-edu/ocr` | 이수증 Claude Vision OCR |
| `GET /api/cron/reminders` | D-day 알림 Cron |

---

## 환경변수 (.env.local)

```bash
# 필수
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ANTHROPIC_API_KEY=         # 작업일보 분석·이수증 OCR

# 이메일 알림
RESEND_API_KEY=
EMAIL_FROM=SafeDoc <noreply@yourdomain.com>

# 카카오 알림톡 (선택)
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER_PHONE=
KAKAO_SENDER_KEY=
KAKAO_PF_ID=
KAKAO_ACTIVITY_TEMPLATE_ID=

# Cron 보안
CRON_SECRET=
```

---

## DB 마이그레이션 순서

```
001_initial_schema.sql      ← 핵심 테이블·RLS (반드시 먼저)
002_education_journal.sql
003_work_plan.sql
004_designation.sql
005_activity_plan.sql
006_msds.sql
007_construction_edu.sql
008_inspection.sql          ← 순회점검·합동점검·협의체·버전이력
009_company_logo_worklog.sql ← 로고·작업일보 분석
```

---

## 배포 (Vercel)

```bash
npm i -g vercel && vercel --prod
# Supabase Auth → Site URL: https://your-app.vercel.app
```

## 모바일 PWA 설치

- **Android**: Chrome → 메뉴 → "홈 화면에 추가"
- **iOS**: Safari → 공유 → "홈 화면에 추가"
- 오프라인에서도 이전 페이지·API 캐시 활용 가능

---

© 2025 SafeDoc — Built with Claude
