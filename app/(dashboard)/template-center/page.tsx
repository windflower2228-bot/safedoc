'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Settings2,
  Upload,
  CheckCircle2,
  FilePlus2,
  Save,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import type { CompanyTemplateConfig, CompanyTemplateItem, TemplateDocType } from '@/lib/templates/catalog'

type DocTypeInfo = { key: TemplateDocType; label: string }

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: "Noto Sans KR", sans-serif; margin: 18mm; color: #111827; }
    h1 { margin: 0 0 12px; font-size: 24px; }
    .meta { margin-bottom: 16px; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #eff6ff; }
  </style>
</head>
<body>
  <h1>{{company_name}} - 회사 맞춤 서식</h1>
  <div class="meta">문서유형: {{doc_type}} | 문서번호: {{doc_number}} | 작성일: {{created_at}}</div>
  <table>
    <tr><th>항목</th><th>값</th></tr>
    <tr><td>담당자</td><td>{{author_name}}</td></tr>
    <tr><td>현장명</td><td>{{site_name}}</td></tr>
    <tr><td>메모</td><td>{{note}}</td></tr>
  </table>
</body>
</html>`

export default function TemplateCenterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingDocType, setUploadingDocType] = useState<TemplateDocType | null>(null)

  const [docTypes, setDocTypes] = useState<DocTypeInfo[]>([])
  const [config, setConfig] = useState<CompanyTemplateConfig | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [selectedTemplateByType, setSelectedTemplateByType] = useState<Record<string, string>>({})

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerDocType, setComposerDocType] = useState<TemplateDocType>('risk_assessment')
  const [composerName, setComposerName] = useState('')
  const [composerDescription, setComposerDescription] = useState('')
  const [composerHtml, setComposerHtml] = useState(DEFAULT_HTML_TEMPLATE)

  const templatesByType = useMemo(() => {
    const grouped: Record<string, CompanyTemplateItem[]> = {}
    for (const item of config?.templates ?? []) {
      if (!grouped[item.docType]) grouped[item.docType] = []
      grouped[item.docType].push(item)
    }
    return grouped
  }, [config])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/template-center', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '서식 설정을 불러오지 못했습니다.')
      setDocTypes(json.docTypes ?? [])
      setConfig(json.config ?? null)
      setCanEdit(Boolean(json.canEdit))

      const selected: Record<string, string> = {}
      for (const dt of json.docTypes ?? []) {
        const active = json.config?.bindings?.[dt.key]?.activeTemplateId
        if (active) selected[dt.key] = active
      }
      setSelectedTemplateByType(selected)
    } catch (error: any) {
      toast.error(error?.message ?? '서식 설정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function postAction(payload: any) {
    setSaving(true)
    try {
      const res = await fetch('/api/template-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '요청에 실패했습니다.')
      if (json.config) setConfig(json.config)
      return json
    } catch (error: any) {
      toast.error(error?.message ?? '요청 처리 중 오류가 발생했습니다.')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function onSetStandard(docType: TemplateDocType) {
    const json = await postAction({ action: 'set_mode', docType, mode: 'standard' })
    if (json) toast.success('표준 서식으로 변경되었습니다.')
  }

  async function onSetCustom(docType: TemplateDocType) {
    const activeTemplateId = selectedTemplateByType[docType] || null
    const json = await postAction({ action: 'set_mode', docType, mode: 'custom', activeTemplateId })
    if (json) toast.success('회사 서식이 적용되었습니다.')
  }

  async function onActivateTemplate(templateId: string) {
    const json = await postAction({ action: 'activate_template', templateId })
    if (json) toast.success('선택한 서식을 기본 회사 서식으로 적용했습니다.')
  }

  async function onDeleteTemplate(templateId: string) {
    if (!confirm('이 서식을 삭제할까요?')) return
    const json = await postAction({ action: 'delete_template', templateId })
    if (json) toast.success('서식을 삭제했습니다.')
  }

  function openUpload(docType: TemplateDocType) {
    setUploadingDocType(docType)
    fileInputRef.current?.click()
  }

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const docType = uploadingDocType
    e.target.value = ''
    if (!file || !docType) return

    const fd = new FormData()
    fd.append('docType', docType)
    fd.append('name', file.name.replace(/\.[^.]+$/, ''))
    fd.append('description', '파일 업로드로 등록된 회사 맞춤 서식')
    fd.append('file', file)

    setSaving(true)
    try {
      const res = await fetch('/api/template-center', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '서식 업로드에 실패했습니다.')
      if (json.config) setConfig(json.config)
      setSelectedTemplateByType((prev) => ({ ...prev, [docType]: json.item?.id ?? prev[docType] }))
      toast.success('회사 서식을 업로드하고 바로 적용했습니다.')
    } catch (error: any) {
      toast.error(error?.message ?? '서식 업로드에 실패했습니다.')
    } finally {
      setSaving(false)
      setUploadingDocType(null)
    }
  }

  async function onCreateTemplate() {
    if (!composerName.trim()) {
      toast.error('서식 이름을 입력해주세요.')
      return
    }
    if (!composerHtml.trim()) {
      toast.error('서식 HTML을 입력해주세요.')
      return
    }
    const fd = new FormData()
    fd.append('docType', composerDocType)
    fd.append('name', composerName.trim())
    fd.append('description', composerDescription.trim())
    fd.append('fileName', `${composerName.trim()}.html`)
    fd.append('htmlContent', composerHtml)

    setSaving(true)
    try {
      const res = await fetch('/api/template-center', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '서식 생성에 실패했습니다.')
      if (json.config) setConfig(json.config)
      setSelectedTemplateByType((prev) => ({ ...prev, [composerDocType]: json.item?.id ?? prev[composerDocType] }))
      toast.success('회사 맞춤 서식을 생성하고 적용했습니다.')
      setComposerOpen(false)
      setComposerDescription('')
      setComposerName('')
    } catch (error: any) {
      toast.error(error?.message ?? '서식 생성에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-56">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onUploadFile}
        accept=".html,.htm,.pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
      />

      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-teal-600" />
              서식 관리센터
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              회사별로 표준 서식과 맞춤 서식을 문서유형 단위로 선택할 수 있습니다.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setComposerOpen((v) => !v)} disabled={!canEdit || saving}>
            <FilePlus2 className="w-4 h-4" />
            {composerOpen ? '서식 편집기 닫기' : '새 서식 만들기'}
          </button>
        </div>
        {!canEdit && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            현재 계정은 조회만 가능합니다. 회사 맞춤 서식 추가/삭제/적용은 관리자 계정에서 가능합니다.
          </div>
        )}
      </div>

      {composerOpen && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FilePlus2 className="w-4 h-4 text-teal-600" />
            회사 맞춤 서식 편집기
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label-base">문서유형</label>
              <select
                className="input-base"
                value={composerDocType}
                onChange={(e) => setComposerDocType(e.target.value as TemplateDocType)}
              >
                {docTypes.map((dt) => (
                  <option key={dt.key} value={dt.key}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">서식 이름</label>
              <input
                className="input-base"
                value={composerName}
                onChange={(e) => setComposerName(e.target.value)}
                placeholder="예: 우리회사 위험성평가 표준서식 v1"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="label-base">설명</label>
            <input
              className="input-base"
              value={composerDescription}
              onChange={(e) => setComposerDescription(e.target.value)}
              placeholder="예: 대외 제출용 양식"
            />
          </div>
          <div>
            <label className="label-base">HTML 서식 코드</label>
            <textarea
              className="input-base font-mono text-[12px] min-h-[260px]"
              value={composerHtml}
              onChange={(e) => setComposerHtml(e.target.value)}
            />
            <p className="text-[11px] text-gray-500 mt-2">
              사용 가능 토큰 예시: <code>{'{{company_name}}'}</code>, <code>{'{{doc_type}}'}</code>, <code>{'{{doc_number}}'}</code>, <code>{'{{created_at}}'}</code>
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={onCreateTemplate} disabled={!canEdit || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              서식 생성 및 적용
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {docTypes.map((dt) => {
          const binding = config?.bindings?.[dt.key]
          const templates = templatesByType[dt.key] ?? []
          const selectedTemplateId = selectedTemplateByType[dt.key] || templates[0]?.id || ''
          const activeTemplateId = binding?.activeTemplateId ?? null
          const activeTemplate = templates.find((item) => item.id === activeTemplateId) || null

          return (
            <div key={dt.key} className="card p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900">{dt.label}</h2>
                    <span
                      className={
                        binding?.mode === 'custom'
                          ? 'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-700'
                          : 'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700'
                      }
                    >
                      {binding?.mode === 'custom' ? '회사 서식 사용 중' : '표준 서식 사용 중'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    현재 활성 서식: {activeTemplate ? activeTemplate.name : '표준 서식'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" onClick={() => onSetStandard(dt.key)} disabled={!canEdit || saving}>
                    <ShieldCheck className="w-4 h-4" />
                    표준 서식 사용
                  </button>
                  <button className="btn-secondary" onClick={() => openUpload(dt.key)} disabled={!canEdit || saving}>
                    <Upload className="w-4 h-4" />
                    회사 서식 업로드
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 mt-4">
                <select
                  className="input-base"
                  value={selectedTemplateId}
                  onChange={(e) =>
                    setSelectedTemplateByType((prev) => ({
                      ...prev,
                      [dt.key]: e.target.value,
                    }))
                  }
                >
                  {templates.length === 0 && <option value="">등록된 회사 서식이 없습니다.</option>}
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.fileName})
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  onClick={() => onSetCustom(dt.key)}
                  disabled={!canEdit || saving || templates.length === 0}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  회사 서식 적용
                </button>
              </div>

              {templates.length > 0 && (
                <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-3 py-2">서식명</th>
                        <th className="text-left px-3 py-2">파일</th>
                        <th className="text-left px-3 py-2">등록자</th>
                        <th className="text-left px-3 py-2">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((template) => (
                        <tr key={template.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-800">
                            <div className="font-medium">{template.name}</div>
                            {template.description && <div className="text-[11px] text-gray-500">{template.description}</div>}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{template.fileName}</td>
                          <td className="px-3 py-2 text-gray-600">{template.createdBy}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <a href={template.publicUrl} target="_blank" rel="noreferrer" className="btn-secondary !px-2 !py-1 !text-xs">
                                <ExternalLink className="w-3.5 h-3.5" />
                                열기
                              </a>
                              <button className="btn-secondary !px-2 !py-1 !text-xs" onClick={() => onActivateTemplate(template.id)} disabled={!canEdit || saving}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                적용
                              </button>
                              <button className="btn-danger !px-2 !py-1 !text-xs" onClick={() => onDeleteTemplate(template.id)} disabled={!canEdit || saving}>
                                <Trash2 className="w-3.5 h-3.5" />
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

