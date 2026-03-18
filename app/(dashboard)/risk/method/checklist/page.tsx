'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Plus, Trash2, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import { DEFAULT_CHECKLIST_CATEGORIES, type CheckResult, type ChecklistItem } from '@/types/risk-method'

const CHECK_CFG: Record<CheckResult, { label: string; icon: any; color: string; bg: string }> = {
  ok:      { label: '적정',   icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4' },
  improve: { label: '보완필요', icon: XCircle,      color: '#dc2626', bg: '#fef2f2' },
  na:      { label: '해당없음', icon: MinusCircle,  color: '#9ca3af', bg: '#f9fafb' },
}

function makeItems(): ChecklistItem[] {
  let seq = 1
  return DEFAULT_CHECKLIST_CATEGORIES.flatMap(cat =>
    cat.items.map(item => ({
      seq: seq++,
      category:       cat.category,
      hazard_factor:  item,
      legal_ref:      '',
      check_result:   'ok' as CheckResult,
      current_status: '',
      improve_action: '',
      improve_owner:  '',
      improve_due:    '',
      improve_done:   false,
    }))
  )
}

export default function ChecklistMethodPage() {
  const router   = useRouter()
  const [saving, setSaving] = useState(false)
  const [items,  setItems]  = useState<ChecklistItem[]>(makeItems)
  const [expandedCat, setExpandedCat] = useState<string | null>('추락')
  const [form, setForm] = useState({
    title:'', eval_type:'periodic', eval_date: new Date().toISOString().slice(0,10),
    work_location:'', evaluator_name:'',
  })

  const categories = [...new Set(items.map(i=>i.category))]
  const improveCnt = items.filter(i=>i.check_result==='improve').length
  const okCnt      = items.filter(i=>i.check_result==='ok').length
  const naCnt      = items.filter(i=>i.check_result==='na').length

  function setResult(seq: number, result: CheckResult) {
    setItems(prev => prev.map(it => it.seq===seq ? {...it, check_result:result} : it))
  }
  function updateItem(seq: number, field: keyof ChecklistItem, val: any) {
    setItems(prev => prev.map(it => it.seq===seq ? {...it,[field]:val} : it))
  }
  function addCustomItem(category: string) {
    const maxSeq = Math.max(...items.map(i=>i.seq), 0)
    setItems(prev => [...prev, {
      seq: maxSeq+1, category, hazard_factor:'', legal_ref:'',
      check_result:'ok', current_status:'', improve_action:'', improve_owner:'', improve_due:'', improve_done:false
    }])
  }
  function removeItem(seq: number) {
    setItems(prev => prev.filter(it=>it.seq!==seq).map((it,i)=>({...it,seq:i+1})))
  }

  async function save() {
    if (!form.title.trim()) { toast.error('제목을 입력하세요.'); return }
    setSaving(true)
    const res  = await fetch('/api/risk', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, eval_method:'checklist', checklist_items:items }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('체크리스트법 위험성평가가 저장되었습니다.')
    router.push(`/risk/${json.data.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk/method" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">체크리스트법 위험성평가</h1>
            <p className="text-xs text-gray-400 mt-0.5">항목별 적정/보완/해당없음 점검 | 보완 항목 개선대책 수립</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary" style={{background:'#16a34a'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>

      {/* 기본정보 */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2"><label className="label-base">제목 *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="3월 정기 체크리스트 위험성평가" className="input-base"/></div>
          <div><label className="label-base">평가 유형</label>
            <select value={form.eval_type} onChange={e=>setForm(f=>({...f,eval_type:e.target.value}))} className="input-base">
              {[['initial','최초'],['periodic','정기'],['special','수시']].map(([v,l])=><option key={v} value={v}>{l}평가</option>)}
            </select>
          </div>
          <div><label className="label-base">평가일</label><input type="date" value={form.eval_date} onChange={e=>setForm(f=>({...f,eval_date:e.target.value}))} className="input-base"/></div>
          <div><label className="label-base">평가자</label><input value={form.evaluator_name} onChange={e=>setForm(f=>({...f,evaluator_name:e.target.value}))} className="input-base"/></div>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[{v:items.length,l:'전체 항목',c:'#374151'},{v:okCnt,l:'적정',c:'#16a34a'},{v:improveCnt,l:'보완 필요',c:'#dc2626'},{v:naCnt,l:'해당없음',c:'#9ca3af'}].map(s=>(
          <div key={s.l} className="card p-3 text-center">
            <div className="text-xl font-bold" style={{color:s.c}}>{s.v}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* 안내 */}
      <div className="card p-3 mb-4 bg-green-50/40 border-green-100 text-xs text-green-700 leading-relaxed">
        ✓ <strong>적정</strong>: 현재 안전조치가 법령 기준에 적합한 경우 &nbsp;|&nbsp;
        ✗ <strong>보완필요</strong>: 현재 조치가 불충분하여 추가 개선이 필요한 경우 → 개선대책 필수 입력 &nbsp;|&nbsp;
        — <strong>해당없음</strong>: 해당 사업장·작업에 해당하지 않는 항목
      </div>

      {/* 카테고리별 체크리스트 */}
      <div className="space-y-3">
        {categories.map(cat => {
          const catItems = items.filter(i=>i.category===cat)
          const catImprove = catItems.filter(i=>i.check_result==='improve').length
          return (
            <div key={cat} className="card overflow-hidden">
              <button type="button"
                onClick={() => setExpandedCat(expandedCat===cat ? null : cat)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 text-left">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{cat}</span>
                  <span className="text-[10px] text-gray-400">{catItems.length}개 항목</span>
                  {catImprove > 0 && (
                    <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      보완 {catImprove}건
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 미니 진행률 */}
                  <div className="flex gap-1">
                    {catItems.map(it => (
                      <div key={it.seq} className="w-2 h-2 rounded-full"
                        style={{background: it.check_result==='ok'?'#16a34a':it.check_result==='improve'?'#dc2626':'#d1d5db'}}/>
                    ))}
                  </div>
                  {expandedCat===cat?<ChevronUp className="w-4 h-4 text-gray-400"/>:<ChevronDown className="w-4 h-4 text-gray-400"/>}
                </div>
              </button>

              {expandedCat===cat && (
                <div>
                  <div className="divide-y divide-gray-100">
                    {catItems.map(item => {
                      const cc = CHECK_CFG[item.check_result]
                      const Icon = cc.icon
                      return (
                        <div key={item.seq} className={clsx('transition-all', item.check_result==='improve' && 'bg-red-50/20')}>
                          <div className="flex items-start gap-3 px-5 py-3">
                            <span className="text-xs text-gray-400 font-mono w-6 flex-shrink-0 pt-1">{item.seq}</span>
                            <div className="flex-1">
                              {/* 점검 항목 텍스트 */}
                              <input value={item.hazard_factor}
                                onChange={e=>updateItem(item.seq,'hazard_factor',e.target.value)}
                                className="text-sm text-gray-800 font-medium bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 w-full outline-none py-0.5 transition-all"
                                placeholder="점검 항목 입력"/>
                              {/* 현재 조치 현황 */}
                              {(item.check_result==='ok' || item.check_result==='improve') && (
                                <input value={item.current_status}
                                  onChange={e=>updateItem(item.seq,'current_status',e.target.value)}
                                  className="mt-1 text-xs text-gray-500 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 w-full outline-none py-0.5 transition-all"
                                  placeholder="현재 안전조치 현황 (선택)"/>
                              )}
                              {/* 보완필요 선택 시 개선대책 */}
                              {item.check_result==='improve' && (
                                <div className="mt-2 p-3 bg-red-50 rounded-xl space-y-2">
                                  <div><label className="text-[10px] font-semibold text-red-700">개선 대책 *</label>
                                    <input value={item.improve_action}
                                      onChange={e=>updateItem(item.seq,'improve_action',e.target.value)}
                                      placeholder="구체적인 개선 조치 내용"
                                      className="mt-1 input-base text-xs"/>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 items-end">
                                    <div><label className="text-[10px] text-gray-500">담당자</label>
                                      <input value={item.improve_owner} onChange={e=>updateItem(item.seq,'improve_owner',e.target.value)} className="input-base text-xs py-1"/></div>
                                    <div><label className="text-[10px] text-gray-500">이행기한</label>
                                      <input type="date" value={item.improve_due} onChange={e=>updateItem(item.seq,'improve_due',e.target.value)} className="input-base text-xs py-1"/></div>
                                    <label className="flex items-center gap-1.5 pb-1 cursor-pointer">
                                      <input type="checkbox" checked={item.improve_done} onChange={e=>updateItem(item.seq,'improve_done',e.target.checked)} className="w-3.5 h-3.5 accent-green-600"/>
                                      <span className="text-xs text-gray-600">완료</span>
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* 결과 선택 버튼 */}
                            <div className="flex gap-1 flex-shrink-0">
                              {(['ok','improve','na'] as CheckResult[]).map(r => {
                                const c = CHECK_CFG[r]
                                const Ic = c.icon
                                return (
                                  <button key={r} type="button"
                                    onClick={() => setResult(item.seq, r)}
                                    className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all',
                                      item.check_result===r ? 'text-white border-transparent' : 'text-gray-400 border-gray-200 hover:border-gray-300 bg-white')}
                                    style={item.check_result===r ? {background:c.color, borderColor:c.color} : {}}>
                                    <Ic className="w-3 h-3"/>
                                    {c.label}
                                  </button>
                                )
                              })}
                              <button onClick={()=>removeItem(item.seq)}
                                className="p-1.5 text-gray-200 hover:text-red-500 rounded">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="px-5 py-2.5 border-t border-gray-100">
                    <button onClick={()=>addCustomItem(cat)} className="text-xs text-green-600 hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3"/>{cat} 항목 추가
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
