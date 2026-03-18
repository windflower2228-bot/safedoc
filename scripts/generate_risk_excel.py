"""
위험성평가 엑셀 생성 스크립트 (테스트용)
실제 서비스에서는 Node.js exceljs 버전(lib/excel/riskExport.ts)이 사용됩니다.
"""
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.page import PageMargins
import datetime

# ─── 색상 상수 ────────────────────────────────────────────────────────────────
COLOR_HEADER_BG   = "1E3A5F"   # 헤더 배경 (딥 네이비)
COLOR_HEADER_FG   = "FFFFFF"   # 헤더 글자
COLOR_SUBHEADER   = "2E6DA4"   # 소제목 배경
COLOR_HIGH        = "C0392B"   # 高위험 배경
COLOR_HIGH_FG     = "FFFFFF"
COLOR_MID         = "E67E22"   # 中위험 배경
COLOR_MID_FG      = "FFFFFF"
COLOR_LOW         = "27AE60"   # 低위험 배경
COLOR_LOW_FG      = "FFFFFF"
COLOR_ROW_ODD     = "F8F9FA"   # 홀수 행 배경
COLOR_ROW_EVEN    = "FFFFFF"   # 짝수 행 배경
COLOR_SECTION_BG  = "EBF3FB"   # 섹션 배경
COLOR_BORDER      = "BDC3C7"   # 테두리
COLOR_TITLE_BG    = "154360"   # 제목 배경

# ─── 스타일 헬퍼 ─────────────────────────────────────────────────────────────

def thin_border(color=COLOR_BORDER):
    side = Side(border_style="thin", color=color)
    return Border(left=side, right=side, top=side, bottom=side)

def medium_border():
    side = Side(border_style="medium", color="000000")
    thin  = Side(border_style="thin",   color=COLOR_BORDER)
    return Border(left=side, right=side, top=side, bottom=side)

def apply_header_style(cell, bg=COLOR_HEADER_BG, fg=COLOR_HEADER_FG, size=10, bold=True, wrap=True):
    cell.font      = Font(name="맑은 고딕", size=size, bold=bold, color=fg)
    cell.fill      = PatternFill("solid", fgColor=bg)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=wrap)
    cell.border    = thin_border("FFFFFF")

def apply_data_style(cell, bold=False, center=False, wrap=True, bg=None, fg="000000", size=9):
    cell.font      = Font(name="맑은 고딕", size=size, bold=bold, color=fg)
    cell.alignment = Alignment(
        horizontal="center" if center else "left",
        vertical="center",
        wrap_text=wrap
    )
    if bg:
        cell.fill = PatternFill("solid", fgColor=bg)
    cell.border = thin_border()

def risk_color(score):
    if score >= 15: return COLOR_HIGH, COLOR_HIGH_FG, "高"
    if score >= 8:  return COLOR_MID,  COLOR_MID_FG,  "中"
    return              COLOR_LOW,  COLOR_LOW_FG,  "低"


# ─── 샘플 데이터 ──────────────────────────────────────────────────────────────

COMPANY     = "(주)한국건설"
SITE        = "4공구 현장"
EVAL_TITLE  = "2025년 3월 정기 위험성평가"
EVAL_TYPE   = "정기평가"
PERIOD      = "2025. 03. 10 ~ 2025. 03. 31"
WORK_TYPES  = "철골공사, 고소작업, 용접·절단, 굴착공사"
AUTHOR      = "김안전 (안전관리자)"
REVIEWER    = "박현장 (관리감독자)"
APPROVER    = "최대표 (안전보건관리책임자)"

HAZARD_TYPES = {
    "fall":         "추락·전도",
    "entanglement": "끼임",
    "collision":    "충돌",
    "fire":         "화재·폭발",
    "hazmat":       "유해물질",
    "electrical":   "감전",
    "ergonomic":    "근골격계",
    "other":        "기타",
}

ITEMS = [
    dict(
        seq=1,
        work_content="고소 철골 조립 작업\n(지상 10m 이상)",
        hazard_factor="작업 중 추락\n공구·자재 낙하",
        hazard_type="fall",
        cur_p=4, cur_s=5,
        engineering="안전난간 설치\n수직형 안전망 설치",
        admin="안전대 착용 의무화\nTBM 실시 (매일)",
        ppe="안전대(Y형), 안전모, 안전화",
        owner="김안전",  due="2025-03-15",
        res_p=2, res_s=3,
        edu=True, plan=True,
    ),
    dict(
        seq=2,
        work_content="용접·절단 작업\n(밀폐·협소 구간)",
        hazard_factor="화재·폭발 위험\n유해가스 흡입",
        hazard_type="fire",
        cur_p=3, cur_s=4,
        engineering="국소배기장치 설치\n방화포·소화기 비치",
        admin="작업허가제 실시\n가스농도 측정 후 입장",
        ppe="방독마스크, 용접면, 가죽장갑, 안전화",
        owner="이점검",  due="2025-03-20",
        res_p=2, res_s=2,
        edu=True, plan=True,
    ),
    dict(
        seq=3,
        work_content="굴착 지반 작업\n(H=3m, L=50m)",
        hazard_factor="토사 붕괴·매몰\n지반 침하",
        hazard_type="other",
        cur_p=3, cur_s=5,
        engineering="흙막이 가시설 설치\n지반 계측 실시",
        admin="굴착 전 지하매설물 확인\n붕괴징후 일상 점검",
        ppe="안전모, 안전화, 반사조끼",
        owner="박현장",  due="2025-03-18",
        res_p=2, res_s=3,
        edu=False, plan=True,
    ),
    dict(
        seq=4,
        work_content="이동식 크레인 인양\n(최대 10톤)",
        hazard_factor="달기기구 파단\n인양물 낙하·충돌",
        hazard_type="collision",
        cur_p=2, cur_s=5,
        engineering="와이어로프 정기 점검\n아웃트리거 완전 확장",
        admin="신호수 배치\n작업 반경 내 출입 금지",
        ppe="안전모, 안전화, 신호 조끼",
        owner="최현장",  due="2025-03-25",
        res_p=1, res_s=3,
        edu=False, plan=True,
    ),
    dict(
        seq=5,
        work_content="도장·방청 작업\n(유기용제 사용)",
        hazard_factor="유기용제 흡입\n피부·눈 접촉",
        hazard_type="hazmat",
        cur_p=3, cur_s=3,
        engineering="전체 환기 설비 가동",
        admin="MSDS 교육 실시\n밀폐공간 작업 금지",
        ppe="유기가스 방독마스크, 화학보호장갑, 보안경",
        owner="김안전",  due="2025-03-31",
        res_p=1, res_s=2,
        edu=True, plan=False,
    ),
]


# ─── 메인 엑셀 생성 ───────────────────────────────────────────────────────────

def create_risk_assessment_xlsx(output_path: str):
    wb = Workbook()

    # ── 시트 1: 위험성평가표 ───────────────────────────────────────────────────
    ws1 = wb.active
    ws1.title = "위험성평가표"

    # 인쇄 설정
    ws1.page_setup.orientation     = "landscape"
    ws1.page_setup.paperSize        = 9   # A4
    ws1.page_setup.fitToPage        = True
    ws1.page_setup.fitToWidth       = 1
    ws1.page_setup.fitToHeight      = 0
    ws1.page_margins                = PageMargins(left=0.5, right=0.5, top=0.7, bottom=0.7)
    ws1.print_title_rows            = "1:8"  # 반복 인쇄 행

    # 열 너비 설정 (A~R)
    col_widths = {
        "A": 4,   # 번호
        "B": 16,  # 작업내용
        "C": 18,  # 유해위험요인
        "D": 10,  # 위험유형
        "E": 5,   # 가능성
        "F": 5,   # 중대성
        "G": 5,   # 점수
        "H": 5,   # 판정
        "I": 18,  # 공학적대책
        "J": 18,  # 관리적대책
        "K": 16,  # 보호구
        "L": 8,   # 담당자
        "M": 10,  # 완료기한
        "N": 5,   # 개선후가능성
        "O": 5,   # 개선후중대성
        "P": 5,   # 개선후점수
        "Q": 5,   # 개선후판정
        "R": 6,   # 교육연계
        "S": 6,   # 계획연계
    }
    for col, width in col_widths.items():
        ws1.column_dimensions[col].width = width

    # ── 타이틀 행 (1~2행) ────────────────────────────────────────────────────
    ws1.row_dimensions[1].height = 30
    ws1.row_dimensions[2].height = 18

    ws1.merge_cells("A1:S1")
    title_cell = ws1["A1"]
    title_cell.value      = "위  험  성  평  가  표"
    title_cell.font       = Font(name="맑은 고딕", size=16, bold=True, color=COLOR_HEADER_FG)
    title_cell.fill       = PatternFill("solid", fgColor=COLOR_TITLE_BG)
    title_cell.alignment  = Alignment(horizontal="center", vertical="center")
    title_cell.border     = thin_border("000000")

    ws1.merge_cells("A2:S2")
    subtitle = ws1["A2"]
    subtitle.value      = f"[ {EVAL_TITLE} ]  ·  {COMPANY}  ·  {SITE}"
    subtitle.font       = Font(name="맑은 고딕", size=10, bold=False, color=COLOR_HEADER_FG)
    subtitle.fill       = PatternFill("solid", fgColor=COLOR_SUBHEADER)
    subtitle.alignment  = Alignment(horizontal="center", vertical="center")

    # ── 기본정보 행 (3~5행) ──────────────────────────────────────────────────
    ws1.row_dimensions[3].height = 18
    ws1.row_dimensions[4].height = 18
    ws1.row_dimensions[5].height = 18

    # (label_merge, label_text, value_merge, value_text)
    info_rows = [
        [("A3:B3", "회사명",   "C3:F3", COMPANY),
         ("G3:H3", "현장명",   "I3:L3", SITE),
         ("M3:N3", "평가기간", "O3:S3", PERIOD)],
        [("A4:B4", "평가유형", "C4:F4", EVAL_TYPE),
         ("G4:H4", "관련공종", "I4:S4", WORK_TYPES)],
        [("A5:B5", "작성자",   "C5:F5", AUTHOR),
         ("G5:H5", "검토자",   "I5:L5", REVIEWER),
         ("M5:N5", "승인자",   "O5:S5", APPROVER)],
    ]

    for row_data in info_rows:
        for label_range, label_text, value_range, value_text in row_data:
            ws1.merge_cells(label_range)
            lc = ws1[label_range.split(":")[0]]
            lc.value = label_text
            apply_header_style(lc, bg=COLOR_SUBHEADER, size=9)

            ws1.merge_cells(value_range)
            vc = ws1[value_range.split(":")[0]]
            vc.value = value_text
            apply_data_style(vc, size=9)

    # ── 헤더 행 (6~8행) ──────────────────────────────────────────────────────
    ws1.row_dimensions[6].height = 16
    ws1.row_dimensions[7].height = 16
    ws1.row_dimensions[8].height = 16

    # 6행: 대분류 헤더 (먼저 merge 후 top-left에 값)
    merge_defs_6 = [
        ("A6:A8", "번\n호"),
        ("B6:B8", "작업\n내용"),
        ("C6:C8", "유해·위험요인"),
        ("D6:D8", "위험\n유형"),
        ("E6:H6", "현재 위험도"),
        ("I6:I8", "공학적\n대책"),
        ("J6:J8", "관리적\n대책"),
        ("K6:K8", "개인\n보호구"),
        ("L6:L8", "담당자"),
        ("M6:M8", "완료\n기한"),
        ("N6:Q6", "개선 후 위험도"),
        ("R6:R8", "교육\n연계"),
        ("S6:S8", "계획\n연계"),
    ]
    for merge_range, text in merge_defs_6:
        ws1.merge_cells(merge_range)
        cell = ws1[merge_range.split(":")[0]]
        cell.value = text
        apply_header_style(cell, size=9)

    # 7~8행: 현재 위험도 세부
    sub_headers = [
        ("E7:E8", "가능성\n(빈도)"),
        ("F7:F8", "중대성\n(강도)"),
        ("G7:G8", "위험\n점수"),
        ("H7:H8", "위험\n판정"),
        ("N7:N8", "가능성"),
        ("O7:O8", "중대성"),
        ("P7:P8", "점수"),
        ("Q7:Q8", "판정"),
    ]
    for merge_range, text in sub_headers:
        ws1.merge_cells(merge_range)
        cell = ws1[merge_range.split(":")[0]]
        cell.value = text
        apply_header_style(cell, bg=COLOR_SUBHEADER, size=8)

    # ── 데이터 행 (9행~) ─────────────────────────────────────────────────────
    ROW_H = 52

    for i, item in enumerate(ITEMS):
        row = 9 + i
        ws1.row_dimensions[row].height = ROW_H

        bg = COLOR_ROW_ODD if i % 2 == 0 else COLOR_ROW_EVEN
        cur_score = item["cur_p"] * item["cur_s"]
        res_score = item["res_p"] * item["res_s"]
        cur_bg, cur_fg, cur_label = risk_color(cur_score)
        res_bg, res_fg, res_label = risk_color(res_score)

        def set_cell(col_letter, value, center=False, bold=False, cell_bg=None, fg="000000"):
            c = ws1[f"{col_letter}{row}"]
            c.value = value
            apply_data_style(c, bold=bold, center=center, bg=cell_bg or bg, fg=fg, size=9)

        set_cell("A", item["seq"], center=True, bold=True)
        set_cell("B", item["work_content"])
        set_cell("C", item["hazard_factor"])
        set_cell("D", HAZARD_TYPES.get(item["hazard_type"], "기타"), center=True)
        set_cell("E", item["cur_p"], center=True)
        set_cell("F", item["cur_s"], center=True)
        set_cell("G", cur_score, center=True, bold=True)

        # 위험 판정 셀 (색상 강조)
        hc = ws1[f"H{row}"]
        hc.value = cur_label
        apply_data_style(hc, bold=True, center=True, bg=cur_bg, fg=cur_fg, size=9)

        set_cell("I", item["engineering"])
        set_cell("J", item["admin"])
        set_cell("K", item["ppe"])
        set_cell("L", item["owner"], center=True)
        set_cell("M", item["due"], center=True)
        set_cell("N", item["res_p"], center=True)
        set_cell("O", item["res_s"], center=True)
        set_cell("P", res_score, center=True, bold=True)

        # 개선 후 판정 셀
        rc = ws1[f"Q{row}"]
        rc.value = res_label
        apply_data_style(rc, bold=True, center=True, bg=res_bg, fg=res_fg, size=9)

        # 연계 체크
        edu_c = ws1[f"R{row}"]
        edu_c.value = "✓" if item["edu"] else "—"
        apply_data_style(edu_c, center=True,
                         bg="EAF4FB" if item["edu"] else bg,
                         fg="1A5276" if item["edu"] else "AAAAAA", size=10)

        plan_c = ws1[f"S{row}"]
        plan_c.value = "✓" if item["plan"] else "—"
        apply_data_style(plan_c, center=True,
                         bg="E9F7EF" if item["plan"] else bg,
                         fg="1E8449" if item["plan"] else "AAAAAA", size=10)

    # ── 합계 행 ──────────────────────────────────────────────────────────────
    sum_row = 9 + len(ITEMS)
    ws1.row_dimensions[sum_row].height = 20

    total = len(ITEMS)
    high  = sum(1 for it in ITEMS if it["cur_p"] * it["cur_s"] >= 15)
    mid   = sum(1 for it in ITEMS if 8 <= it["cur_p"] * it["cur_s"] < 15)
    low   = total - high - mid
    edu   = sum(1 for it in ITEMS if it["edu"])
    plan  = sum(1 for it in ITEMS if it["plan"])

    ws1.merge_cells(f"A{sum_row}:G{sum_row}")
    sc = ws1[f"A{sum_row}"]
    sc.value = (
        f"합계: 전체 {total}건  |  "
        f"高위험 {high}건  |  中위험 {mid}건  |  低위험 {low}건"
    )
    sc.font      = Font(name="맑은 고딕", size=9, bold=True, color=COLOR_TITLE_BG)
    sc.fill      = PatternFill("solid", fgColor="EBF3FB")
    sc.alignment = Alignment(horizontal="center", vertical="center")
    sc.border    = thin_border()

    ws1.merge_cells(f"H{sum_row}:Q{sum_row}")
    sc2 = ws1[f"H{sum_row}"]
    sc2.value = ""
    sc2.fill = PatternFill("solid", fgColor="EBF3FB")
    sc2.border = thin_border()

    ws1.merge_cells(f"R{sum_row}:S{sum_row}")
    ec = ws1[f"R{sum_row}"]
    ec.value = f"교육 {edu}건 / 계획 {plan}건"
    ec.font      = Font(name="맑은 고딕", size=9, bold=True, color="1A5276")
    ec.fill      = PatternFill("solid", fgColor="EAF4FB")
    ec.alignment = Alignment(horizontal="center", vertical="center")
    ec.border    = thin_border()

    # ── 서명 행 ──────────────────────────────────────────────────────────────
    sig_start = sum_row + 2
    ws1.row_dimensions[sig_start].height = 16
    ws1.row_dimensions[sig_start + 1].height = 40
    ws1.row_dimensions[sig_start + 2].height = 16

    sig_labels = [("A", "E", "작성자"), ("G", "K", "검토자 (관리감독자)"), ("M", "Q", "승인자 (안전보건관리책임자)")]
    for start_col, end_col, label in sig_labels:
        ws1.merge_cells(f"{start_col}{sig_start}:{end_col}{sig_start}")
        lc = ws1[f"{start_col}{sig_start}"]
        lc.value = label
        apply_header_style(lc, bg=COLOR_SUBHEADER, size=9)

        ws1.merge_cells(f"{start_col}{sig_start+1}:{end_col}{sig_start+1}")
        sc = ws1[f"{start_col}{sig_start+1}"]
        sc.value = ""
        sc.border = thin_border()
        sc.fill   = PatternFill("solid", fgColor="FDFEFE")

        ws1.merge_cells(f"{start_col}{sig_start+2}:{end_col}{sig_start+2}")
        dc = ws1[f"{start_col}{sig_start+2}"]
        dc.value = f"서명일: {datetime.date.today().strftime('%Y. %m. %d')}"
        dc.font      = Font(name="맑은 고딕", size=8, color="888888")
        dc.alignment = Alignment(horizontal="center", vertical="center")
        dc.border    = thin_border()

    # ── 시트 2: 위험요인 요약 ────────────────────────────────────────────────
    ws2 = wb.create_sheet("위험요인 요약")
    ws2.page_setup.orientation = "portrait"
    ws2.page_setup.paperSize   = 9

    ws2.column_dimensions["A"].width = 6
    ws2.column_dimensions["B"].width = 22
    ws2.column_dimensions["C"].width = 10
    ws2.column_dimensions["D"].width = 10
    ws2.column_dimensions["E"].width = 10
    ws2.column_dimensions["F"].width = 18

    ws2.row_dimensions[1].height = 30
    ws2.merge_cells("A1:F1")
    t = ws2["A1"]
    t.value     = "위험요인 요약 및 교육·작업계획 연계 현황"
    t.font      = Font(name="맑은 고딕", size=13, bold=True, color=COLOR_HEADER_FG)
    t.fill      = PatternFill("solid", fgColor=COLOR_TITLE_BG)
    t.alignment = Alignment(horizontal="center", vertical="center")

    ws2.row_dimensions[2].height = 16
    for col_letter, text in [("A","번호"),("B","작업내용 / 유해위험요인"),("C","위험판정"),("D","교육연계"),("E","계획연계"),("F","감소대책 요약")]:
        c = ws2[f"{col_letter}2"]
        c.value = text
        apply_header_style(c, bg=COLOR_HEADER_BG, size=9)

    for i, item in enumerate(ITEMS):
        r = 3 + i
        ws2.row_dimensions[r].height = 40
        score  = item["cur_p"] * item["cur_s"]
        bg_c, fg_c, label = risk_color(score)

        c_seq = ws2[f"A{r}"]
        c_seq.value = item["seq"]
        apply_data_style(c_seq, center=True, bg=COLOR_ROW_ODD if i%2==0 else COLOR_ROW_EVEN, size=9)

        c_wc = ws2[f"B{r}"]
        c_wc.value = f"{item['work_content']}\n→ {item['hazard_factor']}"
        apply_data_style(c_wc, bg=COLOR_ROW_ODD if i%2==0 else COLOR_ROW_EVEN, size=9)

        c_lv = ws2[f"C{r}"]
        c_lv.value = f"{label} ({score}점)"
        apply_data_style(c_lv, center=True, bg=bg_c, fg=fg_c, bold=True, size=9)

        c_edu = ws2[f"D{r}"]
        c_edu.value = "✓ 교육 연계" if item["edu"] else "—"
        apply_data_style(c_edu, center=True,
                         bg="EAF4FB" if item["edu"] else (COLOR_ROW_ODD if i%2==0 else COLOR_ROW_EVEN),
                         fg="1A5276" if item["edu"] else "AAAAAA", size=9)

        c_plan = ws2[f"E{r}"]
        c_plan.value = "✓ 계획 연계" if item["plan"] else "—"
        apply_data_style(c_plan, center=True,
                         bg="E9F7EF" if item["plan"] else (COLOR_ROW_ODD if i%2==0 else COLOR_ROW_EVEN),
                         fg="1E8449" if item["plan"] else "AAAAAA", size=9)

        c_meas = ws2[f"F{r}"]
        parts = []
        if item["engineering"]: parts.append(f"[공학] {item['engineering'].split(chr(10))[0]}")
        if item["admin"]:       parts.append(f"[관리] {item['admin'].split(chr(10))[0]}")
        if item["ppe"]:         parts.append(f"[보호구] {item['ppe'].split(chr(10))[0]}")
        c_meas.value = "\n".join(parts)
        apply_data_style(c_meas, bg=COLOR_ROW_ODD if i%2==0 else COLOR_ROW_EVEN, size=8)

    # 통계 행
    stat_row = 3 + len(ITEMS) + 1
    ws2.row_dimensions[stat_row].height = 22
    ws2.merge_cells(f"A{stat_row}:F{stat_row}")
    sc = ws2[f"A{stat_row}"]
    sc.value = (
        f"※ 위험성평가 결과: 전체 {len(ITEMS)}건  "
        f"| 高위험 {high}건 (즉시 개선)  "
        f"| 中위험 {mid}건 (단기 개선)  "
        f"| 低위험 {low}건 (허용)"
    )
    sc.font      = Font(name="맑은 고딕", size=9, bold=True, color=COLOR_TITLE_BG)
    sc.fill      = PatternFill("solid", fgColor="EBF3FB")
    sc.alignment = Alignment(horizontal="center", vertical="center")
    sc.border    = thin_border()

    # ── 시트 3: 공종 키워드 및 연계 목록 ────────────────────────────────────
    ws3 = wb.create_sheet("연계 문서 목록")
    ws3.column_dimensions["A"].width = 8
    ws3.column_dimensions["B"].width = 30
    ws3.column_dimensions["C"].width = 15
    ws3.column_dimensions["D"].width = 20
    ws3.column_dimensions["E"].width = 18

    ws3.merge_cells("A1:E1")
    t3 = ws3["A1"]
    t3.value     = "위험성평가 연계 문서 목록"
    t3.font      = Font(name="맑은 고딕", size=12, bold=True, color=COLOR_HEADER_FG)
    t3.fill      = PatternFill("solid", fgColor=COLOR_TITLE_BG)
    t3.alignment = Alignment(horizontal="center", vertical="center")
    ws3.row_dimensions[1].height = 26

    for col, hdr in [("A","번호"),("B","문서명"),("C","문서 종류"),("D","연계 근거"),("E","생성 상태")]:
        c = ws3[f"{col}2"]
        c.value = hdr
        apply_header_style(c, bg=COLOR_HEADER_BG, size=9)
    ws3.row_dimensions[2].height = 16

    linked_docs = [
        (1, "고소작업·굴착 안전보건교육일지", "교육일지", "위험성평가 1·3번 항목 (高위험)", "자동 생성 대기"),
        (2, "용접·도장 유해물질 교육일지",    "교육일지", "위험성평가 2·5번 항목",           "자동 생성 대기"),
        (3, "고소 철골 작업계획서",            "작업계획서", "위험성평가 1번 감소대책",         "자동 생성 대기"),
        (4, "용접·절단 작업계획서",            "작업계획서", "위험성평가 2번 감소대책",         "자동 생성 대기"),
        (5, "굴착공사 작업계획서",             "작업계획서", "위험성평가 3번 감소대책",         "자동 생성 대기"),
        (6, "이동식 크레인 작업계획서",        "작업계획서", "위험성평가 4번 감소대책",         "자동 생성 대기"),
        (7, "3월 순회점검일지",               "순회점검",  "위험성평가 전 항목",              "삽입 대기"),
        (8, "3월 협의체 회의록",              "협의체 회의", "위험성평가 주요 결과",           "안건 추가 대기"),
    ]

    for seq, name, dtype, basis, status in linked_docs:
        r = 2 + seq
        ws3.row_dimensions[r].height = 20
        bg = COLOR_ROW_ODD if seq % 2 == 1 else COLOR_ROW_EVEN
        for col, val, is_center in [
            ("A", seq,    True),
            ("B", name,   False),
            ("C", dtype,  True),
            ("D", basis,  False),
            ("E", status, True),
        ]:
            c = ws3[f"{col}{r}"]
            c.value = val
            apply_data_style(c, center=is_center, bg=bg, size=9)

    wb.save(output_path)
    print(f"✅ 위험성평가 엑셀 생성 완료: {output_path}")


if __name__ == "__main__":
    create_risk_assessment_xlsx("/home/claude/safedoc/위험성평가_샘플.xlsx")
