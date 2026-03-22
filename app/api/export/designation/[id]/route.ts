// app/api/export/designation/[id]/route.ts
// Python PDF 생성기를 child_process로 호출하거나
// 동일 로직을 서버에서 직접 실행합니다.
// 실제 배포 시에는 Python 스크립트를 Next.js API에서 호출합니다.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)
const TEMPLATE_BUCKET = 'company-assets'
const SAFETY_DOC_TEMPLATE_KEY = 'safety_document'

type Params = { params: { id: string } }
const toPythonPath = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderTemplate(template: string, values: Record<string, string>): string {
  const rendered = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    escapeHtml(values[key] ?? '')
  )
  if (rendered.includes('window.print()')) return rendered
  const printButton = `
<button onclick="window.print()" style="position:fixed;right:16px;bottom:16px;background:#0f766e;color:white;border:none;padding:10px 16px;border-radius:10px;cursor:pointer;z-index:9999">인쇄</button>`
  if (rendered.includes('</body>')) return rendered.replace('</body>', `${printButton}</body>`)
  return `${rendered}${printButton}`
}

async function renderHtmlToPdf(html: string): Promise<Buffer | null> {
  const uid = randomUUID()
  const htmlPath = join(tmpdir(), `designation_custom_${uid}.html`)
  const pdfPath = join(tmpdir(), `designation_custom_${uid}.pdf`)
  try {
    await writeFile(htmlPath, html, 'utf-8')
    await execAsync(`wkhtmltopdf "${htmlPath}" "${pdfPath}"`)
    return await readFile(pdfPath)
  } catch {
    return null
  } finally {
    await Promise.all([unlink(htmlPath).catch(() => {}), unlink(pdfPath).catch(() => {})])
  }
}

async function loadCompanyTemplateHtml(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  values: Record<string, string>
): Promise<string | null> {
  const configPath = `company_${companyId}/template-center/config.json`
  const { data: configBlob } = await admin.storage.from(TEMPLATE_BUCKET).download(configPath)
  if (!configBlob) return null
  try {
    const raw = JSON.parse(await configBlob.text())
    const binding = raw?.bindings?.[SAFETY_DOC_TEMPLATE_KEY]
    if (!binding || binding.mode !== 'custom' || !binding.activeTemplateId) return null
    const activeTemplateId = String(binding.activeTemplateId)
    const template = (raw?.templates ?? []).find((item: any) => String(item?.id) === activeTemplateId)
    if (!template?.filePath) return null

    const fileName = String(template.fileName ?? '')
    const fileType = String(template.fileType ?? '')
    const isHtml = fileName.toLowerCase().endsWith('.html') || fileName.toLowerCase().endsWith('.htm') || fileType.includes('text/html')
    if (!isHtml) return null

    const { data: templateBlob } = await admin.storage.from(TEMPLATE_BUCKET).download(String(template.filePath))
    if (!templateBlob) return null
    const templateHtml = await templateBlob.text()
    return renderTemplate(templateHtml, values)
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('인증 필요', { status: 401 })

  const { data: doc, error } = await supabase
    .from('designations')
    .select(`
      *,
      company:companies(name, address),
      project:projects(name, site_name)
    `)
    .eq('id', params.id)
    .single()

  if (error || !doc) return new NextResponse('문서를 찾을 수 없습니다.', { status: 404 })

  const company = doc.company as { name: string; address: string } | null
  const project = doc.project as { name: string; site_name: string } | null

  // Python 스크립트에 전달할 데이터 구성
  const pdfData = {
    doc_type:        doc.doc_type,
    role_label:      doc.role_label,
    doc_number:      doc.doc_number ?? '',
    person_name:     doc.person_name,
    person_position: doc.person_position,
    person_dept:     doc.person_dept ?? '',
    person_address:  doc.person_address ?? '',
    person_id_last4: doc.person_id_last4 ?? '',
    legal_basis:     doc.legal_basis,
    duties:          (doc.duties ?? []) as string[],
    effective_date:  doc.effective_date,
    expiry_date:     doc.expiry_date ?? '',
    work_scope:      doc.work_scope ?? '',
    issuer_name:     doc.issuer_name,
    issuer_position: doc.issuer_position,
    issuer_company:  doc.issuer_company,
    company_name:    company?.name ?? '',
    company_address: company?.address ?? '',
    site_name:       project?.site_name ?? '',
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  const tokenMap: Record<string, string> = {
    company_name: pdfData.company_name ?? '',
    company_address: pdfData.company_address ?? '',
    site_name: pdfData.site_name ?? '',
    doc_type: pdfData.doc_type ?? '',
    role_label: pdfData.role_label ?? '',
    doc_number: pdfData.doc_number ?? '',
    person_name: pdfData.person_name ?? '',
    person_position: pdfData.person_position ?? '',
    person_dept: pdfData.person_dept ?? '',
    person_address: pdfData.person_address ?? '',
    legal_basis: pdfData.legal_basis ?? '',
    effective_date: pdfData.effective_date ?? '',
    expiry_date: pdfData.expiry_date ?? '',
    work_scope: pdfData.work_scope ?? '',
    issuer_name: pdfData.issuer_name ?? '',
    issuer_position: pdfData.issuer_position ?? '',
    issuer_company: pdfData.issuer_company ?? '',
    created_at: new Date().toISOString().slice(0, 10),
    author_name: user.email ?? '',
    note: '',
  }

  const customHtml = profile?.company_id
    ? await loadCompanyTemplateHtml(admin, profile.company_id, tokenMap)
    : null

  if (customHtml) {
    const customPdf = await renderHtmlToPdf(customHtml)
    const docTypeLabel = doc.doc_type === 'appointment' ? '선임서' : '지정서'
    const safeRole = doc.role_label.replace(/[\\/:*?"<>|]/g, '_')
    const safeName = doc.person_name.replace(/\s/g, '').replace(/[\\/:*?"<>|]/g, '_')
    const baseName = `${docTypeLabel}_${safeRole}_${safeName}_${doc.effective_date}_회사서식`

    if (customPdf) {
      return new NextResponse(new Uint8Array(customPdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(baseName + '.pdf')}`,
          'Cache-Control': 'no-store',
        },
      })
    }
    return new NextResponse(customHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(baseName + '.html')}`,
        'Cache-Control': 'no-store',
      },
    })
  }

  try {
    // 임시 JSON 파일 작성 → Python 스크립트 호출 → PDF 읽기 → 정리
    const uid      = randomUUID()
    const jsonPath = join(tmpdir(), `designation_${uid}.json`)
    const pdfPath  = join(tmpdir(), `designation_${uid}.pdf`)
    const modulePath = join(process.cwd(), 'lib', 'pdf')
    const pyModulePath = toPythonPath(modulePath)
    const pyJsonPath = toPythonPath(jsonPath)
    const pyPdfPath = toPythonPath(pdfPath)

    await writeFile(jsonPath, JSON.stringify(pdfData), 'utf-8')

    // Python 인라인 스크립트로 PDF 생성
    const pyScript = `
import json, sys
sys.path.insert(0, '${pyModulePath}')
from generate_designation import generate_designation_pdf
with open('${pyJsonPath}') as f:
    data = json.load(f)
pdf = generate_designation_pdf(data)
with open('${pyPdfPath}', 'wb') as f:
    f.write(pdf)
print(len(pdf))
`
    await execAsync(`python3 -c "${pyScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`)
      .catch(async () => {
        // fallback: 스크립트 파일로 실행
        const scriptPath = join(tmpdir(), `gen_${uid}.py`)
        await writeFile(scriptPath, pyScript, 'utf-8')
        await execAsync(`python3 ${scriptPath}`)
        await unlink(scriptPath).catch(() => {})
      })

    const pdfBuffer = await readFile(pdfPath)

    // 정리
    await Promise.all([
      unlink(jsonPath).catch(() => {}),
      unlink(pdfPath).catch(() => {}),
    ])

    const docTypeLabel = doc.doc_type === 'appointment' ? '선임서' : '지정서'
    const safeRole     = doc.role_label.replace(/[\\/:*?"<>|]/g, '_')
    const safeName     = doc.person_name.replace(/\s/g, '').replace(/[\\/:*?"<>|]/g, '_')
    const filename     = `${docTypeLabel}_${safeRole}_${safeName}_${doc.effective_date}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF Export Error]', err)
    return NextResponse.json(
      { error: 'PDF 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
