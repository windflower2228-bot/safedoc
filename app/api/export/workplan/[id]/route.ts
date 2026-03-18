// app/api/export/workplan/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { WORK_PLAN_TYPE_LABELS, type WorkPlanRiskItem, type WorkPlanWorker } from '@/types/workplan'

type Params = { params: { id: string } }

const C = {
  TITLE: '1E3A5F', HEADER: '2E6DA4', SUB: '4A90D9',
  HIGH_BG: 'FADBD8', HIGH_FG: 'C0392B',
  MID_BG:  'FDEBD0', MID_FG:  'CA6F1E',
  LOW_BG:  'D5F5E3', LOW_FG:  '1E8449',
  ODD: 'F8FAFB', EVEN: 'FFFFFF',
  BORDER: 'BDC3C7', FG: 'FFFFFF',
  GREEN_BG: 'E9F7EF', GREEN_FG: '1E8449',
}

function fill(h: string): ExcelJS.Fill { return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${h}` } } }
function bd(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: `FF${C.BORDER}` } }
  return { top: s, bottom: s, left: s, right: s }
}
function hdr(cell: ExcelJS.Cell, bg = C.TITLE, size = 9) {
  cell.font = { name: '맑은 고딕', size, bold: true, color: { argb: `FF${C.FG}` } }
  cell.fill = fill(bg); cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.border = bd()
}
function dat(cell: ExcelJS.Cell, opts: { center?: boolean; bold?: boolean; bg?: string; fg?: string; size?: number } = {}) {
  const { center = false, bold = false, bg = C.EVEN, fg = '000000', size = 9 } = opts
  cell.font = { name: '맑은 고딕', size, bold, color: { argb: `FF${fg}` } }
  cell.fill = fill(bg); cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: true }; cell.border = bd()
}
function rs(level: string) {
  if (level === 'high')   return { bg: C.HIGH_BG, fg: C.HIGH_FG, label: '高' }
  if (level === 'medium') return { bg: C.MID_BG,  fg: C.MID_FG,  label: '中' }
  return                       { bg: C.LOW_BG,  fg: C.LOW_FG,  label: '低' }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('인증 필요', { status: 401 })

  const { data: doc, error } = await supabase
    .from('work_plans')
    .select(`*, author:user_profiles!author_id(name,position),
      project:projects(site_name), source_risk:risk_assessments!source_risk_id(title),
      company:companies(name,address)`)
    .eq('id', params.id).single()

  if (error || !doc) return new NextResponse('문서 없음', { status: 404 })

  const items   = (doc.risk_items ?? []) as WorkPlanRiskItem[]
  const workers = ((doc.workers ?? []) as WorkPlanWorker[]).filter(w => w.name?.trim())
  const company = doc.company as { name: string } | null
  const project = doc.project as { name: string; site_name: string } | null
  const author  = doc.author  as { name: string; position: string } | null
  const srcRisk = doc.source_risk as { title: string } | null

  const wb = new ExcelJS.Workbook()
  wb.creator = 'SafeDoc'; wb.created = new Date()

  // ════ 시트 1: 작업계획서 ════════════════════════════════════
  const ws = wb.addWorksheet('작업계획서', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1,
      margins: { left: 0.5, right: 0.5, top: 0.8, bottom: 0.8, header: 0.3, footer: 0.3 } },
  })
  ws.properties.defaultRowHeight = 16
  ;[5, 24, 26, 10, 20, 20, 18].forEach((w, i) => { ws.getColumn(i + 1).width = w })

  // 타이틀
  ws.getRow(1).height = 32; ws.mergeCells('A1:G1')
  const tc = ws.getCell('A1')
  tc.value = '작  업  계  획  서'
  tc.font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: `FF${C.FG}` } }
  tc.fill = fill(C.TITLE); tc.alignment = { horizontal: 'center', vertical: 'middle' }

  ws.getRow(2).height = 18; ws.mergeCells('A2:G2')
  const sc = ws.getCell('A2')
  sc.value = `[ ${doc.title} ]  ·  ${company?.name ?? ''}  ·  ${WORK_PLAN_TYPE_LABELS[doc.plan_type as keyof typeof WORK_PLAN_TYPE_LABELS] ?? ''}`
  sc.font = { name: '맑은 고딕', size: 10, color: { argb: `FF${C.FG}` } }
  sc.fill = fill(C.HEADER); sc.alignment = { horizontal: 'center', vertical: 'middle' }

  // 기본정보
  const period = `${doc.work_start_date} ~ ${doc.work_end_date}` +
    (doc.work_start_time ? `  (${doc.work_start_time}~${doc.work_end_time})` : '')
  const infoData: [string, string, string, string][] = [
    ['A3:B3', '작업명',     'C3:G3', doc.title],
    ['A4:B4', '작업 기간', 'C4:D4', period],
    ['E4',    '작업 장소', 'F4:G4', doc.work_location],
    ['A5:B5', '작업 책임자', 'C5:D5', [doc.supervisor_name, doc.supervisor_position].filter(Boolean).join(' / ')],
    ['E5',    '연락처',    'F5:G5', doc.supervisor_phone ?? ''],
    ['A6:B6', '사업장/현장', 'C6:G6', [company?.name, project?.site_name].filter(Boolean).join(' / ')],
    ['A7:B7', '관계 법령',  'C7:G7', doc.legal_basis ?? ''],
  ]
  if (srcRisk) infoData.push(['A8:B8', '위험성평가 연계', 'C8:G8', srcRisk.title])
  if (doc.work_scope) infoData.push(['A9:B9', '작업 개요', 'C9:G9', doc.work_scope])

  ;[3,4,5,6,7,8,9].forEach(r => { ws.getRow(r).height = 18 })
  if (doc.work_scope) ws.getRow(9).height = 52

  for (const [lr, lt, vr, vt] of infoData) {
    const le = lr.split(':')[0]; const ve = vr.split(':')[0]
    try { ws.mergeCells(lr) } catch {}
    ws.getCell(le).value = lt; hdr(ws.getCell(le), C.HEADER)
    try { ws.mergeCells(vr) } catch {}
    ws.getCell(ve).value = vt; dat(ws.getCell(ve))
  }

  // 안전대책
  const safetyRow = infoData.length + 3
  if (doc.safety_summary) {
    ws.getRow(safetyRow).height = 80
    ws.mergeCells(`A${safetyRow}:B${safetyRow}`)
    ws.getCell(`A${safetyRow}`).value = '종합 안전대책'; hdr(ws.getCell(`A${safetyRow}`), C.HEADER)
    ws.mergeCells(`C${safetyRow}:G${safetyRow}`)
    ws.getCell(`C${safetyRow}`).value = doc.safety_summary
    dat(ws.getCell(`C${safetyRow}`), { size: 8 })
  }

  // 항목 헤더
  const itemHdrRow = safetyRow + (doc.safety_summary ? 1 : 0) + 1
  ;[itemHdrRow, itemHdrRow+1].forEach(r => { ws.getRow(r).height = 16 })

  const itemHdrs: [string, string, string][] = [
    [`A${itemHdrRow}:A${itemHdrRow+1}`, '번호',       C.TITLE],
    [`B${itemHdrRow}:B${itemHdrRow+1}`, '작업 내용',   C.TITLE],
    [`C${itemHdrRow}:C${itemHdrRow+1}`, '유해·위험요인', C.TITLE],
    [`D${itemHdrRow}:D${itemHdrRow+1}`, '위험도',       C.TITLE],
    [`E${itemHdrRow}`,                  '감소대책',     C.TITLE],
    [`E${itemHdrRow+1}`,               '공학적 대책',   C.HEADER],
    [`F${itemHdrRow+1}`,               '관리적 대책',   C.HEADER],
    [`G${itemHdrRow+1}`,               '보호구',        C.HEADER],
  ]
  for (const [rng, txt, bg] of itemHdrs) {
    try { ws.mergeCells(rng) } catch {}
    const c = ws.getCell(rng.split(':')[0]); c.value = txt; hdr(c, bg)
  }
  // E-F-G 6행 병합
  try { ws.mergeCells(`E${itemHdrRow}:G${itemHdrRow}`) } catch {}

  // 항목 데이터
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const r    = ws.getRow(itemHdrRow + 2 + i)
    r.height   = 50
    const bg   = i % 2 === 0 ? C.ODD : C.EVEN
    const rv   = rs(item.risk_level)
    ;([
      [1, item.seq,               { center: true, bold: true, bg }],
      [2, item.work_content,      { bg }],
      [3, item.hazard_factor,     { bg }],
      [5, item.engineering_measure || '—', { bg, size: 8 }],
      [6, item.admin_measure || '—',       { bg, size: 8 }],
      [7, item.ppe_measure || '—',         { bg, size: 8 }],
    ] as [number, ExcelJS.CellValue, Parameters<typeof dat>[1]][]).forEach(([col, val, opts]) => {
      const c = r.getCell(col); c.value = val; dat(c, opts)
    })
    const lc = r.getCell(4); lc.value = rv.label
    dat(lc, { center: true, bold: true, bg: rv.bg, fg: rv.fg })
  }

  // ════ 시트 2: 작업방법 체크리스트 ═══════════════════════════
  const ws2 = wb.addWorksheet('작업방법·체크리스트', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  })
  ;[5, 22, 20, 36].forEach((w, i) => { ws2.getColumn(i + 1).width = w })

  ws2.getRow(1).height = 28; ws2.mergeCells('A1:D1')
  const t2 = ws2.getCell('A1')
  t2.value = `작업방법 및 사전 점검 체크리스트 — ${doc.title}`
  t2.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: `FF${C.FG}` } }
  t2.fill = fill(C.TITLE); t2.alignment = { horizontal: 'center', vertical: 'middle' }

  ws2.getRow(2).height = 16
  for (const [col, txt] of [['A2','번호'],['B2','작업 내용'],['C2','필요 장비·자재'],['D2','사전 점검 항목']]) {
    ws2.getCell(col).value = txt; hdr(ws2.getCell(col), C.TITLE)
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const r    = ws2.getRow(3 + i * 2)
    const r2   = ws2.getRow(3 + i * 2 + 1)
    ;[r, r2].forEach(row => { row.height = 44 })

    const bg  = i % 2 === 0 ? C.ODD : C.EVEN
    const rv  = rs(item.risk_level)

    ws2.mergeCells(`A${3+i*2}:A${4+i*2}`)
    const seqC = r.getCell(1)
    seqC.value = item.seq; dat(seqC, { center: true, bold: true, bg: rv.bg, fg: rv.fg })

    ws2.mergeCells(`B${3+i*2}:B${4+i*2}`)
    const wcC = r.getCell(2)
    wcC.value = `[${rv.label}] ${item.work_content}`; dat(wcC, { bold: true, bg })

    ws2.mergeCells(`C${3+i*2}:C${4+i*2}`)
    const eqC = r.getCell(3)
    eqC.value = item.equipment_needed || '—'; dat(eqC, { bg, size: 8 })

    ws2.mergeCells(`D${3+i*2}:D${4+i*2}`)
    const ckC = r.getCell(4)
    ckC.value = item.check_items || item.work_method || '—'; dat(ckC, { bg, size: 8 })
  }

  // ════ 시트 3: 작업 인원 ═════════════════════════════════════
  if (workers.length > 0) {
    const ws3 = wb.addWorksheet('작업 인원', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    })
    ;[5, 20, 18, 18, 22].forEach((w, i) => { ws3.getColumn(i + 1).width = w })

    ws3.getRow(1).height = 26; ws3.mergeCells('A1:E1')
    const t3 = ws3.getCell('A1')
    t3.value = `작업 투입 인원 — ${doc.title}`
    t3.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: `FF${C.FG}` } }
    t3.fill = fill(C.TITLE); t3.alignment = { horizontal: 'center', vertical: 'middle' }

    ws3.getRow(2).height = 16
    for (const [col, txt] of [['A2','번호'],['B2','성명'],['C2','직종/직위'],['D2','담당 역할'],['E2','보유 자격증']]) {
      ws3.getCell(col).value = txt; hdr(ws3.getCell(col), C.TITLE)
    }
    for (let i = 0; i < workers.length; i++) {
      const w = workers[i]; const r = ws3.getRow(3 + i); r.height = 22
      const bg = i % 2 === 0 ? C.ODD : C.EVEN
      ;([
        [1, i+1,        { center: true, bg }],
        [2, w.name,     { bold: true, bg }],
        [3, w.position, { bg }],
        [4, w.role,     { center: true, bg }],
        [5, w.license || '—', { bg }],
      ] as [number, ExcelJS.CellValue, Parameters<typeof dat>[1]][]).forEach(([col, val, opts]) => {
        const c = r.getCell(col); c.value = val; dat(c, opts)
      })
    }
  }

  const buffer   = await wb.xlsx.writeBuffer()
  const safe     = doc.title.replace(/[\\/:*?"<>|]/g, '_')
  const filename = `작업계획서_${safe}_${doc.work_start_date}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
