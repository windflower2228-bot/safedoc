'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, RefreshCw, Upload, X,
  Sparkles, AlertTriangle, CheckCircle2, Edit3, Plus, Trash2,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 ─────────────────────────────────────────────────────
interface RiskItem {
  seq:               number
  work_content:      string
  hazard_factor:     string
  hazard_type:       string
  photo_url?:        string
  ai_generated:      boolean
  user_edited:       boolean
  // 위험성 결정 (지침 제11조)
  probability:       number   // 1~5
  severity:          number   // 1~5
  risk_score:        number
  risk_level:        'low' | 'medium' | 'high'
  // 위험성 감소대책 (지침 제12조)
  measure_engineering: string
  measure_admin:       string
  measure_ppe:         string
  measure_owner:       string
  measure_due_date:    string
  measure_done:        boolean
}

const HAZARD_TYPES = [
  '떨어짐',
  '넘어짐',
  '깔림/뒤집힘',
  '부딪힘',
  '물체에 맞음',
  '무너짐',
  '끼임',
  '절단/베임/찔림',
  '화재/폭발/파열',
  '무리한동작',
  '업무상질병',
  '기타',
]
const OCCASION_TYPES = [
  { value:'construction_change', label:'건설물 설치·이전·변경·해체' },
  { value:'equipment_new',       label:'기계·기구·설비·원재료 신규 도입·변경' },
  { value:'maintenance',         label:'건설물·기계·기구·설비 정비·보수' },
  { value:'method_change',       label:'작업방법·절차 신규 도입·변경' },
  { value:'accident',            label:'중대산업사고·산업재해 발생' },
  { value:'other',               label:'그 밖에 사업주가 필요하다고 판단한 경우' },
]

function calcRisk(prob: number, sev: number): { score: number; level: 'low'|'medium'|'high' } {
  const score = prob * sev
  const level = score >= 15 ? 'high' : score >= 8 ? 'medium' : 'low'
  return { score, level }
}

const RISK_CFG = {
  high:   { label: '高위험', cls: 'bg-red-100 text-red-700',    border: 'border-red-300' },
  medium: { label: '中위험', cls: 'bg-amber-100 text-amber-700', border: 'border-amber-300' },
  low:    { label: '低위험', cls: 'bg-green-100 text-green-700', border: 'border-green-300' },
}

// ─── AI 분석 프롬프트 빌더 ────────────────────────────────────
function buildAnalysisPrompt(): string {
  return `당신은 대한민국 산업안전보건법 전문가입니다. 
업로드된 작업 현장 사진을 분석하여 「사업장 위험성평가에 관한 지침」(고용노동부고시 제2024-76호)에 따라 수시 위험성평가를 실시해주세요.

**분석 항목:**
1. 유해·위험요인 파악 (지침 제10조): 사진에서 보이는 모든 유해위험요인
2. 위험성 결정 (지침 제11조): 발생 가능성(1~5) × 중대성(1~5) = 위험성 점수
3. 위험성 감소대책 수립 (지침 제12조): 공학적·관리적·보호구 대책

**반드시 JSON 배열로만 응답하세요. 다른 텍스트 없이 JSON만:**
[
  {
    "work_content": "작업 내용 (사진에서 파악된 작업)",
    "hazard_factor": "유해·위험요인 (구체적으로)",
    "hazard_type": "떨어짐|넘어짐|깔림/뒤집힘|부딪힘|물체에 맞음|무너짐|끼임|절단/베임/찔림|화재/폭발/파열|무리한동작|업무상질병|기타",
    "probability": 1~5 숫자,
    "severity": 1~5 숫자,
    "measure_engineering": "공학적 대책 (설비·시설 개선)",
    "measure_admin": "관리적 대책 (교육·절차·감독)",
    "measure_ppe": "보호구 대책"
  }
]

**평가 기준:**
- 발생 가능성: 1(매우 낮음) ~ 5(매우 높음)
- 중대성: 1(경미) ~ 5(사망/심각)
- 高위험(15점 이상): 즉시 작업중지 및 개선
- 中위험(8~14점): 단기 개선
- 低위험(8점 미만): 허용 가능하나 지속 관리`
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────
export default function NewOccasionalRiskPage() {
  const router    = useRouter()
  const supabase  = createClient()
  const fileRef   = useRef<HTMLInputElement>(null)

  const [saving,      setSaving]      = useState(false)
  const [analyzing,   setAnalyzing]   = useState(false)
  const [uploadedPhotos, setPhotos]   = useState<{ file: File; preview: string; url?: string }[]>([])
  const [riskItems,   setRiskItems]   = useState<RiskItem[]>([])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '', occasion_type: '', occasion_detail: '',
    eval_date: new Date().toISOString().slice(0, 10),
    work_location: '', evaluator_name: '',
  })

  // ─── 사진 선택 ──────────────────────────────────────────────
  function handleFiles(files: FileList | null) {
    if (!files) return
    const newPhotos = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 10)
      .map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 10))
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  // ─── AI 분석 실행 ───────────────────────────────────────────
  async function analyzePhotos() {
    if (uploadedPhotos.length === 0) {
      toast.error('분석할 사진을 먼저 업로드하세요.')
      return
    }
    setAnalyzing(true)
    toast.info(`${uploadedPhotos.length}장 사진 분석 중... (약 10~30초 소요)`)

    try {
      // 사진들을 Base64로 변환
      const imageContents = await Promise.all(
        uploadedPhotos.map(async p => {
          return new Promise<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1]
              resolve({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: p.file.type as 'image/jpeg' | 'image/png' | 'image/webp',
                  data: base64,
                },
              })
            }
            reader.onerror = reject
            reader.readAsDataURL(p.file)
          })
        })
      )

      // Claude Vision API 호출
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              ...imageContents,
              { type: 'text', text: buildAnalysisPrompt() },
            ],
          }],
        }),
      })

      const data = await response.json()
      const rawText = data.content?.[0]?.text ?? ''

      // JSON 파싱
      const jsonMatch = rawText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.')

      const parsed: any[] = JSON.parse(jsonMatch[0])
      const newItems: RiskItem[] = parsed.map((item, i) => {
        const { score, level } = calcRisk(item.probability ?? 3, item.severity ?? 3)
        return {
          seq:                i + 1 + riskItems.length,
          work_content:       item.work_content ?? '',
          hazard_factor:      item.hazard_factor ?? '',
          hazard_type:        item.hazard_type ?? '기타',
          photo_url:          uploadedPhotos[0]?.preview,
          ai_generated:       true,
          user_edited:        false,
          probability:        item.probability ?? 3,
          severity:           item.severity ?? 3,
          risk_score:         score,
          risk_level:         level,
          measure_engineering: item.measure_engineering ?? '',
          measure_admin:       item.measure_admin ?? '',
          measure_ppe:         item.measure_ppe ?? '',
          measure_owner:       '',
          measure_due_date:    '',
          measure_done:        false,
        }
      })

      setRiskItems(prev => [...prev, ...newItems])
      setExpandedIdx(riskItems.length) // 첫 번째 새 항목 펼침
      toast.success(`AI 분석 완료! ${newItems.length}개 유해위험요인이 자동 입력되었습니다. 내용을 확인하고 수정하세요.`)
    } catch (err: any) {
      toast.error('AI 분석 실패: ' + (err.message ?? '알 수 없는 오류'))
    } finally {
      setAnalyzing(false)
    }
  }

  // ─── 위험요인 항목 수정 ─────────────────────────────────────
  function updateItem(idx: number, field: keyof RiskItem, value: any) {
    setRiskItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value, user_edited: true }
      // 가능성·중대성 변경 시 점수 재계산
      if (field === 'probability' || field === 'severity') {
        const prob = field === 'probability' ? value : item.probability
        const sev  = field === 'severity'    ? value : item.severity
        const { score, level } = calcRisk(prob, sev)
        updated.risk_score = score
        updated.risk_level = level
      }
      return updated
    }))
  }

  function addItem() {
    const { score, level } = calcRisk(3, 3)
    const newItem: RiskItem = {
      seq: riskItems.length + 1, work_content: '', hazard_factor: '',
      hazard_type: '기타', ai_generated: false, user_edited: false,
      probability: 3, severity: 3, risk_score: score, risk_level: level,
      measure_engineering: '', measure_admin: '', measure_ppe: '',
      measure_owner: '', measure_due_date: '', measure_done: false,
    }
    setRiskItems(prev => [...prev, newItem])
    setExpandedIdx(riskItems.length)
  }

  function removeItem(idx: number) {
    setRiskItems(prev => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, seq: i + 1 })))
  }

  // ─── Supabase 파일 업로드 후 저장 ────────────────────────────
  async function save() {
    if (!form.title.trim())         { toast.error('제목을 입력하세요.'); return }
    if (!form.occasion_type)        { toast.error('수시평가 발생 사유를 선택하세요.'); return }
    if (riskItems.length === 0)     { toast.error('위험요인 항목을 1개 이상 입력하세요.'); return }

    setSaving(true)
    // 사진 업로드
    const uploadedUrls: { url: string; file_name: string; ai_analyzed: boolean; analyzed_at: string | null }[] = []
    for (const p of uploadedPhotos) {
      if (p.url) { uploadedUrls.push({ url: p.url, file_name: p.file.name, ai_analyzed: true, analyzed_at: new Date().toISOString() }); continue }
      const path = `risk-photos/${Date.now()}-${p.file.name}`
      const { data } = await supabase.storage.from('company-assets').upload(path, p.file, { upsert: false })
      if (data) {
        const { data: pub } = supabase.storage.from('company-assets').getPublicUrl(path)
        uploadedUrls.push({ url: pub.publicUrl, file_name: p.file.name, ai_analyzed: true, analyzed_at: new Date().toISOString() })
      }
    }

    const payload = {
      ...form,
      photos:     uploadedUrls,
      risk_items: riskItems,
      status:     'draft',
    }
    const res  = await fetch('/api/risk/occasional', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('수시 위험성평가가 저장되었습니다.')
    router.push(`/risk/occasional/${json.data.id}`)
  }

  const highCount   = riskItems.filter(r => r.risk_level === 'high').length
  const mediumCount = riskItems.filter(r => r.risk_level === 'medium').length

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk/occasional" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-red-600" />
              수시 위험성평가 작성
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">AI 사진 분석</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">지침 제15조제2항 | 사진 업로드 → AI 자동 분석 → 사용자 수정</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={save} disabled={saving || analyzing}
            className="btn-primary" style={{ background: '#dc2626' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* ① 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label-base">제목 *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="예: 3공구 굴착기 추가 투입에 따른 수시 위험성평가"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">수시평가 발생 사유 *</label>
              <select value={form.occasion_type}
                onChange={e => setForm(f => ({ ...f, occasion_type: e.target.value }))}
                className="input-base">
                <option value="">선택하세요</option>
                {OCCASION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-base">평가 일자 *</label>
              <input type="date" value={form.eval_date}
                onChange={e => setForm(f => ({ ...f, eval_date: e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="label-base">작업 위치</label>
              <input value={form.work_location}
                onChange={e => setForm(f => ({ ...f, work_location: e.target.value }))}
                placeholder="예: 4공구 지하 2층" className="input-base" />
            </div>
            <div>
              <label className="label-base">평가자</label>
              <input value={form.evaluator_name}
                onChange={e => setForm(f => ({ ...f, evaluator_name: e.target.value }))}
                placeholder="홍길동" className="input-base" />
            </div>
            <div className="col-span-2">
              <label className="label-base">사유 상세</label>
              <input value={form.occasion_detail}
                onChange={e => setForm(f => ({ ...f, occasion_detail: e.target.value }))}
                placeholder="수시평가 발생 경위를 상세히 기재하세요."
                className="input-base" />
            </div>
          </div>
        </div>

        {/* ② 사진 업로드 + AI 분석 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">현장 사진 업로드 & AI 분석</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                사진을 업로드하면 Claude Vision AI가 유해위험요인·위험성·감소대책을 자동으로 분석합니다 (최대 10장)
              </p>
            </div>
            <button
              onClick={analyzePhotos}
              disabled={analyzing || uploadedPhotos.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: analyzing ? '#9ca3af' : 'linear-gradient(135deg, #dc2626, #7c3aed)' }}>
              {analyzing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 분석 중...</>
                : <><Sparkles className="w-4 h-4" /> AI 분석 실행</>}
            </button>
          </div>

          {/* 드래그앤드롭 업로드 영역 */}
          <label
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-red-300 hover:bg-red-50/20 transition-all mb-4"
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}>
            <Upload className="w-8 h-8 text-gray-400" />
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600">사진을 드래그하거나 클릭해서 업로드</div>
              <div className="text-xs text-gray-400 mt-0.5">JPG, PNG, HEIC — 최대 10장 | 파일당 20MB 이하</div>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*"
              onChange={e => handleFiles(e.target.files)} className="hidden" />
          </label>

          {/* 업로드된 사진 미리보기 */}
          {uploadedPhotos.length > 0 && (
            <div className="grid grid-cols-5 gap-3">
              {uploadedPhotos.map((p, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded">
                    {i + 1}
                  </div>
                </div>
              ))}
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-red-300 hover:bg-red-50/10 transition-all">
                <Plus className="w-5 h-5 text-gray-400" />
                <span className="text-[10px] text-gray-400 mt-1">추가</span>
                <input type="file" multiple accept="image/*"
                  onChange={e => handleFiles(e.target.files)} className="hidden" />
              </label>
            </div>
          )}

          {analyzing && (
            <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-purple-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-red-600 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">Claude AI가 현장 사진을 분석하고 있습니다...</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    유해위험요인 파악 (지침 제10조) · 위험성 결정 (제11조) · 감소대책 수립 (제12조)
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-purple-500 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          )}
        </div>

        {/* ③ 위험요인 목록 (AI 생성 + 사용자 수정 가능) */}
        {riskItems.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-800">
                  위험요인 목록
                  <span className="text-xs text-gray-400 font-normal ml-2">{riskItems.length}개</span>
                </h2>
                {highCount > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    <AlertTriangle className="w-3 h-3" /> 高위험 {highCount}건
                  </span>
                )}
                {mediumCount > 0 && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    中위험 {mediumCount}건
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> 항목을 클릭해 내용을 수정할 수 있습니다
                </span>
                <button onClick={addItem}
                  className="btn-secondary text-xs gap-1">
                  <Plus className="w-3 h-3" /> 항목 추가
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {riskItems.map((item, idx) => {
                const rc = RISK_CFG[item.risk_level]
                return (
                  <div key={idx} className={clsx('border-l-4', item.risk_level === 'high' ? 'border-red-400' : item.risk_level === 'medium' ? 'border-amber-400' : 'border-green-400')}>
                    {/* 항목 헤더 */}
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left">
                      <span className="text-xs font-mono text-gray-400 w-5 flex-shrink-0">{item.seq}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">{item.hazard_factor || '(유해위험요인 미입력)'}</span>
                          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-semibold', rc.cls)}>
                            {rc.label} ({item.risk_score}점)
                          </span>
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{item.hazard_type}</span>
                          {item.ai_generated && !item.user_edited && (
                            <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> AI 생성
                            </span>
                          )}
                          {item.user_edited && (
                            <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Edit3 className="w-2.5 h-2.5" /> 수정됨
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{item.work_content}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); removeItem(idx) }}
                          className="p-1 text-gray-300 hover:text-red-500 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {expandedIdx === idx
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {/* 항목 상세 편집 */}
                    {expandedIdx === idx && (
                      <div className="px-5 pb-5 pt-1 bg-gray-50/40 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="label-base">작업 내용</label>
                            <input value={item.work_content}
                              onChange={e => updateItem(idx, 'work_content', e.target.value)}
                              placeholder="어떤 작업에서 발생하는 위험인지"
                              className="input-base text-sm" />
                          </div>
                          <div>
                            <label className="label-base">위험 유형</label>
                            <select value={item.hazard_type}
                              onChange={e => updateItem(idx, 'hazard_type', e.target.value)}
                              className="input-base text-sm">
                              {HAZARD_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <label className="label-base">유해·위험요인 (지침 제10조)</label>
                            <input value={item.hazard_factor}
                              onChange={e => updateItem(idx, 'hazard_factor', e.target.value)}
                              placeholder="구체적인 유해위험요인을 입력하세요"
                              className="input-base text-sm" />
                          </div>
                        </div>

                        {/* 위험성 결정 (지침 제11조) */}
                        <div className="p-3 rounded-xl border" style={{ borderColor: item.risk_level === 'high' ? '#fca5a5' : item.risk_level === 'medium' ? '#fde68a' : '#bbf7d0', background: item.risk_level === 'high' ? '#fef2f2' : item.risk_level === 'medium' ? '#fffbeb' : '#f0fdf4' }}>
                          <div className="text-xs font-semibold text-gray-700 mb-2">위험성 결정 (지침 제11조) — 가능성 × 중대성</div>
                          <div className="grid grid-cols-4 gap-3 items-center">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">발생 가능성 (1~5)</label>
                              <input type="number" min={1} max={5} value={item.probability}
                                onChange={e => updateItem(idx, 'probability', Number(e.target.value))}
                                className="input-base text-center font-bold text-lg" />
                            </div>
                            <div className="text-2xl text-gray-400 text-center mt-4">×</div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-1">중대성 (1~5)</label>
                              <input type="number" min={1} max={5} value={item.severity}
                                onChange={e => updateItem(idx, 'severity', Number(e.target.value))}
                                className="input-base text-center font-bold text-lg" />
                            </div>
                            <div className="text-center mt-4">
                              <div className="text-2xl font-bold" style={{ color: item.risk_level==='high'?'#dc2626':item.risk_level==='medium'?'#d97706':'#16a34a' }}>
                                {item.risk_score}점
                              </div>
                              <div className={clsx('text-xs font-semibold', rc.cls, 'px-2 py-0.5 rounded-full inline-block mt-0.5')}>
                                {rc.label}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 위험성 감소대책 (지침 제12조) */}
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2">위험성 감소대책 (지침 제12조)</div>
                          <div className="space-y-2">
                            {[
                              { field: 'measure_engineering' as const, label: '공학적 대책 (설비·시설 개선)', color: '#2563eb' },
                              { field: 'measure_admin'       as const, label: '관리적 대책 (교육·절차·감독)', color: '#16a34a' },
                              { field: 'measure_ppe'         as const, label: '보호구 대책',                   color: '#7c3aed' },
                            ].map(m => (
                              <div key={m.field} className="flex items-start gap-2">
                                <span className="text-[10px] px-2 py-1 rounded-lg font-medium flex-shrink-0 text-white mt-0.5"
                                  style={{ background: m.color }}>
                                  {m.label.split('(')[0].trim()}
                                </span>
                                <input value={item[m.field]}
                                  onChange={e => updateItem(idx, m.field, e.target.value)}
                                  placeholder={m.label}
                                  className="input-base text-sm flex-1" />
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            <div>
                              <label className="label-base">담당자</label>
                              <input value={item.measure_owner}
                                onChange={e => updateItem(idx, 'measure_owner', e.target.value)}
                                placeholder="홍길동" className="input-base text-sm" />
                            </div>
                            <div>
                              <label className="label-base">이행 기한</label>
                              <input type="date" value={item.measure_due_date}
                                onChange={e => updateItem(idx, 'measure_due_date', e.target.value)}
                                className="input-base text-sm" />
                            </div>
                            <div className="flex items-end pb-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={item.measure_done}
                                  onChange={e => updateItem(idx, 'measure_done', e.target.checked)}
                                  className="w-4 h-4 accent-green-600" />
                                <span className="text-sm text-gray-700">조치 완료</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 하단 추가 버튼 */}
            <div className="px-5 py-3 border-t border-gray-100">
              <button onClick={addItem} className="btn-secondary text-xs gap-1 w-full justify-center">
                <Plus className="w-3.5 h-3.5" /> 위험요인 항목 직접 추가
              </button>
            </div>
          </div>
        )}

        {/* 항목이 없을 때 안내 */}
        {riskItems.length === 0 && uploadedPhotos.length > 0 && !analyzing && (
          <div className="card p-8 text-center border-dashed">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <div className="font-semibold text-gray-700 mb-1">사진이 준비됐습니다!</div>
            <div className="text-sm text-gray-400 mb-4">위의 "AI 분석 실행" 버튼을 눌러 유해위험요인을 자동으로 분석하세요.</div>
            <button onClick={analyzePhotos}
              className="btn-primary text-sm gap-2 mx-auto"
              style={{ background: 'linear-gradient(135deg, #dc2626, #7c3aed)' }}>
              <Sparkles className="w-4 h-4" /> AI 분석 시작
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
