'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  FileText, Upload, Loader2, Search, AlertTriangle,
  BookOpen, ClipboardCheck, FlaskConical, ChevronDown,
  ChevronUp, Plus, ArrowRight, Sparkles, Calendar,
  Users, CheckCircle2, Clock,
} from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 ─────────────────────────────────────────────────────
interface RiskSuggestion   { worktype:string; hazards:string[]; priority:'high'|'medium'|'low'; reason:string }
interface EduSuggestion    { topic:string; legal_basis:string; target:string; priority:'high'|'medium' }
interface WorkplanSugg     { title:string; hazard_type:string; required:boolean }
interface HazardSuggestion { doc_type:string; title:string; check_items?:string[]; substances?:string[] }

interface AnalysisResult {
  id?:                  string
  upload_date:          string
  file_name:            string | null
  detected_worktypes:   string[]
  detected_keywords:    string[]
  risk_suggestions:     RiskSuggestion[]
  edu_suggestions:      EduSuggestion[]
  workplan_suggestions: WorkplanSugg[]
  hazard_suggestions:   HazardSuggestion[]
  summary:              string
  work_date?:           string | null
  worker_count?:        number | null
}

interface HistoryItem {
  id:string; upload_date:string; file_name:string|null
  detected_worktypes:string[]; summary:string; created_at:string
  author:{name:string}|null
}

// 우선순위 색상
const PRIORITY_CFG = {
  high:   { label:'긴급', cls:'bg-red-50 text-red-700 border-red-200' },
  medium: { label:'권장', cls:'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { label:'검토', cls:'bg-gray-50 text-gray-500 border-gray-200' },
}

export default function WorklogPage() {
  const router  = useRouter()
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const textRef  = useRef<HTMLTextAreaElement>(null)

  const [tab,        setTab]      = useState<'upload'|'history'>('upload')
  const [text,       setText]     = useState('')
  const [fileName,   setFileName] = useState<string|null>(null)
  const [uploadDate, setDate]     = useState(new Date().toISOString().slice(0,10))
  const [analyzing,  setAnalyzing]= useState(false)
  const [result,     setResult]   = useState<AnalysisResult|null>(null)
  const [history,    setHistory]  = useState<HistoryItem[]>([])
  const [histLoad,   setHistLoad] = useState(false)
  const [expanded,   setExpanded] = useState<string|null>(null)
  const [activeWT,   setActiveWT] = useState<string|null>(null)  // 선택된 공종 필터

  // 이력 로드
  useEffect(() => {
    if (tab !== 'history') return
    setHistLoad(true)
    fetch('/api/worklog').then(r=>r.json()).then(j=>{
      setHistory(j.data??[])
      setHistLoad(false)
    })
  }, [tab])

  // 파일 업로드 → 텍스트 추출
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    // PDF → 텍스트 (Supabase Storage 업로드 후 Vision API 활용 가능)
    // 현재는 텍스트 파일(.txt) 직접 읽기 지원 + 나머지는 수동 입력 안내
    if (file.type === 'text/plain') {
      const content = await file.text()
      setText(content)
      toast.success(`${file.name} 파일이 로드되었습니다.`)
    } else if (file.type === 'application/pdf') {
      // PDF: Supabase Storage에 업로드 후 Vision 처리 (여기서는 안내 표시)
      toast.info('PDF 파일은 텍스트 내용을 아래 박스에 붙여넣기 해주세요.')
      setFileName(file.name)
    } else {
      // Excel, HWP 등: 텍스트 복사 안내
      toast.info('해당 형식은 내용을 직접 붙여넣기 해주세요.')
      setFileName(file.name)
    }
  }

  // 분석 실행
  async function runAnalysis() {
    if (!text.trim()) { toast.error('분석할 작업일보 내용을 입력해주세요.'); return }
    setAnalyzing(true)
    setResult(null)

    const res  = await fetch('/api/worklog/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, file_name: fileName, upload_date: uploadDate }),
    })
    const json = await res.json()
    setAnalyzing(false)

    if (!res.ok) { toast.error(json.error); return }
    setResult(json.data)
    toast.success('분석이 완료되었습니다!')
    // 활성 공종을 첫 번째로 설정
    if (json.data.detected_worktypes?.length > 0) {
      setActiveWT(null)
    }
  }

  // 연계 버튼 핸들러
  function goCreateRisk(worktype?: string) {
    router.push(`/risk/new${worktype ? `?hint=${encodeURIComponent(worktype)}` : ''}`)
  }
  function goCreateEdu() { router.push('/documents/education/new') }
  function goCreateWorkplan(hazardType?: string) {
    router.push(`/documents/workplan/new${hazardType ? `?hazard=${hazardType}` : ''}`)
  }
  function goCreateInspection() { router.push('/documents/inspection/new') }

  // 필터된 제안 (공종 선택 시)
  const filteredRisks = activeWT
    ? result?.risk_suggestions.filter(r => r.worktype === activeWT) ?? []
    : result?.risk_suggestions ?? []

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600"/>
            작업일보 분석
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            작업일보를 붙여넣으면 AI가 공종을 분석하고 필요한 안전 서류를 자동 추천합니다.
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['upload','history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-4 py-1.5 rounded-md text-xs font-medium transition-all',
                tab===t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {t==='upload' ? '분석하기' : '분석 이력'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 업로드·분석 탭 ────────────────────────────────────── */}
      {tab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 왼쪽: 입력 */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-500"/>
                작업일보 입력
              </h2>

              {/* 날짜 + 파일 */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="label-base">작업일자</label>
                  <input type="date" value={uploadDate} onChange={e=>setDate(e.target.value)} className="input-base"/>
                </div>
                <div className="flex-1">
                  <label className="label-base">파일 첨부 (선택)</label>
                  <label className="flex items-center gap-2 input-base cursor-pointer hover:bg-gray-50 text-gray-500">
                    <Upload className="w-3.5 h-3.5"/>
                    <span className="text-xs truncate">{fileName ?? 'TXT/PDF/Excel 업로드'}</span>
                    <input ref={fileRef} type="file" accept=".txt,.pdf,.xlsx,.xls,.hwp,.docx" onChange={handleFile} className="hidden"/>
                  </label>
                </div>
              </div>

              {/* 텍스트 입력 */}
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={12}
                placeholder={`작업일보 내용을 여기에 붙여넣으세요.

예시:
2025년 3월 16일 작업일보
공종: 철골공사, 고소작업 (5층~8층)
투입인원: 철골공 8명, 안전감시원 1명
작업내용:
- H빔 설치 및 볼트 체결
- 용접·절단 작업 (6층 접합부)
특이사항: 강풍 주의보 발령 중 작업 중단 검토`}
                className="input-base resize-none text-sm leading-relaxed font-mono"
              />

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{text.length}자</span>
                <button onClick={runAnalysis} disabled={analyzing || !text.trim()}
                  className="btn-primary gap-1.5" style={{background:'#4f46e5'}}>
                  {analyzing
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>AI 분석 중...</>
                    : <><Sparkles className="w-4 h-4"/>AI 공종 분석</>}
                </button>
              </div>
            </div>

            {/* 사용 안내 */}
            <div className="card p-4 bg-indigo-50/50 border-indigo-100">
              <div className="text-xs font-semibold text-indigo-700 mb-2">분석 후 자동으로 추천되는 항목</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-indigo-600">
                {[
                  ['위험성평가', '공종별 위험요인 자동 분석'],
                  ['안전보건교육', '교육 필요 주제 및 법적 근거'],
                  ['작업계획서',  '위험 유형별 계획서 자동 생성'],
                  ['점검·MSDS',  '필요 점검 서류 및 화학물질'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0"/>
                    <div><div className="font-medium">{title}</div><div className="text-indigo-400">{desc}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 분석 결과 */}
          <div>
            {analyzing && (
              <div className="card p-8 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin"/>
                  <Sparkles className="w-5 h-5 text-indigo-400 absolute -top-1 -right-1 animate-pulse"/>
                </div>
                <div className="text-sm font-medium text-gray-700">AI가 작업일보를 분석하고 있습니다...</div>
                <div className="text-xs text-gray-400 text-center leading-relaxed">
                  공종 감지 → 위험요인 분석 →<br/>필요 안전 서류 추천
                </div>
              </div>
            )}

            {result && !analyzing && (
              <div className="space-y-4">
                {/* 요약 */}
                <div className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">분석 요약</div>
                      <p className="text-sm text-gray-800 leading-relaxed">{result.summary}</p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {result.work_date && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3"/>{result.work_date}
                        </span>
                      )}
                      {result.worker_count && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users className="w-3 h-3"/>{result.worker_count}명
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 감지된 공종 */}
                <div className="card p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-3">감지된 공종</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveWT(null)}
                      className={clsx('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        activeWT===null ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-500 border-gray-200')}>
                      전체
                    </button>
                    {result.detected_worktypes.map(wt => (
                      <button key={wt}
                        onClick={() => setActiveWT(activeWT===wt ? null : wt)}
                        className={clsx('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          activeWT===wt ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300')}>
                        {wt}
                      </button>
                    ))}
                  </div>
                  {result.detected_keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {result.detected_keywords.map(k => (
                        <span key={k} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">{k}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 위험성평가 추천 */}
                <ResultSection
                  title="위험성평가 필요 항목"
                  icon={<AlertTriangle className="w-4 h-4 text-red-500"/>}
                  color="red"
                  count={filteredRisks.length}
                  isExpanded={expanded==='risk'}
                  onToggle={() => setExpanded(expanded==='risk' ? null : 'risk')}>
                  <div className="space-y-2">
                    {filteredRisks.map((r, i) => {
                      const pc = PRIORITY_CFG[r.priority]
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5', pc.cls)}>
                            {pc.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800">{r.worktype}</div>
                            <div className="text-xs text-gray-500 mt-0.5">위험요인: {r.hazards.join(', ')}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{r.reason}</div>
                          </div>
                          <button onClick={() => goCreateRisk(r.worktype)}
                            className="flex-shrink-0 flex items-center gap-1 text-xs text-red-600 hover:underline">
                            작성 <ArrowRight className="w-3 h-3"/>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => goCreateRisk()}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
                    <Plus className="w-3.5 h-3.5"/>위험성평가 작성하기
                  </button>
                </ResultSection>

                {/* 안전보건교육 추천 */}
                <ResultSection
                  title="안전보건교육 필요 항목"
                  icon={<BookOpen className="w-4 h-4 text-blue-500"/>}
                  color="blue"
                  count={result.edu_suggestions.length}
                  isExpanded={expanded==='edu'}
                  onToggle={() => setExpanded(expanded==='edu' ? null : 'edu')}>
                  <div className="space-y-2">
                    {result.edu_suggestions.map((e, i) => {
                      const pc = PRIORITY_CFG[e.priority]
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5', pc.cls)}>{pc.label}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800">{e.topic}</div>
                            <div className="text-xs text-gray-400 mt-0.5">대상: {e.target}</div>
                            <div className="text-xs text-gray-300 mt-0.5">{e.legal_basis}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={goCreateEdu}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors">
                    <Plus className="w-3.5 h-3.5"/>교육일지 작성하기
                  </button>
                </ResultSection>

                {/* 작업계획서 추천 */}
                <ResultSection
                  title="작업계획서 필요 항목"
                  icon={<ClipboardCheck className="w-4 h-4 text-green-500"/>}
                  color="green"
                  count={result.workplan_suggestions.length}
                  isExpanded={expanded==='workplan'}
                  onToggle={() => setExpanded(expanded==='workplan' ? null : 'workplan')}>
                  <div className="space-y-2">
                    {result.workplan_suggestions.map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{w.title}</div>
                          <span className={clsx('text-[10px]', w.required ? 'text-red-500 font-medium' : 'text-gray-400')}>
                            {w.required ? '필수' : '권장'}
                          </span>
                        </div>
                        <button onClick={() => goCreateWorkplan(w.hazard_type)}
                          className="text-xs text-green-600 hover:underline flex items-center gap-1">
                          작성 <ArrowRight className="w-3 h-3"/>
                        </button>
                      </div>
                    ))}
                  </div>
                </ResultSection>

                {/* 추가 필요 서류 */}
                {result.hazard_suggestions.length > 0 && (
                  <ResultSection
                    title="추가 필요 서류"
                    icon={<FlaskConical className="w-4 h-4 text-amber-500"/>}
                    color="amber"
                    count={result.hazard_suggestions.length}
                    isExpanded={expanded==='hazard'}
                    onToggle={() => setExpanded(expanded==='hazard' ? null : 'hazard')}>
                    <div className="space-y-2">
                      {result.hazard_suggestions.map((h, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-800">{h.title}</div>
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                              {h.doc_type === 'inspection' ? '점검일지' : h.doc_type === 'msds' ? 'MSDS' : h.doc_type}
                            </span>
                          </div>
                          {h.check_items && h.check_items.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {h.check_items.map(c => (
                                <span key={c} className="text-[10px] text-gray-400 bg-white rounded px-1.5 py-0.5 border border-gray-100">{c}</span>
                              ))}
                            </div>
                          )}
                          {h.substances && h.substances.length > 0 && (
                            <div className="mt-1.5 text-[10px] text-amber-600">물질: {h.substances.join(', ')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={goCreateInspection}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                      <Plus className="w-3.5 h-3.5"/>순회점검일지 작성하기
                    </button>
                  </ResultSection>
                )}
              </div>
            )}

            {!result && !analyzing && (
              <div className="card p-10 flex flex-col items-center justify-center text-gray-400 border-dashed">
                <Sparkles className="w-10 h-10 mb-3 opacity-20"/>
                <p className="text-sm font-medium">작업일보를 입력하고</p>
                <p className="text-sm">'AI 공종 분석'을 눌러주세요.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 분석 이력 탭 ──────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="card overflow-hidden">
          {histLoad ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
          ) : history.length === 0 ? (
            <div className="py-14 text-center text-gray-400 text-sm">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20"/>
              <p>분석 이력이 없습니다.</p>
              <button onClick={() => setTab('upload')} className="btn-primary mt-4 text-sm" style={{background:'#4f46e5'}}>
                분석 시작하기
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {['작업일자','파일명','감지 공종','요약','작성자','날짜'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-600">{item.upload_date}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[100px] truncate">{item.file_name ?? '직접 입력'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(item.detected_worktypes ?? []).slice(0,3).map(wt => (
                          <span key={wt} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{wt}</span>
                        ))}
                        {(item.detected_worktypes ?? []).length > 3 && (
                          <span className="text-[10px] text-gray-400">+{item.detected_worktypes.length-3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{item.summary}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{item.author?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 결과 섹션 공통 컴포넌트 ─────────────────────────────────
function ResultSection({
  title, icon, color, count,
  isExpanded, onToggle, children,
}: {
  title:string; icon:React.ReactNode; color:string; count:number
  isExpanded:boolean; onToggle:()=>void; children:React.ReactNode
}) {
  const colorMap: Record<string,string> = {
    red:   'bg-red-50   border-red-200',
    blue:  'bg-blue-50  border-blue-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
  }
  return (
    <div className={clsx('card overflow-hidden border', colorMap[color] ?? 'bg-gray-50 border-gray-200')}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
            color==='red'   ? 'bg-red-100 text-red-700'   :
            color==='blue'  ? 'bg-blue-100 text-blue-700' :
            color==='green' ? 'bg-green-100 text-green-700':
                              'bg-amber-100 text-amber-700')}>
            {count}건
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400"/>}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/60">
          {children}
        </div>
      )}
    </div>
  )
}
