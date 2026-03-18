// lib/linkage/riskToInspection.ts — 위험성평가 → 순회점검 / 합동점검 자동 변환
import type { InspectionCheckItem, InspectionCategory } from '@/types/inspection'
import { HAZARD_TO_CATEGORY, DEFAULT_CHECK_ITEMS } from '@/types/inspection'

interface RiskItem { id:string;seq:number;work_content:string;hazard_factor:string;hazard_type:string;current_level:string;current_score:number;measure_owner:string|null;measure_due_date:string|null }
interface RA { id:string;title:string;eval_type:string;work_types:string[];eval_start_date:string;items:RiskItem[];project?:{name:string;site_name:string}|null;author?:{name:string;position:string}|null }

export function generateInspectionFromRisk(ra:RA, opts:{date?:string;area?:string;inspectorName?:string;inspectorPosition?:string;type?:'routine'|'special'|'safety_day'}={}) {
  const usedCats = new Set<InspectionCategory>()
  for (const i of ra.items) usedCats.add(HAZARD_TO_CATEGORY[i.hazard_type]??'other')
  let seq=1; const items:InspectionCheckItem[]=[]
  for (const i of ra.items.filter(x=>x.current_level==='high').sort((a,b)=>b.current_score-a.current_score)) {
    const cat=HAZARD_TO_CATEGORY[i.hazard_type]??'other'
    items.push({seq:seq++,category:cat,check_content:`[위험성평가 연계] ${i.work_content} — ${i.hazard_factor} 개선 이행 확인`,result:'fail',defect_detail:`高위험 (점수 ${i.current_score})`,action_required:'감소대책 이행 확인 및 재점검',action_deadline:i.measure_due_date??'',action_owner:i.measure_owner??'',is_resolved:false,source_risk_item_id:i.id})
  }
  for (const cat of Array.from(usedCats)) for (const t of (DEFAULT_CHECK_ITEMS[cat]??[]).slice(0,3)) items.push({seq:seq++,category:cat,check_content:t,result:'pass',defect_detail:'',action_required:'',action_deadline:'',action_owner:'',is_resolved:false,source_risk_item_id:null})
  for (const cat of ['ppe','housekeeping'] as InspectionCategory[]) if (!usedCats.has(cat)) for (const t of (DEFAULT_CHECK_ITEMS[cat]??[]).slice(0,2)) items.push({seq:seq++,category:cat,check_content:t,result:'pass',defect_detail:'',action_required:'',action_deadline:'',action_owner:'',is_resolved:false,source_risk_item_id:null})
  items.forEach((c,i)=>{c.seq=i+1})
  const failCnt=items.filter(c=>c.result==='fail').length
  const highCnt=ra.items.filter(i=>i.current_level==='high').length
  return {
    inspection_type:opts.type??'routine' as const,
    inspection_date:opts.date??new Date().toISOString().slice(0,10),
    inspection_area:opts.area??(ra.project?.site_name??''),
    inspector_name:opts.inspectorName??(ra.author?.name??''),
    inspector_position:opts.inspectorPosition??(ra.author?.position??'안전관리자'),
    check_items:items,
    overall_opinion:[`【점검 개요】 ${ra.title} 위험성평가 연계 중점 점검`,`【총 항목】 ${items.length}개  불량 ${failCnt}건`,highCnt>0?`【중점 조치】 高위험 ${highCnt}건 감소대책 이행 상태 확인 요망`:'【결과】 전반적 양호'].join('\n'),
    link_summary:{source_risk_id:ra.id,source_risk_title:ra.title,total_items:items.length,fail_targets:failCnt},
  }
}

export function generateJointInspectionFromRisk(ra:RA, opts:{date?:string;area?:string;evalCount?:number}={}) {
  const draft=generateInspectionFromRisk(ra,{date:opts.date,area:opts.area})
  const highItems=ra.items.filter(i=>i.current_level==='high')
  const total=ra.items.length
  const improvements=highItems.slice(0,5).map((item,idx)=>({seq:idx+1,item:`${item.work_content} — ${item.hazard_factor} 개선`,deadline:item.measure_due_date??'',owner:item.measure_owner??'',is_done:false}))
  return {
    inspection_date:opts.date??new Date().toISOString().slice(0,10),
    inspection_area:opts.area??(ra.project?.site_name??''),
    participants:[
      {seq:1,name:'',position:'안전보건관리책임자',affiliation:'',role:'leader' as const},
      {seq:2,name:'',position:'안전관리자',affiliation:'',role:'member' as const},
      {seq:3,name:'',position:'근로자 대표',affiliation:'',role:'worker_rep' as const},
    ],
    risk_summary:{eval_count:opts.evalCount??1,high_count:highItems.length,resolved_rate:total>0?Math.round((total-highItems.length)/total*100):0,period:`${ra.eval_start_date} ~ 현재`},
    check_items:draft.check_items,
    improvement_items:improvements,
    overall_opinion:[`【점검 개요】 ${ra.title} 연계 합동안전보건점검`,`【위험성평가 현황】 高위험 ${highItems.length}건 / 전체 ${total}건`,`【개선 요구】 ${improvements.length}건`].join('\n'),
  }
}
