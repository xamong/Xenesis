import type { MockScenario } from './types';

const SIMULATION_PATTERN = /시뮬레이션|시나리오|what.?if|가격.*인상|예측|전망|if.*then|비교.*시나리오/i;

export const simulationScenario: MockScenario = {
  id: 'simulation',
  label: '비즈니스 시뮬레이션',
  priority: 65,
  match: (prompt) => SIMULATION_PATTERN.test(prompt),
  generate: () => createSimulationDashboard(),
};

function createSimulationDashboard(): string {
  return `# 가격 정책 시뮬레이션

**현재:** 월 ₩99,000 | 고객 1,200명 | 이탈률 3.2% | MRR ₩1.19억

3가지 시나리오를 비교하여 12개월 후 매출 영향을 분석합니다.

\`\`\`xcon-chain-fixture
{
  "current": { "price": 99000, "customers": 1200, "churn": 3.2, "mrr": 11880 },
  "scenarios": [
    { "id": "A", "label": "가격 10% 인상", "price": 108900, "churnDelta": 1.5, "revenueChange": 4.2 },
    { "id": "B", "label": "가격 유지 + 기능 추가", "price": 99000, "churnDelta": -1.2, "revenueChange": 8.1 },
    { "id": "C", "label": "가격 20% 인상", "price": 118800, "churnDelta": 3.8, "revenueChange": -3.4 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Pricing Simulation" 960x700
  backgroundColor "#f8fafc"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "가격 정책 시뮬레이션" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "현재 ₩99,000 × 1,200명 = MRR ₩1.19억 기준 12개월 전망" at 28 48 600 20
      color "#94a3b8"
      font
        size 13
        weight 600
  kpiCurrent: panel at 24 112 912 72
    backgroundColor "#ffffff"
    border
      visible true
      width 1
      color "#e2e8f0"
      radius 14
    ck1: label "현재 가격  ₩99,000" at 24 22 200 28
      color "#111827"
      font
        size 14
        weight 800
    sep1: shape at 230 10 1 52
      backgroundColor "#e2e8f0"
    ck2: label "고객  1,200명" at 250 22 160 28
      color "#111827"
      font
        size 14
        weight 800
    sep2: shape at 416 10 1 52
      backgroundColor "#e2e8f0"
    ck3: label "이탈률  3.2%" at 436 22 140 28
      color "#dc2626"
      font
        size 14
        weight 800
    sep3: shape at 582 10 1 52
      backgroundColor "#e2e8f0"
    ck4: label "MRR  ₩1.19억" at 602 22 180 28
      color "#2563eb"
      font
        size 14
        weight 800
  projectionChart: chart at 24 202 560 220
    chartType "bar"
    chartData {"labels":["현재","A: 10% 인상","B: 기능 추가","C: 20% 인상"],"datasets":[{"label":"12개월 후 MRR (만원)","data":[11880,12379,12842,11476],"backgroundColor":["#94a3b8","#f59e0b","#22c55e","#ef4444"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"시나리오별 12개월 후 MRR 전망 (만원)","font":{"size":14,"weight":"bold"}}}}
  churnChart: chart at 608 202 328 220
    chartType "bar"
    chartData {"labels":["현재","A","B","C"],"datasets":[{"label":"이탈률 (%)","data":[3.2,4.7,2.0,7.0],"backgroundColor":["#94a3b8","#f59e0b","#22c55e","#ef4444"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"이탈률 변화","font":{"size":14,"weight":"bold"}},"legend":{"display":false}},"scales":{"y":{"max":10}}}
  comparisonGrid: spanGrid at 24 440 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":60},{"width":180},{"width":120},{"width":120},{"width":120},{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"시나리오","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"가격","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"이탈률 변화","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"고객 수 (12M)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"MRR (12M)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"매출 변화","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"현재","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"기준선","foreColor":"#111827"},{"text":"₩99,000","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"3.2%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"1,200","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"₩1.19억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"—","foreColor":"#94a3b8","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"A","foreColor":"#f59e0b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"가격 10% 인상","foreColor":"#111827"},{"text":"₩108,900","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+1.5%p","foreColor":"#f59e0b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"1,137","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"₩1.24억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+4.2%","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"B","foreColor":"#22c55e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"가격 유지 + 기능 추가","foreColor":"#111827"},{"text":"₩99,000","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"−1.2%p","foreColor":"#22c55e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"1,298","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"₩1.28억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+8.1%","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"C","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"가격 20% 인상","foreColor":"#111827"},{"text":"₩118,800","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+3.8%p","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"966","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"₩1.15억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"−3.4%","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
  recommendation: panel at 24 636 912 44
    backgroundColor "#ecfdf5"
    border
      visible true
      width 1
      color "#a7f3d0"
      radius 10
    recText: label "💡 추천: 시나리오 B (기능 추가) — 이탈률 감소 + 매출 +8.1% 성장. 가격 인상 없이 가치 증대." at 20 10 860 24
      color "#065f46"
      font
        size 13
        weight 700
\`\`\`
`;
}
