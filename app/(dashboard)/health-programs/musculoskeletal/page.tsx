'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Users, ArrowLeft, Loader2, Calendar, AlertCircle, ChevronRight, Activity } from 'lucide-react'
import { clsx } from 'clsx'

const SURVEY_TYPE_CFG = {
  initial:   { label: '최초조사',   color: '#2563eb', bg: '#eff6ff',  desc: '신설 사업장 1년 이내' },
  regular:   { label: '정기조사',   color: '#16a34a', bg: '#f0fdf4',  desc: '3년마다 정기 실시' },
  immediate: { label: '수시조사',   color: '#dc2626', bg: '#fef2f2',  desc: '사유 발생 시 지체없이' },
}

export default function MusculoskeletalListPage() {
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health-programs/musculoskeletal')
      .then(r=>r.json()).then(j => { setItems(j.data??[]); setLoading(false) })
  }, [])

  const nextDueDate = (() => {
    if (!items.length) return null
    const latest = items.filter(i=>i.survey_type==='regular').sort((a,b)=>b.survey_date.localeCompare(a.survey_date))[0]
    if (!latest) return null
    const d = new Date(latest.survey_date)
    d.setFullYear(d.getFullYear() + 3)
    return d.toISOString().slice(0,10)
  })()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health-programs" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              근골격계 유해요인조사
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              안전보건기준에 관한 규칙 제12장 제657조 | 3년마다 정기조사 의무
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/health-programs/musculoskeletal/system"
            className="btn-primary text-sm gap-1.5" style={{ background: '#2563eb' }}>
            <Activity className="w-4 h-4" /> 조사 도구
          </Link>
          <Link href="/health-programs/musculoskeletal/new"
            className="btn-secondary text-sm gap-1.5">
            <Plus className="w-4 h-4" /> 기존 작성
          </Link>
        </div>
      </div>

      {/* 법적 안내 */}
      <div className="card p-4 mb-4 bg-blue-50/30 border-blue-100">
        <div className="text-xs font-semibold text-blue-700 mb-2">근골격계부담작업 유해요인조사 의무 (제657조)</div>
        <div className="grid grid-cols-3 gap-3 text-[10px] text-blue-600">
          {[
            ['정기조사', '근골격계부담작업을 하는 경우 3년마다 실시'],
            ['수시조사', '① 임시건강진단에서 질환자 발생 ② 새 작업·설비 도입 ③ 작업환경 변경'],
            ['예방관리프로그램', '연간 10명 이상 질환 인정 또는 발생비율 10% 이상 시 의무 시행'],
          ].map(([t,d]) => (
            <div key={t} className="p-2 bg-blue-50 rounded-lg">
              <div className="font-semibold mb-0.5">{t}</div>
              <div className="leading-relaxed opacity-80">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 다음 정기조사 D-day */}
      {nextDueDate && (
        <div className="card p-3 mb-4 flex items-center gap-3 border-amber-100 bg-amber-50/30">
          <Calendar className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-sm text-amber-700">
            다음 정기 유해요인조사 예정일: <strong>{nextDueDate}</strong>
            <span className="text-xs ml-2 opacity-70">(최근 정기조사 기준 3년 후)</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {Object.entries(SURVEY_TYPE_CFG).map(([k,v]) => (
          <div key={k} className="card p-3 flex items-center gap-3" style={{background:v.bg, borderColor:v.color+'20'}}>
            <div><div className="text-xl font-bold" style={{color:v.color}}>{items.filter(i=>i.survey_type===k).length}</div>
              <div className="text-[10px] text-gray-400">{v.label}</div></div>
            <div className="text-[10px] text-gray-400">{v.desc}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>유해요인조사 기록이 없습니다.</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link href="/health-programs/musculoskeletal/system"
                className="btn-primary text-sm inline-flex" style={{ background: '#2563eb' }}>
                <Activity className="w-4 h-4" /> 조사 도구
              </Link>
              <Link href="/health-programs/musculoskeletal/new"
                className="btn-secondary text-sm inline-flex">
                <Plus className="w-4 h-4" /> 기존 작성
              </Link>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['문서번호','조사 유형','부서·작업','조사일','부담작업 해당','개선계획','상태',''].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const sc = SURVEY_TYPE_CFG[item.survey_type as keyof typeof SURVEY_TYPE_CFG]
                const burdenCnt = (item.burden_work_check??[]).filter((c:any)=>c.is_applicable).length
                const improveCnt = (item.improvement_plan??[]).length
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:sc?.bg,color:sc?.color}}>{sc?.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{item.dept_name} / {item.work_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.survey_date}</td>
                    <td className="px-4 py-3 text-xs text-center">
                      <span className={clsx('px-2 py-0.5 rounded-full font-medium', burdenCnt>0?'bg-red-50 text-red-700':'bg-gray-50 text-gray-500')}>
                        {burdenCnt > 0 ? `${burdenCnt}가지 해당` : '해당없음'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-center">
                      {improveCnt > 0 ? <span className="text-blue-600">{improveCnt}건</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                        item.status==='completed'?'bg-green-50 text-green-700':item.status==='in_review'?'bg-blue-50 text-blue-700':'bg-amber-50 text-amber-700')}>
                        {item.status==='completed'?'완료':item.status==='in_review'?'검토 중':'작성 중'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/health-programs/musculoskeletal/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
