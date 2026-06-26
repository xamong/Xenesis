import type { MockScenario } from './types';

const ELECTION_PATTERN = /선거|개표|득표|후보|투표|당선|낙선/i;

export const electionScenario: MockScenario = {
  id: 'election',
  label: '선거 상황실',
  priority: 50,
  match: (prompt) => ELECTION_PATTERN.test(prompt),
  generate: () => `# 개표 현황 — 실시간

**개표율:** 62.4% | **1위:** 이OO 48.2% | **2위:** 김OO 44.1% | **격차:** 4.1%p

\`\`\`xcon-chain-fixture
{
  "counted": 62.4,
  "candidates": [
    { "name": "이OO", "party": "A당", "votes": 2841200, "rate": 48.2 },
    { "name": "김OO", "party": "B당", "votes": 2599400, "rate": 44.1 },
    { "name": "박OO", "party": "C당", "votes": 452800, "rate": 7.7 }
  ],
  "regions": [
    { "name": "서울", "counted": 68, "lead": "이OO", "gap": 3.2 },
    { "name": "경기", "counted": 61, "lead": "이OO", "gap": 5.8 },
    { "name": "부산", "counted": 58, "lead": "김OO", "gap": 8.4 },
    { "name": "대구", "counted": 55, "lead": "김OO", "gap": 12.1 },
    { "name": "광주", "counted": 64, "lead": "이OO", "gap": 22.3 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Election Dashboard" 960x660
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#1e3a5f"
    border
      visible false
      radius 16
    title: label "개표 현황 — 실시간" at 24 16 400 30
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "개표율 62.4% | 1위 이OO 48.2% | 2위 김OO 44.1% | 격차 4.1%p" at 24 50 700 20
      color "#93c5fd"
      font
        size 13
        weight 600
  kpi1: panel at 24 112 296 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k1l: label "1위 이OO (A당)" at 16 10 200 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "48.2%" at 16 32 120 28
      color "#3b82f6"
      font
        size 22
        weight 800
  kpi2: panel at 336 112 296 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "2위 김OO (B당)" at 16 10 200 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "44.1%" at 16 32 120 28
      color "#ef4444"
      font
        size 22
        weight 800
  kpi3: panel at 648 112 288 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "개표율" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "62.4%" at 16 32 120 28
      color "#fbbf24"
      font
        size 22
        weight 800
  voteChart: chart at 24 200 448 200
    chartType "bar"
    chartData {"labels":["이OO (A당)","김OO (B당)","박OO (C당)"],"datasets":[{"label":"득표율 (%)","data":[48.2,44.1,7.7],"backgroundColor":["#3b82f6","#ef4444","#22c55e"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"후보별 득표율","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"display":false}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"max":60}},"indexAxis":"y"}
  regionChart: chart at 496 200 440 200
    chartType "bar"
    chartData {"labels":["서울","경기","부산","대구","광주"],"datasets":[{"label":"이OO","data":[51.6,52.9,45.8,43.9,61.2],"backgroundColor":"#3b82f6"},{"label":"김OO","data":[48.4,47.1,54.2,56.1,38.8],"backgroundColor":"#ef4444"}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"지역별 양자 득표율","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"max":70}}}
  regionGrid: spanGrid at 24 418 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":140},{"width":120},{"width":160},{"width":140},{"width":160}],"rows":[{"height":34,"cells":[{"text":"지역","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"개표율","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"선두","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"격차","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"서울","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"68%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"이OO","foreColor":"#3b82f6","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"+3.2%p","foreColor":"#3b82f6","textAlign":"MiddleCenter"},{"text":"접전","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"경기","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"61%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"이OO","foreColor":"#3b82f6","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"+5.8%p","foreColor":"#3b82f6","textAlign":"MiddleCenter"},{"text":"우세","backColor":"#dbeafe","foreColor":"#1d4ed8","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"부산","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"58%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"김OO","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"+8.4%p","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"우세","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"광주","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"64%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"이OO","foreColor":"#3b82f6","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"+22.3%p","foreColor":"#3b82f6","textAlign":"MiddleCenter"},{"text":"확정","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`,
};
