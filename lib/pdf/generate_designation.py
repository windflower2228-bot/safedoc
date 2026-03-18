"""
lib/pdf/generate_designation.py
지정서·선임서 PDF 생성 — HTML → wkhtmltopdf
"""
import subprocess, tempfile, os
from datetime import date

def build_html(data: dict) -> str:
    doc_type  = data.get("doc_type", "designation")
    is_appt   = doc_type == "appointment"
    doc_label = "선  임  서" if is_appt else "지  정  서"
    doc_short = "선임서" if is_appt else "지정서"
    role      = data.get("role_label", "")
    name      = data.get("person_name", "")
    duties    = data.get("duties", [])
    today     = date.today().strftime("%Y년  %m월  %d일")
    co        = data.get("company_name", "")
    site      = data.get("site_name", "")
    doc_num   = data.get("doc_number", "")
    period    = data.get("effective_date","") + (" ~ "+data["expiry_date"] if data.get("expiry_date") else " ~ 재임 기간 중")
    id_str    = f"******-{data['person_id_last4']}***" if data.get("person_id_last4") else "—"

    duties_rows = ""
    for i, d in enumerate(duties):
        bg = "#EBF3FB" if i % 2 == 0 else "#ffffff"
        duties_rows += f'<tr><td class="dn">{i+1}</td><td class="dt" style="background:{bg}">{d}</td></tr>\n'

    scope_row = ""
    if data.get("work_scope"):
        scope_row = f'<tr><td class="lb">담당 작업 범위</td><td class="vl" colspan="3" style="white-space:pre-line">{data["work_scope"]}</td></tr>'

    addr_row = ""
    if data.get("person_address"):
        addr_row = f'<tr><td class="lb">주 &nbsp;&nbsp; 소</td><td class="vl" colspan="3">{data["person_address"]}</td></tr>'

    site_txt = f" {site}" if site else ""
    header_sub = f"문서번호: {doc_num}&nbsp; | &nbsp;{co}" + (f"&nbsp; | &nbsp;{site}" if site else "")

    return f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<style>
@page{{size:A4;margin:17mm 18mm 18mm 18mm}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:"Noto Sans CJK KR","Malgun Gothic",sans-serif;font-size:9pt;color:#111;background:#fff;line-height:1.4}}
.tbar{{background:#1E3A5F;color:#fff;text-align:center;padding:11px 0 10px;font-size:19pt;font-weight:900;letter-spacing:7px}}
.sbar{{background:#2E6DA4;color:#fff;font-size:7.5pt;padding:4px 10px;margin-bottom:12px}}
.subj{{background:#EBF3FB;border:1px solid #93C5DA;border-radius:4px;text-align:center;padding:9px 0 8px;margin-bottom:13px}}
.subj .mt{{font-size:15pt;font-weight:900;color:#1E3A5F;letter-spacing:2px;margin-bottom:4px}}
.subj .st{{font-size:9.5pt;color:#2E6DA4}}
.sh{{background:#2E6DA4;color:#fff;font-size:8.5pt;font-weight:700;padding:4px 8px;margin-bottom:0}}
table.it{{width:100%;border-collapse:collapse;margin-bottom:9px;font-size:8.5pt}}
table.it td{{border:0.5px solid #CBD5E1;padding:5px 8px;vertical-align:middle}}
.lb{{background:#F1F5F9;font-weight:700;color:#1E3A5F;text-align:center;width:88px;white-space:nowrap}}
.lb2{{background:#F1F5F9;font-weight:700;color:#1E3A5F;text-align:center;width:68px;white-space:nowrap}}
.vl{{background:#fff}}
table.dt{{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:8.5pt}}
.dn{{background:#F1F5F9;font-weight:700;color:#1E3A5F;text-align:center;width:26px;border:0.5px solid #CBD5E1;padding:4px 0}}
.dt-cell{{border:0.5px solid #CBD5E1;padding:5px 10px;line-height:1.55}}
.notice{{background:#EBF3FB;border:1.5px solid #2E6DA4;border-radius:4px;text-align:center;padding:11px 18px;margin:13px 0;font-size:9.5pt;color:#1E3A5F;line-height:2}}
.dateline{{text-align:center;font-size:11pt;font-weight:700;margin:10px 0 11px;letter-spacing:2px}}
.sign-wrap{{display:flex;justify-content:flex-end;margin-bottom:12px}}
.sign-box{{border:1px solid #CBD5E1;width:215px;background:#FAFAFA;font-size:8pt}}
.sr{{display:flex;border-bottom:0.5px solid #CBD5E1}}
.sr:last-child{{border-bottom:none}}
.sl{{background:#F1F5F9;font-weight:700;color:#1E3A5F;text-align:center;width:50px;padding:5px 0;border-right:0.5px solid #CBD5E1;flex-shrink:0}}
.sv{{padding:5px 8px;flex:1}}
.stamp-row{{display:flex;align-items:center;justify-content:flex-end;padding:5px 8px;gap:8px;border-top:0.5px solid #CBD5E1}}
.stamp{{width:40px;height:40px;border-radius:50%;border:2px solid #C0392B;color:#C0392B;font-size:6.5pt;font-weight:700;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.4;flex-shrink:0}}
.footer{{border-top:0.5px solid #CBD5E1;padding-top:6px;font-size:7pt;color:#64748B;line-height:1.9}}
</style></head><body>
<div class="tbar">{doc_label}</div>
<div class="sbar">{header_sub}</div>
<div class="subj">
  <div class="mt">{role} {doc_short}</div>
  <div class="st">피지정자: {name}</div>
</div>
<div class="sh">■&nbsp; 피지정자 정보</div>
<table class="it">
  <tr>
    <td class="lb">성 &nbsp;&nbsp;&nbsp; 명</td><td class="vl" style="width:38%;font-weight:700">{name}</td>
    <td class="lb2">직 &nbsp;&nbsp; 위</td><td class="vl">{data.get("person_position","")}</td>
  </tr>
  <tr>
    <td class="lb">소 &nbsp;&nbsp;&nbsp; 속</td><td class="vl">{data.get("person_dept","") or "—"}</td>
    <td class="lb2">주민등록</td><td class="vl">{id_str}</td>
  </tr>
  {addr_row}
</table>
<div class="sh">■&nbsp; 지정 내용</div>
<table class="it">
  <tr>
    <td class="lb">직 위 명</td><td class="vl" style="font-weight:700">{role}</td>
    <td class="lb2">지정 기간</td><td class="vl">{period}</td>
  </tr>
  <tr>
    <td class="lb">법적 근거</td><td class="vl" colspan="3">{data.get("legal_basis","")}</td>
  </tr>
  {scope_row}
</table>
<div class="sh">■&nbsp; 주요 직무</div>
<table class="dt">
{duties_rows}
</table>
<div class="notice">
  위 사람을 <strong>{co}{site_txt}</strong>의<br>
  <strong>【{role}】</strong>으로 지정하고,<br>
  「{data.get("legal_basis","")}」에 따른 주요 직무를 성실히 수행하여 줄 것을 당부합니다.
</div>
<div class="dateline">{today}</div>
<div class="sign-wrap">
  <div class="sign-box">
    <div class="sr"><div class="sl">소&nbsp;속</div><div class="sv">{data.get("issuer_company","")}</div></div>
    <div class="sr"><div class="sl">직&nbsp;위</div><div class="sv">{data.get("issuer_position","")}</div></div>
    <div class="sr"><div class="sl">성&nbsp;명</div><div class="sv">{data.get("issuer_name","")}</div></div>
    <div class="stamp-row">
      <span style="font-size:7pt;color:#94a3b8">지정권자</span>
      <div class="stamp">(인)<br>날인란</div>
    </div>
  </div>
</div>
<div class="footer">
  ※ 본 {doc_short}는 산업안전보건법령에 따라 발행된 공식 문서입니다.<br>
  ※ 지정된 직무를 성실히 수행하고, 변경 사항 발생 시 즉시 보고하여 주십시오.<br>
  ※ 문의: {co} &nbsp;|&nbsp; SafeDoc 산업안전보건 문서관리시스템
</div>
</body></html>"""

def html_to_pdf(html: str) -> bytes:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html); hp = f.name
    pp = hp.replace(".html", ".pdf")
    try:
        r = subprocess.run(
            ["wkhtmltopdf","--page-size","A4",
             "--margin-top","0mm","--margin-bottom","0mm",
             "--margin-left","0mm","--margin-right","0mm",
             "--encoding","utf-8","--enable-local-file-access","--quiet",
             hp, pp],
            capture_output=True, timeout=30
        )
        if r.returncode != 0:
            raise RuntimeError(f"wkhtmltopdf: {r.stderr.decode()}")
        with open(pp, "rb") as f:
            return f.read()
    finally:
        for p in [hp, pp]:
            try: os.unlink(p)
            except: pass

def generate_designation_pdf(data: dict) -> bytes:
    return html_to_pdf(build_html(data))

if __name__ == "__main__":
    samples = [
        dict(doc_type="designation", role_label="안전보건관리책임자",
             doc_number="지정-안책-2025-001",
             person_name="김 안 전", person_position="현장소장", person_dept="안전보건팀",
             person_address="서울특별시 강남구 테헤란로 123", person_id_last4="1234",
             legal_basis="산업안전보건법 제15조",
             duties=["산업재해 예방계획의 수립에 관한 사항",
                     "안전보건관리규정의 작성 및 변경에 관한 사항",
                     "근로자의 안전·보건 교육에 관한 사항",
                     "작업환경측정 등 작업환경의 점검 및 개선에 관한 사항",
                     "근로자의 건강진단 등 건강관리에 관한 사항",
                     "산업재해의 원인 조사 및 재발 방지대책 수립에 관한 사항",
                     "산업재해에 관한 통계의 기록 및 유지에 관한 사항"],
             effective_date="2025. 03. 01", expiry_date="", work_scope="",
             issuer_name="홍 길 동", issuer_position="대표이사",
             issuer_company="(주)한국건설", company_name="(주)한국건설",
             site_name="4공구 신축 현장"),
        dict(doc_type="appointment", role_label="안전관리자",
             doc_number="선임-안관-2025-001",
             person_name="이 관 리", person_position="안전관리자", person_dept="안전팀",
             person_address="", person_id_last4="",
             legal_basis="산업안전보건법 제17조",
             duties=["위험성평가에 관한 보좌 및 지도·조언",
                     "해당 사업장 안전교육계획의 수립 및 안전교육 실시에 관한 보좌 및 지도·조언",
                     "사업장 순회점검, 지도 및 조치 건의",
                     "산업재해 발생의 원인 조사·분석 및 재발 방지를 위한 기술적 보좌 및 지도·조언",
                     "산업재해에 관한 통계의 유지·관리·분석을 위한 보좌 및 지도·조언",
                     "법 또는 법에 따른 명령으로 정한 안전에 관한 사항의 이행에 관한 보좌 및 지도·조언",
                     "업무 수행 내용의 기록·유지"],
             effective_date="2025. 03. 01", expiry_date="2027. 02. 28", work_scope="",
             issuer_name="홍 길 동", issuer_position="대표이사",
             issuer_company="(주)한국건설", company_name="(주)한국건설",
             site_name="4공구 신축 현장"),
        dict(doc_type="designation", role_label="관리감독자",
             doc_number="지정-감독-2025-003",
             person_name="박 감 독", person_position="공사부장", person_dept="철골공사팀",
             person_address="", person_id_last4="",
             legal_basis="산업안전보건법 제16조",
             duties=["기계·기구 또는 설비의 안전·보건 점검 및 이상 유무의 확인",
                     "근로자의 작업복·보호구 및 방호장치의 점검과 그 착용·사용에 관한 교육·지도",
                     "해당 작업에서 발생한 산업재해에 관한 보고 및 이에 대한 응급조치",
                     "해당 작업의 작업장 정리·정돈 및 통로 확보에 대한 확인·감독",
                     "산업보건의, 안전관리자 및 보건관리자의 지도·조언에 대한 협조",
                     "위험성평가를 위한 유해·위험요인의 파악 및 그 결과에 따른 개선조치의 시행"],
             effective_date="2025. 03. 10", expiry_date="",
             work_scope="철골 조립 공사 구간 (B동 1~5층)\n고소작업 및 용접·절단 작업 전 구간",
             issuer_name="홍 길 동", issuer_position="대표이사",
             issuer_company="(주)한국건설", company_name="(주)한국건설",
             site_name="4공구 신축 현장"),
    ]
    names = ["지정서_안전보건관리책임자.pdf", "선임서_안전관리자.pdf", "지정서_관리감독자.pdf"]
    for s, fn in zip(samples, names):
        pdf = generate_designation_pdf(s)
        with open(f"/home/claude/safedoc/{fn}", "wb") as f:
            f.write(pdf)
        print(f"✅ {fn}  ({len(pdf):,} bytes)")
