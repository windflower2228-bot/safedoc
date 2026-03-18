'use client'
import Link from 'next/link'
import { BookOpen, ChevronRight, FileText, Users, HardDriveUpload, UserCheck, Briefcase, Star } from 'lucide-react'

const EDU_TYPES = [
  {
    href:  '/documents/construction-edu',
    icon:  HardDriveUpload,
    color: '#ea580c',
    bg:    '#fff7ed',
    title: '건설업 기초안전보건교육',
    desc:  '이수증 사진 → AI OCR 자동 인식',
    badge: 'OCR 자동인식',
    badgeColor: '#fff7ed',
    badgeText: '#c2410c',
  },
  {
    href:  '/documents/education/regular-worker',
    icon:  Users,
    color: '#2563eb',
    bg:    '#eff6ff',
    title: '근로자 정기안전보건교육',
    desc:  '매 분기 실시 | 위험성평가 연계 자동 생성',
    badge: '분기 1회',
    badgeColor: '#eff6ff',
    badgeText: '#1d4ed8',
  },
  {
    href:  '/documents/education/supervisor-regular',
    icon:  UserCheck,
    color: '#7c3aed',
    bg:    '#f5f3ff',
    title: '관리감독자 정기안전보건교육',
    desc:  '반기별 실시 | 상용직 8h/반기 이상',
    badge: '반기 1회',
    badgeColor: '#f5f3ff',
    badgeText: '#6d28d9',
  },
  {
    href:  '/documents/education/special-worker',
    icon:  Star,
    color: '#dc2626',
    bg:    '#fef2f2',
    title: '근로자 특별안전보건교육',
    desc:  '상용직 16h / 일용직·단기간 2h 이상',
    badge: '작업 전 필수',
    badgeColor: '#fef2f2',
    badgeText: '#b91c1c',
  },
  {
    href:  '/documents/education/supervisor-special',
    icon:  Briefcase,
    color: '#b45309',
    bg:    '#fffbeb',
    title: '관리감독자 특별안전보건교육',
    desc:  '유해·위험 작업 관리감독자 대상',
    badge: '작업 전 필수',
    badgeColor: '#fffbeb',
    badgeText: '#92400e',
  },
  {
    href:  '/documents/education/new-hire',
    icon:  FileText,
    color: '#16a34a',
    bg:    '#f0fdf4',
    title: '신규 채용 시 교육',
    desc:  '상용직 8h / 일용직 1h / 단기간 2h 이상',
    badge: '채용 즉시',
    badgeColor: '#f0fdf4',
    badgeText: '#15803d',
  },
  {
    href:  '/documents/education/job-change',
    icon:  FileText,
    color: '#0891b2',
    bg:    '#ecfeff',
    title: '작업내용 변경 시 교육',
    desc:  '상용직 2h / 일용직 1h 이상',
    badge: '변경 즉시',
    badgeColor: '#ecfeff',
    badgeText: '#0e7490',
  },
  {
    href:  '/documents/education/special-employment',
    icon:  Users,
    color: '#6366f1',
    bg:    '#eef2ff',
    title: '특수형태종사자 교육',
    desc:  '최초 노무제공 시 · 특수형태근로종사자',
    badge: '최초 제공 시',
    badgeColor: '#eef2ff',
    badgeText: '#4338ca',
  },
]

export default function EducationHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          안전보건교육
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          산업안전보건법에서 정하는 모든 교육 유형을 관리합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {EDU_TYPES.map((t) => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}
              className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.bg }}>
                  <Icon className="w-5 h-5" style={{ color: t.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {t.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: t.badgeColor, color: t.badgeText }}>
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{t.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
