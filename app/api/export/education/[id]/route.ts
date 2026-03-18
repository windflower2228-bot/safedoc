// app/api/export/education/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { EDU_TYPE_LABELS, type EduItem, type Attendee } from '@/types/education'

type Params = { params: { id: string } }

const C = {
  TITLE:    '1E3A5F',
  HEADER:   '2E6DA4',
  SUB:      '4A90D9',
  HIGH_BG:  'FADBD8', HIGH_FG:  'C0392B',
  MID_BG:   'FDEBD0', MID_FG:   'CA6F1E',
  LOW_BG:   'D5F5E3', LOW_FG:   '1E8449',
  ODD:      'F8FAFB',
  EVEN:     'FFFFFF',
  BORDER:   'BDC3C7',
  FG:       'FFFFFF',
  LINK_BG:  'EBF5FB', LINK_FG:  '1A5276',
}

function fill(hex: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } }
}
function border(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: `FF${C.BORDER}` } }
  return { top: s, bottom: s, left: s, right: s }
}
function hdr(cell: ExcelJS.Cell, bg = C.TITLE, size = 9) {
  cell.font      = { name: '맑은 고딕', size, bold: true, color: { argb: `FF${C.FG}` } }
  cell.fill      = fill(bg)
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  cell.border    = border()
}
function dat(cell: ExcelJS.Cell, opts: { center?: boolean; bold?: boolean; bg?: string; fg?: string; size?: number } = {}) {
  const { center = false, bold = false, bg = C.EVEN, fg = '000000', size = 9 } = opts
  cell.font      = { name: '맑은 고딕', size, bold, color: { argb: `FF${fg}` } }
  cell.fill      = fill(bg)
  cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: true }
  cell.border    = border()
}

function riskStyle(level: string): { bg: string; fg: string; label: string } {
  if (level === 'high')   return { bg: C.HIGH_BG, fg: C.HIGH_FG, label: '高' }
  if (level === 'medium') return { bg: C.MID_BG,  fg: C.MID_FG,  label: '中' }
  return                       { bg: C.LOW_BG,  fg: C.LOW_FG,  label: '低' }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('인증 필요', { status: 401 })

  const { data: doc, error } = await supabase
    .from('education_journals')
    .select(`
      *,
      author:user_profiles!author_id(name, position),
      project:projects(name, site_name),
      source_risk:risk_assessments!source_risk_id(title),
      company:companies(name, address)
    `)
    .eq('id', params.id)
    .single()

  if (error || !doc) return new NextResponse('문서를 찾을 수 없습니다.', { status: 404 })

  const items     = (doc.edu_items ?? []) as EduItem[]
  const attendees = ((doc.attendees ?? []) as Attendee[]).filter(a => a.name?.trim())
  const company   = doc.company   as { name: string; address: string } | null
  const project   = doc.project   as { name: string; site_name: string } | null
  const author    = doc.author    as { name: string; position: string } | null
  const srcRisk   = doc.source_risk as { title: string } | null

  const wb = new ExcelJS.Workbook()
  wb.creator = 'SafeDoc'
  wb.created = new Date()

  // ════════════════════════════════
  // 시트 1: 안전보건교육일지
  // ════════════════════════════════
  const ws = wb.addWorksheet('안전보건교육일지', {
    pageSetup: {
      paperSize: 9, orientation: 'portrait',
      fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.8, bottom: 0.8, header: 0.3, footer: 0.3 },
    },
  })
  ws.properties.defaultRowHeight = 16

  // 열 너비
  ;[6, 24, 26, 10, 42, 30].forEach((w, i) => { ws.getColumn(i + 1).width = w })

  // ── 타이틀 ──────────────────────────────────────────────────
  ws.getRow(1).height = 32
  ws.mergeCells('A1:F1')
  const tc = ws.getCell('A1')
  tc.value = '안  전  보  건  교  육  일  지'
  tc.font      = { name: '맑은 고딕', size: 16, bold: true, color: { argb: `FF${C.FG}` } }
  tc.fill      = fill(C.TITLE)
  tc.alignment = { horizontal: 'center', vertical: 'middle' }

  ws.getRow(2).height = 18
  ws.mergeCells('A2:F2')
  const sc = ws.getCell('A2')
  sc.value = `[ ${doc.title} ]  ·  ${company?.name ?? ''}  ·  ${EDU_TYPE_LABELS[doc.edu_type as keyof typeof EDU_TYPE_LABELS] ?? ''}`
  sc.font      = { name: '맑은 고딕', size: 10, color: { argb: `FF${C.FG}` } }
  sc.fill      = fill(C.HEADER)
  sc.alignment = { horizontal: 'center', vertical: 'middle' }

  // ── 기본정보 섹션 ────────────────────────────────────────────
  const period = `${doc.edu_date}` +
    (doc.edu_start_time ? `  ${doc.edu_start_time}` : '') +
    (doc.edu_end_time   ? ` ~ ${doc.edu_end_time}` : '') +
    (doc.edu_duration_hours ? `  (${doc.edu_duration_hours}시간)` : '')

  const infoBlocks: [string, string, string, string][] = [
    ['A3:B3', '교육명',     'C3:F3', doc.title],
    ['A4:B4', '교육 일시',  'C4:D4', period],
    ['E4:E4', '교육 장소',  'F4:F4', doc.edu_location ?? ''],
    ['A5:B5', '교육 종류',  'C5:D5', EDU_TYPE_LABELS[doc.edu_type as keyof typeof EDU_TYPE_LABELS] ?? ''],
    ['E5:E5', '근무형태',   'F5:F5', (doc as any).worker_type
      ? ({'regular_office':'상용직-사무직','regular_field':'상용직-현장직','daily':'일용직',
          'short_term':'단기간','supervisor':'관리감독자','atypical':'특수형태'}[(doc as any).worker_type] ?? (doc as any).worker_type)
      : '—'],
    ['A6:A6', '교육시간',   'B6:B6', doc.edu_duration_hours ? `${doc.edu_duration_hours}시간` : '—'],
    ['C6:C6', '참석 인원',  'D6:D6', `${attendees.length}명`],
    ['A6:B6', '강사',       'C6:D6', [doc.instructor_name, doc.instructor_position, doc.instructor_affil].filter(Boolean).join(' / ')],
    ['E6:E6', '사업장/현장', 'F6:F6', [company?.name, project?.site_name].filter(Boolean).join(' / ')],
    ['A7:B7', '작성자',     'C7:D7', author ? `${author.name} (${author.position})` : ''],
  ]
  if (srcRisk) {
    infoBlocks.push(['A8:B8', '위험성평가 연계', 'C8:F8', srcRisk.title])
  }

  ;[3,4,5,6,7,8].forEach(r => { ws.getRow(r).height = 18 })

  for (const [lr, lt, vr, vt] of infoBlocks) {
    const le = lr.split(':')[0]; const ve = vr.split(':')[0]
    try { ws.mergeCells(lr) } catch {}
    ws.getCell(le).value = lt
    hdr(ws.getCell(le), C.HEADER)
    try { ws.mergeCells(vr) } catch {}
    ws.getCell(ve).value = vt
    dat(ws.getCell(ve))
  }

  // 교육 목적
  if (doc.edu_content) {
    const contentRow = srcRisk ? 9 : 8
    ws.getRow(contentRow).height = 52
    ws.mergeCells(`A${contentRow}:B${contentRow}`)
    ws.getCell(`A${contentRow}`).value = '교육 목적'
    hdr(ws.getCell(`A${contentRow}`), C.HEADER)
    ws.mergeCells(`C${contentRow}:F${contentRow}`)
    const cc = ws.getCell(`C${contentRow}`)
    cc.value = doc.edu_content
    dat(cc, { size: 8 })
  }

  // ── 교육 항목 헤더 ───────────────────────────────────────────
  const itemStart = (srcRisk ? 10 : 9) + (doc.edu_content ? 1 : 0)
  ws.getRow(itemStart).height = 18
  ws.getRow(itemStart + 1).height = 18

  const itemHdrs: [string, string, string][] = [
    ['A' + itemStart + ':A' + (itemStart+1), '번호',         C.TITLE],
    ['B' + itemStart + ':B' + (itemStart+1), '작업 내용',     C.TITLE],
    ['C' + itemStart + ':C' + (itemStart+1), '유해·위험요인', C.TITLE],
    ['D' + itemStart + ':D' + (itemStart+1), '위험도',        C.TITLE],
    ['E' + itemStart + ':E' + (itemStart+1), '교육 핵심 포인트', C.TITLE],
    ['F' + itemStart + ':F' + (itemStart+1), '관계 법령',     C.TITLE],
  ]
  for (const [rng, txt, bg] of itemHdrs) {
    try { ws.mergeCells(rng) } catch {}
    const c = ws.getCell(rng.split(':')[0])
    c.value = txt
    hdr(c, bg)
  }

  // ── 교육 항목 데이터 ─────────────────────────────────────────
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const row  = ws.getRow(itemStart + 2 + i)
    row.height = 50
    const bg   = i % 2 === 0 ? C.ODD : C.EVEN
    const rs   = riskStyle(item.risk_level)

    ;([
      [1, item.seq,            { center: true, bold: true, bg }],
      [2, item.work_content,   { bg }],
      [3, item.hazard_factor,  { bg }],
      [5, item.edu_point,      { bg, size: 8 }],
      [6, item.legal_basis,    { bg, size: 8 }],
    ] as [number, ExcelJS.CellValue, Parameters<typeof dat>[1]][]).forEach(([col, val, opts]) => {
      const c = row.getCell(col)
      c.value = val
      dat(c, opts)
    })

    const lvCell = row.getCell(4)
    lvCell.value = rs.label
    dat(lvCell, { center: true, bold: true, bg: rs.bg, fg: rs.fg })
  }

  // ════════════════════════════════
  // 시트 2: 참석자 명단
  // ════════════════════════════════
  const ws2 = wb.addWorksheet('참석자 명단', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  })
  ;[6, 24, 22, 22, 20].forEach((w, i) => { ws2.getColumn(i + 1).width = w })

  ws2.getRow(1).height = 28
  ws2.mergeCells('A1:E1')
  const at = ws2.getCell('A1')
  at.value = `교육 참석자 명단 — ${doc.title} (${doc.edu_date})`
  at.font = { name: '맑은 고딕', size: 13, bold: true, color: { argb: `FF${C.FG}` } }
  at.fill = fill(C.TITLE)
  at.alignment = { horizontal: 'center', vertical: 'middle' }

  ws2.getRow(2).height = 16
  for (const [col, txt] of [['A2','번호'],['B2','성명'],['C2','직종/직위'],['D2','소속'],['E2','서명']]) {
    ws2.getCell(col).value = txt
    hdr(ws2.getCell(col), C.TITLE)
  }

  const allAttendees = (doc.attendees ?? []) as Attendee[]
  const minRows = Math.max(allAttendees.length, 15)
  for (let i = 0; i < minRows; i++) {
    const row = ws2.getRow(3 + i)
    row.height = 28
    const a   = allAttendees[i]
    const bg  = i % 2 === 0 ? C.ODD : C.EVEN
    ;([
      [1, i + 1,                 { center: true, bg }],
      [2, a?.name       ?? '',   { bold: !!a?.name, bg }],
      [3, a?.position   ?? '',   { bg }],
      [4, a?.department ?? '',   { bg }],
      [5, '',                    { bg }],
    ] as [number, ExcelJS.CellValue, Parameters<typeof dat>[1]][]).forEach(([col, val, opts]) => {
      const c = row.getCell(col)
      c.value = val
      dat(c, opts)
    })
  }

  // 합계 행
  const sumR = ws2.getRow(3 + minRows)
  sumR.height = 18
  ws2.mergeCells(`A${3+minRows}:E${3+minRows}`)
  const sumC = sumR.getCell(1)
  sumC.value = `총 참석 인원: ${attendees.length}명 / ${doc.edu_date} ${doc.title}`
  sumC.font      = { name: '맑은 고딕', size: 9, bold: true, color: { argb: `FF${C.TITLE}` } }
  sumC.fill      = fill('EBF3FB')
  sumC.alignment = { horizontal: 'center', vertical: 'middle' }
  sumC.border    = border()

  // ── 응답 ─────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer()
  const safe     = doc.title.replace(/[\\/:*?"<>|]/g, '_')
  const filename = `안전보건교육일지_${safe}_${doc.edu_date}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
