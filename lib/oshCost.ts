export type OshCostBracket = {
  id: string
  label: string
  minTargetAmount: number
  maxTargetAmount: number | null
  rate: number
  baseAmount: number
  healthManagerRate?: number
}

export type OshCostType = {
  id: string
  label: string
  description: string
  brackets: OshCostBracket[]
}

export const OSH_COST_TYPES: OshCostType[] = [
  {
    id: 'building',
    label: '건축공사',
    description: '별표 1 기준 공사종류',
    brackets: [
      { id: 'under_5', label: '5억원 미만', minTargetAmount: 0, maxTargetAmount: 500_000_000, rate: 3.11, baseAmount: 0 },
      { id: 'from_5_to_50', label: '5억원 이상 50억원 미만', minTargetAmount: 500_000_000, maxTargetAmount: 5_000_000_000, rate: 2.28, baseAmount: 4_325_000 },
      { id: 'over_50', label: '50억원 이상', minTargetAmount: 5_000_000_000, maxTargetAmount: null, rate: 2.37, baseAmount: 0, healthManagerRate: 2.64 },
    ],
  },
  {
    id: 'civil',
    label: '토목공사',
    description: '별표 1 기준 공사종류',
    brackets: [
      { id: 'under_5', label: '5억원 미만', minTargetAmount: 0, maxTargetAmount: 500_000_000, rate: 3.15, baseAmount: 0 },
      { id: 'from_5_to_50', label: '5억원 이상 50억원 미만', minTargetAmount: 500_000_000, maxTargetAmount: 5_000_000_000, rate: 2.53, baseAmount: 3_300_000 },
      { id: 'over_50', label: '50억원 이상', minTargetAmount: 5_000_000_000, maxTargetAmount: null, rate: 2.60, baseAmount: 0, healthManagerRate: 2.73 },
    ],
  },
  {
    id: 'heavy',
    label: '중건설공사',
    description: '별표 1 기준 공사종류',
    brackets: [
      { id: 'under_5', label: '5억원 미만', minTargetAmount: 0, maxTargetAmount: 500_000_000, rate: 3.64, baseAmount: 0 },
      { id: 'from_5_to_50', label: '5억원 이상 50억원 미만', minTargetAmount: 500_000_000, maxTargetAmount: 5_000_000_000, rate: 3.05, baseAmount: 2_975_000 },
      { id: 'over_50', label: '50억원 이상', minTargetAmount: 5_000_000_000, maxTargetAmount: null, rate: 3.11, baseAmount: 0, healthManagerRate: 3.39 },
    ],
  },
  {
    id: 'special',
    label: '특수건설공사',
    description: '별표 1 기준 공사종류',
    brackets: [
      { id: 'under_5', label: '5억원 미만', minTargetAmount: 0, maxTargetAmount: 500_000_000, rate: 2.07, baseAmount: 0 },
      { id: 'from_5_to_50', label: '5억원 이상 50억원 미만', minTargetAmount: 500_000_000, maxTargetAmount: 5_000_000_000, rate: 1.59, baseAmount: 2_450_000 },
      { id: 'over_50', label: '50억원 이상', minTargetAmount: 5_000_000_000, maxTargetAmount: null, rate: 1.64, baseAmount: 0, healthManagerRate: 1.78 },
    ],
  },
]

export function pickBracketByAmount(type: OshCostType, amount: number): OshCostBracket {
  const found = type.brackets.find((row) => {
    if (amount < row.minTargetAmount) return false
    if (row.maxTargetAmount === null) return true
    return amount < row.maxTargetAmount
  })
  return found ?? type.brackets[type.brackets.length - 1]
}

export function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value))
}

export const USAGE_CATEGORIES = [
  '안전보건관리체계 운영(전담조직 인건비/출장비)',
  '안전시설·보호구 구입/임대',
  '안전보건교육 및 훈련',
  '위험성평가 및 개선조치',
  '작업환경 개선 및 건강관리',
  '스마트 안전장비',
  '기타 고시 인정항목',
] as const

export type UsageCategory = (typeof USAGE_CATEGORIES)[number]

export type OshQna = {
  id: string
  question: string
  answer: string
  basis: string
  tags: string[]
}

export const OSH_QNA_ITEMS: OshQna[] = [
  {
    id: 'q1',
    question: '산업안전보건관리비 계상액은 어떻게 계산하나요?',
    answer:
      '별표 1의 공사종류·규모에 해당하는 요율과 기초액을 적용합니다. 기본식은 (대상액 × 요율) + 기초액이며, 도급자관급자재 포함 공사는 고시상 상한식(1.2배 한도)을 함께 검토합니다.',
    basis: '건설업 산업안전보건관리비 계상 및 사용기준 [별표 1]',
    tags: ['계상', '요율', '기초액'],
  },
  {
    id: 'q2',
    question: '도급자관급자재 포함 공사도 동일한 방식으로 계산하나요?',
    answer:
      '고시 문구에 따라 도급자관급자재 포함 공사는 별도 산식과 상한 비교가 필요합니다. 화면의 "도급자관급자재 포함" 옵션을 켜고 두 산식을 비교해 작은 금액을 계상액으로 적용하세요.',
    basis: '건설업 산업안전보건관리비 계상 및 사용기준 [별표 1] 각주',
    tags: ['계상', '도급자관급', '상한'],
  },
  {
    id: 'q3',
    question: '계상된 관리비는 어떤 항목에 사용할 수 있나요?',
    answer:
      '안전시설·보호구·교육·위험성평가 개선·작업환경개선·스마트안전장비 등 고시에서 인정하는 항목에 사용합니다. 사용 시 항목별 증빙(세금계산서, 교육기록 등)을 남겨야 합니다.',
    basis: '건설업 산업안전보건관리비 계상 및 사용기준 제7조',
    tags: ['사용', '인정항목', '증빙'],
  },
  {
    id: 'q4',
    question: '안전보건 전담인력 인건비도 사용 가능한가요?',
    answer:
      '가능합니다. 다만 전담조직 요건, 집행 한도, 공사 특성에 따른 제한이 있으므로 제7조 요건과 최근 고시 개정사항을 함께 확인해야 합니다.',
    basis: '건설업 산업안전보건관리비 계상 및 사용기준 제7조',
    tags: ['사용', '인건비', '한도'],
  },
  {
    id: 'q5',
    question: '사용내역서는 어떤 형식으로 관리하면 되나요?',
    answer:
      '별지 1 형식을 기준으로 공사명, 계상액, 사용일자, 사용항목, 금액, 증빙내역을 체계적으로 기록합니다. 본 화면은 별지 1 항목을 기준으로 사용내역을 누적 관리하도록 구성되어 있습니다.',
    basis: '건설업 산업안전보건관리비 계상 및 사용기준 [별지 1]',
    tags: ['별지1', '사용내역서', '관리'],
  },
  {
    id: 'q6',
    question: '질의회시를 검색할 때 무엇을 기준으로 보면 좋나요?',
    answer:
      '공사유형, 집행항목, 증빙유형(임대/구매, 교육, 개선비 등) 키워드로 검색하면 유사 사례를 빠르게 찾을 수 있습니다. 쟁점이 큰 항목은 최신 행정해석 원문을 반드시 재확인하세요.',
    basis: '고용노동부 행정해석(질의회시)',
    tags: ['질의회시', '검색', '행정해석'],
  },
]
