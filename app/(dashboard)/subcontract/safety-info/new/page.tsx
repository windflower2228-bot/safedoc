'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, FileText, Plus, Trash2 } from 'lucide-react'

// 산안법 시행규칙 제83조 기반 제공 정보 항목
const DEFAULT_INFO_ITEMS = [
  { category:'유해·위험요인', item:'작업 공정별 유해·위험요인 및 재해예방대책', content:'', doc_attached:false },
  { category:'화학물질 정보', item:'사용 화학물질의 명칭·유해성/위험성·취급상 주의사항(MSDS 포함)', content:'', doc_attached:false },
  { category:'설비·장비', item:'사용 기계·기구·설비의 안전수칙 및 점검 상태', content:'', doc_attached:false },
  { category:'작업방법', item:'작업 절차·작업허가 기준 및 출입통제 사항', content:'', doc_attached:false },
  { category:'보호구', item:'필요 보호구의 종류·착용 기준·비치 위치', content:'', doc_attached:false },
  { category:'비상조치', item:'비상상황 대응 절차(대피·응급조치·비상연락망)', content:'', doc_attached:false },
  { category:'기타', item:'작업 특성상 추가로 제공이 필요한 안전·보건 정보', content:'', doc_attached:false },
]

export default function NewSafetyInfoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const form = useForm({ defaultValues: {
    vendor_name:'', work_type:'', provision_date: new Date().toISOString().slice(0,10),
    receiver_name:'', provider_name:'', provider_position:'',
    info_items: DEFAULT_INFO_ITEMS,
  }})
  const { fields } = useFieldArray({ control: form.control, name:'info_items' })

  async function onSubmit(data: any) {
    setSaving(true)
    const res = await fetch('/api/subcontract/safety-info', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('안전보건 정보제공 문서가 저장되었습니다.')
    router.push(`/subcontract/safety-info/${json.data.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/subcontract/safety-info" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-green-600"/>안전 및 보건에 관한 정보제공</h1>
          <p className="text-xs text-gray-400 mt-0.5">산안법 제65조 | 작업 시작 전 서면 제공 의무</p></div>
        </div>
        <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary" style={{background:'#16a34a'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <form className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">수급업체명 *</label><input {...form.register('vendor_name',{required:true})} className="input-base"/></div>
            <div><label className="label-base">도급 공종 *</label><input {...form.register('work_type',{required:true})} className="input-base"/></div>
            <div><label className="label-base">제공 일자 *</label><input {...form.register('provision_date')} type="date" className="input-base"/></div>
            <div><label className="label-base">수령자 (수급인 대표)</label><input {...form.register('receiver_name')} className="input-base"/></div>
            <div><label className="label-base">제공자</label><input {...form.register('provider_name')} className="input-base"/></div>
            <div><label className="label-base">제공자 직위</label><input {...form.register('provider_position')} className="input-base"/></div>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">제공 정보 항목</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">산안법 시행규칙 제83조 기준 기본항목 — 내용 입력 후 저장</p>
          </div>
          <div className="divide-y divide-gray-100">
            {fields.map((f, idx) => (
              <div key={f.id} className="p-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 flex-shrink-0 mt-0.5">{form.watch(`info_items.${idx}.category`)}</span>
                  <span className="text-xs font-medium text-gray-800">{form.watch(`info_items.${idx}.item`)}</span>
                  <label className="ml-auto flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0">
                    <input type="checkbox" {...form.register(`info_items.${idx}.doc_attached`)} className="w-3.5 h-3.5 accent-green-600"/>
                    <span className="text-gray-500">문서 첨부</span>
                  </label>
                </div>
                <textarea {...form.register(`info_items.${idx}.content`)} rows={2}
                  className="input-base resize-none text-xs" placeholder="제공 내용을 기재하세요."/>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
