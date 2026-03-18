'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Loader2, Plus, Trash2, Users, Link2, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'
import { COMMITTEE_ROLE_LABEL, type RiskPerformance } from '@/types/inspection'
import { buildRiskPerformance, getDefaultAgendaItems } from '@/lib/linkage/riskToCommittee'

const ROLES = Object.entries(COMMITTEE_ROLE_LABEL)

export default function CommitteeNewPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const riskId      = searchParams.get('risk_id')

  const [saving,   setSaving]   = useState(false)
  const [riskPerf, setRiskPerf] = useState<RiskPerformance | null>(null)
  const [riskTitle,setRiskTitle]= useState<string>('')

  const form = useForm<any>({
    defaultValues: {
      meeting_date:   new Date().toISOString().slice(0, 10),
      meeting_start:  '', meeting_end: '',
      meeting_place:  '회의실', meeting_type: 'regular',
      resolution: '', next_meeting_date: '',
      members: [
        { seq:1, name:'', position:'안전보건관리책임자', affiliation:'', role:'chair',       is_present:true },
        { seq:2, name:'', position:'안전관리자',         affiliation:'', role:'member',      is_present:true },
        { seq:3, name:'', position:'근로자 대표',         affiliation:'', role:'worker_rep', is_present:true },
        { seq:4, name:'', position:'사용자 대표',         affiliation:'', role:'mgmt_rep',   is_present:true },
      ],
      agenda_items: [
        { seq:1, title:'위험성평가 운영 실적 보고', content:'', decision:'', owner:'안전관리자', deadline:'' },
        { seq:2, title:'안전보건 활동 추진 실적',   content:'', decision:'', owner:'안전관리자', deadline:'' },
        { seq:3, title:'안전보건 활동 계획 수립',   content:'', decision:'', owner:'안전관리자', deadline:'' },
        { seq:4, title:'근로자 의견 청취',           content:'', decision:'', owner:'근로자 대표', deadline:'' },
      ],
    },
  })

  const { fields: memberFields, append: addMember, remove: removeMember } = useFieldArray({ control: form.control, name: 'members' })
  const { fields: agendaFields, append: addAgenda, remove: removeAgenda } = useFieldArray({ control: form.control, name: 'agenda_items' })

  // 위험성평가 운영 실적 자동 연계
  useEffect(() => {
    if (!riskId) return
    // 최근 위험성평가 목록 가져오기
    fetch(`/api/risk?status=approved&limit=10`).then(r => r.json()).then(j => {
      const raList = j.data ?? []
      const perf   = buildRiskPerformance(raList)
      setRiskPerf(perf)
      if (raList[0]) setRiskTitle(raList[0].title)

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
      members:      data.members.map((m:any,i:number) => ({ ...m, seq: i+1 })),
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
              위험성평가 운영 실적 요약 (의안 1번 자동 반영)
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
            <button type="button"
              onClick={() => addMember({ seq:memberFields.length+1, name:'', position:'', affiliation:'', role:'member', is_present:true })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3"/> 추가
            </button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['성명','직위','소속','역할','참석',''].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {memberFields.map((f, idx) => (
                <tr key={f.id}>
                  <td className="px-4 py-2"><input {...form.register(`members.${idx}.name`)} placeholder="홍길동" className="input-base text-sm py-1.5"/></td>
                  <td className="px-4 py-2"><input {...form.register(`members.${idx}.position`)} placeholder="안전보건관리책임자" className="input-base text-sm py-1.5"/></td>
                  <td className="px-4 py-2"><input {...form.register(`members.${idx}.affiliation`)} placeholder="(주)건설" className="input-base text-sm py-1.5"/></td>
                  <td className="px-4 py-2">
                    <select {...form.register(`members.${idx}.role`)} className="input-base text-sm py-1.5">
                      {ROLES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" {...form.register(`members.${idx}.is_present`)} className="w-4 h-4 accent-purple-600"/>
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => removeMember(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <div key={f.id} className={clsx('p-5', idx === 0 && riskPerf && 'bg-purple-50/20')}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {idx+1}
                  </span>
                  <input {...form.register(`agenda_items.${idx}.title`)} placeholder="안건 제목" className="input-base flex-1 font-medium"/>
                  {idx === 0 && riskPerf && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Link2 className="w-2.5 h-2.5"/> 위험성평가 연계
                    </span>
                  )}
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
