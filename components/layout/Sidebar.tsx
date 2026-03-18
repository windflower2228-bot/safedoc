'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, AlertTriangle, Sparkles,
  BookOpen, HardDriveUpload, Users, UserCheck, Star, Briefcase,
  FileText as FT, SearchCheck, Shield, UsersRound,
  FlaskConical, Activity, Stethoscope, ClipboardCheck, Stamp, ShieldCheck,
  Users2, ScrollText, BarChart3, Wrench, ShieldAlert, Award, CheckSquare, HardHat, Layers,
  FileSearch, RefreshCw, Calendar, Lightbulb, Heart, Users2 as Users3, Wind, Ear,
  CalendarDays, History, Building2, UserCog,
  ChevronRight, ChevronDown, HeartPulse,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { UserProfile } from '@/types'

interface Props { profile: UserProfile & { company?: { name: string } } }

interface NavItem  { href: string; label: string; icon: any }
interface NavGroup {
  key: string; label: string; icon: any; color: string
  href?: string; children?: NavItem[]; section?: string
}

const NAV: NavGroup[] = [
  { key:'dash',        section:'메인',      label:'대시보드',         icon:LayoutDashboard, color:'#2563eb', href:'/dashboard' },
  {
    key:'risk', section:'핵심 문서', label:'위험성평가', icon:AlertTriangle, color:'#dc2626',
    href:'/risk',
    children:[
      { href:'/risk/initial',    label:'최초 위험성평가',   icon:FileSearch   },
      { href:'/risk/occasional', label:'수시 위험성평가',   icon:RefreshCw    },
      { href:'/risk/periodic',   label:'정기 위험성평가',   icon:Calendar     },
      { href:'/risk/constant',   label:'상시 위험성평가',   icon:Activity     },
      { href:'/risk/near-miss',  label:'아차사고 보고',     icon:Lightbulb    },
      { href:'/risk/regulation', label:'위험성평가 실시규정',icon:BookOpen     },
      { href:'/risk/method',     label:'평가방법 선택',        icon:CheckSquare  },
    ],
  },
  { key:'worklog',                           label:'작업일보 분석',     icon:Sparkles,        color:'#7c3aed', href:'/worklog' },
  {
    key:'safety-mgmt', section:'문서 관리', label:'안전보건관리체제', icon:ShieldCheck, color:'#1d4ed8',
    href:'/safety-management',
    children:[
      { href:'/safety-management/annual-report',         label:'연간 이사회 보고 및 승인',     icon:Activity   },
      { href:'/safety-management/responsibility-manager',label:'안전보건(총괄)관리책임자',      icon:Stamp      },
      { href:'/safety-management/supervisor',            label:'관리감독자',                   icon:Stamp      },
      { href:'/safety-management/safety-manager',        label:'안전관리자',                   icon:Stamp      },
      { href:'/safety-management/health-manager',        label:'보건관리자',                   icon:Stamp      },
      { href:'/safety-management/safety-health-officer', label:'안전보건관리담당자',            icon:Stamp      },
      { href:'/safety-management/industrial-physician',  label:'산업보건의',                   icon:Stamp      },
      { href:'/safety-management/honorary-inspector',    label:'명예산업안전감독관',            icon:Stamp      },
    ],
  },
  {
    key:'safety-committee', label:'산업안전보건위원회·노사협의체', icon:Users2, color:'#2563eb',
    href:'/safety-committee',
  },
  {
    key:'safety-regulation', label:'안전보건관리규정', icon:ScrollText, color:'#4338ca',
    href:'/safety-regulation',
  },
  {
    key:'education', label:'안전보건교육', icon:BookOpen, color:'#2563eb',
    href:'/documents/education',
    children:[
      { href:'/documents/construction-edu',             label:'건설업 기초안전보건교육',     icon:HardDriveUpload },
      { href:'/documents/education/regular-worker',     label:'근로자 정기안전보건교육',     icon:Users           },
      { href:'/documents/education/supervisor-regular', label:'관리감독자 정기안전보건교육', icon:UserCheck       },
      { href:'/documents/education/special-worker',     label:'근로자 특별안전보건교육',     icon:Star            },
      { href:'/documents/education/supervisor-special', label:'관리감독자 특별안전보건교육', icon:Briefcase       },
      { href:'/documents/education/new-hire',           label:'신규 채용 시 교육',           icon:FT              },
      { href:'/documents/education/job-change',         label:'작업내용 변경 시 교육',       icon:FT              },
      { href:'/documents/education/special-employment', label:'특수형태종사자 교육',         icon:FT              },
    ],
  },
    {
    key:'safety-measures', label:'안전조치', icon:HardHat, color:'#ea580c',
    href:'/safety-measures',
    children:[
      { href:'/safety-measures/ppe-ledger',         label:'보호구 지급대장',              icon:HardHat       },
      { href:'/safety-measures/supervisor-duties',  label:'관리감독자의 유해위험방지업무', icon:Shield        },
      { href:'/safety-measures/work-plan',          label:'사전조사 및 작업계획서',        icon:ClipboardCheck},
      { href:'/safety-measures/work-commander',     label:'작업지휘자·신호수·화재감시자 지정서', icon:Users2  },
      { href:'/safety-measures/structural-review',  label:'구조검토 및 조립상세도',        icon:Layers        },
    ],
  },
  {
    key:'subcontract', label:'도급사업 시 안전보건조치', icon:Shield, color:'#ea580c',
    href:'/subcontract',
    children:[
      { href:'/subcontract/qualified-vendor',  label:'적격 수급업체 선정 자료',             icon:BarChart3   },
      { href:'/subcontract/safety-info',       label:'안전 및 보건에 관한 정보제공',         icon:FT          },
      { href:'/subcontract/inspection',        label:'작업장 순회점검일지',                  icon:SearchCheck },
      { href:'/subcontract/committee',         label:'안전 및 보건에 관한 협의체',           icon:UsersRound  },
      { href:'/subcontract/joint-inspection',  label:'도급사업의 합동안전보건점검',     icon:Shield      },
      { href:'/subcontract/pre-work-inspection', label:'작업 시작 전 합동안전점검',           icon:Wrench      },
    ],
  },
  {
    key:'health-programs', section:'문서 관리', label:'보건조치', icon:Heart, color:'#e11d48',
    href:'/health-programs',
    children:[
      { href:'/health-programs/wellness',        label:'건강증진프로그램',      icon:Heart   },
      { href:'/health-programs/musculoskeletal', label:'근골격계 유해요인조사', icon:Users3  },
      { href:'/health-programs/confined-space',  label:'밀폐공간작업프로그램',  icon:Wind    },
      { href:'/health-programs/hearing',         label:'청력보존프로그램',      icon:Ear     },
      { href:'/health-programs/respiratory',     label:'호흡기보호프로그램',    icon:Wind   },
    ],
  },
  {
    key:'health', label:'보건관리', icon:HeartPulse, color:'#e11d48',
    href:'/health',
    children:[
      { href:'/health/msds',                   label:'MSDS 관리',      icon:FlaskConical  },
      { href:'/health/work-env',               label:'작업환경측정',   icon:Activity      },
      { href:'/health/health-check-general',   label:'일반건강진단',   icon:Stethoscope   },
      { href:'/health/health-check-placement', label:'배치전 건강진단',icon:Stethoscope   },
      { href:'/health/health-check-special',   label:'특수건강진단',   icon:Stethoscope   },
    ],
  },
  {
    key:'hazardous', label:'유해위험기계·기구', icon:ShieldAlert, color:'#dc2626',
    href:'/hazardous-machinery',
    children:[
      { href:'/hazardous-machinery/safety-cert',      label:'안전인증',     icon:Award         },
      { href:'/hazardous-machinery/voluntary-cert',   label:'자율안전확인', icon:CheckSquare   },
      { href:'/hazardous-machinery/safety-inspection',label:'안전검사',     icon:ClipboardCheck},
    ],
  },
  { key:'plan',    section:'일정·관리', label:'활동계획표',    icon:CalendarDays, color:'#ca8a04', href:'/plan'    },
  { key:'history',                       label:'문서 버전 이력', icon:History,      color:'#6366f1', href:'/history' },
  { key:'users',                         label:'사용자 관리',   icon:UserCog,      color:'#888',    href:'/users'   },
  { key:'company',                       label:'회사·현장 관리',icon:Building2,    color:'#888',    href:'/company' },
]

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()

  const initOpen = () => {
    const o: Record<string,boolean> = {}
    for (const g of NAV) {
      if (g.children) {
        if (g.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/')))
          o[g.key] = true
        else if (g.href && (pathname === g.href || pathname.startsWith(g.href + '/')))
          o[g.key] = true
      }
    }
    return o
  }
  const [open, setOpen] = useState<Record<string,boolean>>(initOpen)

  const isAct   = (href: string) => href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  const grpAct  = (g: NavGroup)  => (g.href && isAct(g.href)) || g.children?.some(c => isAct(c.href))

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 h-screen">
      {/* 로고 */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900 leading-none">SafeDoc</div>
          <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px] leading-none">
            {profile.company?.name ?? '안전보건관리'}
          </div>
        </div>
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-px">
        {NAV.map(g => {
          const Icon       = g.icon
          const hasKids    = !!(g.children?.length)
          const isExpanded = open[g.key] ?? false
          const active     = grpAct(g)

          return (
            <div key={g.key}>
              {/* 섹션 라벨 */}
              {g.section && (
                <p className="px-2 pt-3 pb-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                  {g.section}
                </p>
              )}

              {/* 행 */}
              {hasKids ? (
                <button onClick={() => setOpen(p => ({...p,[g.key]:!p[g.key]}))}
                  className={clsx('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all group',
                    active ? 'text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{background: active ? g.color+'18' : 'transparent'}}>
                    <Icon className="w-3.5 h-3.5" style={{color: active ? g.color : '#9ca3af'}}/>
                  </div>
                  <span className="flex-1 text-left truncate leading-tight">{g.label}</span>
                  {isExpanded
                    ? <ChevronDown className="w-3 h-3 text-gray-300 flex-shrink-0"/>
                    : <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0"/>}
                </button>
              ) : (
                <Link href={g.href!}
                  className={clsx('flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all',
                    isAct(g.href!) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{background: isAct(g.href!) ? g.color+'18' : 'transparent'}}>
                    <Icon className="w-3.5 h-3.5" style={{color: isAct(g.href!) ? g.color : '#9ca3af'}}/>
                  </div>
                  <span className="flex-1 truncate leading-tight">{g.label}</span>
                  {isAct(g.href!) && <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0"/>}
                </Link>
              )}

              {/* 하위 메뉴 */}
              {hasKids && isExpanded && (
                <div className="ml-3 pl-2.5 border-l border-gray-100 mt-0.5 mb-1 space-y-px">
                  {g.children!.map(c => {
                    const CI  = c.icon
                    const act = isAct(c.href)
                    return (
                      <Link key={c.href} href={c.href}
                        className={clsx('flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] transition-all leading-tight',
                          act ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800')}>
                        <CI className={clsx('w-3.5 h-3.5 flex-shrink-0', act ? 'text-blue-500' : 'text-gray-300')}/>
                        <span className="truncate">{c.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* 사용자 정보 */}
      <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue-700">{profile.name?.charAt(0) ?? '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-900 truncate">{profile.name}</div>
          <div className="text-[10px] text-gray-400 truncate">{profile.position}</div>
        </div>
      </div>
    </aside>
  )
}
