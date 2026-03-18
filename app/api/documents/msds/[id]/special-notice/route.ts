// app/api/documents/msds/[id]/special-notice/route.ts
// 특별관리물질 고지 (안전보건규칙 제440조)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CMR_LABELS } from '@/lib/special-management-substances'

type Params = { params: { id: string } }

function buildNoticeHtml(data: {
  substance_name: string
  cmr_types: string[]
  notice_content: string
  posted_at: string
  company_name?: string
  posted_location?: string
}): string {
  const cmrBadges = data.cmr_types.map(t => {
    const cfg = CMR_LABELS[t as 'C'|'M'|'R']
    if (!cfg) return ''
    return `<span style="display:inline-block;background:${cfg.bg};color:${cfg.color};border:1.5px solid ${cfg.color}33;
      padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin:2px;">${cfg.label}</span>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8">
<title>특별관리물질 고지 — ${data.substance_name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;background:#f3f4f6;padding:20px}
  .wrap{max-width:640px;margin:0 auto}
  .card{background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .header{background:#7c3aed;color:white;padding:20px 24px;text-align:center}
  .header-title{font-size:22px;font-weight:900;letter-spacing:1px}
  .header-sub{font-size:11px;opacity:.85;margin-top:4px}
  .law-badge{display:inline-block;background:rgba(255,255,255,.2);color:white;padding:2px 10px;border-radius:20px;font-size:10px;margin-top:6px}
  .body{padding:24px}
  .substance-box{background:#fdf4ff;border:2px solid #e879f9;border-radius:10px;padding:16px 20px;margin-bottom:18px;text-align:center}
  .substance-name{font-size:26px;font-weight:900;color:#6b21a8;margin-bottom:8px}
  .warning-badge{background:#dc2626;color:white;display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:8px}
  .cmr-row{margin-top:8px}
  .section{margin-bottom:18px}
  .section-title{font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;padding-left:8px;border-left:3px solid #7c3aed}
  .content-box{background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:13px;color:#374151;line-height:1.8;white-space:pre-wrap}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
  .info-item{background:#f3f4f6;border-radius:8px;padding:10px 12px}
  .info-label{font-size:10px;color:#9ca3af;font-weight:600}
  .info-value{font-size:13px;color:#1f2937;font-weight:500;margin-top:2px}
  .worker-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  .worker-table th{background:#f3f4f6;padding:8px;text-align:center;border:1px solid #e5e7eb;font-weight:600;color:#374151}
  .worker-table td{padding:8px;text-align:center;border:1px solid #e5e7eb;color:#374151}
  .worker-table tr:nth-child(even){background:#fafafa}
  .footer{background:#fef2f2;border-top:1px solid #fecaca;padding:14px 20px;font-size:11px;color:#b91c1c;text-align:center;line-height:1.6}
  @media print{body{background:white;padding:0}.no-print{display:none}.card{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="wrap">
  <div class="no-print" style="text-align:right;margin-bottom:12px">
    <button onclick="window.print()" style="background:#7c3aed;color:white;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px">🖨️ 인쇄</button>
    <button onclick="window.close()" style="background:#6b7280;color:white;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;margin-left:6px">✕ 닫기</button>
  </div>
  <div class="card">
    <!-- 헤더 -->
    <div class="header">
      <div class="header-title">⚠ 특별관리물질 고지</div>
      <div class="header-sub">산업안전보건기준에 관한 규칙 제440조</div>
      <div class="law-badge">별표 18 제1호나목 CMR 물질</div>
    </div>
    <div class="body">
      <!-- 물질명 + 특별관리물질 경고 -->
      <div class="substance-box">
        <div class="warning-badge">⚠ 특별관리물질</div>
        <div class="substance-name">${data.substance_name}</div>
        <div class="cmr-row">${cmrBadges}</div>
      </div>

      <!-- CMR 해당 유형 상세 -->
      <div class="section">
        <div class="section-title">유해 유형 (CMR 분류)</div>
        <div class="content-box">${data.cmr_types.map(t => {
          const cfg = CMR_LABELS[t as 'C'|'M'|'R']
          return cfg ? `• ${cfg.full}` : ''
        }).filter(Boolean).join('\n')}</div>
      </div>

      <!-- 고지 내용 -->
      <div class="section">
        <div class="section-title">취급 시 주의사항</div>
        <div class="content-box">${data.notice_content || `• 반드시 개인보호구(호흡용 보호구, 보호장갑, 보안경 등)를 착용하십시오.
• 취급 전 MSDS를 확인하고 응급처치 방법을 숙지하십시오.
• 취급일지(이름·취급량·작업내용·보호구·사고내용)를 반드시 기록하십시오.
• 누출·오염·흡입 사고 발생 시 즉시 보고하고 응급조치를 실시하십시오.
• 임의 폐기를 금지하며 지정된 방법으로 처리하십시오.`}</div>
      </div>

      <!-- 게시 정보 -->
      <div class="info-grid">
        ${data.company_name ? `<div class="info-item"><div class="info-label">사업장명</div><div class="info-value">${data.company_name}</div></div>` : ''}
        <div class="info-item"><div class="info-label">게시일</div><div class="info-value">${data.posted_at}</div></div>
        ${data.posted_location ? `<div class="info-item"><div class="info-label">게시 위치</div><div class="info-value">${data.posted_location}</div></div>` : ''}
      </div>

      <!-- 근로자 확인란 -->
      <div class="section" style="margin-top:18px">
        <div class="section-title">근로자 인지 확인란</div>
        <table class="worker-table">
          <thead><tr><th>성명</th><th>부서</th><th>확인일</th><th>서명</th></tr></thead>
          <tbody>
            ${Array.from({length:5}).map(() => `<tr><td style="height:28px"></td><td></td><td></td><td></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="footer">
      이 고지문은 「산업안전보건기준에 관한 규칙」 제440조에 의거하여 특별관리물질 취급 근로자에게 의무적으로 고지됩니다.<br>
      본 물질 취급 근로자는 반드시 취급일지(제439조)를 작성하고 보관하여야 합니다.
    </div>
  </div>
</div>
</body>
</html>`
}

export async function GET(_: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data, error } = await supabase
    .from('special_substance_notices')
    .select('*, author:user_profiles!author_id(name)')
    .eq('msds_id', params.id)
    .order('posted_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const { data: profile } = await supabase
    .from('user_profiles').select('company_id,role').eq('id', user.id).single()
  if (!['super_admin','company_admin','manager'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const { data: company } = await supabase.from('companies').select('name').eq('id', profile!.company_id).single()

  const html = buildNoticeHtml({
    ...body,
    company_name: company?.name,
    posted_at: body.posted_at || new Date().toLocaleDateString('ko-KR'),
  })

  const { data, error } = await supabase
    .from('special_substance_notices')
    .insert({
      ...body,
      msds_id:      params.id,
      company_id:   profile!.company_id,
      author_id:    user.id,
      html_content: html,
    })
    .select('*, author:user_profiles!author_id(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, html }, { status: 201 })
}
