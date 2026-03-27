'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Loader2, Plus, Trash2, Users, Link2, BarChart3 } from 'lucide-react'
import { type RiskPerformance } from '@/types/inspection'
import { buildRiskPerformance, getDefaultAgendaItems } from '@/lib/linkage/riskToCommittee'

export default function CommitteeNewPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const riskId      = searchParams.get('risk_id')

  const [saving,   setSaving]   = useState(false)
  const [riskPerf, setRiskPerf] = useState<RiskPerformance | null>(null)

  const form = useForm<any>({
    defaultValues: {
      meeting_date:   new Date().toISOString().slice(0, 10),
      meeting_start:  '', meeting_end: '',
      meeting_place:  '회의실', meeting_type: 'regular',
      resolution: '', next_meeting_date: '',
      members: [
        { seq:1, name:'', position:'사용자측 대표', affiliation:'', role:'mgmt_rep', side:'management', is_present:true },
        { seq:2, name:'', position:'근로자측 대표', affiliation:'', role:'worker_rep', side:'labor', is_present:true },
      ],
      agenda_items: getDefaultAgendaItems(false),
    },
  })

  const { fields: memberFields, append: addMember, remove: removeMember } = useFieldArray({ control: form.control, name: 'members' })
  const { fields: agendaFields, append: addAgenda, remove: removeAgenda } = useFieldArray({ control: form.control, name: 'agenda_items' })
  const members = form.watch('members') ?? []
  const managementIndexes = members.reduce((acc: number[], m: any, idx: number) => {
    if ((m.side ?? '') === 'management' || ((m.side ?? '') === '' && (m.role ?? '') !== 'worker_rep')) acc.push(idx)
    return acc
  }, [])
  const laborIndexes = members.reduce((acc: number[], m: any, idx: number) => {
    if ((m.side ?? '') === 'labor' || (m.role ?? '') === 'worker_rep') acc.push(idx)
    return acc
  }, [])

  function addMemberBySide(side: 'management' | 'labor') {
    addMember({
      seq: memberFields.length + 1,
      name: '',
      position: side === 'management' ? '사용자측 위원' : '근로자측 위원',
      affiliation: '',
      role: side === 'management' ? 'mgmt_rep' : 'worker_rep',
      side,
      is_present: true,
    })
  }

  // 위험성평가 운영 실적 자동 연계
  useEffect(() => {
    if (!riskId) return
    // 최근 위험성평가 목록 가져오기
    fetch(`/api/risk?status=approved&limit=10`).then(r => r.json()).then(j => {
      const raList = j.data ?? []
      const perf   = buildRiskPerformance(raList)
      setRiskPerf(perf)

      // 의안 1번에 운영 실적 자동 입력
      const agendas = getDefaultAgendaItems(true, perf)
      form.setValue('agenda_items', agendas.map((a, i) => ({ ...a, seq: i+1 })))
      if (raList[0]) {
        form.setValue('source_risk_id', raList[0].id)
      }
      toast.success(`위험성평가 운영 실적 자동 연계 완료 (총 ${raList.length}건)`)
    })
  }, [riskId])

  async function onSubmit(data: any) {
    setSaving(true)
    const payload = {
      ...data,
      risk_performance: riskPerf,
      members: data.members.map((m: any, i: number) => ({
        ...m,
        seq: i + 1,
        side: m.side ?? (m.role === 'worker_rep' ? 'labor' : 'management'),
        role: m.role ?? (m.side === 'labor' ? 'worker_rep' : 'mgmt_rep'),
      })),
      agenda_items: data.agenda_items.map((a:any,i:number) => ({ ...a, seq: i+1 })),
    }
    const res  = await fetch('/api/documents/committee', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('안전보건협의체 회의록이 작성되었습니다.')
    router.push(`/documents/committee/${json.data.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600"/>
            안전보건협의체 회의록 작성
          </h1>
          {riskPerf && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-600">
              <BarChart3 className="w-3.5 h-3.5"/>
              위험성평가 운영 실적 자동 연계 (총 {riskPerf.eval_count}건, 高위험 {riskPerf.high_count}건)
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary" style={{background:'#7c3aed'}}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            저장
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 위험성평가 운영 실적 패널 */}
        {riskPerf && (
          <div className="card p-4 border-purple-200 bg-purple-50/30">
            <h3 className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5"/>
              위험성평가 운영 실적 요약 (제79조 안건 중 "위험성평가 실시에 관한 사항" 자동 반영)
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:'평가 건수',   value:`${riskPerf.eval_count}건`,  color:'text-purple-700' },
                { label:'高위험 건수', value:`${riskPerf.high_count}건`,  color:'text-red-600'    },
                { label:'中·低 건수',  value:`${riskPerf.mid_count+riskPerf.low_count}건`, color:'text-amber-600' },
                { label:'이행률',      value:`${riskPerf.resolved_rate}%`,color:'text-green-600'  },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-lg p-3 border border-purple-100">
                  <div className="text-[10px] text-gray-400">{s.label}</div>
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            {riskPerf.notable_items.length > 0 && (
              <div className="mt-3 text-xs text-purple-700">
                <span className="font-medium">고위험 항목:</span> {riskPerf.notable_items.join(' / ')}
              </div>
            )}
          </div>
        )}

        {/* 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">회의 기본정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">회의 유형</label>
              <select {...form.register('meeting_type')} className="input-base">
                <option value="regular">정기 회의</option>
                <option value="extraordinary">임시 회의</option>
              </select>
            </div>
            <div>
              <label className="label-base">회의 일자 *</label>
              <input {...form.register('meeting_date')} type="date" className="input-base"/>
            </div>
            <div>
              <label className="label-base">회의 장소 *</label>
              <input {...form.register('meeting_place')} placeholder="본사 회의실" className="input-base"/>
            </div>
            <div>
              <label className="label-base">시작 시간</label>
              <input {...form.register('meeting_start')} type="time" className="input-base"/>
            </div>
            <div>
              <label className="label-base">종료 시간</label>
              <input {...form.register('meeting_end')} type="time" className="input-base"/>
            </div>
            <div>
              <label className="label-base">차기 회의 예정일</label>
              <input {...form.register('next_meeting_date')} type="date" className="input-base"/>
            </div>
          </div>
        </div>

        {/* 참석자 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">참석자 명단</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className="rounded-xl border border-blue-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-100">
                <span className="text-xs font-semibold text-blue-700">사용자측</span>
                <button type="button" onClick={() => addMemberBySide('management')} className="text-[11px] text-blue-700 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              <div className="divide-y divide-blue-50">
                {managementIndexes.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">사용자측 참석자를 추가하세요.</div>
                ) : (
                  managementIndexes.map((idx) => (
                    <div key={memberFields[idx]?.id ?? idx} className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input {...form.register(`members.${idx}.name`)} placeholder="성명" className="input-base text-sm py-1.5" />
                        <input {...form.register(`members.${idx}.position`)} placeholder="직위" className="input-base text-sm py-1.5" />
                      </div>
                      <input {...form.register(`members.${idx}.affiliation`)} placeholder="소속" className="input-base text-sm py-1.5" />
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-500 flex items-center gap-1.5">
                          <input type="checkbox" {...form.register(`members.${idx}.is_present`)} className="w-4 h-4 accent-blue-600" />
                          참석
                        </label>
                        <button type="button" onClick={() => removeMember(idx)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input type="hidden" {...form.register(`members.${idx}.side`)} value="management" />
                      <input type="hidden" {...form.register(`members.${idx}.role`)} value="mgmt_rep" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-green-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-green-50 border-b border-green-100">
                <span className="text-xs font-semibold text-green-700">근로자측</span>
                <button type="button" onClick={() => addMemberBySide('labor')} className="text-[11px] text-green-700 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 추가
                </button>
              </div>
              <div className="divide-y divide-green-50">
                {laborIndexes.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-gray-400">근로자측 참석자를 추가하세요.</div>
                ) : (
                  laborIndexes.map((idx) => (
                    <div key={memberFields[idx]?.id ?? idx} className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input {...form.register(`members.${idx}.name`)} placeholder="성명" className="input-base text-sm py-1.5" />
                        <input {...form.register(`members.${idx}.position`)} placeholder="직위" className="input-base text-sm py-1.5" />
                      </div>
                      <input {...form.register(`members.${idx}.affiliation`)} placeholder="소속" className="input-base text-sm py-1.5" />
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-500 flex items-center gap-1.5">
                          <input type="checkbox" {...form.register(`members.${idx}.is_present`)} className="w-4 h-4 accent-green-600" />
                          참석
                        </label>
                        <button type="button" onClick={() => removeMember(idx)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input type="hidden" {...form.register(`members.${idx}.side`)} value="labor" />
                      <input type="hidden" {...form.register(`members.${idx}.role`)} value="worker_rep" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 안건 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">회의 안건</h2>
            <button type="button"
              onClick={() => addAgenda({ seq:agendaFields.length+1, title:'', content:'', decision:'', owner:'', deadline:'' })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3"/> 안건 추가
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {agendaFields.map((f, idx) => (
              <div key={f.id} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {idx+1}
                  </span>
                  <input {...form.register(`agenda_items.${idx}.title`)} placeholder="안건 제목" className="input-base flex-1 font-medium"/>
                  <button type="button" onClick={() => removeAgenda(idx)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 ml-9">
                  <div>
                    <label className="label-base">내용</label>
                    <textarea {...form.register(`agenda_items.${idx}.content`)} rows={3}
                      className="input-base resize-none text-sm" placeholder="안건 내용"/>
                  </div>
                  <div>
                    <label className="label-base">결정 사항</label>
                    <textarea {...form.register(`agenda_items.${idx}.decision`)} rows={3}
                      className="input-base resize-none text-sm" placeholder="결정 사항 및 조치 내용"/>
                  </div>
                  <div>
                    <label className="label-base">담당자</label>
                    <input {...form.register(`agenda_items.${idx}.owner`)} className="input-base text-sm"/>
                  </div>
                  <div>
                    <label className="label-base">이행 기한</label>
                    <input {...form.register(`agenda_items.${idx}.deadline`)} type="date" className="input-base text-sm"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 결의사항 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">결의사항</h2>
          <textarea {...form.register('resolution')} rows={3}
            className="input-base resize-none" placeholder="회의 결의사항을 입력하세요."/>
        </div>
      </form>
    </div>
  )
}
