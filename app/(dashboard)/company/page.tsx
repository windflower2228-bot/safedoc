'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  Building2, Upload, Save, Loader2, X, Eye,
  FileText, ImageIcon, CheckCircle2,
} from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'

interface CompanyInfo {
  id: string; name: string
  logo_url: string | null; logo_name: string | null
  doc_header_type: 'logo_only' | 'name_only' | 'logo_and_name' | 'custom'
  doc_header_custom: string | null
  address: string | null; ceo_name: string | null
  business_number: string | null; safety_manager: string | null
  phone: string | null; fax: string | null
}

const HEADER_TYPES = [
  { value: 'logo_and_name', label: '로고 + 회사명', desc: '가장 일반적인 형태' },
  { value: 'logo_only',     label: '로고만',        desc: '로고가 충분히 큰 경우' },
  { value: 'name_only',     label: '회사명만',       desc: '텍스트 헤더' },
  { value: 'custom',        label: '직접 입력',      desc: 'HTML 자유 입력' },
] as const

export default function CompanySettingsPage() {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [info,        setInfo]       = useState<CompanyInfo | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [saving,      setSaving]     = useState(false)
  const [uploading,   setUploading]  = useState(false)
  const [previewLogo, setPreview]    = useState<string | null>(null)

  // 폼 상태
  const [form, setForm] = useState({
    name: '', address: '', ceo_name: '', business_number: '',
    safety_manager: '', phone: '', fax: '',
    doc_header_type: 'logo_and_name' as CompanyInfo['doc_header_type'],
    doc_header_custom: '',
  })

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(j => {
      setLoading(false)
      if (!j.data) return
      const d = j.data as CompanyInfo
      setInfo(d)
      setForm({
        name:              d.name ?? '',
        address:           d.address ?? '',
        ceo_name:          d.ceo_name ?? '',
        business_number:   d.business_number ?? '',
        safety_manager:    d.safety_manager ?? '',
        phone:             d.phone ?? '',
        fax:               d.fax ?? '',
        doc_header_type:   d.doc_header_type ?? 'logo_and_name',
        doc_header_custom: d.doc_header_custom ?? '',
      })
    })
  }, [])

  // 로고 업로드
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('파일 크기는 2MB 이하여야 합니다.'); return }

    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `logos/${info?.id ?? 'temp'}_${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload(path, file, { upsert: true })

    if (error) { toast.error('업로드 실패: ' + error.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path)
    const logoUrl = urlData.publicUrl

    // DB 저장
    await fetch('/api/company', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url: logoUrl, logo_name: file.name }),
    })

    setUploading(false)
    setInfo(prev => prev ? { ...prev, logo_url: logoUrl, logo_name: file.name } : prev)
    setPreview(logoUrl)
    toast.success('로고가 업로드되었습니다.')
  }

  // 로고 삭제
  async function removeLogo() {
    await fetch('/api/company', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url: null, logo_name: null }),
    })
    setInfo(prev => prev ? { ...prev, logo_url: null, logo_name: null } : prev)
    setPreview(null)
    toast.success('로고가 삭제되었습니다.')
  }

  // 회사 정보 저장
  async function handleSave() {
    setSaving(true)
    const res  = await fetch('/api/company', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    setInfo(prev => prev ? { ...prev, ...form } : prev)
    toast.success('회사 정보가 저장되었습니다.')
  }

  const logoSrc = previewLogo ?? info?.logo_url

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300"/>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600"/>
            회사·현장 관리
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">로고와 회사 정보는 모든 문서 헤더에 자동 반영됩니다.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
          저장
        </button>
      </div>

      <div className="space-y-5">
        {/* 로고 업로드 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-500"/>
            회사 로고
          </h2>

          <div className="flex items-start gap-6">
            {/* 로고 미리보기 */}
            <div className="flex-shrink-0">
              {logoSrc ? (
                <div className="relative">
                  <div className="w-32 h-20 border-2 border-gray-100 rounded-xl flex items-center justify-center bg-white overflow-hidden">
                    <img src={logoSrc} alt="회사 로고" className="max-w-full max-h-full object-contain p-1"/>
                  </div>
                  <button onClick={removeLogo}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                    <X className="w-3 h-3"/>
                  </button>
                </div>
              ) : (
                <div className="w-32 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50">
                  <ImageIcon className="w-8 h-8 text-gray-300"/>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                {logoSrc ? info?.logo_name : '로고 없음'}
              </p>
            </div>

            {/* 업로드 버튼 및 안내 */}
            <div className="flex-1">
              <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-blue-100 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all bg-white">
                {uploading
                  ? <><Loader2 className="w-5 h-5 text-blue-500 animate-spin"/><span className="text-sm text-blue-600">업로드 중...</span></>
                  : <><Upload className="w-5 h-5 text-blue-400"/><span className="text-sm text-gray-600 font-medium">로고 이미지 업로드</span><span className="text-xs text-gray-400">PNG, JPG, SVG · 최대 2MB</span></>}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="hidden"/>
              </label>
              <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-0.5">
                <p>✓ 투명 배경 PNG를 권장합니다.</p>
                <p>✓ 권장 크기: 가로 300px 이상, 세로 100px 이하</p>
                <p>✓ 저장된 로고는 위험성평가, 교육일지 등 모든 문서 상단에 자동 표시됩니다.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 문서 헤더 스타일 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500"/>
            문서 헤더 스타일
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {HEADER_TYPES.map(ht => (
              <label key={ht.value}
                className={clsx(
                  'flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all',
                  form.doc_header_type === ht.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}>
                <input type="radio" value={ht.value}
                  checked={form.doc_header_type === ht.value}
                  onChange={() => setForm(f => ({ ...f, doc_header_type: ht.value as any }))}
                  className="mt-0.5 accent-blue-600"/>
                <div>
                  <div className="text-sm font-medium text-gray-800">{ht.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{ht.desc}</div>
                </div>
                {form.doc_header_type === ht.value && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto flex-shrink-0"/>
                )}
              </label>
            ))}
          </div>

          {form.doc_header_type === 'custom' && (
            <div>
              <label className="label-base">커스텀 헤더 내용</label>
              <textarea
                value={form.doc_header_custom}
                onChange={e => setForm(f => ({ ...f, doc_header_custom: e.target.value }))}
                rows={3} placeholder="회사명 또는 헤더에 표시할 텍스트를 입력하세요."
                className="input-base resize-none"/>
            </div>
          )}

          {/* 헤더 미리보기 */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5"/>
              문서 헤더 미리보기
            </div>
            <DocHeaderPreview
              logoUrl={logoSrc}
              companyName={form.name || info?.name || '회사명'}
              headerType={form.doc_header_type}
              customText={form.doc_header_custom}
            />
          </div>
        </div>

        {/* 회사 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500"/>
            회사 기본정보
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key:'name',            label:'회사명 *',        placeholder:'(주)한국건설' },
              { key:'business_number', label:'사업자등록번호',   placeholder:'000-00-00000' },
              { key:'ceo_name',        label:'대표자',           placeholder:'홍길동' },
              { key:'safety_manager',  label:'안전보건관리책임자',placeholder:'김안전' },
              { key:'phone',           label:'전화번호',         placeholder:'02-0000-0000' },
              { key:'fax',             label:'팩스번호',         placeholder:'02-0000-0001' },
            ].map(f => (
              <div key={f.key}>
                <label className="label-base">{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="input-base"/>
              </div>
            ))}
            <div className="col-span-2">
              <label className="label-base">주소</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="서울특별시 강남구 테헤란로 00길 00"
                className="input-base"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 문서 헤더 미리보기 컴포넌트 ─────────────────────────────
function DocHeaderPreview({
  logoUrl, companyName, headerType, customText,
}: {
  logoUrl: string | null; companyName: string
  headerType: CompanyInfo['doc_header_type']; customText: string | null
}) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* 문서 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b-2 border-gray-800">
        <div className="flex items-center gap-3">
          {(headerType === 'logo_and_name' || headerType === 'logo_only') && logoUrl && (
            <img src={logoUrl} alt="로고" className="h-8 object-contain"/>
          )}
          {(headerType === 'logo_and_name' || headerType === 'name_only') && (
            <span className="text-sm font-bold text-gray-900">{companyName}</span>
          )}
          {headerType === 'custom' && (
            <span className="text-sm font-bold text-gray-900">{customText || companyName}</span>
          )}
          {!logoUrl && headerType !== 'name_only' && headerType !== 'custom' && (
            <span className="text-xs text-gray-300 italic">로고 미등록</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-gray-900">안전보건교육일지</div>
          <div className="text-[10px] text-gray-500">문서번호: 교육-2025-001</div>
        </div>
      </div>
      {/* 문서 내용 시뮬레이션 */}
      <div className="px-5 py-4 space-y-2">
        <div className="h-2 bg-gray-100 rounded w-3/4"/>
        <div className="h-2 bg-gray-100 rounded w-1/2"/>
        <div className="h-2 bg-gray-100 rounded w-2/3"/>
      </div>
    </div>
  )
}
