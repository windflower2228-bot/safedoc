// lib/doc-header.ts
// 모든 문서 출력(엑셀·PDF)에서 공통으로 사용하는 헤더 빌더

export interface CompanyForHeader {
  name:              string
  logo_url:          string | null
  doc_header_type:   'logo_only' | 'name_only' | 'logo_and_name' | 'custom'
  doc_header_custom: string | null
  address:           string | null
  business_number:   string | null
  ceo_name:          string | null
  safety_manager:    string | null
  phone:             string | null
}

/**
 * 엑셀 출력용 헤더 텍스트 반환
 * ExcelJS 셀에 직접 넣을 수 있는 문자열
 */
export function getExcelHeaderText(company: CompanyForHeader): string {
  if (company.doc_header_type === 'custom' && company.doc_header_custom) {
    return company.doc_header_custom
  }
  if (company.doc_header_type === 'name_only') {
    return company.name
  }
  return company.name  // logo_only, logo_and_name → 이름 반환 (로고는 별도 삽입)
}

/**
 * PDF/wkhtmltopdf 용 HTML 헤더 빌더
 */
export function buildPdfHeaderHtml(
  company:    CompanyForHeader,
  docTitle:   string,
  docNumber:  string | null,
): string {
  let leftContent = ''

  switch (company.doc_header_type) {
    case 'logo_only':
      leftContent = company.logo_url
        ? `<img src="${company.logo_url}" style="max-height:48px;max-width:160px;object-fit:contain">`
        : `<strong>${company.name}</strong>`
      break
    case 'name_only':
      leftContent = `<div style="font-size:16px;font-weight:700">${company.name}</div>`
      break
    case 'logo_and_name':
      leftContent = `
        <div style="display:flex;align-items:center;gap:10px">
          ${company.logo_url ? `<img src="${company.logo_url}" style="max-height:40px;max-width:120px;object-fit:contain">` : ''}
          <div style="font-size:13px;font-weight:700">${company.name}</div>
        </div>`
      break
    case 'custom':
      leftContent = `<div style="font-size:13px;font-weight:700">${company.doc_header_custom ?? company.name}</div>`
      break
  }

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;
      padding:10px 20px;border-bottom:2px solid #1E3A5F;margin-bottom:12px">
      <div>${leftContent}</div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:700;color:#1E3A5F">${docTitle}</div>
        ${docNumber ? `<div style="font-size:10px;color:#666;margin-top:2px">문서번호: ${docNumber}</div>` : ''}
      </div>
    </div>`
}

/**
 * 엑셀 파일에 로고 이미지를 삽입하는 헬퍼
 * ExcelJS workbook + worksheet + 셀 위치 지정
 */
export async function insertLogoToExcel(
  workbook:  any,   // ExcelJS.Workbook
  worksheet: any,   // ExcelJS.Worksheet
  logoUrl:   string,
  opts: { tl?: { col: number; row: number }; ext?: { width: number; height: number } } = {}
): Promise<void> {
  try {
    const fetch_ = (await import('node-fetch')).default as any
    const res    = await fetch_(logoUrl)
    const buffer = Buffer.from(await res.arrayBuffer())
    const ext    = logoUrl.includes('.png') ? 'png' : 'jpeg'

    const imageId = workbook.addImage({ buffer, extension: ext })
    worksheet.addImage(imageId, {
      tl: opts.tl ?? { col: 0, row: 0 },
      ext: opts.ext ?? { width: 120, height: 40 },
    })
  } catch {
    // 로고 삽입 실패해도 문서 출력은 계속 진행
  }
}

/**
 * Supabase에서 회사 정보 조회 (export API 내부에서 사용)
 */
export async function fetchCompanyForHeader(
  supabase:  any,
  companyId: string
): Promise<CompanyForHeader | null> {
  const { data } = await supabase
    .from('companies')
    .select('name, logo_url, doc_header_type, doc_header_custom, address, business_number, ceo_name, safety_manager, phone')
    .eq('id', companyId)
    .single()
  return data ?? null
}
