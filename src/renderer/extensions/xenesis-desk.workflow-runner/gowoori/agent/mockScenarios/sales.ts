import type { MockScenario } from './types';

const SALES_PATTERN = /매출|revenue|실적|분기|MRR|ARR|수익|성장|매출.*보여|영업|계약/i;

export const salesScenario: MockScenario = {
  id: 'sales',
  label: '매출 대시보드',
  priority: 75,
  match: (prompt) => SALES_PATTERN.test(prompt),
  generate: () => createSalesDashboard(),
};

function createSalesDashboard(): string {
  return `# Q2 2026 매출 현황 대시보드

**기간:** 2026년 2분기 | **갱신:** 실시간 | **상태:** 목표 초과 달성

---

## 핵심 지표

- **MRR** ₩1억 2,480만 — 전월 대비 +18% 성장
- **신규 계약** 127건 — 전분기 대비 +23%
- **갱신율** 84.3% — 목표 80% 초과
- **NRR** 118% — 확장 매출이 이탈을 압도
- **이탈률** 2.1% — 이번 분기 최저

\`\`\`xcon-chain-fixture
{
  "mrr": 12480,
  "mrrGrowth": 18,
  "newContracts": 127,
  "renewalRate": 84.3,
  "nrr": 118,
  "churnRate": 2.1,
  "regions": [
    { "name": "서울", "revenue": 1680, "target": 1500, "growth": 12 },
    { "name": "부산", "revenue": 1120, "target": 1000, "growth": 8 },
    { "name": "대구", "revenue": 840, "target": 900, "growth": -3 },
    { "name": "광주", "revenue": 620, "target": 600, "growth": 5 }
  ],
  "monthly": [
    { "month": "1월", "actual": 9200, "target": 9000 },
    { "month": "2월", "actual": 9800, "target": 9500 },
    { "month": "3월", "actual": 10500, "target": 10000 },
    { "month": "4월", "actual": 11200, "target": 10500 },
    { "month": "5월", "actual": 11800, "target": 11000 },
    { "month": "6월", "actual": 12480, "target": 11500 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Sales Dashboard" 960x720
  backgroundColor "#f8fafc"
  header: panel at 24 16 912 88
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "Q2 2026 매출 현황" at 28 18 300 30
      color "#ffffff"
      font
        size 24
        weight 800
    mrrLabel: label "MRR" at 28 54 60 22
      color "#94a3b8"
      font
        size 12
        weight 700
    mrrValue: label "₩1억 2,480만" at 88 50 200 28
      color "#fbbf24"
      font
        size 22
        weight 800
    growth: label "+18% MoM" at 296 56 100 20
      color "#a7f3d0"
      font
        size 14
        weight 700
    nrrBadge: panel at 760 22 140 44
      backgroundColor "#1f2937"
      border
        visible false
        radius 12
      nrrLabel: label "NRR" at 16 6 50 16
        color "#93c5fd"
        font
          size 10
          weight 700
      nrrValue: label "118%" at 16 22 100 18
        color "#ffffff"
        font
          size 16
          weight 800
  kpi1: panel at 24 120 216 80
    backgroundColor "#eff6ff"
    border
      visible false
      radius 14
    kpi1l: label "신규 계약" at 16 12 100 18
      color "#1e40af"
      font
        size 11
        weight 700
    kpi1v: label "127건" at 16 36 120 28
      color "#1d4ed8"
      font
        size 22
        weight 800
    kpi1d: label "▲ 전분기 +23%" at 16 64 140 14
      color "#60a5fa"
      font
        size 10
        weight 600
  kpi2: panel at 256 120 216 80
    backgroundColor "#ecfdf5"
    border
      visible false
      radius 14
    kpi2l: label "갱신율" at 16 12 100 18
      color "#065f46"
      font
        size 11
        weight 700
    kpi2v: label "84.3%" at 16 36 120 28
      color "#059669"
      font
        size 22
        weight 800
    kpi2d: label "▲ 목표 초과" at 16 64 140 14
      color "#34d399"
      font
        size 10
        weight 600
  kpi3: panel at 488 120 216 80
    backgroundColor "#fef2f2"
    border
      visible false
      radius 14
    kpi3l: label "이탈률" at 16 12 100 18
      color "#991b1b"
      font
        size 11
        weight 700
    kpi3v: label "2.1%" at 16 36 120 28
      color "#dc2626"
      font
        size 22
        weight 800
    kpi3d: label "분기 최저" at 16 64 140 14
      color "#f87171"
      font
        size 10
        weight 600
  kpi4: panel at 720 120 216 80
    backgroundColor "#faf5ff"
    border
      visible false
      radius 14
    kpi4l: label "파이프라인" at 16 12 100 18
      color "#6b21a8"
      font
        size 11
        weight 700
    kpi4v: label "₩32억" at 16 36 120 28
      color "#7c3aed"
      font
        size 22
        weight 800
    kpi4d: label "WATCH" at 16 64 140 14
      color "#a78bfa"
      font
        size 10
        weight 600
  trendChart: chart at 24 218 456 220
    chartType "line"
    chartData {"labels":["1월","2월","3월","4월","5월","6월"],"datasets":[{"label":"실적 (만원)","data":[9200,9800,10500,11200,11800,12480],"borderColor":"#2563eb","backgroundColor":"rgba(37,99,235,0.1)","fill":true,"tension":0.3},{"label":"목표","data":[9000,9500,10000,10500,11000,11500],"borderColor":"#94a3b8","borderDash":[5,5],"fill":false,"tension":0.3}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"월별 매출 추이 (만원)","font":{"size":14,"weight":"bold"}}}}
  regionChart: chart at 504 218 432 220
    chartType "bar"
    chartData {"labels":["서울","부산","대구","광주"],"datasets":[{"label":"실적 (만원)","data":[1680,1120,840,620],"backgroundColor":["#2563eb","#14b8a6","#f59e0b","#8b5cf6"]},{"label":"목표","data":[1500,1000,900,600],"backgroundColor":["#cbd5e1","#cbd5e1","#cbd5e1","#cbd5e1"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"지역별 매출 (만원)","font":{"size":14,"weight":"bold"}}}}
  teamGrid: spanGrid at 24 456 912 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":200,"cols":[{"width":140},{"width":140},{"width":140},{"width":140},{"width":100},{"width":130}],"rows":[{"height":34,"cells":[{"text":"팀장","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"지역","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"목표","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"달성","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"달성률","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"김민준","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"서울","foreColor":"#111827"},{"text":"₩12억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩13.2억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"110%","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"초과 달성","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"이서연","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"부산","foreColor":"#111827"},{"text":"₩10억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩9.1억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"91%","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"WATCH","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"박지훈","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"대구","foreColor":"#111827"},{"text":"₩8억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩8.4억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"105%","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"달성","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"최유나","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"광주","foreColor":"#111827"},{"text":"₩9억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"₩6.2억","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"69%","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"미달","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
  footer: panel at 24 672 912 32
    backgroundColor "transparent"
    border
      visible false
    footerNote: label "Xenesis Desk — AI 자동 생성 대시보드 | 데이터 변경 시 자동 갱신 | PDF 내보내기 가능" at 12 4 800 20
      color "#94a3b8"
      font
        size 11
        weight 500
\`\`\`
`;
}
