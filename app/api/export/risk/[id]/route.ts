// app/api/export/risk/[id]/route.ts
// 위험성평가 엑셀 출력 API — ExcelJS 기반
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

type Params = { params: { id: string } }

// ─── 색상 상수 ────────────────────────────────────────────────────────────────
const C = {
  TITLE:      '1E3A5F',
  HEADER:     '2E6DA4',
  SUBHEADER:  '4A90D9',
  HIGH_BG:    'FADBD8',  HIGH_FG:    'C0392B',
  MID_BG:     'FDEBD0',  MID_FG:     'CA6F1E',
  LOW_BG:     'D5F5E3',  LOW_FG:     '1E8449',
  ROW_ODD:    'F8FAFB',
  ROW_EVEN:   'FFFFFF',
  BORDER:     'BDC3C7',
  HEADER_FG:  'FFFFFF',
  EDU_BG:     'EBF5FB',  EDU_FG:     '1A5276',
  PLAN_BG:    'EAFAF1',  PLAN_FG:    '1E8449',
}

function riskInfo(score: number) {
  if (score >= 15) return { label: '高', bg: C.HIGH_BG, fg: C.HIGH_FG }
  if (score >= 8)  return { label: '中', bg: C.MID_BG,  fg: C.MID_FG  }
  return               { label: '低', bg: C.LOW_BG,  fg: C.LOW_FG  }
}

function fillSolid(color: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } }
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: `FF${C.BORDER}` } }
  return { top: s, bottom: s, left: s, right: s }
}

function applyHeader(cell: ExcelJS.Cell, bg = C.TITLE, fg = C.HEADER_FG, size = 9) {
  cell.font      = { name: '맑은 고딕', size, bold: true, color: { argb: `FF${fg}` } }
  cell.fill      = fillSolid(bg)
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  cell.border    = thinBorder()
}

function applyData(cell: ExcelJS.Cell, opts: {
  center?: boolean; bold?: boolean; bg?: string
  fg?: string; size?: number; wrap?: boolean
} = {}) {
  const { center = false, bold = false, bg, fg = '000000', size = 9, wrap = true } = opts
  cell.font      = { name: '맑은 고딕', size, bold, color: { argb: `FF${fg}` } }
  cell.fill      = fillSolid(bg ?? C.ROW_EVEN)
  cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: wrap }
  cell.border    = thinBorder()
}

const HAZARD_LABELS: Record<string, string> = {
  fall: '추락·전도', entanglement: '끼임', collision: '충돌',
  fire: '화재·폭발', hazmat: '유해물질', electrical: '감전',
  ergonomic: '근골격계', other: '기타',
}
const EVAL_TYPE_LABELS: Record<string, string> = {
  initial: '최초평가', periodic: '정기평가',
  special: '수시평가', always_on: '상시평가',
}

// ─── GET /api/export/risk/:id ────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('인증 필요', { status: 401 })

  // 데이터 로드
  const { data: ra, error } = await supabase
    .from('risk_assessments')
    .select(`
      *, 
      author:user_profiles!author_id(name, position),
      reviewer:user_profiles!reviewer_id(name, position),
      approver:user_profiles!approver_id(name, position),
      project:projects(name, site_name),
      items:risk_items(*),
      company:companies(name)
    `)
    .eq('id', params.id)
    .single()

  if (error || !ra) return new NextResponse('문서를 찾을 수 없습니다.', { status: 404 })

  const items = (ra.items ?? []).sort((a: { seq: number }, b: { seq: number }) => a.seq - b.seq)
  const company = ra.company as { name: string } | null
  const project = ra.project as { name: string; site_name: string } | null
  const author  = ra.author  as { name: string; position: string } | null
  const reviewer = ra.reviewer as { name: string; position: string } | null
  const approver = ra.approver as { name: string; position: string } | null

  // ─── 워크북 생성 ──────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'SafeDoc'
  wb.created  = new Date()
  wb.modified = new Date()

  // ══════════════════════════════════════════════════════════════════════════
  // 시트 1: 위험성평가표
  // ══════════════════════════════════════════════════════════════════════════
  const ws = wb.addWorksheet('위험성평가표', {
    pageSetup: {
      paperSize: 9, orientation: 'landscape',
      fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddFooter: `&L${company?.name ?? ''} - ${ra.title}&C&P / &N&R작성일: ${new Date().toLocaleDateString('ko-KR')}`,
    },
  })
  ws.properties.defaultRowHeight = 15

  // 열 너비
  const colWidths = [4, 16, 18, 10, 6, 6, 6, 6, 20, 20, 16, 9, 11, 6, 6, 6, 6, 7, 7]
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

  // ── 행 1: 메인 타이틀 ─────────────────────────────────────────────────────
  ws.getRow(1).height = 30
  ws.mergeCells('A1:S1')
  const titleCell = ws.getCell('A1')
  titleCell.value = '위  험  성  평  가  표'
  titleCell.font      = { name: '맑은 고딕', size: 16, bold: true, color: { argb: `FF${C.HEADER_FG}` } }
  titleCell.fill      = fillSolid(C.TITLE)
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // ── 행 2: 부제목 ──────────────────────────────────────────────────────────
  ws.getRow(2).height = 18
  ws.mergeCells('A2:S2')
  const subCell = ws.getCell('A2')
  subCell.value = `[ ${ra.title} ]  ·  ${company?.name ?? ''}  ·  ${project?.site_name ?? ''}`
  subCell.font      = { name: '맑은 고딕', size: 10, color: { argb: `FF${C.HEADER_FG}` } }
  subCell.fill      = fillSolid(C.HEADER)
  subCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // ── 행 3~5: 기본정보 ──────────────────────────────────────────────────────
  const period = `${ra.eval_start_date} ~ ${ra.eval_end_date}`
  const infoRows = [
    [['A3:B3','회사명'], ['C3:F3', company?.name ?? ''],
     ['G3:H3','현장명'], ['I3:L3', project?.site_name ?? ''],
     ['M3:N3','평가기간'], ['O3:S3', period]],
    [['A4:B4','평가유형'], ['C4:F4', EVAL_TYPE_LABELS[ra.eval_type] ?? ra.eval_type],
     ['G4:S4','관련 공종 : ' + ra.work_types.join(', ')]],
    [['A5:B5','작성자'], ['C5:F5', author ? `${author.name} (${author.position})` : ''],
     ['G5:H5','검토자'], ['I5:L5', reviewer ? `${reviewer.name} (${reviewer.position})` : ''],
     ['M5:N5','승인자'], ['O5:S5', approver ? `${approver.name} (${approver.position})` : '']],
  ] as [string, string][][]

  for (let rowIdx = 0; rowIdx < infoRows.length; rowIdx++) {
    ws.getRow(3 + rowIdx).height = 18
    const row = infoRows[rowIdx]
    for (let i = 0; i < row.length; i += 2) {
      const [labelRange, labelText] = row[i]
      const [valueRange, valueText] = row[i + 1] ?? ['', '']
      ws.mergeCells(labelRange)
      applyHeader(ws.getCell(labelRange.split(':')[0]), C.HEADER)
      ws.getCell(labelRange.split(':')[0]).value = labelText

      if (valueRange) {
        ws.mergeCells(valueRange)
        applyData(ws.getCell(valueRange.split(':')[0]), { size: 9 })
        ws.getCell(valueRange.split(':')[0]).value = valueText
      }
    }
  }

  // ── 행 6~8: 컬럼 헤더 ────────────────────────────────────────────────────
  const HEADER_DEFS: [string, string, string][] = [
    // [병합범위, 텍스트, 배경색]
    ['A6:A8',  '번\n호',          C.TITLE],
    ['B6:B8',  '작업 내용',        C.TITLE],
    ['C6:C8',  '유해·위험요인',    C.TITLE],
    ['D6:D8',  '위험\n유형',       C.TITLE],
    ['E6:H6',  '현재 위험도',      C.TITLE],
    ['E7:E8',  '가능성',           C.HEADER],
    ['F7:F8',  '중대성',           C.HEADER],
    ['G7:G8',  '점수',             C.HEADER],
    ['H7:H8',  '판정',             C.HEADER],
    ['I6:I8',  '공학적 대책',      C.TITLE],
    ['J6:J8',  '관리적 대책',      C.TITLE],
    ['K6:K8',  '개인\n보호구',     C.TITLE],
    ['L6:L8',  '담당자',           C.TITLE],
    ['M6:M8',  '완료\n기한',       C.TITLE],
    ['N6:Q6',  '개선 후 위험도',   C.TITLE],
    ['N7:N8',  '가능성',           C.HEADER],
    ['O7:O8',  '중대성',           C.HEADER],
    ['P7:P8',  '점수',             C.HEADER],
    ['Q7:Q8',  '판정',             C.HEADER],
    ['R6:R8',  '교육\n연계',       C.TITLE],
    ['S6:S8',  '계획\n연계',       C.TITLE],
  ]
  ;[6, 7, 8].forEach(r => { ws.getRow(r).height = 16 })

  for (const [range, text, bg] of HEADER_DEFS) {
    try { ws.mergeCells(range) } catch { /* already merged */ }
    const cell = ws.getCell(range.split(':')[0])
    cell.value = text
    applyHeader(cell, bg)
  }

  // ── 행 9~: 데이터 ─────────────────────────────────────────────────────────
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const row  = ws.getRow(9 + i)
    row.height = 54

    const bg = i % 2 === 0 ? C.ROW_ODD : C.ROW_EVEN
    const curScore = item.current_score ?? (item.current_probability * item.current_severity)
    const resScore = item.residual_score ?? (
      item.residual_probability && item.residual_severity
        ? item.residual_probability * item.residual_severity : null
    )
    const curRisk = riskInfo(curScore)
    const resRisk = resScore !== null ? riskInfo(resScore) : null

    const setCell = (col: number, value: ExcelJS.CellValue, opts: Parameters<typeof applyData>[1] = {}) => {
      const cell = row.getCell(col)
      cell.value = value
      applyData(cell, { bg, ...opts })
    }

    setCell(1,  item.seq,               { center: true, bold: true })
    setCell(2,  item.work_content)
    setCell(3,  item.hazard_factor)
    setCell(4,  HAZARD_LABELS[item.hazard_type] ?? '기타', { center: true })
    setCell(5,  item.current_probability, { center: true })
    setCell(6,  item.current_severity,    { center: true })
    setCell(7,  curScore,                 { center: true, bold: true })

    // 위험 판정 (색상 강조)
    const curCell = row.getCell(8)
    curCell.value = curRisk.label
    applyData(curCell, { center: true, bold: true, bg: curRisk.bg, fg: curRisk.fg })

    setCell(9,  item.engineering_measure ?? '')
    setCell(10, item.admin_measure ?? '')
    setCell(11, item.ppe_measure ?? '')
    setCell(12, item.measure_owner ?? '',    { center: true })
    setCell(13, item.measure_due_date ?? '',  { center: true })
    setCell(14, item.residual_probability ?? '', { center: true })
    setCell(15, item.residual_severity ?? '',    { center: true })
    setCell(16, resScore ?? '',                  { center: true, bold: true })

    // 개선 후 판정
    const resCell = row.getCell(17)
    if (resRisk) {
      resCell.value = resRisk.label
      applyData(resCell, { center: true, bold: true, bg: resRisk.bg, fg: resRisk.fg })
    } else {
      resCell.value = '—'
      applyData(resCell, { center: true, bg, fg: 'AAAAAA' })
    }

    // 교육 연계
    const eduCell = row.getCell(18)
    eduCell.value = item.link_to_education ? '✓' : '—'
    applyData(eduCell, {
      center: true,
      bg:  item.link_to_education ? C.EDU_BG : bg,
      fg:  item.link_to_education ? C.EDU_FG : 'AAAAAA',
      bold: item.link_to_education,
    })

    // 계획 연계
    const planCell = row.getCell(19)
    planCell.value = item.link_to_work_plan ? '✓' : '—'
    applyData(planCell, {
      center: true,
      bg:  item.link_to_work_plan ? C.PLAN_BG : bg,
      fg:  item.link_to_work_plan ? C.PLAN_FG : 'AAAAAA',
      bold: item.link_to_work_plan,
    })
  }

  // ── 합계 행 ───────────────────────────────────────────────────────────────
  const sumRow = ws.getRow(9 + items.length)
  sumRow.height = 22

  const high   = items.filter((it: { current_level: string }) => it.current_level === 'high').length
  const medium = items.filter((it: { current_level: string }) => it.current_level === 'medium').length
  const low    = items.length - high - medium
  const eduCnt = items.filter((it: { link_to_education: boolean }) => it.link_to_education).length
  const planCnt = items.filter((it: { link_to_work_plan: boolean }) => it.link_to_work_plan).length

  ws.mergeCells(`A${9+items.length}:Q${9+items.length}`)
  const sumCell = sumRow.getCell(1)
  sumCell.value = `합계: 전체 ${items.length}건  |  高위험 ${high}건 (즉시 개선)  |  中위험 ${medium}건 (단기 개선)  |  低위험 ${low}건 (허용)`
  sumCell.font      = { name: '맑은 고딕', size: 9, bold: true, color: { argb: `FF${C.TITLE}` } }
  sumCell.fill      = fillSolid('EBF3FB')
  sumCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sumCell.border    = thinBorder()

  ws.mergeCells(`R${9+items.length}:S${9+items.length}`)
  const eduSumCell = sumRow.getCell(18)
  eduSumCell.value = `교육 ${eduCnt}건 / 계획 ${planCnt}건`
  applyData(eduSumCell, { center: true, bg: C.EDU_BG, fg: C.EDU_FG, bold: true })

  // ── 서명 행 ───────────────────────────────────────────────────────────────
  const sigStart = 9 + items.length + 2

  const sigGroups: [string, string, string][] = [
    [`A${sigStart}:F${sigStart}`,   `A${sigStart+1}:F${sigStart+1}`,   '작성자'],
    [`G${sigStart}:L${sigStart}`,   `G${sigStart+1}:L${sigStart+1}`,   '검토자 (관리감독자)'],
    [`M${sigStart}:S${sigStart}`,   `M${sigStart+1}:S${sigStart+1}`,   '승인자 (안전보건관리책임자)'],
  ]

  for (const [labelRange, sigRange, label] of sigGroups) {
    ws.getRow(sigStart).height   = 16
    ws.getRow(sigStart+1).height = 44

    ws.mergeCells(labelRange)
    const lc = ws.getCell(labelRange.split(':')[0])
    lc.value = label
    applyHeader(lc, C.HEADER)

    ws.mergeCells(sigRange)
    const sc = ws.getCell(sigRange.split(':')[0])
    sc.value = ''
    sc.fill   = fillSolid('FDFEFE')
    sc.border = thinBorder()
  }

  // 인쇄 반복 행 설정
  ws.pageSetup.printTitlesRow = '1:8'

  // ══════════════════════════════════════════════════════════════════════════
  // 시트 2: 위험요인 요약
  // ══════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('위험요인 요약', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  })
  ;[6, 22, 10, 10, 10, 26].forEach((w, i) => { ws2.getColumn(i+1).width = w })

  ws2.getRow(1).height = 28
  ws2.mergeCells('A1:F1')
  const t2 = ws2.getCell('A1')
  t2.value = '위험요인 요약 및 교육·작업계획 연계 현황'
  t2.font      = { name: '맑은 고딕', size: 13, bold: true, color: { argb: `FF${C.HEADER_FG}` } }
  t2.fill      = fillSolid(C.TITLE)
  t2.alignment = { horizontal: 'center', vertical: 'middle' }

  ws2.getRow(2).height = 16
  const h2s: [string, string][] = [
    ['A2','번호'], ['B2','작업 내용 / 유해위험요인'], ['C2','위험 판정'],
    ['D2','교육 연계'], ['E2','계획 연계'], ['F2','감소대책 요약'],
  ]
  for (const [addr, text] of h2s) {
    ws2.getCell(addr).value = text
    applyHeader(ws2.getCell(addr), C.TITLE)
  }

  for (let i = 0; i < items.length; i++) {
    const item  = items[i]
    const r     = ws2.getRow(3 + i)
    r.height    = 44
    const bg    = i % 2 === 0 ? C.ROW_ODD : C.ROW_EVEN
    const score = item.current_score ?? (item.current_probability * item.current_severity)
    const risk  = riskInfo(score)

    const measures = [
      item.engineering_measure ? `[공학] ${item.engineering_measure.split('\n')[0]}` : '',
      item.admin_measure       ? `[관리] ${item.admin_measure.split('\n')[0]}`       : '',
      item.ppe_measure         ? `[보호구] ${item.ppe_measure}`                      : '',
    ].filter(Boolean).join('\n')

    const cells: [number, ExcelJS.CellValue, Parameters<typeof applyData>[1]][] = [
      [1, item.seq, { center: true, bold: true, bg }],
      [2, `${item.work_content}\n→ ${item.hazard_factor}`, { bg }],
      [3, `${risk.label} (${score}점)`, { center: true, bold: true, bg: risk.bg, fg: risk.fg }],
      [4, item.link_to_education ? '✓ 교육 연계' : '—', {
        center: true,
        bg:  item.link_to_education ? C.EDU_BG : bg,
        fg:  item.link_to_education ? C.EDU_FG : 'AAAAAA',
        bold: item.link_to_education,
      }],
      [5, item.link_to_work_plan ? '✓ 계획 연계' : '—', {
        center: true,
        bg:  item.link_to_work_plan ? C.PLAN_BG : bg,
        fg:  item.link_to_work_plan ? C.PLAN_FG : 'AAAAAA',
        bold: item.link_to_work_plan,
      }],
      [6, measures, { bg, size: 8 }],
    ]
    for (const [col, val, opts] of cells) {
      const c = r.getCell(col)
      c.value = val
      applyData(c, opts)
    }
  }

  // 통계 행
  const sr = ws2.getRow(3 + items.length)
  sr.height = 22
  ws2.mergeCells(`A${3+items.length}:F${3+items.length}`)
  const sc2 = sr.getCell(1)
  sc2.value = `※ 전체 ${items.length}건  |  高위험 ${high}건 (즉시)  |  中위험 ${medium}건 (단기)  |  低위험 ${low}건 (허용)`
  sc2.font      = { name: '맑은 고딕', size: 9, bold: true, color: { argb: `FF${C.TITLE}` } }
  sc2.fill      = fillSolid('EBF3FB')
  sc2.alignment = { horizontal: 'center', vertical: 'middle' }
  sc2.border    = thinBorder()

  // ══════════════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════
  // 시트 3: 관리감독자의 유해위험방지업무 (별표 2·3)
  // ══════════════════════════════════════════════════════════════════════════
  const { extractSupervisorDuties } = await import('@/lib/linkage/riskToSupervisorDuties')

  const riskItemsForDuty = items.map((i: any) => ({
    work_type:         i.work_content,
    hazard:            i.hazard_factor,
    risk_factor:       i.hazard_factor,
    reduction_measure: [i.engineering_measure, i.admin_measure, i.ppe_measure].filter(Boolean).join(' '),
  }))
  const matchedDuties = extractSupervisorDuties(riskItemsForDuty)

  if (matchedDuties.length > 0) {
    const ws3 = wb.addWorksheet('관리감독자 유해위험방지업무', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    })
    ws3.getColumn(1).width = 28
    ws3.getColumn(2).width = 42
    ws3.getColumn(3).width = 42

    // 타이틀
    ws3.getRow(1).height = 30
    ws3.mergeCells('A1:C1')
    const t3 = ws3.getCell('A1')
    t3.value     = '[별표 2] 관리감독자의 유해·위험 방지 업무 (산업안전보건기준에 관한 규칙 제35조제1항)'
    t3.font      = { name: '맑은 고딕', size: 11, bold: true, color: { argb: `FF${C.HEADER_FG}` } }
    t3.fill      = fillSolid(C.TITLE)
    t3.alignment = { horizontal: 'center', vertical: 'middle' }
    t3.border    = thinBorder()

    // 부제 - 위험성평가 연계 안내
    ws3.getRow(2).height = 16
    ws3.mergeCells('A2:C2')
    const sub3 = ws3.getCell('A2')
    sub3.value     = `※ 위험성평가 키워드 분석을 통해 자동 추출된 항목 (총 ${matchedDuties.length}개 작업 유형)`
    sub3.font      = { name: '맑은 고딕', size: 9, color: { argb: `FF${C.TITLE}` } }
    sub3.fill      = fillSolid('EBF3FB')
    sub3.alignment = { horizontal: 'left', vertical: 'middle' }
    sub3.border    = thinBorder()

    // 헤더
    ws3.getRow(3).height = 16
    const h3 = [['A3','작업 종류 및 법적 근거'], ['B3','직무수행내용 [별표 2]'], ['C3','작업시작 전 점검사항 [별표 3]']]
    for (const [addr, text] of h3) {
      ws3.getCell(addr).value = text
      applyHeader(ws3.getCell(addr), C.HEADER)
    }

    // 카테고리 색상
    const CAT_COLORS: Record<string,string> = {
      machinery:    'E8F4FD', construction: 'FEF9E7', electrical: 'F5EEF8',
      chemical:     'FDEDEC', lifting:       'EAFAF1', other:       'F2F3F4',
    }

    let rowIdx = 4
    for (const d of matchedDuties) {
      const bg = CAT_COLORS[d.category] ?? 'FFFFFF'
      const dutyText    = d.duties.map((du, i) => `${i+1}. ${du}`).join('\n')
      const checkText   = d.preChecks.map((c, i) => `${i+1}. ${c}`).join('\n')
      const lineCount   = Math.max(d.duties.length, d.preChecks.length) + 1
      ws3.getRow(rowIdx).height = Math.max(lineCount * 14, 24)

      const cells3: [string, string, Record<string,unknown>][] = [
        [`A${rowIdx}`, `${d.workType}\n(${d.legalRef})`, { bg, wrap: true, bold: false }],
        [`B${rowIdx}`, dutyText,  { bg, wrap: true }],
        [`C${rowIdx}`, checkText, { bg, wrap: true }],
      ]
      for (const [addr, val, opts] of cells3) {
        ws3.getCell(addr).value = val
        applyData(ws3.getCell(addr), opts as Parameters<typeof applyData>[1])
      }
      rowIdx++
    }

    // 서명란
    rowIdx++
    ws3.getRow(rowIdx).height = 14
    ws3.mergeCells(`A${rowIdx}:C${rowIdx}`)
    const sig = ws3.getCell(`A${rowIdx}`)
    sig.value     = '관리감독자 확인: _________________________ (인)          안전관리자 확인: _________________________ (인)'
    sig.font      = { name: '맑은 고딕', size: 9, color: { argb: `FF${C.TITLE}` } }
    sig.fill      = fillSolid('F8F9FA')
    sig.alignment = { horizontal: 'center', vertical: 'middle' }
    sig.border    = thinBorder()
  }

  // 응답 스트리밍
  // ══════════════════════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer()
  const safeTitle = ra.title.replace(/[\\/:*?"<>|]/g, '_')
  const filename  = `위험성평가_${safeTitle}_${new Date().toISOString().slice(0,10)}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  })
}
