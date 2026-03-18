'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  FlaskConical, ArrowLeft, Globe, Loader2,
  Sparkles, Tag, ShieldAlert, AlertTriangle,
  RefreshCw, Printer, GraduationCap,
  Plus, Trash2, Save, FileText,
} from 'lucide-react'
import { clsx } from 'clsx'
import { GHS_LABELS, type GhsHazardClass } from '@/types/msds'
import { CMR_LABELS, SPECIAL_SUBSTANCES, type CMRType } from '@/lib/special-management-substances'

const LEGAL_BADGES = [
  { key:'is_managed',       label:'관리대상유해물질',      legal:'안전보건규칙 별표12',     color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
  { key:'is_permitted',     label:'허가대상유해물질',      legal:'산안법 시행령 제88조',    color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  { key:'is_special',       label:'특별관리물질',          legal:'안전보건규칙 별표12 제2호',color:'#b45309', bg:'#fffbeb', border:'#fde68a' },
  { key:'is_work_env_target',label:'작업환경측정 대상물질', legal:'시행규칙 별표21',         color:'#0891b2', bg:'#ecfeff', border:'#a5f3fc' },
  { key:'is_special_health', label:'특수건강진단 대상물질', legal:'시행규칙 별표22',         color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' },
]

function GhsDiamond({ hazardClass, label }: { hazardClass: string; label: string }) {
  const colorMap: Record<string,string> = { GHS01:'#dc2626',GHS02:'#f97316',GHS03:'#eab308',GHS04:'#2563eb',GHS05:'#1d4ed8',GHS06:'#1f2937',GHS07:'#9ca3af',GHS08:'#7c3aed',GHS09:'#16a34a' }
  const emojiMap: Record<string,string> = { GHS01:'💥',GHS02:'🔥',GHS03:'⭕',GHS04:'🔵',GHS05:'⚗️',GHS06:'☠️',GHS07:'❗',GHS08:'⚠️',GHS09:'🌿' }
  const key = Object.keys(colorMap).find(k => hazardClass.toUpperCase().includes(k)) ?? 'GHS07'
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width:48, height:48, background:'white', border:`2px solid ${colorMap[key]??'#9ca3af'}`, borderRadius:4, transform:'rotate(45deg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ transform:'rotate(-45deg)', fontSize:20 }}>{emojiMap[key]??'⚠️'}</span>
      </div>
      <span className="text-[9px] text-center text-gray-500 mt-1 leading-tight max-w-[60px]">{label}</span>
    </div>
  )
}

export default function MsdsDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [msds,       setMsds]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [analyzing,  setAnalyzing]  = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genEdu,     setGenEdu]     = useState(false)
  const [labelHtml,  setLabelHtml]  = useState<string | null>(null)
  const [legalText,  setLegalText]  = useState('')
  const [showLabel,  setShowLabel]  = useState(false)
  const [tab, setTab] = useState<'info'|'classification'|'label'|'special'>('info')
  const [checkingSpecial, setCheckingSpecial] = useState(false)
  const [specialLogs, setSpecialLogs]         = useState<any[]>([])
  const [specialNotices, setSpecialNotices]   = useState<any[]>([])
  const [showLogForm, setShowLogForm]         = useState(false)
  const [showNoticeForm, setShowNoticeForm]   = useState(false)
  const [savingLog, setSavingLog]             = useState(false)
  const [savingNotice, setSavingNotice]       = useState(false)
  const [noticeHtml, setNoticeHtml]           = useState<string|null>(null)
  const [logForm, setLogForm] = useState({
    work_date: new Date().toISOString().slice(0,10),
    worker_name: '', substance_name: '', usage_amount: '', work_content: '',
    ppe_worn: '', incident_content: '', incident_occurred: false,
    dept_name: '', work_location: '', work_duration: '',
  })
  const [noticeForm, setNoticeForm] = useState({
    substance_name: '', cmr_types: [] as string[], notice_content: '',
    posted_at: new Date().toISOString().slice(0,10), posted_location: '',
  })

  useEffect(() => {
    fetch(`/api/documents/msds/${params.id}`).then(r=>r.json()).then(j => {
      setMsds(j.data)
      setLegalText(j.data?.legal_regulation_raw ?? '')
      if (j.data?.hazard_label?.html_content) setLabelHtml(j.data.hazard_label.html_content)
      // 특별관리물질 이름 자동 세팅
      if (j.data?.legal_classification?.special_substance_name)
        setNoticeForm(f => ({ ...f, substance_name: j.data.legal_classification.special_substance_name, cmr_types: j.data.legal_classification.special_cmr_types || [] }))
      else
        setNoticeForm(f => ({ ...f, substance_name: j.data?.product_name || '' }))
      setLogForm(f => ({ ...f, substance_name: j.data?.product_name || '' }))
      setLoading(false)
    })
    // 취급일지·고지 목록 로드
    fetch(`/api/documents/msds/${params.id}/special-log`).then(r=>r.json()).then(j=>setSpecialLogs(j.data||[]))
    fetch(`/api/documents/msds/${params.id}/special-notice`).then(r=>r.json()).then(j=>setSpecialNotices(j.data||[]))
  }, [params.id])

  async function analyzeLegal() {
    setAnalyzing(true)
    toast.info('Claude AI가 법적 규제현황을 분석하고 있습니다...')
    try {
      const res  = await fetch(`/api/documents/msds/${params.id}/analyze-legal`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ legal_text: legalText }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMsds((p: any) => ({ ...p, legal_classification: json.classification, legal_regulation_raw: legalText }))
      toast.success('법적 분류 분석이 완료되었습니다!')
      setTab('classification')
    } catch (e: any) { toast.error('분석 실패: ' + e.message) }
    finally { setAnalyzing(false) }
  }

  async function generateLabel() {
    setGenerating(true)
    toast.info('GHS 경고표지를 생성하고 있습니다...')
    try {
      const res  = await fetch(`/api/documents/msds/${params.id}/generate-label`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setLabelHtml(json.html)
      setMsds((p: any) => ({ ...p, hazard_label: json.label }))
      toast.success('GHS 경고표지가 생성되었습니다!')
      setTab('label'); setShowLabel(true)
    } catch (e: any) { toast.error('생성 실패: ' + e.message) }
    finally { setGenerating(false) }
  }

  function printLabel() {
    if (!labelHtml) return
    const win = window.open('', '_blank', 'width=700,height=900')
    if (!win) return
    win.document.write(labelHtml)
    win.document.close()
  }

  async function handleGenEdu() {
    setGenEdu(true)
    const res  = await fetch(`/api/documents/msds/${params.id}/generate-edu`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ save:true }) })
    const json = await res.json()
    setGenEdu(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('MSDS 교육일지가 생성되었습니다!')
    router.push(`/documents/education/${json.data.id}`)
  }

  async function checkSpecial() {
    setCheckingSpecial(true)
    toast.info('특별관리물질 해당 여부를 확인합니다...')
    try {
      const res  = await fetch(`/api/documents/msds/${params.id}/check-special`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ legal_text: legalText }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMsds((p:any) => ({ ...p, legal_classification: { ...(p.legal_classification||{}), ...json, is_special: json.is_special, special_substance_name: json.matched_substance, special_cmr_types: json.cmr_types } }))
      if (json.is_special) {
        setNoticeForm(f => ({ ...f, substance_name: json.matched_substance || f.substance_name, cmr_types: json.cmr_types || [] }))
        setLogForm(f => ({ ...f, substance_name: json.matched_substance || f.substance_name }))
        toast.success(`특별관리물질 확인: ${json.matched_substance || '해당'}`)
      } else {
        toast.info('이 물질은 별표12 특별관리물질에 해당하지 않습니다.')
      }
      setTab('special')
    } catch(e:any) { toast.error(e.message) }
    finally { setCheckingSpecial(false) }
  }

  async function saveLog() {
    setSavingLog(true)
    try {
      const res  = await fetch(`/api/documents/msds/${params.id}/special-log`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(logForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSpecialLogs(prev => [json.data, ...prev])
      setShowLogForm(false)
      setLogForm(f => ({ ...f, worker_name:'', usage_amount:'', work_content:'', ppe_worn:'', incident_content:'', incident_occurred:false, work_date: new Date().toISOString().slice(0,10) }))
      toast.success('취급일지가 등록되었습니다.')
    } catch(e:any) { toast.error(e.message) }
    finally { setSavingLog(false) }
  }

  async function saveNotice() {
    setSavingNotice(true)
    try {
      const res  = await fetch(`/api/documents/msds/${params.id}/special-notice`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(noticeForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSpecialNotices(prev => [json.data, ...prev])
      setNoticeHtml(json.html)
      setShowNoticeForm(false)
      toast.success('고지문이 생성되었습니다! 인쇄하여 게시판에 부착하세요.')
    } catch(e:any) { toast.error(e.message) }
    finally { setSavingNotice(false) }
  }

  function printNotice(html: string) {
    const win = window.open('', '_blank', 'width=720,height=960')
    if (!win) return
    win.document.write(html); win.document.close()
  }

  async function deleteLog(logId: string) {
    if (!confirm('취급일지를 삭제하시겠습니까?')) return
    await fetch(`/api/documents/msds/${params.id}/special-log/${logId}`, { method:'DELETE' })
    setSpecialLogs(prev => prev.filter(l => l.id !== logId))
    toast.success('삭제되었습니다.')
  }
  if (!msds)   return <div className="text-center text-gray-400 py-16">MSDS를 찾을 수 없습니다.</div>

  const hazards       = (msds.ghs_hazards ?? []) as GhsHazardClass[]
  const lc            = msds.legal_classification ?? {}
  const hasClass      = Object.keys(lc).length > 0 && lc.analyzed_at
  const isSpecial     = !!lc.is_special
  const specialCmrTypes: string[] = lc.special_cmr_types || []
  const activeBadges  = LEGAL_BADGES.filter(b => lc[b.key])

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/documents/msds" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FlaskConical className="w-5 h-5 text-cyan-600"/>{msds.product_name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {msds.cas_number && <span className="text-xs text-gray-400 font-mono">CAS {msds.cas_number}</span>}
              {msds.is_public && <span className="flex items-center gap-1 text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full"><Globe className="w-3 h-3"/>공용 자료</span>}
              {msds.signal_word && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${msds.signal_word==='danger'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{msds.signal_word==='danger'?'⚡ 위험':'⚠ 경고'}</span>}
              {/* 법적 분류 요약 배지 */}
              {activeBadges.slice(0,2).map(b => (
                <span key={b.key} className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{background:b.bg,color:b.color,border:`1px solid ${b.border}`}}>{b.label}</span>
              ))}
              {activeBadges.length > 2 && <span className="text-[9px] text-gray-400">+{activeBadges.length-2}개</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={handleGenEdu} disabled={genEdu} className="btn-secondary text-xs gap-1.5">
            {genEdu?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<GraduationCap className="w-3.5 h-3.5"/>}교육일지 생성
          </button>
          <button onClick={checkSpecial} disabled={checkingSpecial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
            style={{borderColor:'#7c3aed',color:'#6d28d9',background:checkingSpecial?'#f9fafb':'#f5f3ff'}}>
            {checkingSpecial?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<ShieldAlert className="w-3.5 h-3.5"/>}
            특별관리물질 확인
          </button>
          <button onClick={generateLabel} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
            style={{borderColor:'#d97706',color:'#b45309',background: generating?'#f9fafb':'#fffbeb'}}>
            {generating?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Tag className="w-3.5 h-3.5"/>}
            MSDS → 경고표지 변환
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {[
          { id:'info',           label:'기본 정보' },
          { id:'classification', label:`법적 분류 분석${hasClass?' ✓':''}` },
          { id:'label',          label:`GHS 경고표지${labelHtml?' ✓':''}` },
          { id:'special',        label:`특별관리물질${isSpecial?' 🔴 해당':specialLogs.length>0?` (${specialLogs.length}건)`:''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
              tab===t.id
                ? t.id==='special' && isSpecial ? 'border-red-500 text-red-700' : 'border-cyan-500 text-cyan-700'
                : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 탭1: 기본 정보 ─────────────────────────────────── */}
      {tab==='info' && (
        <div className="space-y-4">
          {hazards.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4 text-sm">GHS 유해·위험성 분류</h2>
              <div className="flex flex-wrap gap-6">{hazards.map(h => <GhsDiamond key={h} hazardClass={h} label={GHS_LABELS[h]??h}/>)}</div>
            </div>
          )}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4 text-sm">제품 정보</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[['제품명',msds.product_name],['CAS 번호',msds.cas_number||'—'],['UN 번호',msds.un_number||'—'],['제조사',msds.manufacturer||'—'],['주성분',msds.main_components||'—'],['노출기준',msds.exposure_limit||'—'],['필요 보호구',msds.ppe_required||'—'],['개정일',msds.revision_date||'—']].map(([k,v]) => (
                <div key={k}><div className="text-xs text-gray-400">{k}</div><div className="font-medium text-gray-800">{v}</div></div>
              ))}
            </div>
          </div>
          {msds.hazard_statements?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-3 text-sm">유해·위험 문구</h2>
              <ul className="space-y-1">{msds.hazard_statements.map((h: string, i: number) => <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-red-500 flex-shrink-0">•</span>{h}</li>)}</ul>
            </div>
          )}
          {msds.precautionary_statements?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-3 text-sm">예방조치 문구</h2>
              <ul className="space-y-1">{msds.precautionary_statements.map((p: string, i: number) => <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-green-500 flex-shrink-0">✓</span>{p}</li>)}</ul>
            </div>
          )}
          {(msds.first_aid_eye||msds.first_aid_skin||msds.first_aid_inhale||msds.first_aid_ingest) && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4 text-sm">응급조치 요령</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[['눈 접촉',msds.first_aid_eye],['피부 접촉',msds.first_aid_skin],['흡입',msds.first_aid_inhale],['섭취',msds.first_aid_ingest]].filter(([,v])=>v).map(([k,v]) => (
                  <div key={k}><div className="text-xs text-gray-400 mb-1">{k}</div><div className="text-gray-700 leading-relaxed">{v}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 탭2: 법적 분류 ─────────────────────────────────── */}
      {tab==='classification' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold text-gray-800">15. 법적 규제현황 — AI 자동 분류</h2>
                <p className="text-xs text-gray-400 mt-0.5">MSDS 15항목 텍스트를 붙여넣으면 Claude AI가 관리대상/허가대상/특별관리/작업환경측정/특수건강진단 여부를 자동 판단합니다.</p>
              </div>
              <button onClick={analyzeLegal} disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 flex-shrink-0"
                style={{background: analyzing?'#9ca3af':'linear-gradient(135deg,#2563eb,#7c3aed)'}}>
                {analyzing?<><Loader2 className="w-4 h-4 animate-spin"/>분석 중...</>:<><Sparkles className="w-4 h-4"/>AI 법적 분류 분석</>}
              </button>
            </div>
            <textarea value={legalText} onChange={e=>setLegalText(e.target.value)} rows={5}
              className="input-base resize-none text-sm font-mono"
              placeholder="MSDS 15. 법적 규제현황 항목을 여기에 붙여넣으세요.&#10;예) 가. 산업안전보건법&#10;    - 관리대상유해물질: 해당 (벤젠)&#10;    - 허가대상유해물질: 해당 (시행령 제88조)&#10;    - 특별관리물질: 해당 (발암성 1A)"/>
            <div className="text-[10px] text-gray-400 mt-1.5">* 15조 텍스트가 없으면 제품명·GHS 유해성 정보 기반으로 추정 분류합니다.</div>
          </div>

          {analyzing && (
            <div className="card p-5 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-100">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 animate-pulse"/>
                <div>
                  <div className="font-semibold text-gray-800">Claude AI가 법적 규제현황을 분석 중...</div>
                  <div className="text-xs text-gray-500 mt-0.5">관리대상 / 허가대상 / 특별관리 / 작업환경측정 / 특수건강진단 / 특별교육 여부 판단 중</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{width:'60%'}}/>
              </div>
            </div>
          )}

          {hasClass && !analyzing && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {LEGAL_BADGES.map(badge => {
                  const isActive = !!lc[badge.key]
                  return (
                    <div key={badge.key}
                      className={clsx('card p-4 flex items-start gap-3 transition-all',isActive?'ring-2':'')}
                      style={isActive?{ringColor:badge.border,borderColor:badge.border,background:badge.bg}:{opacity:.5}}>
                      <div className="flex-1">
                        <div className="font-semibold text-sm" style={{color:isActive?badge.color:'#9ca3af'}}>{badge.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{badge.legal}</div>
                        <span className={clsx('text-[10px] font-bold mt-1 inline-block',isActive?'text-red-600':'text-gray-400')}>
                          {isActive?'● 해당':'○ 해당 없음'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {lc.edu_required_35 && (
                <div className="card p-5 border-amber-200 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-amber-700"/>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-amber-800 mb-1">특별교육 의무 발생 — 산업안전보건법 시행규칙 [별표 5] 제35호</div>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        <strong>허가 또는 관리대상 유해물질의 제조 또는 취급작업</strong>에 해당합니다.<br/>
                        해당 작업 근로자에게 <strong>16시간 이상</strong>(단기간 작업의 경우 2시간 이상)의 특별안전보건교육을 실시해야 합니다.
                      </p>
                      <div className="text-xs text-amber-600 mt-2 leading-relaxed bg-amber-100/50 rounded-lg p-2">
                        <strong>교육 내용:</strong> 취급 화학물질의 명칭·성질 및 상태 / 인체에 미치는 영향 / 국소배기장치 점검요령 / 보호구 착용 및 관리 / 응급처치 및 비상시 대처방법
                      </div>
                      <button onClick={handleGenEdu} disabled={genEdu}
                        className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 border border-amber-300 bg-white px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-all">
                        {genEdu?<Loader2 className="w-3 h-3 animate-spin"/>:<GraduationCap className="w-3 h-3"/>}
                        특별교육 일지 자동 생성
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {lc.classification_reason && (
                <div className="card p-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">분류 근거</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{lc.classification_reason}</p>
                  <div className="text-[10px] text-gray-400 mt-2">분석 시각: {lc.analyzed_at?new Date(lc.analyzed_at).toLocaleString('ko-KR'):'—'}</div>
                </div>
              )}

              {lc.legal_refs?.length > 0 && (
                <div className="card p-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">관련 법령</div>
                  <div className="flex flex-wrap gap-2">
                    {lc.legal_refs.map((ref: string, i: number) => (
                      <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{ref}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center">
                <button onClick={analyzeLegal} disabled={analyzing} className="btn-secondary text-xs gap-1.5 inline-flex">
                  <RefreshCw className="w-3.5 h-3.5"/> 재분석
                </button>
              </div>
            </>
          )}

          {!hasClass && !analyzing && (
            <div className="card p-10 text-center border-dashed">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-blue-300"/>
              <div className="font-semibold text-gray-700 mb-1">아직 법적 분류 분석을 실시하지 않았습니다.</div>
              <div className="text-sm text-gray-400 mb-4">위의 "AI 법적 분류 분석" 버튼을 눌러 자동으로 분류합니다.</div>
              <button onClick={analyzeLegal} className="btn-primary text-sm gap-2 inline-flex" style={{background:'linear-gradient(135deg,#2563eb,#7c3aed)'}}>
                <Sparkles className="w-4 h-4"/> 지금 분석하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 탭3: GHS 경고표지 ──────────────────────────────── */}
      {tab==='label' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">GHS 경고표지 자동 생성</h2>
                <p className="text-xs text-gray-400 mt-0.5">산업안전보건법 제114조 / 고용노동부고시 제2023-9호 | 법정 6개 필수 항목 자동 구성</p>
              </div>
              <div className="flex gap-2">
                {labelHtml && <button onClick={printLabel} className="btn-secondary text-xs gap-1.5"><Printer className="w-3.5 h-3.5"/>인쇄</button>}
                <button onClick={generateLabel} disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{background:generating?'#9ca3af':'linear-gradient(135deg,#d97706,#dc2626)'}}>
                  {generating?<><Loader2 className="w-4 h-4 animate-spin"/>생성 중...</>:<><Tag className="w-4 h-4"/>{labelHtml?'경고표지 재생성':'경고표지 생성'}</>}
                </button>
              </div>
            </div>

            {/* 경고표지 6개 구성요소 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[['① 명칭','제품명 또는 물질명'],['② 그림문자','GHS 9종 다이아몬드'],['③ 신호어','위험 / 경고'],['④ 유해·위험문구','H-Code 문구'],['⑤ 예방조치문구','P-Code (최대 6개)'],['⑥ 공급자 정보','제조사·긴급연락처']].map(([k,v]) => (
                <div key={k} className="p-2.5 bg-gray-50 rounded-xl text-center">
                  <div className="font-semibold text-xs text-gray-700">{k}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            {!hasClass && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                <div><strong>권장:</strong> 경고표지 생성 전 "법적 분류 분석" 탭에서 AI 분석을 먼저 실시하면 관리대상/허가대상/특별관리물질 표기가 자동으로 포함됩니다.</div>
              </div>
            )}

            {!labelHtml && !generating && (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center mt-4">
                <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300"/>
                <div className="font-semibold text-gray-600 mb-1">경고표지가 아직 생성되지 않았습니다.</div>
                <div className="text-sm text-gray-400 mb-4">MSDS 데이터를 기반으로 법령에 맞는 GHS 경고표지를 자동으로 생성합니다.</div>
                <button onClick={generateLabel} className="btn-primary text-sm gap-2 inline-flex" style={{background:'linear-gradient(135deg,#d97706,#dc2626)'}}>
                  <Tag className="w-4 h-4"/> 경고표지 자동 생성
                </button>
              </div>
            )}
          </div>

          {labelHtml && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-800 text-sm">경고표지 미리보기</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    {msds.hazard_label?.generated_at ? `생성: ${new Date(msds.hazard_label.generated_at).toLocaleString('ko-KR')}` : ''}
                  </span>
                  <button onClick={() => setShowLabel(v => !v)} className="btn-secondary text-xs">{showLabel?'숨기기':'미리보기'}</button>
                  <button onClick={printLabel} className="btn-primary text-xs gap-1.5" style={{background:'#d97706'}}><Printer className="w-3.5 h-3.5"/>인쇄</button>
                </div>
              </div>
              {showLabel && (
                <iframe ref={iframeRef} srcDoc={labelHtml} title="GHS 경고표지" className="w-full border-0" style={{height:600}}/>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 탭4: 특별관리물질 ──────────────────────────────── */}
      {tab==='special' && (
        <div className="space-y-4">

          {/* 해당 여부 상태 카드 */}
          {!lc.special_checked_at && !checkingSpecial && (
            <div className="card p-8 text-center border-dashed border-purple-200">
              <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-purple-300"/>
              <div className="font-semibold text-gray-700 mb-1">특별관리물질 해당 여부를 확인하세요</div>
              <p className="text-sm text-gray-400 mb-4">
                별표12에서 "(특별관리물질)" 표기된 물질 여부를 AI로 자동 판단합니다.<br/>
                해당 시 취급일지(제439조)·고지(제440조) 의무가 발생합니다.
              </p>
              <button onClick={checkSpecial}
                className="btn-primary text-sm gap-2 inline-flex" style={{background:'linear-gradient(135deg,#7c3aed,#dc2626)'}}>
                <ShieldAlert className="w-4 h-4"/> 특별관리물질 해당 여부 확인
              </button>
            </div>
          )}

          {checkingSpecial && (
            <div className="card p-5 bg-purple-50/40 border-purple-100">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 animate-pulse"/>
                <div>
                  <div className="font-semibold text-gray-800">별표12 특별관리물질 목록과 비교 중...</div>
                  <div className="text-xs text-gray-500 mt-0.5">유기화합물·금속류·산알칼리류·가스상태물질 36종 대조 중</div>
                </div>
              </div>
            </div>
          )}

          {lc.special_checked_at && !checkingSpecial && (
            <>
              {/* 판정 결과 배너 */}
              <div className={clsx('card p-5 flex items-start gap-4',
                isSpecial ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200')}>
                <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  isSpecial ? 'bg-red-100' : 'bg-green-100')}>
                  <ShieldAlert className={clsx('w-6 h-6', isSpecial ? 'text-red-600' : 'text-green-600')}/>
                </div>
                <div className="flex-1">
                  <div className={clsx('font-bold text-lg', isSpecial ? 'text-red-700' : 'text-green-700')}>
                    {isSpecial ? '⚠ 특별관리물질 해당' : '✓ 특별관리물질 해당 없음'}
                  </div>
                  {isSpecial && lc.special_substance_name && (
                    <div className="text-sm font-semibold text-red-800 mt-0.5">
                      별표12 해당 물질: <span className="underline">{lc.special_substance_name}</span>
                      {lc.special_condition && <span className="text-red-600 text-xs ml-2">({lc.special_condition})</span>}
                    </div>
                  )}
                  {/* CMR 유형 배지 */}
                  {isSpecial && specialCmrTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {specialCmrTypes.map(t => {
                        const cfg = CMR_LABELS[t as CMRType]
                        if (!cfg) return null
                        return (
                          <span key={t} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{background:cfg.bg, color:cfg.color, border:`1.5px solid ${cfg.color}40`}}>
                            {cfg.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {isSpecial && lc.special_cmr_reason && (
                    <p className="text-xs text-red-600 mt-2 leading-relaxed">{lc.special_cmr_reason}</p>
                  )}
                  <div className="text-[10px] text-gray-400 mt-2">
                    확인 시각: {new Date(lc.special_checked_at).toLocaleString('ko-KR')}
                    <button onClick={checkSpecial} disabled={checkingSpecial} className="ml-3 text-gray-400 hover:text-gray-600 underline">재확인</button>
                  </div>
                </div>
              </div>

              {isSpecial && (
                <>
                  {/* 법적 의무 요약 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card p-4 border-red-100 bg-red-50/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5 text-red-600"/>
                        </div>
                        <span className="font-semibold text-sm text-red-800">취급일지 작성 의무</span>
                      </div>
                      <p className="text-xs text-red-700 leading-relaxed">
                        <strong>제439조</strong>: 취급 시마다 ① 근로자 이름 ② 물질명 ③ 취급량 ④ 작업내용 ⑤ 착용 보호구 ⑥ 사고 발생 시 피해 및 조치사항을 기록·비치해야 합니다.
                      </p>
                    </div>
                    <div className="card p-4 border-purple-100 bg-purple-50/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 text-purple-600"/>
                        </div>
                        <span className="font-semibold text-sm text-purple-800">고지 의무</span>
                      </div>
                      <p className="text-xs text-purple-700 leading-relaxed">
                        <strong>제440조</strong>: 특별관리물질이라는 사실과 발암성·생식세포변이원성·생식독성 중 해당 유형을 게시판 등을 통해 근로자에게 알려야 합니다.
                      </p>
                    </div>
                  </div>

                  {/* 특별교육 안내 */}
                  <div className="card p-4 border-amber-200 bg-amber-50">
                    <div className="flex items-start gap-3">
                      <GraduationCap className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5"/>
                      <div>
                        <div className="font-semibold text-amber-800 text-sm">특별안전보건교육 의무 — 시행규칙 [별표 5] 제35호</div>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          허가 또는 관리대상 유해물질(특별관리물질 포함)의 제조·취급 작업 근로자에게 <strong>16시간 이상</strong>의 특별교육을 실시해야 합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── 취급일지 섹션 (제439조) ── */}
                  <div className="card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                      <div>
                        <h2 className="font-semibold text-gray-800">취급일지</h2>
                        <p className="text-[10px] text-gray-400 mt-0.5">안전보건규칙 제439조 | 법 제164조제1항제3호 — 6가지 사항 기록 의무</p>
                      </div>
                      <button onClick={() => setShowLogForm(v=>!v)}
                        className="btn-primary text-xs gap-1.5" style={{background:'#dc2626'}}>
                        <Plus className="w-3.5 h-3.5"/>{showLogForm ? '취소' : '취급일지 작성'}
                      </button>
                    </div>

                    {/* 취급일지 작성 폼 */}
                    {showLogForm && (
                      <div className="p-5 bg-red-50/30 border-b border-red-100 space-y-4">
                        <div className="text-xs font-semibold text-red-700 mb-1">
                          제439조 제1~6호 기재 사항 (전항 필수)
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="label-base">① 근로자 이름 *</label>
                            <input value={logForm.worker_name} onChange={e=>setLogForm(f=>({...f,worker_name:e.target.value}))}
                              placeholder="홍길동" className="input-base text-sm"/>
                          </div>
                          <div>
                            <label className="label-base">② 특별관리물질 명칭 *</label>
                            <input value={logForm.substance_name} onChange={e=>setLogForm(f=>({...f,substance_name:e.target.value}))}
                              className="input-base text-sm"/>
                          </div>
                          <div>
                            <label className="label-base">취급 일자 *</label>
                            <input type="date" value={logForm.work_date} onChange={e=>setLogForm(f=>({...f,work_date:e.target.value}))}
                              className="input-base text-sm"/>
                          </div>
                          <div>
                            <label className="label-base">③ 취급량 *</label>
                            <input value={logForm.usage_amount} onChange={e=>setLogForm(f=>({...f,usage_amount:e.target.value}))}
                              placeholder="예: 500mL / 2kg" className="input-base text-sm"/>
                          </div>
                          <div>
                            <label className="label-base">부서명</label>
                            <input value={logForm.dept_name} onChange={e=>setLogForm(f=>({...f,dept_name:e.target.value}))}
                              placeholder="생산1팀" className="input-base text-sm"/>
                          </div>
                          <div>
                            <label className="label-base">작업 장소</label>
                            <input value={logForm.work_location} onChange={e=>setLogForm(f=>({...f,work_location:e.target.value}))}
                              placeholder="3공장 도장실" className="input-base text-sm"/>
                          </div>
                          <div className="col-span-3">
                            <label className="label-base">④ 작업 내용 *</label>
                            <textarea value={logForm.work_content} onChange={e=>setLogForm(f=>({...f,work_content:e.target.value}))}
                              rows={2} placeholder="예: 금속 부품 세척 작업, 세척조에 용제 투입 후 침지 방식으로 세척"
                              className="input-base text-sm resize-none"/>
                          </div>
                          <div className="col-span-3">
                            <label className="label-base">⑤ 작업 시 착용한 보호구 *</label>
                            <input value={logForm.ppe_worn} onChange={e=>setLogForm(f=>({...f,ppe_worn:e.target.value}))}
                              placeholder="예: 방독마스크(유기화합물용), 내화학성 장갑(니트릴), 보안경, 방화복"
                              className="input-base text-sm"/>
                          </div>
                          <div className="col-span-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="label-base mb-0">⑥ 누출·오염·흡입 등 사고 발생 여부</label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={logForm.incident_occurred}
                                  onChange={e=>setLogForm(f=>({...f,incident_occurred:e.target.checked}))}
                                  className="w-4 h-4 accent-red-600"/>
                                <span className="text-xs text-red-700 font-medium">사고 발생</span>
                              </label>
                            </div>
                            {logForm.incident_occurred && (
                              <textarea value={logForm.incident_content} onChange={e=>setLogForm(f=>({...f,incident_content:e.target.value}))}
                                rows={3} placeholder="사고 발생 시 피해 내용 및 조치사항을 상세히 기재하세요."
                                className="input-base text-sm resize-none border-red-300 bg-red-50/50"/>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowLogForm(false)} className="btn-secondary text-xs">취소</button>
                          <button onClick={saveLog} disabled={savingLog}
                            className="btn-primary text-xs gap-1.5" style={{background:'#dc2626'}}>
                            {savingLog ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                            저장
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 취급일지 목록 */}
                    {specialLogs.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-400">
                        아직 등록된 취급일지가 없습니다.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" style={{minWidth:'700px'}}>
                          <thead><tr className="bg-gray-50 border-b border-gray-200">
                            {['취급일','근로자','물질명','취급량','작업내용','착용 보호구','사고',''].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                            ))}
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {specialLogs.map(log => (
                              <tr key={log.id} className={clsx('hover:bg-gray-50', log.incident_occurred && 'bg-red-50/30')}>
                                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{log.work_date}</td>
                                <td className="px-3 py-2.5 font-medium text-gray-900">{log.worker_name}</td>
                                <td className="px-3 py-2.5 text-gray-700">{log.substance_name}</td>
                                <td className="px-3 py-2.5 text-gray-600">{log.usage_amount}</td>
                                <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{log.work_content}</td>
                                <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{log.ppe_worn}</td>
                                <td className="px-3 py-2.5 text-center">
                                  {log.incident_occurred
                                    ? <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">발생</span>
                                    : <span className="text-[10px] text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5">
                                  <button onClick={() => deleteLog(log.id)} className="text-gray-300 hover:text-red-500">
                                    <Trash2 className="w-3.5 h-3.5"/>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* ── 고지 섹션 (제440조) ── */}
                  <div className="card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                      <div>
                        <h2 className="font-semibold text-gray-800">특별관리물질 고지</h2>
                        <p className="text-[10px] text-gray-400 mt-0.5">안전보건규칙 제440조 — 게시판 등을 통해 근로자에게 고지 의무</p>
                      </div>
                      <button onClick={() => setShowNoticeForm(v=>!v)}
                        className="btn-primary text-xs gap-1.5" style={{background:'#7c3aed'}}>
                        <Plus className="w-3.5 h-3.5"/>{showNoticeForm ? '취소' : '고지문 작성'}
                      </button>
                    </div>

                    {/* 고지 작성 폼 */}
                    {showNoticeForm && (
                      <div className="p-5 bg-purple-50/30 border-b border-purple-100 space-y-3">
                        <div className="text-xs font-semibold text-purple-700 mb-1">
                          제440조: 특별관리물질 해당 사실 + CMR 유형 고지 (게시판 등 활용)
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label-base">물질명 *</label>
                            <input value={noticeForm.substance_name} onChange={e=>setNoticeForm(f=>({...f,substance_name:e.target.value}))}
                              className="input-base text-sm"/>
                          </div>
                          <div>
                            <label className="label-base">게시일</label>
                            <input type="date" value={noticeForm.posted_at} onChange={e=>setNoticeForm(f=>({...f,posted_at:e.target.value}))}
                              className="input-base text-sm"/>
                          </div>
                          <div className="col-span-2">
                            <label className="label-base">CMR 유형 (해당하는 것 모두 선택) *</label>
                            <div className="flex gap-3 mt-1">
                              {(['C','M','R'] as CMRType[]).map(t => {
                                const cfg = CMR_LABELS[t]
                                return (
                                  <label key={t} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border-2 flex-1 transition-all"
                                    style={noticeForm.cmr_types.includes(t)?{borderColor:cfg.color,background:cfg.bg}:{borderColor:'#e5e7eb'}}>
                                    <input type="checkbox"
                                      checked={noticeForm.cmr_types.includes(t)}
                                      onChange={e => setNoticeForm(f => ({
                                        ...f,
                                        cmr_types: e.target.checked ? [...f.cmr_types, t] : f.cmr_types.filter(x=>x!==t)
                                      }))}
                                      className="w-4 h-4" style={{accentColor:cfg.color}}/>
                                    <div>
                                      <div className="text-xs font-bold" style={{color:cfg.color}}>{cfg.label}</div>
                                      <div className="text-[9px] text-gray-400 leading-tight">{cfg.full.split('(')[0]}</div>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="label-base">게시 위치</label>
                            <input value={noticeForm.posted_location} onChange={e=>setNoticeForm(f=>({...f,posted_location:e.target.value}))}
                              placeholder="예: 3공장 출입구 게시판" className="input-base text-sm"/>
                          </div>
                          <div className="col-span-2">
                            <label className="label-base">취급 시 주의사항 (자동 입력 또는 수정 가능)</label>
                            <textarea value={noticeForm.notice_content} onChange={e=>setNoticeForm(f=>({...f,notice_content:e.target.value}))}
                              rows={4} className="input-base text-sm resize-none"
                              placeholder="비워두면 기본 주의사항이 자동 입력됩니다."/>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowNoticeForm(false)} className="btn-secondary text-xs">취소</button>
                          <button onClick={saveNotice} disabled={savingNotice}
                            className="btn-primary text-xs gap-1.5" style={{background:'#7c3aed'}}>
                            {savingNotice ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                            고지문 생성
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 고지 목록 */}
                    {specialNotices.length === 0 && !showNoticeForm ? (
                      <div className="py-10 text-center text-sm text-gray-400">
                        아직 등록된 고지 기록이 없습니다.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {specialNotices.map(notice => (
                          <div key={notice.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900 text-sm">{notice.substance_name}</span>
                                {(notice.cmr_types||[]).map((t: string) => {
                                  const cfg = CMR_LABELS[t as CMRType]
                                  return cfg ? (
                                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                      style={{background:cfg.bg, color:cfg.color}}>{cfg.label}</span>
                                  ) : null
                                })}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                게시일: {notice.posted_at}
                                {notice.posted_location && ` | 위치: ${notice.posted_location}`}
                                {notice.is_active && <span className="ml-2 text-green-600 font-medium">● 게시 중</span>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {notice.html_content && (
                                <button onClick={() => printNotice(notice.html_content)}
                                  className="btn-secondary text-xs gap-1.5">
                                  <Printer className="w-3.5 h-3.5"/>인쇄
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 별표12 전체 특별관리물질 목록 참조 */}
                  <div className="card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-gray-800 text-sm">별표12 특별관리물질 전체 목록 (참고)</h2>
                        <p className="text-[10px] text-gray-400 mt-0.5">산업안전보건기준에 관한 규칙 별표12 | "(특별관리물질)" 표기 물질</p>
                      </div>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-[11px]" style={{minWidth:'600px'}}>
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                          {['분류','한글명','영문명','CAS No.','CMR 유형','조건'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {SPECIAL_SUBSTANCES.map(s => {
                            const isCurrentSubstance = lc.special_substance_name?.includes(s.name_ko) || msds.product_name?.includes(s.name_ko)
                            return (
                              <tr key={s.id} className={clsx('hover:bg-gray-50', isCurrentSubstance && 'bg-red-50 font-semibold')}>
                                <td className="px-3 py-2">
                                  <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-medium',
                                    s.category==='유기화합물'?'bg-blue-50 text-blue-700':
                                    s.category==='금속류'?'bg-gray-100 text-gray-700':
                                    s.category==='산·알칼리류'?'bg-orange-50 text-orange-700':
                                    'bg-green-50 text-green-700')}>
                                    {s.category}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-900">{s.name_ko}
                                  {isCurrentSubstance && <span className="ml-1 text-red-600">◀ 현재</span>}
                                </td>
                                <td className="px-3 py-2 text-gray-500 font-mono">{s.name_en}</td>
                                <td className="px-3 py-2 text-gray-500 font-mono">{s.cas_no}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    {s.cmr_type.map(t => {
                                      const cfg = CMR_LABELS[t]
                                      return (
                                        <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                          style={{background:cfg.bg, color:cfg.color}}>{t}</span>
                                      )
                                    })}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-gray-400 text-[9px]">{s.condition || '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
