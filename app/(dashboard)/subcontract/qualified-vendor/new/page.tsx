'use client'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, BarChart3, Plus, Trash2 } from 'lucide-react'

// 산안법 제61조 기반 기본 평가 항목(사용자 수정 가능)
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
  const { fields, append, remove } = useFieldArray({ control: form.control, name:'eval_items' })
  const items = form.watch('eval_items')
  const total = items.reduce((s: number, i: any) => s + (Number(i?.score) || 0), 0)
  const maxTotal = items.reduce((s: number, i: any) => s + (Number(i?.max_score) || 0), 0)
  const qualified = maxTotal > 0 && total >= maxTotal * 0.6

  async function onSubmit(data: any) {
    setSaving(true)
    const normalizedItems = (data.eval_items ?? [])
      .map((item: any) => {
        const maxScore = Math.max(0, Number(item.max_score) || 0)
        const score = Math.min(maxScore, Math.max(0, Number(item.score) || 0))
        return {
          category: String(item.category ?? '').trim(),
          item: String(item.item ?? '').trim(),
          max_score: maxScore,
          score,
          note: String(item.note ?? '').trim(),
        }
      })
      .filter((item: any) => item.category || item.item || item.max_score || item.score || item.note)

    const totalScore = normalizedItems.reduce((sum: number, item: any) => sum + (Number(item.score) || 0), 0)
    const maxTotalScore = normalizedItems.reduce((sum: number, item: any) => sum + (Number(item.max_score) || 0), 0)
    const isQualified = maxTotalScore > 0 && totalScore >= maxTotalScore * 0.6

    const res = await fetch('/api/subcontract/qualified-vendor', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        ...data,
        eval_items: normalizedItems,
        total_score: totalScore,
        is_qualified: isQualified,
      }),
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
              <p className="text-[10px] text-gray-400 mt-0.5">산안법 제61조 — 총 배점의 60% 이상 시 적격 (현재 만점 {maxTotal}점)</p></div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{color: qualified?'#16a34a':'#dc2626'}}>{total}점</div>
              <div className="text-[10px]" style={{color: qualified?'#16a34a':'#dc2626'}}>{qualified?'적격':`부적격 (기준 ${Math.ceil(maxTotal * 0.6)}점)`}</div>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['분류','평가 항목','배점','취득점수','비고','삭제'].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((f, idx) => (
                <tr key={f.id}>
                  <td className="px-3 py-2">
                    <input {...form.register(`eval_items.${idx}.category`)} className="input-base py-1 text-xs"/>
                  </td>
                  <td className="px-3 py-2">
                    <input {...form.register(`eval_items.${idx}.item`)} className="input-base py-1 text-xs"/>
                  </td>
                  <td className="px-3 py-2">
                    <input {...form.register(`eval_items.${idx}.max_score`, { valueAsNumber:true })}
                      type="number" min={0}
                      className="input-base py-1 text-center w-20"/>
                  </td>
                  <td className="px-3 py-2">
                    <input {...form.register(`eval_items.${idx}.score`, {valueAsNumber:true})}
                      type="number" min={0} max={Math.max(0, Number(items[idx]?.max_score) || 0)}
                      className="input-base py-1 text-center w-20"/>
                  </td>
                  <td className="px-3 py-2"><input {...form.register(`eval_items.${idx}.note`)} className="input-base py-1 text-xs"/></td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      disabled={fields.length === 1}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-40"
                      title="항목 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => append({ category:'', item:'', max_score:0, score:0, note:'' })}
              className="btn-secondary text-xs px-2.5 py-1.5 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              평가항목 추가
            </button>
          </div>
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
