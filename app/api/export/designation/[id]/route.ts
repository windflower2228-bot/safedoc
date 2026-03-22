// app/api/export/designation/[id]/route.ts
// Python PDF 생성기를 child_process로 호출하거나
// 동일 로직을 서버에서 직접 실행합니다.
// 실제 배포 시에는 Python 스크립트를 Next.js API에서 호출합니다.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

type Params = { params: { id: string } }
const toPythonPath = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
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

    return new NextResponse(pdfBuffer, {
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
