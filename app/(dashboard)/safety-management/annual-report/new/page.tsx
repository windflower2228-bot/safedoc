'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Activity, Plus, Trash2 } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'

const DEFAULT_AGENDA_ITEMS = [
  { seq: 1, title: '안전 및 보건에 관한 경영방침', content: '', resolution: '' },
  { seq: 2, title: '안전ㆍ보건관리 조직의 구성ㆍ인원 및 역할', content: '', resolution: '' },
  { seq: 3, title: '안전ㆍ보건 관련 예산 및 시설 현황', content: '', resolution: '' },
  { seq: 4, title: '안전 및 보건에 관한 전년도 활동실적 및 다음 연도 활동계획', content: '', resolution: '' },
  { seq: 5, title: '기타', content: '', resolution: '' },
]

export default function NewBoardReportPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const form = useForm({ defaultValues: {
    report_year: new Date().getFullYear(), report_date: new Date().toISOString().slice(0,10),
    meeting_type: 'board', safety_plan_summary: '', investment_budget: '',
    agenda_items: DEFAULT_AGENDA_ITEMS,
  }})
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'agenda_items' })

  async function onSubmit(data: any) {
    setSaving(true)
    const res = await fetch('/api/board-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, investment_budget: data.investment_budget ? Number(data.investment_budget) : null }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('이사회 보고 문서가 작성되었습니다.')
    router.push('/safety-management/annual-report')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-management/annual-report" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-700"/>연간 이사회 보고 작성</h1>
            <p className="text-xs text-gray-400 mt-0.5">산업안전보건법 제14조</p>
          </div>
        </div>
        <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary" style={{background:'#1d4ed8'}}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">기본정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label-base">보고 연도 *</label><input {...form.register('report_year')} type="number" className="input-base"/></div>
            <div><label className="label-base">보고 일자 *</label><input {...form.register('report_date')} type="date" className="input-base"/></div>
            <div><label className="label-base">회의 종류</label>
              <select {...form.register('meeting_type')} className="input-base">
                <option value="board">이사회</option><option value="audit">감사위원회</option><option value="general">주주총회</option>
              </select>
            </div>
            <div><label className="label-base">안전보건 투자 예산 (원)</label><input {...form.register('investment_budget')} type="number" placeholder="100000000" className="input-base"/></div>
          </div>
          <div className="mt-4"><label className="label-base">안전보건 계획 요약</label><textarea {...form.register('safety_plan_summary')} rows={3} className="input-base resize-none" placeholder="당해 연도 안전보건 계획의 주요 내용을 요약하세요."/></div>
        </div>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">보고 안건</h2>
            <button type="button" onClick={() => append({ seq:fields.length+1, title:'', content:'', resolution:'' })} className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>안건 추가</button>
          </div>
          <div className="divide-y divide-gray-100">
            {fields.map((f, idx) => (
              <div key={f.id} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold flex-shrink-0">{idx+1}</span>
                  <input {...form.register(`agenda_items.${idx}.title`)} placeholder="안건 제목" className="input-base flex-1 font-medium"/>
                  <button type="button" onClick={() => remove(idx)} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
                <div className="grid grid-cols-2 gap-3 ml-9">
                  <div><label className="label-base">안건 내용</label><textarea {...form.register(`agenda_items.${idx}.content`)} rows={3} className="input-base resize-none text-sm"/></div>
                  <div><label className="label-base">결의 사항</label><textarea {...form.register(`agenda_items.${idx}.resolution`)} rows={3} className="input-base resize-none text-sm"/></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
