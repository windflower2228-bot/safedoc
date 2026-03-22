import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  CompanyTemplateConfig,
  CompanyTemplateItem,
  TemplateDocType,
  TemplateMode,
  TEMPLATE_DOC_TYPES,
  TEMPLATE_DOC_TYPE_SET,
} from '@/lib/templates/catalog'

const BUCKET = 'company-assets'
const WRITE_ROLES = ['super_admin', 'company_admin']
const MAX_TEMPLATE_SIZE = 20 * 1024 * 1024

function getConfigPath(companyId: string): string {
  return `company_${companyId}/template-center/config.json`
}

function getTemplatePath(companyId: string, docType: string, id: string, fileName: string): string {
  return `company_${companyId}/template-center/files/${docType}/${id}_${fileName}`
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120) || 'template'
}

function isTemplateDocType(value: string): value is TemplateDocType {
  return TEMPLATE_DOC_TYPE_SET.has(value)
}

function createDefaultConfig(now: string): CompanyTemplateConfig {
  const bindings: CompanyTemplateConfig['bindings'] = {}
  for (const item of TEMPLATE_DOC_TYPES) {
    bindings[item.key] = {
      mode: 'standard',
      activeTemplateId: null,
      updatedAt: now,
    }
  }
  return {
    version: 1,
    updatedAt: now,
    templates: [],
    bindings,
  }
}

function normalizeConfig(raw: any): CompanyTemplateConfig {
  const now = new Date().toISOString()
  const base = createDefaultConfig(now)
  if (!raw || typeof raw !== 'object') return base

  const templates = Array.isArray(raw.templates)
    ? raw.templates
        .filter((item) => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.docType === 'string')
        .filter((item) => isTemplateDocType(String(item.docType)))
        .map((item) => ({
          id: String(item.id),
          docType: String(item.docType) as TemplateDocType,
          name: String(item.name ?? '회사 서식'),
          description: String(item.description ?? ''),
          filePath: String(item.filePath ?? ''),
          fileName: String(item.fileName ?? ''),
          fileType: String(item.fileType ?? 'application/octet-stream'),
          size: Number(item.size ?? 0),
          publicUrl: String(item.publicUrl ?? ''),
          createdAt: String(item.createdAt ?? now),
          createdBy: String(item.createdBy ?? '사용자'),
        }))
    : []

  const bindings: CompanyTemplateConfig['bindings'] = { ...base.bindings }
  if (raw.bindings && typeof raw.bindings === 'object') {
    for (const [docType, binding] of Object.entries(raw.bindings)) {
      if (!isTemplateDocType(String(docType))) continue
      const mode = binding && (binding as any).mode === 'custom' ? 'custom' : 'standard'
      const activeTemplateId = String((binding as any)?.activeTemplateId ?? '').trim() || null
      bindings[docType] = {
        mode,
        activeTemplateId,
        updatedAt: String((binding as any)?.updatedAt ?? now),
      }
    }
  }

  return {
    version: Number(raw.version ?? 1),
    updatedAt: String(raw.updatedAt ?? now),
    templates,
    bindings,
  }
}

async function readConfig(admin: ReturnType<typeof createAdminClient>, companyId: string): Promise<CompanyTemplateConfig> {
  const path = getConfigPath(companyId)
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) return createDefaultConfig(new Date().toISOString())
  try {
    const raw = JSON.parse(await data.text())
    return normalizeConfig(raw)
  } catch {
    return createDefaultConfig(new Date().toISOString())
  }
}

async function writeConfig(admin: ReturnType<typeof createAdminClient>, companyId: string, config: CompanyTemplateConfig) {
  const path = getConfigPath(companyId)
  const payload = Buffer.from(JSON.stringify(config, null, 2), 'utf-8')
  const { error } = await admin.storage.from(BUCKET).upload(path, payload, {
    upsert: true,
    contentType: 'application/json',
  })
  if (error) throw new Error(`서식 설정 저장 실패: ${error.message}`)
}

async function getAuth(requireWrite = false) {
  const supabase = createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '인증 필요' }, { status: 401 }) }

  const { profile, errorMessage } = await getProfileForAuth<{ company_id: string; role: string; name: string }>(
    supabase,
    user.id,
    'company_id, role, name'
  )
  if (!profile?.company_id) {
    return {
      error: NextResponse.json(
        { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
        { status: 403 }
      ),
    }
  }
  if (requireWrite && !WRITE_ROLES.includes(profile.role ?? '')) {
    return { error: NextResponse.json({ error: '서식 관리는 관리자 권한이 필요합니다.' }, { status: 403 }) }
  }

  return { admin, user, profile }
}

function touchBinding(
  config: CompanyTemplateConfig,
  docType: TemplateDocType,
  mode: TemplateMode,
  activeTemplateId: string | null
) {
  config.bindings[docType] = {
    mode,
    activeTemplateId,
    updatedAt: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const auth = await getAuth(false)
    if ('error' in auth) return auth.error

    const config = await readConfig(auth.admin, auth.profile.company_id)
    const canEdit = WRITE_ROLES.includes(auth.profile.role ?? '')
    return NextResponse.json({
      docTypes: TEMPLATE_DOC_TYPES,
      config,
      canEdit,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '서식 설정을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = String(req.headers.get('content-type') ?? '')
    const auth = await getAuth(true)
    if ('error' in auth) return auth.error

    const config = await readConfig(auth.admin, auth.profile.company_id)
    const now = new Date().toISOString()

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const docTypeRaw = String(form.get('docType') ?? '').trim()
      if (!isTemplateDocType(docTypeRaw)) {
        return NextResponse.json({ error: '유효한 문서 유형이 아닙니다.' }, { status: 400 })
      }
      const docType = docTypeRaw as TemplateDocType

      const name = String(form.get('name') ?? '').trim() || `${docType} 회사 서식`
      const description = String(form.get('description') ?? '').trim()
      const htmlContent = String(form.get('htmlContent') ?? '').trim()
      const uploadFile = form.get('file')

      let fileBuffer: Buffer
      let fileName: string
      let fileType: string

      if (htmlContent) {
        fileBuffer = Buffer.from(htmlContent, 'utf-8')
        fileName = sanitizeFileName(String(form.get('fileName') ?? `${name}.html`))
        if (!fileName.toLowerCase().endsWith('.html') && !fileName.toLowerCase().endsWith('.htm')) {
          fileName += '.html'
        }
        fileType = 'text/html'
      } else {
        if (!(uploadFile instanceof File)) {
          return NextResponse.json({ error: '업로드 파일이 필요합니다.' }, { status: 400 })
        }
        if (uploadFile.size <= 0) return NextResponse.json({ error: '빈 파일은 업로드할 수 없습니다.' }, { status: 400 })
        if (uploadFile.size > MAX_TEMPLATE_SIZE) {
          return NextResponse.json({ error: '서식 파일은 20MB 이하만 업로드할 수 있습니다.' }, { status: 400 })
        }
        fileBuffer = Buffer.from(await uploadFile.arrayBuffer())
        fileName = sanitizeFileName(uploadFile.name)
        fileType = uploadFile.type || 'application/octet-stream'
      }

      const id = randomUUID()
      const filePath = getTemplatePath(auth.profile.company_id, docType, id, fileName)
      const { error: uploadError } = await auth.admin.storage.from(BUCKET).upload(filePath, fileBuffer, {
        upsert: true,
        contentType: fileType,
      })
      if (uploadError) return NextResponse.json({ error: `서식 업로드 실패: ${uploadError.message}` }, { status: 500 })

      const {
        data: { publicUrl },
      } = auth.admin.storage.from(BUCKET).getPublicUrl(filePath)

      const item: CompanyTemplateItem = {
        id,
        docType,
        name,
        description,
        filePath,
        fileName,
        fileType,
        size: fileBuffer.byteLength,
        publicUrl,
        createdAt: now,
        createdBy: auth.profile.name || auth.user.email || '관리자',
      }

      config.templates.unshift(item)
      touchBinding(config, docType, 'custom', item.id)
      config.updatedAt = now

      await writeConfig(auth.admin, auth.profile.company_id, config)
      return NextResponse.json({ item, config }, { status: 201 })
    }

    const body = await req.json()
    const action = String(body?.action ?? '').trim()

    if (action === 'set_mode') {
      const docTypeRaw = String(body?.docType ?? '').trim()
      const modeRaw = String(body?.mode ?? '').trim()
      if (!isTemplateDocType(docTypeRaw)) return NextResponse.json({ error: '유효한 문서 유형이 아닙니다.' }, { status: 400 })
      if (modeRaw !== 'standard' && modeRaw !== 'custom') return NextResponse.json({ error: '유효한 모드가 아닙니다.' }, { status: 400 })

      const docType = docTypeRaw as TemplateDocType
      const mode = modeRaw as TemplateMode
      let activeTemplateId: string | null = null

      if (mode === 'custom') {
        const requestedId = String(body?.activeTemplateId ?? '').trim()
        const fallback = config.templates.find((item) => item.docType === docType)?.id ?? null
        activeTemplateId = requestedId || fallback
        if (!activeTemplateId) {
          return NextResponse.json({ error: '해당 문서유형의 회사 서식이 없습니다. 먼저 업로드하거나 생성해주세요.' }, { status: 400 })
        }
      }

      touchBinding(config, docType, mode, activeTemplateId)
      config.updatedAt = now
      await writeConfig(auth.admin, auth.profile.company_id, config)
      return NextResponse.json({ config })
    }

    if (action === 'activate_template') {
      const templateId = String(body?.templateId ?? '').trim()
      const item = config.templates.find((entry) => entry.id === templateId)
      if (!item) return NextResponse.json({ error: '서식을 찾을 수 없습니다.' }, { status: 404 })
      touchBinding(config, item.docType, 'custom', item.id)
      config.updatedAt = now
      await writeConfig(auth.admin, auth.profile.company_id, config)
      return NextResponse.json({ config })
    }

    if (action === 'delete_template') {
      const templateId = String(body?.templateId ?? '').trim()
      const item = config.templates.find((entry) => entry.id === templateId)
      if (!item) return NextResponse.json({ error: '서식을 찾을 수 없습니다.' }, { status: 404 })

      config.templates = config.templates.filter((entry) => entry.id !== templateId)
      const { error: removeError } = await auth.admin.storage.from(BUCKET).remove([item.filePath])
      if (removeError) {
        // 파일 삭제 실패 시에도 메타데이터는 정리하되 로그만 남긴다.
        console.error('template file remove failed', removeError)
      }
      const binding = config.bindings[item.docType]
      if (binding?.activeTemplateId === templateId) {
        touchBinding(config, item.docType, 'standard', null)
      }
      config.updatedAt = now
      await writeConfig(auth.admin, auth.profile.company_id, config)
      return NextResponse.json({ config })
    }

    return NextResponse.json({ error: '지원하지 않는 요청입니다.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '서식 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

