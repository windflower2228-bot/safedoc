'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Loader2, Link2, Plus, Trash2, ClipboardCheck } from 'lucide-react'
import { RESULT_LABEL, type InspectionCheckItem, type InspectionResult } from '@/types/inspection'

const RESULTS = Object.entries(RESULT_LABEL) as [InspectionResult, string][]
const SITE_TEMPLATE_LABEL = {
  building: '건축현장 표준서식',
  civil: '토목현장 표준서식',
} as const
type SiteTemplateType = keyof typeof SITE_TEMPLATE_LABEL

const BUILDING_TEMPLATE_ITEMS = [
  '가설통로/작업발판 설치 상태 확인',
  '개구부 덮개·안전난간 설치 상태 확인',
  '비계·동바리·거푸집 변형/이완 여부 확인',
  '양중작업(타워크레인·호이스트) 작업반경 통제 상태 확인',
  '전기·용접 작업 화재예방 조치 확인',
  '보호구(안전모·안전화·안전대) 착용 상태 확인',
]

const CIVIL_TEMPLATE_ITEMS = [
  '굴착면 사면 안정 및 붕괴방지 상태 확인',
  '흙막이 가시설(버팀대·앵커) 변형/이탈 여부 확인',
  '중장비 작업구역 분리 및 유도자 배치 상태 확인',
  '토사·자재 적치 및 차량 동선 관리 상태 확인',
  '가시설 통로·출입통제 및 추락방호 상태 확인',
  '우천·배수·침수 대비 안전조치 이행 상태 확인',
]

interface FormData {
  inspection_type: string
  inspection_date: string
  inspector_name: string
  overall_opinion: string
}

type EditableItem = InspectionCheckItem & { _lid: number }

let _seq = 0
const newId = () => _seq++

export default function InspectionNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const riskId = searchParams.get('risk_id')

  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [riskInfo, setRiskInfo] = useState<{ id: string; title: string } | null>(null)
  const [siteTemplateType, setSiteTemplateType] = useState<SiteTemplateType>('building')
  const [checkItems, setCheckItems] = useState<EditableItem[]>(() =>
    BUILDING_TEMPLATE_ITEMS.map((checkContent, idx) => ({
      _lid: newId(),
      seq: idx + 1,
      category: 'other',
      check_content: checkContent,
      result: 'pass',
      defect_detail: '',
      action_required: '',
      action_deadline: '',
      action_owner: '',
      is_resolved: false,
      source_risk_item_id: null,
    }))
  )

  const form = useForm<FormData>({
    defaultValues: {
      inspection_type: 'routine',
      inspection_date: new Date().toISOString().slice(0, 10),
      inspector_name: '',
      overall_opinion: '',
    },
  })

  function buildItemsFromTemplate(type: SiteTemplateType): EditableItem[] {
    const items = type === 'civil' ? CIVIL_TEMPLATE_ITEMS : BUILDING_TEMPLATE_ITEMS
    return items.map((checkContent, idx) => ({
      _lid: newId(),
      seq: idx + 1,
      category: 'other',
      check_content: checkContent,
      result: 'pass' as InspectionResult,
      defect_detail: '',
      action_required: '',
      action_deadline: '',
      action_owner: '',
      is_resolved: false,
      source_risk_item_id: null,
    }))
  }

  function applySiteTemplate(type: SiteTemplateType) {
    setCheckItems(buildItemsFromTemplate(type))
    toast.success(`${SITE_TEMPLATE_LABEL[type]}을(를) 불러왔습니다. 필요시 항목을 수정해 사용하세요.`)
  }

  useEffect(() => {
    if (!riskId) return
    setGenerating(true)
    fetch('/api/documents/inspection/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ risk_id: riskId }),
    })
      .then((r) => r.json())
      .then((j) => {
        setGenerating(false)
        if (!j.data) return
        const d = j.data
        form.reset({
          inspection_type: d.inspection_type ?? 'routine',
          inspection_date: d.inspection_date ?? new Date().toISOString().slice(0, 10),
          inspector_name: d.inspector_name ?? '',
          overall_opinion: d.overall_opinion ?? '',
        })
        const generatedItems = (d.check_items ?? []).map((i: InspectionCheckItem, idx: number) => ({
          ...i,
          _lid: newId(),
          seq: idx + 1,
        }))
        setCheckItems(
          generatedItems.length > 0
            ? generatedItems
            : [
                {
                  _lid: newId(),
                  seq: 1,
                  category: 'other',
                  check_content: '',
                  result: 'pass',
                  defect_detail: '',
                  action_required: '',
                  action_deadline: '',
                  action_owner: '',
                  is_resolved: false,
                  source_risk_item_id: null,
                },
              ]
        )
        setRiskInfo({ id: riskId, title: j.data.link_summary.source_risk_title })
        toast.success(`위험성평가 연계 완료 — 점검 항목 ${generatedItems.length}건 자동 생성`)
      })
  }, [riskId, form])

  function updateItem(lid: number, field: 'check_content' | 'result' | 'action_required', value: string) {
    setCheckItems((prev) => prev.map((item) => (item._lid === lid ? { ...item, [field]: value } : item)))
  }

  function removeItem(lid: number) {
    setCheckItems((prev) => {
      const filtered = prev.filter((item) => item._lid !== lid)
      const base =
        filtered.length > 0
          ? filtered
          : [
              {
                _lid: newId(),
                seq: 1,
                category: 'other' as const,
                check_content: '',
                result: 'pass' as const,
                defect_detail: '',
                action_required: '',
                action_deadline: '',
                action_owner: '',
                is_resolved: false,
                source_risk_item_id: null,
              },
            ]
      return base.map((item, idx) => ({ ...item, seq: idx + 1 }))
    })
  }

  function addItem() {
    setCheckItems((prev) => [
      ...prev,
      {
        _lid: newId(),
        seq: prev.length + 1,
        category: 'other',
        check_content: '',
        result: 'pass',
        defect_detail: '',
        action_required: '',
        action_deadline: '',
        action_owner: '',
        is_resolved: false,
        source_risk_item_id: null,
      },
    ])
  }

  async function onSubmit(data: FormData) {
    const normalizedItems = checkItems
      .map(({ _lid, ...rest }, idx) => ({
        ...rest,
        seq: idx + 1,
        category: rest.category ?? 'other',
        check_content: String(rest.check_content ?? '').trim(),
        result: (rest.result ?? 'pass') as InspectionResult,
        action_required: String(rest.action_required ?? '').trim(),
        defect_detail: '',
        action_deadline: '',
        action_owner: '',
      }))
      .filter((item) => item.check_content || item.action_required)

    if (normalizedItems.length === 0) {
      toast.error('점검 항목을 최소 1개 입력해주세요.')
      return
    }

    setSaving(true)
    const payload = {
      ...data,
      source_risk_id: riskId ?? null,
      check_items: normalizedItems,
    }
    const res = await fetch('/api/documents/inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      toast.error(json.error)
      return
    }
    toast.success('순회점검일지가 작성되었습니다.')
    router.push(`/documents/inspection/${json.data.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            순회점검일지 작성
          </h1>
          {riskInfo && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600">
              <Link2 className="w-3.5 h-3.5" />
              위험성평가 연계: {riskInfo.title}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">
            취소
          </button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary" style={{ background: '#d97706' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      {generating && (
        <div className="card p-4 mb-4 bg-blue-50 border-blue-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">위험성평가 데이터를 분석하여 점검 항목을 자동 생성 중...</span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">점검 기본정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">점검 일자 *</label>
              <input {...form.register('inspection_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">점검자 성명 *</label>
              <input {...form.register('inspector_name', { required: true })} placeholder="홍길동" className="input-base" />
            </div>
            <div>
              <label className="label-base">표준서식 선택</label>
              <div className="flex gap-2 items-center">
                <select
                  value={siteTemplateType}
                  onChange={(e) => {
                    const nextType = e.target.value as SiteTemplateType
                    setSiteTemplateType(nextType)
                    applySiteTemplate(nextType)
                  }}
                  className="input-base"
                >
                  <option value="building">건축현장</option>
                  <option value="civil">토목현장</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-800">점검 항목</h2>
              <span className="text-xs text-gray-400">{checkItems.length}개</span>
            </div>
            <button type="button" onClick={addItem} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              항목 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ tableLayout: 'fixed', minWidth: '720px' }}>
              <colgroup>
                <col style={{ width: 36 }} />
                <col />
                <col style={{ width: 120 }} />
                <col style={{ width: 220 }} />
                <col style={{ width: 40 }} />
              </colgroup>
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  {['#', '점검내용', '점검결과', '조치사항', ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-amber-800">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checkItems.map((item, idx) => (
                  <tr key={item._lid} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-2 py-2 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.check_content}
                        onChange={(e) => updateItem(item._lid, 'check_content', e.target.value)}
                        className="w-full bg-transparent text-xs outline-none focus:bg-amber-50 focus:rounded focus:px-1"
                        placeholder="점검 내용을 입력하세요."
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={item.result}
                        onChange={(e) => updateItem(item._lid, 'result', e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white"
                      >
                        {RESULTS.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.action_required}
                        onChange={(e) => updateItem(item._lid, 'action_required', e.target.value)}
                        className="w-full bg-transparent text-xs outline-none focus:bg-amber-50 focus:rounded focus:px-1"
                        placeholder="필요 조치사항을 입력하세요."
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button type="button" onClick={() => removeItem(item._lid)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">기타 특이사항</h2>
          <textarea
            {...form.register('overall_opinion')}
            rows={4}
            className="input-base resize-none text-sm"
            placeholder="기타 특이사항을 입력하세요."
          />
        </div>
      </form>
    </div>
  )
}
