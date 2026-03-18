'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Plus, Trash2, Users2 } from 'lucide-react'

// 산안법에서 정하는 기본 안건 템플릿
const DEFAULT_AGENDAS = {
  safety_committee: [
    { title: '산업재해 예방계획의 수립에 관한 사항',          content: '', decision: '', owner: '안전관리자',  deadline: '' },
    { title: '안전보건관리규정의 작성 및 변경에 관한 사항',    content: '', decision: '', owner: '안전관리자',  deadline: '' },
    { title: '근로자의 안전·보건 교육에 관한 사항',           content: '', decision: '', owner: '안전관리자',  deadline: '' },
    { title: '작업환경측정 등 작업환경의 점검 및 개선',        content: '', decision: '', owner: '보건관리자',  deadline: '' },
    { title: '근로자의 건강진단 등 건강관리에 관한 사항',      content: '', decision: '', owner: '보건관리자',  deadline: '' },
    { title: '중대재해의 원인 조사 및 재발 방지대책',          content: '', decision: '', owner: '안전보건관리책임자', deadline: '' },
    { title: '산업재해 통계의 기록·유지에 관한 사항',          content: '', decision: '', owner: '안전관리자',  deadline: '' },
    { title: '안전장치 및 보호구 구입 시 적격품 여부 확인',    content: '', decision: '', owner: '안전관리자',  deadline: '' },
  ],
  labor_management: [
    { title: '산업재해 예방에 관한 사항',                      content: '', decision: '', owner: '안전관리자',  deadline: '' },
    { title: '작업환경 점검 및 개선에 관한 사항',              content: '', decision: '', owner: '안전관리자',  deadline: '' },
    { title: '근로자의 건강진단 등 건강관리에 관한 사항',      content: '', decision: '', owner: '보건관리자',  deadline: '' },
    { title: '안전보건교육에 관한 사항',                       content: '', decision: '', owner: '안전관리자',  deadline: '' },
    { title: '위험성평가 결과 및 조치에 관한 사항',            content: '', decision: '', owner: '안전관리자',  deadline: '' },
  ],
}

const DEFAULT_MEMBERS = {
  safety_committee: [
    { name:'', position:'안전보건관리책임자', affiliation:'', side:'management', is_present:true },
    { name:'', position:'안전관리자',         affiliation:'', side:'management', is_present:true },
    { name:'', position:'보건관리자',         affiliation:'', side:'management', is_present:true },
    { name:'', position:'근로자대표',         affiliation:'', side:'labor',      is_present:true },
    { name:'', position:'명예산업안전감독관', affiliation:'', side:'labor',      is_present:true },
  ],
  labor_management: [
    { name:'', position:'안전보건총괄책임자', affiliation:'도급인', side:'management', is_present:true },
    { name:'', position:'안전관리자',         affiliation:'도급인', side:'management', is_present:true },
    { name:'', position:'수급인 대표',         affiliation:'수급인', side:'labor',      is_present:true },
    { name:'', position:'수급인 근로자대표',   affiliation:'수급인', side:'labor',      is_present:true },
  ],
}

export default function SafetyCommitteeNewPage() {
  const router = useRouter()
  const [saving,  setSaving]  = useState(false)
  const [cType,   setCType]   = useState<'safety_committee'|'labor_management'>('safety_committee')

  const form = useForm<any>({
    defaultValues: {
      committee_type:    'safety_committee',
      meeting_type:      'regular',
      meeting_date:      new Date().toISOString().slice(0, 10),
      meeting_start:     '14:00', meeting_end: '15:00',
      meeting_place:     '',
      chairman_name:     '',
      members:           DEFAULT_MEMBERS.safety_committee,
      agenda_items:      DEFAULT_AGENDAS.safety_committee.map((a, i) => ({ ...a, seq: i+1 })),
      resolution:        '',
      next_meeting_date: '',
    },
  })

  const { fields: mFields, append: addMember, remove: removeMember } =
    useFieldArray({ control: form.control, name: 'members' })
  const { fields: aFields, append: addAgenda, remove: removeAgenda } =
    useFieldArray({ control: form.control, name: 'agenda_items' })

  function switchType(t: 'safety_committee'|'labor_management') {
    setCType(t)
    form.setValue('committee_type', t)
    form.setValue('members',      DEFAULT_MEMBERS[t].map((m,i) => ({ ...m, seq:i+1 })))
    form.setValue('agenda_items', DEFAULT_AGENDAS[t].map((a,i) => ({ ...a, seq:i+1 })))
  }

  async function onSubmit(data: any) {
    setSaving(true)
    const payload = {
      ...data,
      members:      data.members.map((m:any,i:number) => ({ ...m, seq:i+1 })),
      agenda_items: data.agenda_items.map((a:any,i:number) => ({ ...a, seq:i+1 })),
    }
    const res = await fetch('/api/safety-committee', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('회의록이 작성되었습니다.')
    router.push(`/safety-committee/${json.data.id}`)
  }

  const isCommittee = cType === 'safety_committee'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-committee" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users2 className="w-5 h-5 text-blue-700" />
              회의록 작성
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {isCommittee ? '산안법 제24조 — 분기 1회 이상 | 근로자·사용자 동수' : '산안법 제75조 — 월 1회 이상 | 도급인·수급인 대표'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary" style={{ background: '#1d4ed8' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            저장
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 구분 선택 */}
        <div className="card p-4">
          <div className="flex gap-3">
            <button type="button" onClick={() => switchType('safety_committee')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${cType==='safety_committee' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              산업안전보건위원회
              <div className="text-[10px] font-normal mt-0.5 opacity-70">상시 100명 이상 | 분기 1회</div>
            </button>
            <button type="button" onClick={() => switchType('labor_management')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${cType==='labor_management' ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              노사협의체
              <div className="text-[10px] font-normal mt-0.5 opacity-70">도급사업 혼재 작업 | 월 1회</div>
            </button>
          </div>
        </div>

        {/* 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">회의 기본정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">회의 유형</label>
              <select {...form.register('meeting_type')} className="input-base">
                <option value="regular">정기</option>
                <option value="extraordinary">임시</option>
              </select>
            </div>
            <div>
              <label className="label-base">회의 일자 *</label>
              <input {...form.register('meeting_date')} type="date" className="input-base"/>
            </div>
            <div>
              <label className="label-base">회의 장소 *</label>
              <input {...form.register('meeting_place')} placeholder="본사 2층 회의실" className="input-base"/>
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
              <label className="label-base">의장 / 위원장</label>
              <input {...form.register('chairman_name')} placeholder="홍길동" className="input-base"/>
            </div>
            <div>
              <label className="label-base">차기 회의 예정일</label>
              <input {...form.register('next_meeting_date')} type="date" className="input-base"/>
            </div>
          </div>
        </div>

        {/* 참석자 명단 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">참석자 명단</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {isCommittee ? '근로자 위원과 사용자 위원 동수로 구성 (산안법 제24조 제2항)' : '도급인 대표 + 수급인 대표로 구성 (산안법 제75조)'}
              </p>
            </div>
            <button type="button"
              onClick={() => addMember({ seq:mFields.length+1, name:'', position:'', affiliation:'', side:'management', is_present:true })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3"/> 추가
            </button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {['성명','직위','소속', isCommittee ? '구분(근/사)' : '구분(도급/수급)', '참석',''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {mFields.map((f, idx) => (
                <tr key={f.id}>
                  <td className="px-3 py-2"><input {...form.register(`members.${idx}.name`)} placeholder="홍길동" className="input-base text-sm py-1.5"/></td>
                  <td className="px-3 py-2"><input {...form.register(`members.${idx}.position`)} className="input-base text-sm py-1.5"/></td>
                  <td className="px-3 py-2"><input {...form.register(`members.${idx}.affiliation`)} className="input-base text-sm py-1.5"/></td>
                  <td className="px-3 py-2">
                    <select {...form.register(`members.${idx}.side`)} className="input-base text-sm py-1.5">
                      {isCommittee
                        ? <><option value="management">사용자</option><option value="labor">근로자</option></>
                        : <><option value="management">도급인</option><option value="labor">수급인</option></>}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" {...form.register(`members.${idx}.is_present`)} className="w-4 h-4 accent-blue-600"/>
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => removeMember(idx)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 안건 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">회의 안건</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">산안법에서 정하는 심의·의결 사항이 기본 입력됩니다</p>
            </div>
            <button type="button"
              onClick={() => addAgenda({ seq:aFields.length+1, title:'', content:'', decision:'', owner:'', deadline:'' })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3"/> 안건 추가
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {aFields.map((f, idx) => (
              <div key={f.id} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${isCommittee ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {idx+1}
                  </span>
                  <input {...form.register(`agenda_items.${idx}.title`)} placeholder="안건 제목" className="input-base flex-1 font-medium"/>
                  <button type="button" onClick={() => removeAgenda(idx)} className="p-1 text-gray-300 hover:text-red-500 rounded flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 ml-9">
                  <div>
                    <label className="label-base">내용</label>
                    <textarea {...form.register(`agenda_items.${idx}.content`)} rows={3} className="input-base resize-none text-sm"/>
                  </div>
                  <div>
                    <label className="label-base">심의·결정 사항</label>
                    <textarea {...form.register(`agenda_items.${idx}.decision`)} rows={3} className="input-base resize-none text-sm"/>
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
            className="input-base resize-none"
            placeholder="회의 결의사항을 입력하세요."/>
        </div>
      </form>
    </div>
  )
}
