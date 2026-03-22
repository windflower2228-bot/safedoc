'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, BarChart3, Plus, Trash2 } from 'lucide-react'

// 산안법 제61조 기반 평가 항목
const DEFAULT_EVAL_ITEMS = [
  { category:'산재예방 실적', item:'최근 3년간 산업재해 발생 여부', max_score:20, score:0, note:'' },
  { category:'산재예방 실적', item:'산재예방 계획 수립 여부', max_score:10, score:0, note:'' },
  { category:'안전보건 조직', item:'안전관리자·보건관리자 선임 여부', max_score:15, score:0, note:'' },
  { category:'안전보건 조직', item:'안전보건교육 실시 실적', max_score:10, score:0, note:'' },
  { category:'장비·시설', item:'보호구 및 안전장비 보유 현황', max_score:15, score:0, note:'' },
  { category:'장비·시설', item:'산재보험 가입 여부 및 납부 실적', max_score:10, score:0, note:'' },
  { category:'서류·인증', item:'안전보건관리규정 보유 여부', max_score:10, score:0, note:'' },
  { category:'서류·인증', item:'위험성평가 실시 실적', max_score:10, score:0, note:'' },
]
const MAX_TOTAL = DEFAULT_EVAL_ITEMS.reduce((s, i) => s + i.max_score, 0)

export default function NewQualifiedVendorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const form = useForm({ defaultValues: {
    vendor_name:'', vendor_ceo:'', vendor_business_number:'', vendor_address:'',
    work_type:'', contract_start:'', contract_end:'',
    evaluation_date: new Date().toISOString().slice(0,10),
    eval_items: DEFAULT_EVAL_ITEMS,
    evaluator_name:'', evaluator_position:'',
  }})
  const { fields } = useFieldArray({ control: form.control, name:'eval_items' })
  const items = form.watch('eval_items')
  const total = items.reduce((s: number, i: any) => s + (Number(i.score) || 0), 0)
  const qualified = total >= MAX_TOTAL * 0.6

  async function onSubmit(data: any) {
    setSaving(true)
    const res = await fetch('/api/subcontract/qualified-vendor', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...data, total_score: total, is_qualified: qualified }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('적격 수급업체 선정 자료가 저장되었습니다.')
    router.push(`/subcontract/qualified-vendor/${json.data.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/subcontract/qualified-vendor" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-700"/>적격 수급업체 선정 자료</h1>
          <p className="text-xs text-gray-400 mt-0.5">산안법 제61조 | 산재예방 능력 평가 후 도급 계약</p></div>
        </div>
        <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary" style={{background:'#1d4ed8'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <form className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">수급업체 기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">업체명 *</label><input {...form.register('vendor_name',{required:true})} className="input-base"/></div>
            <div><label className="label-base">대표자</label><input {...form.register('vendor_ceo')} className="input-base"/></div>
            <div><label className="label-base">사업자등록번호</label><input {...form.register('vendor_business_number')} className="input-base"/></div>
            <div><label className="label-base">주소</label><input {...form.register('vendor_address')} className="input-base"/></div>
            <div><label className="label-base">도급 공종 *</label><input {...form.register('work_type',{required:true})} placeholder="예: 철근콘크리트 공사" className="input-base"/></div>
            <div><label className="label-base">평가일 *</label><input {...form.register('evaluation_date')} type="date" className="input-base"/></div>
            <div><label className="label-base">계약 시작일</label><input {...form.register('contract_start')} type="date" className="input-base"/></div>
            <div><label className="label-base">계약 종료일</label><input {...form.register('contract_end')} type="date" className="input-base"/></div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div><h2 className="font-semibold text-gray-800">안전보건 능력 평가 항목</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">산안법 제61조 — 60점 이상 시 적격 (만점 {MAX_TOTAL}점)</p></div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{color: qualified?'#16a34a':'#dc2626'}}>{total}점</div>
              <div className="text-[10px]" style={{color: qualified?'#16a34a':'#dc2626'}}>{qualified?'적격':`부적격 (60% 미만)`}</div>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['분류','평가 항목','배점','취득점수','비고'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((f, idx) => (
                <tr key={f.id}>
                  <td className="px-3 py-2 text-gray-500">{items[idx]?.category}</td>
                  <td className="px-3 py-2 text-gray-800">{items[idx]?.item}</td>
                  <td className="px-3 py-2 text-center">{items[idx]?.max_score}점</td>
                  <td className="px-3 py-2">
                    <input {...form.register(`eval_items.${idx}.score`, {valueAsNumber:true})}
                      type="number" min={0} max={items[idx]?.max_score}
                      className="input-base py-1 text-center w-20"/>
                  </td>
                  <td className="px-3 py-2"><input {...form.register(`eval_items.${idx}.note`)} className="input-base py-1 text-xs"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">평가자</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">평가자 성명</label><input {...form.register('evaluator_name')} className="input-base"/></div>
            <div><label className="label-base">직위</label><input {...form.register('evaluator_position')} className="input-base"/></div>
          </div>
        </div>
      </form>
    </div>
  )
}
