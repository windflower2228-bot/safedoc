'use client'
import Link from 'next/link'
import { Shield, ChevronRight, ClipboardCheck, FileText, SearchCheck, Users, BarChart3 } from 'lucide-react'

const ITEMS = [
  { href:'/subcontract/qualified-vendor', icon:BarChart3,    color:'#1d4ed8', bg:'#eff6ff', title:'적격 수급업체 선정 자료',          badge:'선정 전 필수', bc:'#eff6ff',bt:'#1d4ed8', desc:'산안법 제61조 | 수급인의 산재예방 능력 평가' },
  { href:'/subcontract/safety-info',      icon:FileText,     color:'#16a34a', bg:'#f0fdf4', title:'안전 및 보건에 관한 정보제공',       badge:'착공 전 필수', bc:'#f0fdf4',bt:'#15803d', desc:'산안법 제65조 | 유해·위험 정보 서면 제공' },
  { href:'/subcontract/inspection',       icon:SearchCheck,  color:'#d97706', bg:'#fffbeb', title:'작업장 순회점검일지',                badge:'2주 1회 이상', bc:'#fffbeb',bt:'#b45309', desc:'산안법 제64조 제1항 4호 | 도급인 순회점검 의무' },
  { href:'/subcontract/committee',        icon:Users,        color:'#7c3aed', bg:'#f5f3ff', title:'안전 및 보건에 관한 협의체',         badge:'월 1회 이상',  bc:'#f5f3ff',bt:'#6d28d9', desc:'산안법 제75조 | 도급인·수급인 합동 협의체' },
  { href:'/subcontract/joint-inspection', icon:ClipboardCheck,color:'#ea580c',bg:'#fff7ed', title:'도급사업의 합동안전보건점검',        badge:'분기 1회 이상',bc:'#fff7ed',bt:'#c2410c', desc:'산안법 제64조 제1항 6호 | 도급인·수급인 합동 점검' },
]

export default function SubcontractHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          도급사업 시 안전보건조치
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">산안법 제61조~제66조에서 정하는 도급인의 안전보건 의무사항을 관리합니다.</p>
      </div>
      <div className="card p-4 mb-5 border-orange-100 bg-orange-50/30">
        <p className="text-xs text-orange-700 leading-relaxed font-medium mb-1">도급인의 주요 의무사항 (산안법 제64조)</p>
        <p className="text-[11px] text-orange-600 leading-relaxed">
          도급인은 관계수급인 근로자가 도급인의 사업장에서 작업을 하는 경우 ① 도급인과 수급인을 구성원으로 하는 안전보건협의체를 구성·운영하고 ② 작업장을 순회점검하며 ③ 관계수급인이 하는 안전보건교육을 지원하고 ④ 위험성평가를 실시하여야 한다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {ITEMS.map(t => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href} className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:t.bg}}>
                  <Icon className="w-5 h-5" style={{color:t.color}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{t.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{background:t.bc,color:t.bt}}>{t.badge}</span>
                  </div>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1"/>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
