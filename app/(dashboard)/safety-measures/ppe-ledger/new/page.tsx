'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, HardHat, Plus, Trash2, Upload, Download, FileText } from 'lucide-react'

// 산안법 제38조 / 안전보건규칙 제32조 기반 보호구 종류
const PPE_TYPES = [
  '안전모 (추락·낙하물 위험)',
  '안전대 (추락 방지)',
  '안전화 (중·보통·저압)',
  '안전장갑',
  '방진마스크 (1급·2급·특급)',
  '방독마스크',
  '송기마스크',
  '전동식 호흡보호구',
  '보호복 (방열·방화·방수)',
  '차광보안경',
  '용접용 보안면',
  '방음 귀마개 (1종·2종)',
  '방음 귀덮개',
  '안전허리띠',
  '구명조끼',
  '기타 (직접 입력)',
]

const CONDITION_OPTIONS = ['신품', '양호', '보통', '불량']

interface FormValues {
  ledger_date:       string
  worker_name:       string
  worker_dept:       string
  worker_position:   string
  ppe_items: {
    name:         string
    spec:         string
    qty:          number
    condition:    string
    issued_date:  string
    return_date:  string
    serial_no:    string
    notes:        string
  }[]
  remarks: string
}

export default function NewPpeLedgerPage() {
  const router  = useRouter()
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [fileInputKey, setFileInputKey] = useState(0)

  const form = useForm<FormValues>({
    defaultValues: {
      ledger_date:     new Date().toISOString().slice(0, 10),
      worker_name:     '',
      worker_dept:     '',
      worker_position: '',
      ppe_items: [
        { name:'안전모 (추락·낙하물 위험)', spec:'ABS 재질, A형', qty:1, condition:'신품', issued_date: new Date().toISOString().slice(0,10), return_date:'', serial_no:'', notes:'' },
        { name:'안전대 (추락 방지)',         spec:'Y형 1개걸이용',   qty:1, condition:'신품', issued_date: new Date().toISOString().slice(0,10), return_date:'', serial_no:'', notes:'' },
        { name:'안전화 (중·보통·저압)',       spec:'중작업용 270mm', qty:1, condition:'신품', issued_date: new Date().toISOString().slice(0,10), return_date:'', serial_no:'', notes:'' },
      ],
      remarks: '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'ppe_items' })

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  function downloadTemplateCsv() {
    const today = new Date().toISOString().slice(0, 10)
    const rows = [
      ['지급일자', '근로자성명', '소속부서', '직위', '보호구종류', '규격형식', '수량', '상태', '지급일', '반납일', '관리번호', '비고'],
      [today, '홍길동', '안전팀', '반장', '안전모 (추락·낙하물 위험)', 'ABS 재질, A형', '1', '신품', today, '', 'SN-001', ''],
      [today, '홍길동', '안전팀', '반장', '안전화 (중·보통·저압)', '중작업용 270mm', '1', '신품', today, '', 'SN-002', ''],
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `보호구_지급대장_서식_${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('보호구 지급대장 서식을 다운로드했습니다.')
  }

  async function onSubmit(data: FormValues) {
    if (!data.worker_name.trim()) { toast.error('근로자 성명을 입력하세요.'); return }
    if (data.ppe_items.length === 0) { toast.error('보호구 항목을 1개 이상 추가하세요.'); return }
    setSaving(true)
    const res = await fetch('/api/safety-measures/ppe-ledger', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        ppe_items: data.ppe_items.map((item, i) => ({ ...item, seq: i + 1 })),
      }),
    })
    const json = await res.json()
    if (res.ok && files.length > 0) {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      const uploadRes = await fetch(`/api/safety-measures/ppe-ledger/${json.data.id}/attachments`, {
        method: 'POST',
        body: formData,
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) {
        toast.warning(`대장은 저장됐지만 첨부 업로드에 실패했습니다. (${uploadJson.error ?? '알 수 없는 오류'})`)
      }
    }
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success(`보호구 지급대장이 등록되었습니다.${files.length ? ` (첨부 ${files.length}건 저장)` : ''}`)
    setFiles([])
    setFileInputKey((k) => k + 1)
    router.push(`/safety-measures/ppe-ledger/${json.data.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures/ppe-ledger"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HardHat className="w-5 h-5 text-blue-600" />
              보호구 지급대장 작성
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              산안법 제38조 / 안전보건규칙 제32조 | 적격 보호구 지급 의무
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={downloadTemplateCsv} className="btn-secondary gap-1">
            <Download className="w-4 h-4" />
            서식 다운로드
          </button>
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary" style={{ background: '#2563eb' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">지급 정보</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label-base">지급 일자 *</label>
              <input {...form.register('ledger_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">근로자 성명 *</label>
              <input {...form.register('worker_name')} placeholder="홍길동" className="input-base" />
            </div>
            <div>
              <label className="label-base">소속 부서</label>
              <input {...form.register('worker_dept')} placeholder="안전팀" className="input-base" />
            </div>
            <div>
              <label className="label-base">직위</label>
              <input {...form.register('worker_position')} placeholder="반장" className="input-base" />
            </div>
          </div>
        </div>

        {/* 보호구 목록 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">보호구 지급 목록</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">안전보건규칙 제32조 — 작업 유형에 맞는 적격 보호구 지급</p>
            </div>
            <button type="button"
              onClick={() => append({ name:'', spec:'', qty:1, condition:'신품', issued_date: new Date().toISOString().slice(0,10), return_date:'', serial_no:'', notes:'' })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3" /> 항목 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-5">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500">보호구 종류</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-32">규격·형식</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-14">수량</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-20">상태</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-28">지급일</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-28">반납일</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-24">관리번호</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-500 w-24">비고</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((f, idx) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <select {...form.register(`ppe_items.${idx}.name`)}
                        className="input-base text-xs py-1">
                        {PPE_TYPES.map(t => <option key={t} value={t === '기타 (직접 입력)' ? '' : t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input {...form.register(`ppe_items.${idx}.spec`)}
                        placeholder="ABS, A형" className="input-base text-xs py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input {...form.register(`ppe_items.${idx}.qty`, { valueAsNumber: true })}
                        type="number" min={1} className="input-base text-xs py-1 text-center" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select {...form.register(`ppe_items.${idx}.condition`)}
                        className="input-base text-xs py-1">
                        {CONDITION_OPTIONS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input {...form.register(`ppe_items.${idx}.issued_date`)}
                        type="date" className="input-base text-xs py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input {...form.register(`ppe_items.${idx}.return_date`)}
                        type="date" className="input-base text-xs py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input {...form.register(`ppe_items.${idx}.serial_no`)}
                        placeholder="SN-001" className="input-base text-xs py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input {...form.register(`ppe_items.${idx}.notes`)}
                        className="input-base text-xs py-1" />
                    </td>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => remove(idx)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 첨부 파일 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">첨부 (현장 사진 / PDF 스캔본)</h2>
          <p className="text-xs text-gray-500 mb-3">
            사진 또는 PDF를 첨부하면 대장 저장 시 함께 보관됩니다. (최대 10개, 파일당 20MB)
          </p>
          <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/10 transition-all">
            <Upload className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              {files.length > 0 ? (
                <span className="text-sm text-gray-700">{files.length}개 파일 선택됨</span>
              ) : (
                <span className="text-sm text-gray-400">사진 촬영본 또는 PDF 스캔본 선택</span>
              )}
            </div>
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept="image/*,.pdf,application/pdf"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="hidden"
            />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between text-xs border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-gray-400 ml-3 flex-shrink-0">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 비고 + 서명 */}
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">비고</label>
              <textarea {...form.register('remarks')} rows={3}
                className="input-base resize-none text-sm"
                placeholder="특이사항을 기재하세요." />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
                <p className="font-semibold mb-1">안전보건규칙 제32조 (보호구 지급 의무)</p>
                <p>사업주는 근로자가 유해·위험 작업을 하는 경우 적격한 보호구를 지급하고 착용하도록 하여야 한다. 보호구는 안전인증(KCs) 또는 자율안전확인(KCs) 제품이어야 한다.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 border border-gray-200 rounded-xl">
                  <div className="text-xs text-gray-400 mb-6">지급자 서명</div>
                  <div className="text-xs text-gray-600">(인)</div>
                </div>
                <div className="text-center p-3 border border-gray-200 rounded-xl">
                  <div className="text-xs text-gray-400 mb-6">수령자 서명</div>
                  <div className="text-xs text-gray-600">(인)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
