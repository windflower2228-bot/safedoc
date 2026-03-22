export const TEMPLATE_DOC_TYPES = [
  { key: 'risk_assessment', label: '위험성평가' },
  { key: 'safety_document', label: '안전보건관리체제 지정/선임 문서' },
  { key: 'education_journal', label: '안전보건교육 일지' },
  { key: 'work_plan', label: '사전조사 및 작업계획서' },
  { key: 'committee_minutes', label: '산업안전보건위원회·노사협의체 회의록' },
  { key: 'msds', label: 'MSDS 문서' },
] as const

export type TemplateDocType = (typeof TEMPLATE_DOC_TYPES)[number]['key']

export const TEMPLATE_DOC_TYPE_SET = new Set<string>(TEMPLATE_DOC_TYPES.map((item) => item.key))

export const TEMPLATE_DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TEMPLATE_DOC_TYPES.map((item) => [item.key, item.label])
)

export type TemplateMode = 'standard' | 'custom'

export type CompanyTemplateItem = {
  id: string
  docType: TemplateDocType
  name: string
  description: string
  filePath: string
  fileName: string
  fileType: string
  size: number
  publicUrl: string
  createdAt: string
  createdBy: string
}

export type CompanyTemplateBinding = {
  mode: TemplateMode
  activeTemplateId: string | null
  updatedAt: string
}

export type CompanyTemplateConfig = {
  version: number
  updatedAt: string
  templates: CompanyTemplateItem[]
  bindings: Record<string, CompanyTemplateBinding>
}

