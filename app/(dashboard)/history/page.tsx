'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, History, ChevronDown, ChevronUp, RotateCcw, Eye, FileText, GitBranch } from 'lucide-react'
import { clsx } from 'clsx'
import { toast } from 'sonner'

const DOC_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  risk:             { label:'위험성평가',       color:'text-red-700',    bg:'bg-red-50'    },
  education:        { label:'안전보건교육일지', color:'text-blue-700',   bg:'bg-blue-50'   },
  workplan:         { label:'작업계획서',       color:'text-green-700',  bg:'bg-green-50'  },
  inspection:       { label:'순회점검일지',     color:'text-amber-700',  bg:'bg-amber-50'  },
  joint_inspection: { label:'합동안전보건점검', color:'text-orange-700', bg:'bg-orange-50' },
  committee:        { label:'안전보건협의체',   color:'text-purple-700', bg:'bg-purple-50' },
  designation:      { label:'지정서·선임서',    color:'text-violet-700', bg:'bg-violet-50' },
  msds:             { label:'MSDS',            color:'text-cyan-700',   bg:'bg-cyan-50'   },
}

interface VersionItem {
  id:             string
  doc_type:       string
  doc_id:         string
  doc_number:     string | null
  version:        number
  change_summary: string
  created_at:     string
  author:         { name: string } | null
}

export default function HistoryPage() {
  const searchParams = useSearchParams()
  const docId   = searchParams.get('doc_id')
  const docType = searchParams.get('doc_type')

  const [versions,  setVersions]  = useState<VersionItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [snapshot,  setSnapshot]  = useState<any>(null)
  const [snapLoading, setSnapLoad]= useState(false)
  const [filter,    setFilter]    = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (docId)   params.set('doc_id', docId)
    if (docType) params.set('doc_type', docType)
    const res  = await fetch(`/api/history?${params}`)
    const json = await res.json()
    setLoading(false)
    setVersions(json.data ?? [])
  }, [docId, docType])

  useEffect(() => { load() }, [load])

  async function loadSnapshot(versionId: string) {
    if (expanded === versionId) { setExpanded(null); setSnapshot(null); return }
    setExpanded(versionId)
    setSnapLoad(true)
    const res  = await fetch(`/api/history/${versionId}`)
    const json = await res.json()
    setSnapLoad(false)
    setSnapshot(json.data?.snapshot ?? null)
  }

  // 타입별 필터
  const docTypes = Array.from(new Set(versions.map(v => v.doc_type)))
  const filtered = filter === 'all' ? versions : versions.filter(v => v.doc_type === filter)

  // 그룹핑 (doc_type + doc_number 기준)
  const grouped = filtered.reduce((acc, v) => {
    const key = `${v.doc_type}::${v.doc_id}`
    if (!acc[key]) acc[key] = { doc_type: v.doc_type, doc_id: v.doc_id, doc_number: v.doc_number, versions: [] }
    acc[key].versions.push(v)
    return acc
  }, {} as Record<string, { doc_type:string; doc_id:string; doc_number:string|null; versions:VersionItem[] }>)

  const totalVersions = versions.length
  const uniqueDocs    = Object.keys(grouped).length

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600"/>
            문서 버전 이력관리
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            모든 문서의 수정 이력이 자동으로 기록됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium">{totalVersions}개 버전</span>
          <span className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs">{uniqueDocs}개 문서</span>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {Object.entries(DOC_TYPE_LABELS).map(([type, cfg]) => {
          const cnt = versions.filter(v => v.doc_type === type).length
          if (cnt === 0) return null
          return (
            <div key={type} className={clsx('card p-3.5 cursor-pointer transition-all', filter===type && 'ring-2 ring-indigo-400')}
              onClick={() => setFilter(filter===type ? 'all' : type)}>
              <div className={clsx('text-xs font-medium mb-1', cfg.color)}>{cfg.label}</div>
              <div className="text-xl font-bold text-gray-900">{cnt}건</div>
            </div>
          )
        })}
      </div>

      {/* 필터 탭 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter('all')}
          className={clsx('text-xs px-3 py-1.5 rounded-lg border transition-all',
            filter==='all' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200')}>
          전체
        </button>
        {docTypes.map(t => {
          const cfg = DOC_TYPE_LABELS[t] ?? { label: t, color:'text-gray-700', bg:'bg-gray-50' }
          return (
            <button key={t} onClick={() => setFilter(t)}
              className={clsx('text-xs px-3 py-1.5 rounded-lg border transition-all',
                filter===t ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-gray-500 border-gray-200')}>
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* 버전 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <History className="w-10 h-10 mx-auto mb-3 opacity-20"/>
          <p className="text-sm">버전 이력이 없습니다.</p>
          <p className="text-xs mt-1">문서를 작성하거나 수정하면 자동으로 기록됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([key, group]) => {
            const cfg = DOC_TYPE_LABELS[group.doc_type] ?? { label:group.doc_type, color:'text-gray-700', bg:'bg-gray-50' }
            const latest = group.versions[0]
            return (
              <div key={key} className="card overflow-hidden">
                {/* 문서 헤더 */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0"/>
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                  <span className="text-sm font-semibold text-gray-800 font-mono">{group.doc_number ?? group.doc_id.slice(0,8)}</span>
                  <span className="text-xs text-gray-400 ml-auto">{group.versions.length}개 버전</span>
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-gray-300"/>
                    <span className="text-xs text-gray-400">v{latest.version}</span>
                  </div>
                </div>

                {/* 버전 타임라인 */}
                <div className="px-5 py-3">
                  <div className="relative">
                    <div className="absolute left-[9px] top-3 bottom-3 w-px bg-gray-200"/>
                    <div className="space-y-1">
                      {group.versions.map((v, idx) => {
                        const isExpanded = expanded === v.id
                        const isLatest   = idx === 0
                        return (
                          <div key={v.id}>
                            <div
                              className={clsx('flex items-start gap-3 py-2.5 px-3 rounded-xl cursor-pointer transition-colors',
                                isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-50')}
                              onClick={() => loadSnapshot(v.id)}>
                              {/* 버전 dot */}
                              <div className={clsx('w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                                isLatest ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300')}>
                                {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                              </div>
                              {/* 내용 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={clsx('text-xs font-bold', isLatest ? 'text-indigo-700' : 'text-gray-600')}>
                                    v{v.version}
                                  </span>
                                  {isLatest && (
                                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">최신</span>
                                  )}
                                  <span className="text-xs text-gray-700">{v.change_summary || '내용 수정'}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(v.created_at).toLocaleString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                                  </span>
                                  {v.author && (
                                    <span className="text-[10px] text-gray-400">· {v.author.name}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button className="p-1 text-gray-300 hover:text-indigo-500 rounded" title="스냅샷 보기">
                                  <Eye className="w-3.5 h-3.5"/>
                                </button>
                                {!isLatest && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      toast.info(`v${v.version} 버전으로 복원하려면 해당 문서에서 수동으로 내용을 적용해주세요.`)
                                    }}
                                    className="p-1 text-gray-300 hover:text-amber-500 rounded" title="이 버전 참고">
                                    <RotateCcw className="w-3.5 h-3.5"/>
                                  </button>
                                )}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400"/> : <ChevronDown className="w-3.5 h-3.5 text-gray-400"/>}
                              </div>
                            </div>

                            {/* 스냅샷 미리보기 */}
                            {isExpanded && (
                              <div className="ml-7 mt-1 mb-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                {snapLoading ? (
                                  <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin"/>불러오는 중...
                                  </div>
                                ) : snapshot ? (
                                  <div className="p-4">
                                    <div className="text-[10px] font-semibold text-gray-500 mb-2">v{v.version} 스냅샷 미리보기</div>
                                    <SnapshotPreview docType={group.doc_type} snapshot={snapshot}/>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 문서 타입별 스냅샷 요약 뷰 ──────────────────────────────
function SnapshotPreview({ docType, snapshot }: { docType: string; snapshot: any }) {
  const fields: { label: string; value: any }[] = []

  if (docType === 'inspection') {
    fields.push(
      { label:'점검 유형',  value: snapshot.inspection_type },
      { label:'점검 일자',  value: snapshot.inspection_date },
      { label:'점검 구역',  value: snapshot.inspection_area },
      { label:'점검자',     value: snapshot.inspector_name },
      { label:'점검 항목 수', value: snapshot.check_items?.length ?? 0 },
      { label:'불량 건수',  value: (snapshot.check_items??[]).filter((i:any)=>i.result==='fail').length },
      { label:'상태',       value: snapshot.status },
    )
  } else if (docType === 'committee') {
    fields.push(
      { label:'회의 유형',  value: snapshot.meeting_type },
      { label:'회의 일자',  value: snapshot.meeting_date },
      { label:'장소',       value: snapshot.meeting_place },
      { label:'참석자 수',  value: snapshot.members?.length ?? 0 },
      { label:'안건 수',    value: snapshot.agenda_items?.length ?? 0 },
      { label:'상태',       value: snapshot.status },
    )
  } else if (docType === 'joint_inspection') {
    fields.push(
      { label:'점검 일자',    value: snapshot.inspection_date },
      { label:'점검 구역',    value: snapshot.inspection_area },
      { label:'참석자 수',    value: snapshot.participants?.length ?? 0 },
      { label:'점검 항목 수', value: snapshot.check_items?.length ?? 0 },
      { label:'개선사항 수',  value: snapshot.improvement_items?.length ?? 0 },
      { label:'상태',         value: snapshot.status },
    )
  } else if (docType === 'risk') {
    fields.push(
      { label:'제목',     value: snapshot.title },
      { label:'평가 유형', value: snapshot.eval_type },
      { label:'항목 수',  value: snapshot.items?.length ?? 0 },
      { label:'상태',     value: snapshot.status },
    )
  } else {
    // 범용 처리
    Object.entries(snapshot).slice(0, 8).forEach(([k, v]) => {
      if (typeof v !== 'object') fields.push({ label: k, value: String(v) })
    })
  }

  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-2">
      {fields.map(f => (
        <div key={f.label}>
          <span className="text-[10px] text-gray-400">{f.label}</span>
          <div className="text-xs text-gray-700 font-medium">{String(f.value ?? '—')}</div>
        </div>
      ))}
    </div>
  )
}
