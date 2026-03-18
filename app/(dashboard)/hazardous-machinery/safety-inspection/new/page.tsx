'use client'
import { useForm } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, ClipboardCheck } from 'lucide-react'
import { SAFETY_INSPECTION_TYPES } from '@/types/hazardous-machinery'

export default function NewSafetyInspectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeCode = searchParams.get('type') ?? ''
  const mt = SAFETY_INSPECTION_TYPES.find(t => t.code === typeCode)
  const [saving, setSaving] = useState(false)

  const form = useForm({ defaultValues: {
    machine_type:     typeCode,
    machine_name:     mt?.label ?? '',
    model_no:         '',
    serial_no:        '',
    manufacturer:     '',
    install_date:     '',
    location:         '',
    is_applicable:    true,
    inapplicable_reason: '',
    inspection_cycle: mt?.cycleLabel ?? '2년',
    notes:            '',
  }})

  async function onSubmit(data: any) {
    setSaving(true)
    const res = await fetch('/api/hazardous-machinery/safety-inspection', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...data, inspection_status:'pending', inspection_records:[] }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('안전검사 대상 기계가 등록되었습니다.')
    router.push('/hazardous-machinery/safety-inspection')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/hazardous-machinery/safety-inspection" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-red-600"/>안전검사 대상 기계 등록</h1>
            {mt && <p className="text-xs text-gray-400 mt-0.5">{mt.legalRef} | 검사주기: {mt.cycleLabel}</p>}
          </div>
        </div>
        <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary" style={{background:'#dc2626'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <form className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">기계 기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">기계 종류 *</label>
              <select {...form.register('machine_type')} className="input-base">
                {SAFETY_INSPECTION_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </div>
            <div><label className="label-base">기계명 (사내 식별명) *</label><input {...form.register('machine_name',{required:true})} placeholder="예: 타워크레인 TC-800" className="input-base"/></div>
            <div><label className="label-base">모델·형식</label><input {...form.register('model_no')} className="input-base"/></div>
            <div><label className="label-base">제조번호·등록번호</label><input {...form.register('serial_no')} className="input-base"/></div>
            <div><label className="label-base">제조사</label><input {...form.register('manufacturer')} className="input-base"/></div>
            <div><label className="label-base">설치(등록)일</label><input {...form.register('install_date')} type="date" className="input-base"/></div>
            <div><label className="label-base">설치 위치</label><input {...form.register('location')} placeholder="예: 4공구 현장" className="input-base"/></div>
            <div><label className="label-base">검사주기</label><input {...form.register('inspection_cycle')} className="input-base"/></div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...form.register('is_applicable')} className="w-4 h-4 accent-red-600"/>
              <span className="text-sm text-gray-700">사업장에서 사용 중인 기계 (해당 있음)</span>
            </label>
          </div>
          <div className="mt-2"><label className="label-base">비고</label><input {...form.register('notes')} className="input-base"/></div>
        </div>
      </form>
    </div>
  )
}
