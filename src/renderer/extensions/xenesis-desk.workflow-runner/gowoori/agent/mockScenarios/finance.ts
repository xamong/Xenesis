import type { MockScenario } from './types';

const FINANCE_PATTERN = /재무|손익|비용|예산|P&L|영업이익|순이익|현금.*흐름|재무.*제표/i;

export const financeScenario: MockScenario = {
  id: 'finance',
  label: '재무 현황',
  priority: 48,
  match: (prompt) => FINANCE_PATTERN.test(prompt),
  generate: () => createFinanceDashboard(),
};

function createFinanceDashboard(): string {
  return `# 재무 현황 — Q2 2026

**매출:** ₩48.2억 | **순이익:** ₩9.4억 | **영업이익률:** 19.5% | **상태:** 흑자

\`\`\`xcon-chain-fixture
{
  "revenue": 4820,
  "netIncome": 940,
  "operatingMargin": 19.5,
  "cashFlow": 1240,
  "breakdown": [
    { "item": "매출", "budget": 4400, "actual": 4820, "diff": 9.5 },
    { "item": "인건비", "budget": 2200, "actual": 2130, "diff": -3.2 },
    { "item": "운영비", "budget": 900, "actual": 840, "diff": -6.7 },
    { "item": "R&D", "budget": 400, "actual": 410, "diff": 2.5 },
    { "item": "마케팅", "budget": 480, "actual": 500, "diff": 4.2 }
  ],
  "monthly": [
    { "month": "1월", "revenue": 720, "cost": 580, "profit": 140 },
    { "month": "2월", "revenue": 760, "cost": 600, "profit": 160 },
    { "month": "3월", "revenue": 810, "cost": 620, "profit": 190 },
    { "month": "4월", "revenue": 830, "cost": 640, "profit": 190 },
    { "month": "5월", "revenue": 850, "cost": 650, "profit": 200 },
    { "month": "6월", "revenue": 850, "cost": 790, "profit": 60 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Finance Dashboard" 960x660
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "재무 현황 — Q2 2026" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "매출 ₩48.2억 | 순이익 ₩9.4억 | 영업이익률 19.5%" at 28 48 600 20
      color "#94a3b8"
      font
        size 13
        weight 600
    badge: label "흑자" at 840 28 50 24
      backgroundColor "#166534"
      color "#a7f3d0"
      align "center"
      border
        visible false
        radius 10
      font
        size 11
        weight 700
  kpi1: panel at 24 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k1l: label "총 매출" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "₩48.2억" at 16 32 140 28
      color "#fbbf24"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "순이익" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "₩9.4억" at 16 32 140 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "영업이익률" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "19.5%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "현금 흐름" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "₩12.4억" at 16 32 140 28
      color "#60a5fa"
      font
        size 22
        weight 800
  plChart: chart at 24 200 448 200
    chartType "bar"
    chartData {"labels":["1월","2월","3월","4월","5월","6월"],"datasets":[{"label":"매출 (만원)","data":[720,760,810,830,850,850],"backgroundColor":"#2563eb"},{"label":"비용","data":[580,600,620,640,650,790],"backgroundColor":"#f59e0b"},{"label":"순이익","data":[140,160,190,190,200,60],"backgroundColor":"#22c55e"}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"월별 매출/비용/순이익 (만원)","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  marginChart: chart at 496 200 440 200
    chartType "line"
    chartData {"labels":["1월","2월","3월","4월","5월","6월"],"datasets":[{"label":"영업이익률 (%)","data":[19.4,21.1,23.5,22.9,23.5,7.1],"borderColor":"#22c55e","backgroundColor":"rgba(34,197,94,0.1)","fill":true,"tension":0.3},{"label":"목표 (20%)","data":[20,20,20,20,20,20],"borderColor":"#475569","borderDash":[5,5],"fill":false}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"영업이익률 추이","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"min":0,"max":30}}}
  budgetGrid: spanGrid at 24 418 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":160},{"width":160},{"width":160},{"width":160},{"width":160}],"rows":[{"height":34,"cells":[{"text":"항목","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"예산 (만원)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"실적 (만원)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"차이","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"평가","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"매출","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"₩4,400","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩4,820","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+9.5%","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"초과","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"인건비","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"₩2,200","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩2,130","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"-3.2%","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"절감","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"운영비","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"₩900","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩840","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"-6.7%","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"절감","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"R&D","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"₩400","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩410","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+2.5%","foreColor":"#92400e","textAlign":"MiddleCenter"},{"text":"예산 내","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
