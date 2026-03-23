'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2,
  CheckCircle2, XCircle, Upload, X, FileText, Printer,
} from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import type { OpsItem } from '@/types/risk-method'

const INJURY_TYPES = [
  '떨어짐',
  '넘어짐',
  '깔림/뒤집힘',
  '부딪힘',
  '물체에 맞음',
  '무너짐',
  '끼임',
  '절단/베임/찔림',
  '화재/폭발/파열',
  '무리한동작',
  '업무상질병',
  '기타',
]

function defaultOps(seq: number): OpsItem {
  return {
    seq, work_name:'', work_step:'', hazard_factor:'', injury_type:'떨어짐',
    current_measure:'', is_sufficient: false, additional_measure:'',
    worker_pledge:'', photo_url: undefined,
  }
}

// ─── OPS 카드 1장 미리보기 ────────────────────────────────────
function OpsCard({ item }: { item: OpsItem }) {
  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden text-xs print:break-inside-avoid">
      {/* 헤더 */}
      <div className="bg-purple-700 text-white px-4 py-2 flex justify-between items-center">
        <div className="font-bold text-sm">[핵심요인기술법] {item.work_name || '작업명 미입력'}</div>
        <div className="text-[10px] opacity-80">OPS #{item.seq}</div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* 좌측: 위험요인 */}
        <div className="p-3 space-y-2">
          <div>
            <div className="font-semibold text-gray-700 text-[10px] mb-0.5">작업 단계·절차</div>
            <div className="text-gray-600">{item.work_step || '—'}</div>
          </div>
          <div>
            <div className="font-semibold text-red-700 text-[10px] mb-0.5">⚠ 핵심 유해·위험요인</div>
            <div className="text-red-800 font-medium leading-relaxed">{item.hazard_factor || '—'}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700 text-[10px] mb-0.5">예상 재해 유형</div>
            <div className="text-gray-600">{item.injury_type || '—'}</div>
          </div>
        </div>
        {/* 우측: 안전조치 */}
        <div className="p-3 space-y-2">
          <div>
            <div className="font-semibold text-blue-700 text-[10px] mb-0.5">현재 안전조치</div>
            <div className="text-gray-600 leading-relaxed">{item.current_measure || '—'}</div>
          </div>
          {!item.is_sufficient && item.additional_measure && (
            <div>
              <div className="font-semibold text-orange-700 text-[10px] mb-0.5">추가 조치사항</div>
              <div className="text-orange-800 leading-relaxed">{item.additional_measure}</div>
            </div>
          )}
          {item.worker_pledge && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="font-semibold text-green-700 text-[10px] mb-0.5">근로자 준수사항 (TBM)</div>
              <div className="text-green-800 leading-relaxed">{item.worker_pledge}</div>
            </div>
          )}
        </div>
      </div>
      {/* 사진 */}
      {item.photo_url && (
        <div className="border-t border-gray-200 p-2">
          <img src={item.photo_url} alt="" className="w-full h-24 object-cover rounded-lg"/>
        </div>
      )}
      {/* 서명란 */}
      <div className="border-t border-gray-200 grid grid-cols-3 divide-x divide-gray-200 text-[10px]">
        {['작성자','관리감독자','근로자'].map(role => (
          <div key={role} className="px-3 py-1.5 text-center text-gray-400">{role}: ________________</div>
        ))}
      </div>
    </div>
  )
}

export default function OpsMethodPage() {
  const router   = useRouter()
  const supabase = createClient()
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])
  const [saving, setSaving]  = useState(false)
  const [items,  setItems]   = useState<OpsItem[]>([defaultOps(1)])
  const [previewMode, setPreviewMode] = useState(false)
  const [form, setForm] = useState({
    title:'', eval_type:'special', eval_date: new Date().toISOString().slice(0,10),
    work_location:'', evaluator_name:'',
  })

  function addItem() { setItems(prev => [...prev, defaultOps(prev.length+1)]) }
  function removeItem(idx: number) {
    setItems(prev => prev.filter((_,i)=>i!==idx).map((it,i)=>({...it,seq:i+1})))
  }
  function updateItem(idx: number, field: keyof OpsItem, val: any) {
    setItems(prev => prev.map((it,i) => i===idx ? {...it,[field]:val} : it))
  }

  async function uploadPhoto(idx: number, file: File) {
    const path = `ops-photos/${Date.now()}-${file.name}`
    const { data } = await supabase.storage.from('company-assets').upload(path, file, { upsert:false })
    if (data) {
      const { data: pub } = supabase.storage.from('company-assets').getPublicUrl(path)
      updateItem(idx, 'photo_url', pub.publicUrl)
      toast.success('사진이 첨부되었습니다.')
    }
  }

  async function save() {
    if (!form.title.trim()) { toast.error('제목을 입력하세요.'); return }
    if (items.some(it=>!it.work_name.trim())) { toast.error('모든 OPS 시트의 작업명을 입력하세요.'); return }
    setSaving(true)
    const res  = await fetch('/api/risk', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, eval_method:'ops', ops_items:items }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success(`핵심요인기술법(OPS) ${items.length}장이 저장되었습니다.`)
    router.push(`/risk/${json.data.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk/method" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">핵심요인 기술법 (OPS)</h1>
            <p className="text-xs text-gray-400 mt-0.5">One Point Sheet | 작업 1개당 1장 | 임시·수시·비정형 작업 적합 | TBM 활용</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreviewMode(!previewMode)} className="btn-secondary gap-1.5">
            <FileText className="w-4 h-4"/>{previewMode ? '편집 모드' : 'OPS 미리보기'}
          </button>
          <button onClick={() => window.print()} className="btn-secondary gap-1.5">
            <Printer className="w-4 h-4"/>출력
          </button>
          <button onClick={save} disabled={saving} className="btn-primary" style={{background:'#7c3aed'}}>
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div className="card p-4 mb-4 bg-purple-50/40 border-purple-100 text-xs text-purple-700 leading-relaxed">
        <strong>핵심요인기술법(OPS)</strong>은 작업 방법이 단순하고 위험성이 상대적으로 낮은 소규모 사업장,
        또는 1개월 미만 임시·수시·비정형 작업에 적합합니다.
        작업 1개당 시트 1장에 핵심 위험요인 1~2개와 안전조치만 간결하게 기술하여 TBM에 활용합니다.
      </div>

      {/* 기본정보 */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2"><label className="label-base">제목 *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="비정형작업 OPS 위험성평가" className="input-base"/></div>
          <div><label className="label-base">평가 유형</label>
            <select value={form.eval_type} onChange={e=>setForm(f=>({...f,eval_type:e.target.value}))} className="input-base">
              {[['initial','최초'],['periodic','정기'],['special','수시'],['always_on','상시']].map(([v,l])=><option key={v} value={v}>{l}평가</option>)}
            </select>
          </div>
          <div><label className="label-base">평가일</label><input type="date" value={form.eval_date} onChange={e=>setForm(f=>({...f,eval_date:e.target.value}))} className="input-base"/></div>
          <div><label className="label-base">평가자</label><input value={form.evaluator_name} onChange={e=>setForm(f=>({...f,evaluator_name:e.target.value}))} className="input-base"/></div>
        </div>
      </div>

      {/* 미리보기 모드 */}
      {previewMode ? (
        <div className="space-y-4">
          {items.map(item => <OpsCard key={item.seq} item={item}/>)}
        </div>
      ) : (
        // 편집 모드
        <div className="space-y-4">
          {items.map((item,idx) => (
            <div key={idx} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-purple-700 text-white">
                <div className="font-semibold text-sm">OPS #{item.seq} — {item.work_name || '작업명 입력 필요'}</div>
                <button onClick={()=>removeItem(idx)} className="p-1 hover:bg-purple-600 rounded">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
              <div className="p-5 space-y-4">
                {/* 작업 기본정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label-base">작업명 *</label>
                    <input value={item.work_name} onChange={e=>updateItem(idx,'work_name',e.target.value)}
                      placeholder="예: 고소작업 비계 설치" className="input-base text-sm"/></div>
                  <div><label className="label-base">작업 단계·절차</label>
                    <input value={item.work_step} onChange={e=>updateItem(idx,'work_step',e.target.value)}
                      placeholder="예: 비계 파이프 조립 → 발판 설치" className="input-base text-sm"/></div>
                </div>

                {/* 핵심 위험요인 */}
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 space-y-3">
                  <div className="text-xs font-semibold text-red-700">⚠ 핵심 유해·위험요인 (1~2개만 기술)</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="label-base">유해·위험요인</label>
                      <textarea value={item.hazard_factor}
                        onChange={e=>updateItem(idx,'hazard_factor',e.target.value)}
                        rows={2} placeholder="예: 2m 이상 고소작업 중 안전대 미착용 시 추락 위험"
                        className="input-base text-sm resize-none"/>
                    </div>
                    <div>
                      <label className="label-base">예상 재해 유형</label>
                      <select value={item.injury_type} onChange={e=>updateItem(idx,'injury_type',e.target.value)} className="input-base text-sm">
                        {INJURY_TYPES.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 안전조치 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                    <div className="text-xs font-semibold text-blue-700">현재 안전조치</div>
                    <textarea value={item.current_measure}
                      onChange={e=>updateItem(idx,'current_measure',e.target.value)}
                      rows={3} placeholder="예: 안전대 착용 지시, 안전난간 설치"
                      className="input-base text-sm resize-none"/>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={item.is_sufficient}
                        onChange={e=>updateItem(idx,'is_sufficient',e.target.checked)}
                        className="w-4 h-4 accent-green-600"/>
                      <span className="text-xs text-gray-700">현재 조치로 충분함 (추가 조치 불필요)</span>
                    </label>
                  </div>

                  {!item.is_sufficient && (
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-2">
                      <div className="text-xs font-semibold text-orange-700">추가 조치사항</div>
                      <textarea value={item.additional_measure}
                        onChange={e=>updateItem(idx,'additional_measure',e.target.value)}
                        rows={3} placeholder="예: 안전대 부착설비 추가 설치, 추락방호망 설치"
                        className="input-base text-sm resize-none"/>
                    </div>
                  )}
                </div>

                {/* TBM 공유사항 */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-100 space-y-2">
                  <div className="text-xs font-semibold text-green-700">근로자 준수사항 (TBM 공유)</div>
                  <textarea value={item.worker_pledge}
                    onChange={e=>updateItem(idx,'worker_pledge',e.target.value)}
                    rows={2} placeholder="예: 반드시 안전대 착용 후 작업 시작, 이상 발견 시 즉시 작업중지 보고"
                    className="input-base text-sm resize-none"/>
                </div>

                {/* 사진 첨부 */}
                <div>
                  <label className="label-base">현장 사진 첨부 (선택)</label>
                  {item.photo_url ? (
                    <div className="relative inline-block">
                      <img src={item.photo_url} alt="" className="h-32 object-cover rounded-xl"/>
                      <button onClick={()=>updateItem(idx,'photo_url',undefined)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                        <X className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 hover:bg-purple-50/20 transition-all w-fit">
                      <Upload className="w-4 h-4 text-gray-400"/>
                      <span className="text-xs text-gray-400">사진 첨부 (JPG, PNG)</span>
                      <input type="file" accept="image/*" className="hidden"
                        ref={el=>{fileRefs.current[idx]=el}}
                        onChange={e=>{if(e.target.files?.[0]) uploadPhoto(idx, e.target.files[0])}}/>
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button onClick={addItem}
            className="w-full card py-4 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50/20 transition-all flex items-center justify-center gap-2 text-sm text-purple-600 font-medium">
            <Plus className="w-5 h-5"/> OPS 시트 추가 (작업 추가)
          </button>
        </div>
      )}
    </div>
  )
}
