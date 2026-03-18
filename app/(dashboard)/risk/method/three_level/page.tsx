'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { THREE_LEVEL_CRITERIA, RISK_LEVEL_CFG, type ThreeLevelRisk, type ThreeLevelItem } from '@/types/risk-method'

const HAZARD_TYPES = ['추락·전도','끼임','충돌·협착','화재·폭발','유해물질','감전','근골격계','기타']

function defaultItem(seq: number): ThreeLevelItem {
  return { seq, work_content:'', hazard_factor:'', hazard_type:'추락·전도',
    current_measure:'', risk_level:'medium', is_acceptable: false,
    reduce_measure:'', measure_owner:'', measure_due:'', measure_done:false }
}

// ─── 신호등 버튼 컴포넌트 ─────────────────────────────────────
function TrafficLight({ value, onChange }: { value: ThreeLevelRisk; onChange: (v: ThreeLevelRisk) => void }) {
  const levels: ThreeLevelRisk[] = ['high','medium','low']
  return (
    <div className="flex flex-col gap-2">
      {levels.map(l => {
        const c  = THREE_LEVEL_CRITERIA[l]
        const rc = RISK_LEVEL_CFG[l]
        return (
          <button key={l} type="button" onClick={() => onChange(l)}
            className={clsx('flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
              value===l ? 'shadow-sm' : 'border-gray-200 bg-white opacity-60 hover:opacity-80')}
            style={value===l ? {borderColor:rc.border, background:c.bg} : {}}>
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{background:value===l?rc.color:'#d1d5db'}}/>
            <div>
              <div className="font-bold text-sm" style={{color:value===l?rc.color:'#6b7280'}}>{c.label}</div>
              <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{c.desc}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default function ThreeLevelMethodPage() {
  const router   = useRouter()
  const [saving, setSaving]  = useState(false)
  const [items,  setItems]   = useState<ThreeLevelItem[]>([defaultItem(1)])
  const [expanded,setExpanded]= useState<number>(0)
  const [form, setForm] = useState({
    title:'', eval_type:'initial', eval_date: new Date().toISOString().slice(0,10),
    work_location:'', evaluator_name:'',
    acceptable_threshold: 'low' as ThreeLevelRisk,   // 허용 가능 기준
  })

  function addItem() {
    setItems(prev => [...prev, defaultItem(prev.length+1)])
    setExpanded(items.length)
  }
  function removeItem(idx: number) {
    setItems(prev => prev.filter((_,i)=>i!==idx).map((it,i)=>({...it,seq:i+1})))
  }
  function updateItem(idx: number, field: keyof ThreeLevelItem, val: any) {
    setItems(prev => prev.map((it,i) => i===idx ? {...it,[field]:val} : it))
  }
  function setLevel(idx: number, level: ThreeLevelRisk) {
    // 허용 가능 여부도 자동 결정
    const isAcceptable = level === 'low' || (form.acceptable_threshold === 'medium' && level === 'medium')
    setItems(prev => prev.map((it,i) => i===idx ? {...it, risk_level:level, is_acceptable:isAcceptable} : it))
  }

  async function save() {
    if (!form.title.trim()) { toast.error('제목을 입력하세요.'); return }
    setSaving(true)
    const res  = await fetch('/api/risk', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, eval_method:'three_level', three_level_items:items }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('3단계 판단법 위험성평가가 저장되었습니다.')
    router.push(`/risk/${json.data.id}`)
  }

  const highCnt   = items.filter(it=>it.risk_level==='high').length
  const mediumCnt = items.filter(it=>it.risk_level==='medium').length
  const lowCnt    = items.filter(it=>it.risk_level==='low').length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk/method" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">위험성 수준 3단계 판단법</h1>
            <p className="text-xs text-gray-400 mt-0.5">상·중·하 직관적 판단 | 허용 가능 수준 결정 | 소규모 사업장 적합</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary" style={{background:'#d97706'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>

      {/* 기본정보 */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2"><label className="label-base">제목 *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input-base"/></div>
          <div><label className="label-base">평가 유형</label>
            <select value={form.eval_type} onChange={e=>setForm(f=>({...f,eval_type:e.target.value}))} className="input-base">
              {[['initial','최초'],['periodic','정기'],['special','수시']].map(([v,l])=><option key={v} value={v}>{l}평가</option>)}
            </select>
          </div>
          <div><label className="label-base">평가일</label><input type="date" value={form.eval_date} onChange={e=>setForm(f=>({...f,eval_date:e.target.value}))} className="input-base"/></div>
          <div><label className="label-base">평가자</label><input value={form.evaluator_name} onChange={e=>setForm(f=>({...f,evaluator_name:e.target.value}))} className="input-base"/></div>
        </div>
      </div>

      {/* 허용 가능 수준 설정 */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-amber-600"/>
          <span className="font-semibold text-sm text-gray-800">허용 가능한 위험성 수준 결정</span>
          <span className="text-xs text-gray-400">(사전준비 단계에서 결정 — 지침 제9조)</span>
        </div>
        <div className="flex gap-3">
          {(['low','medium'] as const).map(t => (
            <button key={t} type="button"
              onClick={()=>setForm(f=>({...f,acceptable_threshold:t}))}
              className={clsx('flex-1 p-3 rounded-xl border-2 text-left transition-all',
                form.acceptable_threshold===t ? '' : 'border-gray-200 opacity-60 hover:opacity-80')}
              style={form.acceptable_threshold===t ? {borderColor:THREE_LEVEL_CRITERIA[t].label.includes('下')||t==='low'?'#bbf7d0':'#fde68a', background:THREE_LEVEL_CRITERIA[t].bg} : {}}>
              <div className="font-semibold text-sm" style={{color:RISK_LEVEL_CFG[t].color}}>
                {t==='low' ? '"하(低)" 수준만 허용' : '"중(中)" 이하 허용'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t==='low'
                  ? '하(低)만 허용 — 중(中)·상(高)은 모두 즉시 개선 필요. 일반적 사업장 권장.'
                  : '중(中)까지 허용 — 상(高)만 즉시 개선. 소규모 사업장·경미한 위험 환경.'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 위험성 판단 기준 */}
      <div className="card p-4 mb-4">
        <div className="text-xs font-semibold text-gray-700 mb-3">위험성 수준 판단 기준 (지침 안내서 기준)</div>
        <div className="grid grid-cols-3 gap-3">
          {(['high','medium','low'] as ThreeLevelRisk[]).map(l => {
            const c  = THREE_LEVEL_CRITERIA[l]
            const rc = RISK_LEVEL_CFG[l]
            const isAcceptable = l==='low' || (form.acceptable_threshold==='medium' && l==='medium')
            return (
              <div key={l} className="p-3 rounded-xl" style={{background:c.bg, border:`1.5px solid ${rc.border}`}}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm" style={{color:rc.color}}>{c.label}</span>
                  {isAcceptable
                    ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">허용 가능</span>
                    : <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">개선 필요</span>}
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed">{c.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 통계 */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="text-gray-500">전체 {items.length}건</span>
        {highCnt   > 0 && <span className="text-red-600 font-semibold">• 상(高) {highCnt}건</span>}
        {mediumCnt > 0 && <span className="text-amber-600 font-semibold">• 중(中) {mediumCnt}건</span>}
        {lowCnt    > 0 && <span className="text-green-600 font-semibold">• 하(低) {lowCnt}건</span>}
      </div>

      {/* 위험요인 목록 */}
      <div className="card overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">위험요인 항목</h2>
          <button onClick={addItem} className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>항목 추가</button>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item,idx) => {
            const c   = THREE_LEVEL_CRITERIA[item.risk_level]
            const rc  = RISK_LEVEL_CFG[item.risk_level]
            const isAcceptable = item.risk_level==='low' ||
              (form.acceptable_threshold==='medium' && item.risk_level!=='high')
            return (
              <div key={idx} className={clsx('border-l-4',
                item.risk_level==='high'?'border-red-400':item.risk_level==='medium'?'border-amber-400':'border-green-400')}>
                <button type="button" onClick={()=>setExpanded(expanded===idx?-1:idx)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left">
                  <span className="text-xs font-mono text-gray-400 w-5">{item.seq}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">{item.hazard_factor||'(미입력)'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:c.bg,color:rc.color,border:`1px solid ${rc.border}`}}>{c.label}</span>
                      <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full',isAcceptable?'bg-green-50 text-green-700':'bg-red-50 text-red-700')}>
                        {isAcceptable?'허용 가능':'개선 필요'}
                      </span>
                    </div>
                    {item.work_content && <div className="text-xs text-gray-500 truncate mt-0.5">{item.work_content}</div>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={e=>{e.stopPropagation();removeItem(idx)}} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                    {expanded===idx?<ChevronUp className="w-4 h-4 text-gray-400"/>:<ChevronDown className="w-4 h-4 text-gray-400"/>}
                  </div>
                </button>

                {expanded===idx && (
                  <div className="px-5 pb-5 pt-1 bg-gray-50/40">
                    <div className="grid grid-cols-2 gap-6">
                      {/* 좌측: 기본입력 */}
                      <div className="space-y-3">
                        <div><label className="label-base">작업 내용</label><input value={item.work_content} onChange={e=>updateItem(idx,'work_content',e.target.value)} className="input-base text-sm"/></div>
                        <div><label className="label-base">위험 유형</label>
                          <select value={item.hazard_type} onChange={e=>updateItem(idx,'hazard_type',e.target.value)} className="input-base text-sm">
                            {HAZARD_TYPES.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div><label className="label-base">유해·위험요인 *</label><input value={item.hazard_factor} onChange={e=>updateItem(idx,'hazard_factor',e.target.value)} className="input-base text-sm"/></div>
                        <div><label className="label-base">현재 안전조치</label><input value={item.current_measure} onChange={e=>updateItem(idx,'current_measure',e.target.value)} className="input-base text-sm"/></div>
                      </div>
                      {/* 우측: 신호등 판단 */}
                      <div>
                        <label className="label-base mb-2 block">위험성 수준 판단</label>
                        <TrafficLight value={item.risk_level} onChange={l=>setLevel(idx,l)}/>
                        {!isAcceptable && (
                          <div className="mt-3 p-3 bg-red-50 rounded-xl space-y-2">
                            <label className="text-[10px] font-semibold text-red-700">위험성 감소대책 *</label>
                            <input value={item.reduce_measure} onChange={e=>updateItem(idx,'reduce_measure',e.target.value)}
                              placeholder="상·중 수준 → 반드시 개선대책 수립" className="input-base text-xs"/>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={item.measure_owner} onChange={e=>updateItem(idx,'measure_owner',e.target.value)} placeholder="담당자" className="input-base text-xs py-1"/>
                              <input type="date" value={item.measure_due} onChange={e=>updateItem(idx,'measure_due',e.target.value)} className="input-base text-xs py-1"/>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={item.measure_done} onChange={e=>updateItem(idx,'measure_done',e.target.checked)} className="w-3.5 h-3.5 accent-green-600"/>
                              <span className="text-xs text-gray-600">조치 완료</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={addItem} className="btn-secondary text-xs gap-1 w-full justify-center"><Plus className="w-3.5 h-3.5"/>항목 추가</button>
        </div>
      </div>
    </div>
  )
}
