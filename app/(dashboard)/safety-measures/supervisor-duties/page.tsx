'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Shield, Plus, ArrowLeft, Loader2, Search,
  AlertTriangle, CheckCircle2, Printer, FileDown,
  ChevronDown, ChevronUp, Link2, RefreshCw,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  SUPERVISOR_DUTY_TABLE, CATEGORY_LABELS, matchDutiesByKeywords,
  type SupervisorDutyItem,
} from '@/types/supervisor-duties'

// ─── 신규 작성 모달 (위험성평가 연계 or 직접 선택) ─────────────
function NewDutyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [mode,      setMode]      = useState<'risk'|'manual'>('risk')
  const [risks,     setRisks]     = useState<any[]>([])
  const [selRisk,   setSelRisk]   = useState<string>('')
  const [matched,   setMatched]   = useState<SupervisorDutyItem[]>([])
  const [selDuties, setSelDuties] = useState<Set<string>>(new Set())
  const [form,      setForm]      = useState({ supervisor_name:'', supervisor_position:'', work_date: new Date().toISOString().slice(0,10), work_location:'' })
  const [saving,    setSaving]    = useState(false)
  const [catFilter, setCatFilter] = useState('all')

  useEffect(() => {
    fetch('/api/risk').then(r=>r.json()).then(j=>setRisks(j.data??[]))
  }, [])

  // 위험성평가 선택 시 키워드 자동 분석
  async function selectRisk(id: string) {
    setSelRisk(id)
    const risk = risks.find((r: any) => r.id === id)
    if (!risk) return
    // 위험성평가 상세 조회해서 키워드 추출
    const res = await fetch(`/api/risk/${id}`)
    const j   = await res.json()
    const rows: any[] = j.data?.items ?? []
    const textBlob = rows.map((r: any) =>
      [r.work_type, r.hazard, r.risk_factor, r.location].filter(Boolean).join(' ')
    ).join(' ')
    const keywords = textBlob.split(/[\s,·/]+/).filter(k => k.length >= 2)
    const m = matchDutiesByKeywords(keywords)
    setMatched(m)
    setSelDuties(new Set(m.map(d => d.id)))
  }

  function toggleDuty(id: string) {
    setSelDuties(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function create() {
    if (!form.supervisor_name) { toast.error('관리감독자 성명을 입력하세요.'); return }
    setSaving(true)
    const tableSource = mode === 'risk' ? matched : SUPERVISOR_DUTY_TABLE
    const chosen = tableSource.filter(d => selDuties.has(d.id))
    const payload = {
      ...form,
      linked_risk_id: selRisk || null,
      duty_items: chosen.map(d => ({
        duty_id:   d.id,
        workType:  d.workType,
        legalRef:  d.legalRef,
        category:  d.category,
        duties:    d.duties,
        preChecks: d.preChecks,
        checked_duties: [],
        checked_preChecks: [],
        deviations: '',
        actions: '',
      })),
    }
    const res  = await fetch('/api/safety-measures/supervisor-duties', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('관리감독자 유해위험방지업무가 작성되었습니다.')
    onCreated(json.data.id)
    onClose()
  }

  const displayList = mode === 'risk' ? matched : SUPERVISOR_DUTY_TABLE
  const filtered = catFilter === 'all' ? displayList : displayList.filter(d => d.category === catFilter)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">관리감독자 유해위험방지업무 작성</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">안전보건규칙 [별표 2·3]</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 text-sm">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* 모드 선택 */}
          <div className="flex gap-3">
            <button onClick={() => setMode('risk')}
              className={clsx('flex-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all',
                mode==='risk' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              위험성평가 연계
              <div className="text-[9px] font-normal mt-0.5 opacity-70">위험성평가 키워드 자동 분석 → 적용 항목 추천</div>
            </button>
            <button onClick={() => setMode('manual')}
              className={clsx('flex-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all',
                mode==='manual' ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              직접 선택
              <div className="text-[9px] font-normal mt-0.5 opacity-70">별표 2 전체 목록에서 직접 체크</div>
            </button>
          </div>

          {/* 기본정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-base">관리감독자 성명 *</label><input value={form.supervisor_name} onChange={e=>setForm(f=>({...f,supervisor_name:e.target.value}))} placeholder="홍길동" className="input-base"/></div>
            <div><label className="label-base">직위</label><input value={form.supervisor_position} onChange={e=>setForm(f=>({...f,supervisor_position:e.target.value}))} placeholder="현장반장" className="input-base"/></div>
            <div><label className="label-base">작업 일자 *</label><input type="date" value={form.work_date} onChange={e=>setForm(f=>({...f,work_date:e.target.value}))} className="input-base"/></div>
            <div><label className="label-base">작업 위치</label><input value={form.work_location} onChange={e=>setForm(f=>({...f,work_location:e.target.value}))} placeholder="4공구 지하 2층" className="input-base"/></div>
          </div>

          {/* 위험성평가 선택 */}
          {mode === 'risk' && (
            <div>
              <label className="label-base">연계할 위험성평가</label>
              <select value={selRisk} onChange={e=>selectRisk(e.target.value)} className="input-base">
                <option value="">선택하세요</option>
                {risks.map((r: any) => <option key={r.id} value={r.id}>{r.title} ({r.assessment_date})</option>)}
              </select>
              {selRisk && matched.length > 0 && (
                <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" />
                  위험성평가 키워드 분석 완료: <strong>{matched.length}개 별표2 항목</strong> 자동 선택됨
                </div>
              )}
            </div>
          )}

          {/* 카테고리 필터 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">적용할 별표2 항목 선택</span>
              <span className="text-[10px] text-gray-400">{selDuties.size}개 선택</span>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {[{k:'all',l:'전체'}, ...Object.entries(CATEGORY_LABELS).map(([k,v])=>({k,l:v.label}))].map(f => (
                <button key={f.k} onClick={()=>setCatFilter(f.k)}
                  className={clsx('px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border',
                    catFilter===f.k ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400')}>
                  {f.l}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {filtered.map(d => {
                const cat = CATEGORY_LABELS[d.category]
                return (
                  <label key={d.id} className={clsx('flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-all',
                    selDuties.has(d.id) ? 'border-blue-300 bg-blue-50/40' : 'border-gray-100')}>
                    <input type="checkbox" checked={selDuties.has(d.id)} onChange={()=>toggleDuty(d.id)}
                      className="w-4 h-4 accent-blue-600 flex-shrink-0 mt-0.5"/>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-gray-800">{d.workType}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{background:cat.bg,color:cat.color}}>{cat.label}</span>
                        <span className="text-[9px] text-gray-400">{d.legalRef}</span>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2 flex-shrink-0 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="btn-secondary">취소</button>
          <button onClick={create} disabled={saving || selDuties.size === 0}
            className="btn-primary disabled:opacity-40" style={{background:'#dc2626'}}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
            {selDuties.size}개 항목으로 작성
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SupervisorDutiesPage() {
  const router  = useRouter()
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    fetch('/api/safety-measures/supervisor-duties').then(r=>r.json()).then(j=>{setItems(j.data??[]);setLoading(false)})
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4"/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600"/>
              관리감독자의 유해위험방지업무
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              안전보건규칙 제35조 / [별표 2] 유해위험방지 · [별표 3] 작업시작 전 점검
            </p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          className="btn-primary text-sm gap-1.5" style={{background:'#dc2626'}}>
          <Plus className="w-4 h-4"/> 작성
        </button>
      </div>

      {/* 법적 안내 */}
      <div className="card p-4 mb-4 border-red-100 bg-red-50/30">
        <p className="text-[11px] text-red-700 leading-relaxed">
          <span className="font-semibold">안전보건규칙 제35조</span> — 사업주는 관리감독자로 하여금
          <span className="font-semibold"> [별표 2]</span>에서 정하는 바에 따라 유해·위험을 방지하기 위한 업무를 수행하도록 하여야 하며,
          <span className="font-semibold"> [별표 3]</span>에서 정하는 바에 따라 작업시작 전 필요한 사항을 점검하도록 하여야 한다.
          총 <strong className="text-red-700">20개 작업 유형</strong>에 대한 법정 직무수행내용 및 작업시작 전 점검사항을 포함합니다.
        </p>
      </div>

      {/* 별표2 적용 범위 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => {
          const cnt = SUPERVISOR_DUTY_TABLE.filter(d => d.category === k).length
          return (
            <div key={k} className="card p-3 flex items-center gap-3"
              style={{background:v.bg, borderColor: v.color+'20'}}>
              <div className="text-lg font-bold" style={{color:v.color}}>{cnt}</div>
              <div><div className="text-xs font-medium" style={{color:v.color}}>{v.label}</div>
                <div className="text-[9px] text-gray-400">작업 유형</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>관리감독자 유해위험방지업무 기록이 없습니다.</p>
            <button onClick={() => setShowNew(true)}
              className="btn-primary mt-4 text-sm inline-flex" style={{background:'#dc2626'}}>
              <Plus className="w-4 h-4"/> 작성하기
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['문서번호','관리감독자','작업일','위치','항목수','위험성평가 연계','상태',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.supervisor_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.work_date}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.work_location||'—'}</td>
                  <td className="px-4 py-3 text-xs text-center">{(item.duty_items??[]).length}개</td>
                  <td className="px-4 py-3">
                    {item.linked_risk_id
                      ? <span className="text-xs text-blue-600 flex items-center gap-1"><Link2 className="w-3 h-3"/>연계됨</span>
                      : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                      item.status==='completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                      {item.status==='completed' ? '완료' : '작성 중'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/safety-measures/supervisor-duties/${item.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                      <button onClick={() => {/* PDF 출력 */}} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
                        <Printer className="w-3 h-3"/>출력
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewDutyModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => router.push(`/safety-measures/supervisor-duties/${id}`)}
        />
      )}
    </div>
  )
}
