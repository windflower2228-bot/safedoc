'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Heart, Users, Wind, Ear } from 'lucide-react'

const PROGRAMS = [
  {
    href:  '/health-programs/wellness',
    icon:  Heart,
    color: '#e11d48', bg: '#fff1f2',
    title: '건강증진프로그램',
    badge: '산안법 제129조',
    desc:  '연간 건강증진 계획 수립 · 금연·금주·운동·영양 관리 · 참여율·예산 관리',
    legalRef: '산업안전보건법 제129조 / 건강증진사업 운영',
    suitable: '전체 사업장',
    features: ['연간 계획표', '프로그램별 이행율', '참여인원 통계'],
  },
  {
    href:  '/health-programs/musculoskeletal',
    icon:  Users,
    color: '#2563eb', bg: '#eff6ff',
    title: '근골격계 유해요인조사',
    badge: '안전보건규칙 제657조',
    desc:  '3년마다 정기조사 · 부담작업 11가지 체크 · 증상조사 · 작업환경 개선계획',
    legalRef: '안전보건기준에 관한 규칙 제12장 제657~662조',
    suitable: '근골격계 부담작업이 있는 사업장',
    features: ['11가지 부담작업 판단', '증상 설문조사', '개선계획 수립'],
  },
  {
    href:  '/health-programs/confined-space',
    icon:  Wind,
    color: '#7c3aed', bg: '#f5f3ff',
    title: '밀폐공간작업프로그램',
    badge: '안전보건규칙 제619조',
    desc:  '밀폐공간 위치 파악 · 유해위험요인 관리 · 작업허가서 · 긴급구조계획',
    legalRef: '안전보건기준에 관한 규칙 제10장 제619~629조',
    suitable: '맨홀·탱크·집수정·정화조 등 밀폐공간 보유 사업장',
    features: ['밀폐공간 목록 관리', '작업허가서', '산소·가스 측정 기록'],
  },
  {
    href:  '/health-programs/hearing',
    icon:  Ear,
    color: '#d97706', bg: '#fffbeb',
    title: '청력보존프로그램',
    badge: '안전보건규칙 제512조',
    desc:  '소음노출 평가 · 공학적 대책 · 청력보호구 지급 · 정기 청력검사 · 교육',
    legalRef: '안전보건기준에 관한 규칙 제8장 제512~520조',
    suitable: '소음작업(85dB 이상) 또는 충격소음작업 사업장',
    features: ['소음측정 결과 관리', '보호구 지급 현황', '청력검사(D1·D2) 관리'],
  },
  {
    href:  '/health-programs/respiratory',
    icon:  
    color: '#16a34a', bg: '#f0fdf4',
    title: '호흡기보호프로그램',
    badge: 'KOSHA GUIDE H-82',
    desc:  '유해물질 노출 평가 · 호흡용 보호구 선정 · 밀착도 검사(Fit Test) · 유지관리',
    legalRef: '안전보건기준에 관한 규칙 / KOSHA GUIDE H-82-2020',
    suitable: '분진·유기용제·특별관리물질 등 호흡기 유해인자 취급 사업장',
    features: ['유해물질 노출 현황', '보호구 선정 기준', 'Fit Test 기록'],
  },
]

export default function HealthProgramsHubPage() {
  const [counts, setCounts] = useState<Record<string,number>>({})

  useEffect(() => {
    const endpoints = [
      ['/api/health-programs/wellness',      'wellness'],
      ['/api/health-programs/musculoskeletal','musculoskeletal'],
      ['/api/health-programs/confined-space', 'confined-space'],
      ['/api/health-programs/hearing',        'hearing'],
      ['/api/health-programs/respiratory',    'respiratory'],
    ]
    endpoints.forEach(([url, key]) => {
      fetch(url).then(r=>r.json()).then(j =>
        setCounts(prev => ({ ...prev, [key]: (j.data??[]).length }))
      ).catch(()=>{})
    })
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          보건조치
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          산업안전보건법 제39조 / 산업안전보건기준에 관한 규칙 | 근로자 건강보호 보건조치 5개 프로그램
        </p>
      </div>

      {/* 법적 근거 배너 */}
      <div className="card p-4 mb-5 bg-rose-50/30 border-rose-100">
        <div className="text-xs font-semibold text-rose-700 mb-1.5">산업안전보건법 제39조 (보건조치)</div>
        <p className="text-xs text-rose-600 leading-relaxed">
          사업주는 다음 각 호의 어느 하나에 해당하는 건강장해를 예방하기 위하여 필요한 보건상의 조치를 하여야 합니다.
          원재료·가스·증기·분진·흄·미스트로 인한 건강장해 / 방사선·유해광선으로 인한 건강장해 / 고열·한냉·다습으로 인한 건강장해 /
          소음·진동으로 인한 건강장해 / 이상기압으로 인한 건강장해 / 기타 신체에 부담을 주는 작업에 의한 건강장해
        </p>
      </div>

      <div className="space-y-3">
        {PROGRAMS.map(prog => {
          const Icon   = prog.icon
          const count  = counts[prog.href.split('/').pop()!] ?? 0
          return (
            <Link key={prog.href} href={prog.href}
              className="card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group block">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: prog.bg }}>
                  <Icon className="w-6 h-6" style={{ color: prog.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {prog.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: prog.bg, color: prog.color }}>
                      {prog.badge}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {count}건
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{prog.desc}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] text-gray-400">{prog.legalRef}</span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {prog.features.map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">{f}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-2" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
