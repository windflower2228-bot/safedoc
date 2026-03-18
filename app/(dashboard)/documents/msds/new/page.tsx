'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  FlaskConical, Upload, Save, Loader2, BookOpen,
  X, Check, AlertTriangle, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import {
  GHS_LABELS, GHS_COLORS,
  type GhsHazardClass, type MsdsRecord,
} from '@/types/msds'

const GHS_LIST = Object.entries(GHS_LABELS) as [GhsHazardClass, string][]

interface FormData {
  product_name:     string
  product_code:     string
  cas_number:       string
  un_number:        string
  manufacturer:     string
  signal_word:      'danger' | 'warning' | ''
  main_components:  string
  first_aid_eye:    string
  first_aid_skin:   string
  first_aid_inhale: string
  first_aid_ingest: string
  fire_fighting:    string
  spill_handling:   string
  handling_storage: string
  exposure_limit:   string
  ppe_required:     string
  revision_date:    string
  is_public:        boolean
}

export default function NewMsdsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [saving,      setSaving]      = useState(false)
  const [genEdu,      setGenEdu]      = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [uploadedFile, setUploaded]   = useState<{ url: string; name: string } | null>(null)
  const [ghs, setGhs]                 = useState<GhsHazardClass[]>([])
  const [savedId,     setSavedId]     = useState<string | null>(null)

  const form = useForm<FormData>({
    defaultValues: {
      product_name: '', product_code: '', cas_number: '', un_number: '',
      manufacturer: '', signal_word: '', main_components: '',
      first_aid_eye: '', first_aid_skin: '', first_aid_inhale: '', first_aid_ingest: '',
      fire_fighting: '', spill_handling: '',
      handling_storage: '', exposure_limit: '', ppe_required: '',
      revision_date: '', is_public: false,
    },
  })

  // GHS 토글
  function toggleGhs(h: GhsHazardClass) {
    setGhs(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])
  }

  // 파일 업로드 (Supabase Storage)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `msds/${Date.now()}_${file.name}`

    const { data, error } = await supabase.storage
      .from('msds-files')
      .upload(path, file, { upsert: true })

    setUploading(false)
    if (error) { toast.error('파일 업로드에 실패했습니다.'); return }

    const { data: urlData } = supabase.storage.from('msds-files').getPublicUrl(path)
    setUploaded({ url: urlData.publicUrl, name: file.name })
    toast.success('파일이 업로드되었습니다.')
  }

  // MSDS 저장
  async function onSave() {
    const v = form.getValues()
    if (!v.product_name) { toast.error('제품명을 입력해주세요.'); return }

    setSaving(true)
    const res  = await fetch('/api/documents/msds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...v,
        signal_word: v.signal_word || null,
        ghs_hazards: ghs,
        file_url:    uploadedFile?.url ?? null,
        file_name:   uploadedFile?.name ?? null,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    setSavedId(json.data.id)
    toast.success('MSDS가 등록되었습니다. 법적 분류를 자동 분석합니다...')

    // 저장 직후 법적 분류 자동 분석 (백그라운드)
    const newId = json.data.id
    Promise.all([
      fetch(`/api/documents/msds/${newId}/analyze-legal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legal_text: '' }),
      }),
      fetch(`/api/documents/msds/${newId}/check-special`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legal_text: '' }),
      }),
    ]).then(() => {
      toast.success('법적 분류 자동 분석이 완료되었습니다.')
    }).catch(() => {})

    router.push(`/documents/msds/${newId}`)
  }

  // 교육일지 자동 생성
  async function handleGenEdu() {
    if (!savedId) {
      // 먼저 저장
      const v = form.getValues()
      if (!v.product_name) { toast.error('제품명을 먼저 입력해주세요.'); return }
      setSaving(true)
      const res  = await fetch('/api/documents/msds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...v,
          signal_word: v.signal_word || null,
          ghs_hazards: ghs,
          file_url:    uploadedFile?.url ?? null,
          file_name:   uploadedFile?.name ?? null,
        }),
      })
      const json = await res.json()
      setSaving(false)
      if (!res.ok) { toast.error(json.error); return }
      const newId = json.data.id
      setSavedId(newId)
      // 바로 교육일지 생성
      setGenEdu(true)
      const eduRes = await fetch(`/api/documents/msds/${newId}/generate-edu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save: true }),
      })
      const eduJson = await eduRes.json()
      setGenEdu(false)
      if (!eduRes.ok) { toast.error(eduJson.error); return }
      toast.success('MSDS 교육일지가 자동 생성되었습니다!')
      router.push(`/documents/education/${eduJson.data.id}`)
      return
    }

    setGenEdu(true)
    const res  = await fetch(`/api/documents/msds/${savedId}/generate-edu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ save: true }),
    })
    const json = await res.json()
    setGenEdu(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('MSDS 교육일지가 자동 생성되었습니다!')
    router.push(`/documents/education/${json.data.id}`)
  }

  const productName = form.watch('product_name')

  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-600" />
            MSDS 등록
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">등록 후 교육일지를 자동으로 생성할 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={handleGenEdu} disabled={genEdu || saving}
            className="btn-secondary gap-1.5">
            {genEdu ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4 text-blue-500" />}
            교육일지 자동 생성
          </button>
          <button onClick={onSave} disabled={saving}
            className="btn-primary" style={{ background: '#0891b2' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 섹션 1: 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 text-xs flex items-center justify-center font-bold">1</span>
            제품 기본정보
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-base">제품명 (물질명) *</label>
              <input {...form.register('product_name')} placeholder="예: 에폭시 수지 (EP-100)"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">제품 코드</label>
              <input {...form.register('product_code')} placeholder="EP-100" className="input-base" />
            </div>
            <div>
              <label className="label-base">CAS 번호</label>
              <input {...form.register('cas_number')} placeholder="25068-38-6" className="input-base font-mono" />
            </div>
            <div>
              <label className="label-base">UN 번호</label>
              <input {...form.register('un_number')} placeholder="UN1866" className="input-base font-mono" />
            </div>
            <div>
              <label className="label-base">제조사</label>
              <input {...form.register('manufacturer')} placeholder="(주)화학사" className="input-base" />
            </div>
            <div>
              <label className="label-base">개정일</label>
              <input {...form.register('revision_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">주요 구성성분</label>
              <input {...form.register('main_components')} placeholder="비스페놀A 에폭시 수지 50~80%" className="input-base" />
            </div>
          </div>

          {/* 공용 자료 여부 */}
          <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" {...form.register('is_public')}
                className="w-4 h-4 accent-cyan-600" />
              <span className="text-gray-700 font-medium">공용 자료로 등록</span>
            </label>
            <span className="text-xs text-gray-400">켜면 다른 회사 사용자도 이 MSDS를 조회·활용할 수 있습니다.</span>
          </div>
        </div>

        {/* 섹션 2: GHS 유해성 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold">2</span>
            GHS 유해성·위험성 분류
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {GHS_LIST.map(([key, label]) => {
              const selected = ghs.includes(key)
              const colors   = GHS_COLORS[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleGhs(key)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    selected
                      ? `${colors.bg} ${colors.text} border-current`
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {label}
                </button>
              )
            })}
          </div>
          <div>
            <label className="label-base">신호어 (Signal Word)</label>
            <select {...form.register('signal_word')} className="input-base max-w-xs">
              <option value="">선택 안함</option>
              <option value="danger">위험 (Danger)</option>
              <option value="warning">경고 (Warning)</option>
            </select>
          </div>
        </div>

        {/* 섹션 4: 응급조치 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs flex items-center justify-center font-bold">4</span>
            응급조치 요령
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'first_aid_eye',    label: '눈에 들어갔을 때' },
              { name: 'first_aid_skin',   label: '피부에 접촉했을 때' },
              { name: 'first_aid_inhale', label: '흡입했을 때' },
              { name: 'first_aid_ingest', label: '섭취했을 때' },
            ].map(f => (
              <div key={f.name}>
                <label className="label-base">{f.label}</label>
                <textarea
                  {...form.register(f.name as keyof FormData)}
                  rows={2}
                  placeholder="즉시 맑은 물로 15분 이상 씻고 의사의 진료를 받으시오."
                  className="input-base resize-none text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 섹션 7~8: 취급·저장 / 노출방지 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">7</span>
            취급·저장 및 노출방지
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label-base">취급·저장 주의사항</label>
              <textarea {...form.register('handling_storage')} rows={3}
                placeholder="직사광선을 피하고 서늘하고 건조한 장소에 보관. 화기엄금."
                className="input-base resize-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">노출기준 (TWA / STEL)</label>
                <input {...form.register('exposure_limit')} placeholder="TWA: 1 ppm" className="input-base text-sm" />
              </div>
              <div>
                <label className="label-base">필요 보호구</label>
                <input {...form.register('ppe_required')}
                  placeholder="방독마스크, 화학보호장갑, 보안경"
                  className="input-base text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">소화방법</label>
                <input {...form.register('fire_fighting')} placeholder="포말·분말·CO2 소화기 사용" className="input-base text-sm" />
              </div>
              <div>
                <label className="label-base">누출 시 조치</label>
                <input {...form.register('spill_handling')} placeholder="누출 즉시 환기 후 흡착포로 수거" className="input-base text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* 파일 업로드 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-600" />
            MSDS 원본 파일 첨부 <span className="text-xs text-gray-400 font-normal">(선택)</span>
          </h2>

          {uploadedFile ? (
            <div className="flex items-center gap-3 p-3 bg-cyan-50 rounded-xl border border-cyan-200">
              <FlaskConical className="w-5 h-5 text-cyan-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-cyan-800">{uploadedFile.name}</div>
                <div className="text-xs text-cyan-500 mt-0.5">업로드 완료</div>
              </div>
              <button onClick={() => setUploaded(null)}
                className="p-1 text-cyan-400 hover:text-cyan-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-cyan-300 hover:bg-cyan-50/50 transition-all">
              {uploading
                ? <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                : <Upload className="w-6 h-6 text-gray-300" />}
              <div className="text-sm text-gray-500">
                {uploading ? '업로드 중...' : 'PDF, Word 파일을 드래그하거나 클릭하세요'}
              </div>
              <input type="file" accept=".pdf,.doc,.docx,.hwp"
                onChange={handleFileUpload} className="hidden" />
            </label>
          )}

          <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            파일을 업로드하면 상세 페이지에서 다운로드할 수 있습니다. 위 필드는 교육일지 자동 생성에 사용됩니다.
          </div>
        </div>

        {/* 교육일지 자동 생성 안내 */}
        {productName && ghs.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
            <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">교육일지 자동 생성 준비됨</p>
              <p className="text-xs text-blue-600 mt-0.5">
                저장과 동시에 <strong>"{productName} MSDS 교육일지"</strong>를 자동으로 만들 수 있습니다.
                GHS 유해성 {ghs.length}종이 교육 항목에 자동 반영됩니다.
              </p>
            </div>
            <button onClick={handleGenEdu} disabled={genEdu || saving}
              className="flex-shrink-0 btn-primary text-xs py-1.5"
              style={{ background: '#0891b2' }}>
              {genEdu ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              저장 + 교육일지 생성
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
