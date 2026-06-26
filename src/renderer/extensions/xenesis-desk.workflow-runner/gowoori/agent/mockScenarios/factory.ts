import type { MockScenario } from './types';

const FACTORY_PATTERN = /팩토리|센서|진동|공정|제조|설비|정비|IoT|스마트.*팩|공장/i;

export const factoryScenario: MockScenario = {
  id: 'factory',
  label: '스마트 팩토리',
  priority: 50,
  match: (prompt) => FACTORY_PATTERN.test(prompt),
  generate: () => createFactoryDashboard(),
};

function createFactoryDashboard(): string {
  return `# 스마트 팩토리 — 2번 라인 이상 감지

**상태:** 경고 | **이상 센서:** 진동 | **예측 정비:** 48시간 내

---

## 현황

- 2번 라인 진동 센서 값이 정상 범위(0-4.5mm/s)를 초과하여 5.8mm/s 기록
- 온도 정상, 압력 정상 — 베어링 마모 의심
- 과거 6개월간 유사 패턴 3회 발생, 모두 베어링 교체로 해결

\`\`\`xcon-chain-fixture
{
  "line": "2번 라인",
  "alert": { "sensor": "진동", "value": 5.8, "unit": "mm/s", "threshold": 4.5 },
  "sensors": [
    { "name": "진동", "value": 5.8, "unit": "mm/s", "threshold": 4.5, "status": "경고" },
    { "name": "온도", "value": 68.2, "unit": "°C", "threshold": 85, "status": "정상" },
    { "name": "압력", "value": 3.4, "unit": "bar", "threshold": 5.0, "status": "정상" },
    { "name": "전류", "value": 12.8, "unit": "A", "threshold": 15, "status": "정상" }
  ],
  "history": [
    { "hour": "08시", "vibration": 3.2, "temp": 65.1 },
    { "hour": "09시", "vibration": 3.4, "temp": 66.0 },
    { "hour": "10시", "vibration": 3.8, "temp": 66.8 },
    { "hour": "11시", "vibration": 4.2, "temp": 67.2 },
    { "hour": "12시", "vibration": 4.9, "temp": 67.8 },
    { "hour": "13시", "vibration": 5.8, "temp": 68.2 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Factory Monitor" 960x700
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#78350f"
    border
      visible false
      radius 16
    title: label "스마트 팩토리 — 2번 라인 이상 감지" at 24 16 500 30
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "진동 5.8mm/s (임계 4.5) | 베어링 마모 의심 | 예측 정비 48h" at 24 50 600 20
      color "#fed7aa"
      font
        size 13
        weight 600
    badge: label "경고" at 830 24 60 32
      backgroundColor "#f59e0b"
      color "#ffffff"
      align "center"
      border
        visible false
        radius 10
      font
        size 12
        weight 800
  kpi1: panel at 24 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k1l: label "진동" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "5.8 mm/s" at 16 32 140 28
      color "#ef4444"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "온도" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "68.2°C" at 16 32 140 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "압력" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "3.4 bar" at 16 32 140 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "전류" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "12.8A" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  vibChart: chart at 24 200 448 220
    chartType "line"
    chartData {"labels":["08시","09시","10시","11시","12시","13시"],"datasets":[{"label":"진동 (mm/s)","data":[3.2,3.4,3.8,4.2,4.9,5.8],"borderColor":"#ef4444","backgroundColor":"rgba(239,68,68,0.1)","fill":true,"tension":0.3},{"label":"임계치 (4.5)","data":[4.5,4.5,4.5,4.5,4.5,4.5],"borderColor":"#475569","borderDash":[5,5],"fill":false}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"진동 센서 추이","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"min":0,"max":8}}}
  lineMap: networkDiagram at 496 200 440 220
    backgroundColor "#111827"
    nodeRadius 20
    primaryColor "#f59e0b"
    nodeColor "#22c55e"
    accentColor "#ef4444"
    linkColor "#475569"
    textColor "#f8fafc"
    showLabels true
    showArrows true
    nodes [{"id":"input","label":"원자재","x":50,"y":110,"color":"#22c55e"},{"id":"line1","label":"1번 라인","x":170,"y":60,"color":"#22c55e"},{"id":"line2","label":"2번 라인","x":170,"y":160,"color":"#ef4444"},{"id":"qc","label":"품질검사","x":300,"y":110,"color":"#22c55e"},{"id":"pack","label":"포장","x":400,"y":110,"color":"#22c55e"}]
    links [{"source":"input","target":"line1"},{"source":"input","target":"line2"},{"source":"line1","target":"qc"},{"source":"line2","target":"qc","type":"ref"},{"source":"qc","target":"pack"}]
  maintenanceGrid: spanGrid at 24 438 912 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":200,"cols":[{"width":140},{"width":140},{"width":120},{"width":120},{"width":140},{"width":140}],"rows":[{"height":34,"cells":[{"text":"센서","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"현재값","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"임계치","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"잔여 수명","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"조치","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"진동 센서","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"5.8 mm/s","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"4.5 mm/s","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"경고","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"~48시간","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"베어링 교체 예약","foreColor":"#111827"}]},{"height":38,"cells":[{"text":"온도 센서","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"68.2°C","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"85°C","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"양호","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"—","foreColor":"#94a3b8","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"압력 센서","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"3.4 bar","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"5.0 bar","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"양호","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"—","foreColor":"#94a3b8","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"전류 센서","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"12.8A","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"15A","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"양호","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"—","foreColor":"#94a3b8","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
