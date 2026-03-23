'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, ChevronRight, FileSearch, RefreshCw, Calendar,
  Activity, UsersRound, Lightbulb, BookOpen,
} from 'lucide-react'

const MENU_ITEMS = [
  { href:'/risk/initial',   icon:FileSearch, color:'#1d4ed8', bg:'#eff6ff', title:'최초 위험성평가',   badge:'제15조 제1항', desc:'사업 성립일(실착공일)로부터 1개월 이내 실시 | 전체 작업 대상', highlight:false },
  { href:'/risk/occasional',icon:RefreshCw,  color:'#dc2626', bg:'#fef2f2', title:'수시 위험성평가',   badge:'제15조 제2항', desc:'사진 업로드 AI 분석 + 수동입력 병행 | AI 결과에서 항목 선택 반영', highlight:true  },
  { href:'/risk/periodic',  icon:Calendar,   color:'#16a34a', bg:'#f0fdf4', title:'정기 위험성평가',   badge:'제15조 제3항', desc:'최초평가 후 매년 1회 전체 작업 재검토 | 설비 노후화·안전기준 변경 반영', highlight:false },
  { href:'/risk/constant',  icon:Activity,   color:'#7c3aed', bg:'#f5f3ff', title:'상시 위험성평가',   badge:'제15조 제4항', desc:'수동입력 + 이미지 AI 분석 지원 | AI 결과 선택 반영 후 상시평가 작성', highlight:false },
  { href:'/risk/tbm',       icon:UsersRound, color:'#6d28d9', bg:'#f5f3ff', title:'T.B.M',             badge:'작업 전 10분', desc:'위험성평가 핵심위험 자동 연계 | 사전 준비·실행·환류 체크 | 참석자 서명·출력', highlight:false },
  { href:'/risk/near-miss', icon:Lightbulb,  color:'#d97706', bg:'#fffbeb', title:'아차사고 보고',     badge:'제5조의2',     desc:'부상으로 이어질 뻔한 상황 기록 | 수시평가 트리거 | 위험성평가 자동 연계', highlight:false },
  { href:'/risk/regulation',icon:BookOpen,   color:'#0891b2', bg:'#ecfeff', title:'위험성평가 실시규정',badge:'제9조',        desc:'사전준비 단계 | 실시 범위·방법·주기·담당자 규정 | 근로자 참여 계획 수립', highlight:false },
]

export default function RiskHubPage() {
  const [counts, setCounts] = useState<Record<string,number>>({})
  useEffect(() => {
    fetch('/api/risk/occasional').then(r=>r.json()).then(j => setCounts(p => ({ ...p, occasional:(j.data??[]).length }))).catch(()=>{})
    fetch('/api/risk/near-miss').then(r=>r.json()).then(j => setCounts(p => ({ ...p, near_miss:(j.data??[]).filter((d:any)=>d.status==='open').length }))).catch(()=>{})
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600"/>위험성평가
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">산안법 제36조 / 사업장 위험성평가에 관한 지침 (고용노동부고시 제2024-76호)</p>
      </div>

      {/* 절차 흐름 */}
      <div className="card p-4 mb-5 bg-red-50/30 border-red-100">
        <div className="text-xs font-semibold text-red-700 mb-2">위험성평가 절차 (지침 제9조~제14조)</div>
        <div className="flex items-center gap-1.5 text-[10px] text-red-600 flex-wrap">
          {['사전준비','→','유해위험요인 파악','→','위험성 결정','→','감소대책 수립·실행','→','공유·고지','→','기록·보존 (3년)'].map((t,i) => (
            <span key={i} className={t==='→'?'text-red-300':'bg-red-100 px-2 py-0.5 rounded-full font-medium'}>{t}</span>
          ))}
        </div>
        <div className="mt-2 flex gap-3 text-[10px]">
          <Link href="/risk/list" className="text-blue-600 hover:underline">← 전체 위험성평가 목록 보기</Link>
          <Link href="/risk/new"  className="text-red-600 hover:underline">+ 새 위험성평가 작성 (빈도강도법)</Link>
          <Link href="/risk/method" className="text-purple-600 hover:underline">📋 평가방법 선택 (4가지)</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {MENU_ITEMS.map(item => {
          const Icon = item.icon
          const badge = item.href==='/risk/occasional' && counts.occasional ? `${counts.occasional}건` :
                        item.href==='/risk/near-miss' && counts.near_miss ? `미결 ${counts.near_miss}건` : null
          return (
            <Link key={item.href} href={item.href}
              className={`card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block ${item.highlight?'ring-2 ring-red-200':''}`}>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:item.bg}}>
                  <Icon className="w-5 h-5" style={{color:item.color}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{item.title}</span>
                    {item.highlight && <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold">AI 사진 분석</span>}
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{background:item.bg,color:item.color}}>{item.badge}</span>
                    {badge && <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
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
