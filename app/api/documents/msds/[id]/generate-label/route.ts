// app/api/documents/msds/[id]/generate-label/route.ts
// MSDS 데이터를 GHS 경고표지(산안법 제114조 / 고용노동부고시 제2023-9호)로 자동 변환

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

// ── GhsHazardClass 값 → 그림문자 직접 매핑 ───────────────────
// types/msds.ts의 GhsHazardClass 기준
const GHS_PICTOGRAM_MAP: Record<string, { emoji: string; title: string; color: string }> = {
  explosive:       { emoji:'💥', title:'폭발성',           color:'#dc2626' },
  flammable:       { emoji:'🔥', title:'인화성·가연성',     color:'#f97316' },
  oxidizing:       { emoji:'⭕', title:'산화성',            color:'#eab308' },
  compressed_gas:  { emoji:'🔵', title:'고압가스',          color:'#2563eb' },
  corrosive:       { emoji:'⚗️', title:'부식성',            color:'#1d4ed8' },
  toxic:           { emoji:'☠️', title:'급성독성(고독성)',   color:'#1f2937' },
  harmful:         { emoji:'❗', title:'유해성·경고',        color:'#9ca3af' },
  irritant:        { emoji:'❕', title:'자극성·경고',        color:'#6b7280' },
  health_hazard:   { emoji:'⚠️', title:'건강유해성',        color:'#7c3aed' },
  environmental:   { emoji:'🌿', title:'환경유해성',        color:'#16a34a' },
}

function buildLabelHtml(data: {
  product_name:              string
  manufacturer?:             string
  emergency_tel?:            string
  signal_word?:              string
  ghs_hazards?:              string[]
  hazard_statements?:        string[]
  precautionary_statements?: string[]
  cas_number?:               string
  main_components?:          string
  legal_classification?:     any
}): string {
  const {
    product_name, manufacturer, emergency_tel,
    signal_word, ghs_hazards = [], hazard_statements = [],
    precautionary_statements = [], cas_number, main_components,
    legal_classification = {},
  } = data

  // 그림문자: ghs_hazards 배열의 key로 직접 조회
  const validPictograms = ghs_hazards
    .filter(h => GHS_PICTOGRAM_MAP[h])
    .map(h => GHS_PICTOGRAM_MAP[h])

  const signalText  = signal_word === 'danger' ? '위험' : '경고'
  const signalColor = signal_word === 'danger' ? '#dc2626' : '#d97706'
  const borderColor = signal_word === 'danger' ? '#dc2626' : '#d97706'

  // 법적 규제 배지
  const badges: string[] = []
  if (legal_classification.is_special)         badges.push('특별관리물질')
  if (legal_classification.is_managed)         badges.push('관리대상유해물질')
  if (legal_classification.is_permitted)        badges.push('허가대상유해물질')
  if (legal_classification.is_work_env_target) badges.push('작업환경측정 대상')
  if (legal_classification.is_special_health)  badges.push('특수건강진단 대상')

  // 특별관리물질 CMR 배지
  const cmrBadges = (legal_classification.special_cmr_types || []).map((t: string) => {
    const colors: Record<string,string> = { C:'#dc2626', M:'#7c3aed', R:'#0891b2' }
    const labels: Record<string,string> = { C:'발암성(C)', M:'변이원성(M)', R:'생식독성(R)' }
    return `<span style="background:${colors[t]}20;color:${colors[t]};border:1px solid ${colors[t]}40;
      padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;margin:2px;display:inline-block;">
      ${labels[t] || t}</span>`
  }).join('')

  const badgesHtml = badges.length > 0 ? `
    <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px;">
      ${badges.map(b => `<span style="background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;
        padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600;">${b}</span>`).join('')}
    </div>
    ${cmrBadges ? `<div style="margin-top:4px;">${cmrBadges}</div>` : ''}` : ''

  const eduBadge = legal_classification.edu_required_35 ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 8px;margin-top:6px;font-size:9px;color:#92400e;line-height:1.5;">
      ⚠️ <strong>특별교육 필요</strong> — 산업안전보건법 시행규칙 [별표 5] 제35호<br>
      허가 또는 관리대상 유해물질 취급 근로자 (16시간 이상)
    </div>` : ''

  // 예방조치문구 최대 6개 (법령 기준)
  const precautionaryTop6 = precautionary_statements.slice(0, 6)

  // 그림문자 다이아몬드 SVG
  const pictogramHtml = validPictograms.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;justify-content:center;">
        ${validPictograms.map(p => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:54px;height:54px;border:2.5px solid ${p.color};border-radius:4px;
              transform:rotate(45deg);display:flex;align-items:center;justify-content:center;background:white;">
              <span style="transform:rotate(-45deg);font-size:22px;line-height:1;">${p.emoji}</span>
            </div>
            <span style="font-size:8px;color:#374151;text-align:center;max-width:60px;">${p.title}</span>
          </div>`).join('')}
      </div>`
    : `<div style="text-align:center;padding:10px;color:#9ca3af;font-size:11px;">
        (GHS 유해성 분류 정보 없음)
      </div>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>GHS 경고표지 — ${product_name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;background:#f5f5f5;padding:20px}
  .label-wrap{max-width:580px;margin:0 auto}
  .label{background:white;border:3px solid ${borderColor};border-radius:8px;overflow:hidden}
  .header{border-bottom:2px solid ${borderColor};padding:14px 20px;text-align:center}
  .product-name{font-size:22px;font-weight:900;letter-spacing:0.5px;color:#111}
  .cas-info{font-size:10px;color:#6b7280;margin-top:3px}
  .signal{font-size:30px;font-weight:900;color:${signalColor};letter-spacing:2px;margin:8px 0 2px}
  .body{padding:16px 20px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px}
  .col-label{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:5px;letter-spacing:0.5px}
  .hazard-list,.precaution-list{list-style:none}
  .hazard-list li,.precaution-list li{font-size:10px;color:#1f2937;padding:1px 0;line-height:1.5}
  .hazard-list li::before{content:"• ";color:${borderColor}}
  .precaution-list li::before{content:"✓ ";color:#16a34a}
  .supplier{margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .s-label{font-size:9px;font-weight:700;color:#9ca3af}
  .s-value{font-size:11px;color:#1f2937;font-weight:500;margin-top:1px}
  .emergency{background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:6px 10px;
    font-size:12px;font-weight:700;color:#b91c1c;text-align:center;margin-top:8px}
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:8px 16px;
    font-size:8px;color:#9ca3af;text-align:center;line-height:1.5}
  @media print{body{background:white;padding:0}.no-print{display:none}.label{border-width:2px;border-radius:0}}
</style>
</head>
<body>
<div class="label-wrap">
  <div class="no-print" style="text-align:right;margin-bottom:10px">
    <button onclick="window.print()" style="background:#2563eb;color:white;border:none;padding:7px 16px;
      border-radius:6px;cursor:pointer;font-size:12px">🖨️ 인쇄</button>
    <button onclick="window.close()" style="background:#6b7280;color:white;border:none;padding:7px 14px;
      border-radius:6px;cursor:pointer;font-size:12px;margin-left:5px">✕ 닫기</button>
  </div>
  <div class="label">
    <!-- ① 명칭 + ③ 신호어 -->
    <div class="header">
      <div class="product-name">${product_name}</div>
      ${cas_number ? `<div class="cas-info">CAS No. ${cas_number}${main_components ? ` | ${main_components}` : ''}</div>` : ''}
      <div class="signal">${signalText}</div>
    </div>
    <div class="body">
      <!-- ② 그림문자 -->
      ${pictogramHtml}

      <!-- ④ 유해·위험문구 + ⑤ 예방조치문구 -->
      <div class="two-col">
        <div>
          <div class="col-label">④ 유해·위험 문구</div>
          <ul class="hazard-list">
            ${hazard_statements.length
              ? hazard_statements.map(h => `<li>${h}</li>`).join('')
              : '<li style="color:#9ca3af">(없음)</li>'}
          </ul>
        </div>
        <div>
          <div class="col-label">⑤ 예방조치 문구${precautionary_statements.length > 6 ? ` (6/${precautionary_statements.length})` : ''}</div>
          <ul class="precaution-list">
            ${precautionaryTop6.length
              ? precautionaryTop6.map(p => `<li>${p}</li>`).join('')
              : '<li style="color:#9ca3af">(없음)</li>'}
          </ul>
        </div>
      </div>

      <!-- 법적 규제 배지 + 교육 -->
      ${badgesHtml}
      ${eduBadge}

      <!-- ⑥ 공급자 정보 -->
      <div class="supplier">
        <div><div class="s-label">제조사/공급사</div><div class="s-value">${manufacturer || '(미기재)'}</div></div>
        <div><div class="s-label">작성일</div><div class="s-value">${new Date().toLocaleDateString('ko-KR')}</div></div>
      </div>
      ${emergency_tel ? `<div class="emergency">☎ 긴급연락처: ${emergency_tel}</div>` : ''}
    </div>
    <div class="footer">
      산업안전보건법 제114조 | 화학물질의 분류·표시 및 물질안전보건자료에 관한 기준 (고용노동부고시 제2023-9호)<br>
      경고표지 6개 필수항목: ① 명칭 ② 그림문자 ③ 신호어 ④ 유해·위험문구 ⑤ 예방조치문구 ⑥ 공급자정보
    </div>
  </div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: msds, error } = await supabase
    .from('msds_records').select('*').eq('id', params.id).single()
  if (error || !msds) return NextResponse.json({ error: 'MSDS를 찾을 수 없습니다.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  const html = buildLabelHtml({
    product_name:             msds.product_name,
    manufacturer:             msds.manufacturer,
    emergency_tel:            body.emergency_tel || '',
    signal_word:              msds.signal_word,
    ghs_hazards:              msds.ghs_hazards || [],
    hazard_statements:        msds.hazard_statements || [],
    precautionary_statements: msds.precautionary_statements || [],
    cas_number:               msds.cas_number,
    main_components:          msds.main_components,
    legal_classification:     msds.legal_classification || {},
  })

  const labelData = {
    product_name:             msds.product_name,
    manufacturer:             msds.manufacturer,
    signal_word:              msds.signal_word,
    pictograms:               msds.ghs_hazards || [],
    hazard_statements:        msds.hazard_statements || [],
    precautionary_statements: (msds.precautionary_statements || []).slice(0, 6),
    generated_at:             new Date().toISOString(),
    html_content:             html,
  }

  const { data: updated } = await supabase
    .from('msds_records')
    .update({ hazard_label: labelData, updated_at: new Date().toISOString() })
    .eq('id', params.id).select().single()

  return NextResponse.json({ data: updated, html, label: labelData })
}
