import type { MockScenario } from './types';

const MEDICAL_PATTERN = /환자|바이탈|심박|의료|병원|당직|혈압|체온|투약|간호/i;

export const medicalScenario: MockScenario = {
  id: 'medical',
  label: '병원 당직실',
  priority: 50,
  match: (prompt) => MEDICAL_PATTERN.test(prompt),
  generate: () => createMedicalDashboard(),
};

function createMedicalDashboard(): string {
  return `# 3병실 환자 바이탈 모니터링

**환자:** 김OO (M/62) | **상태:** 주의 | **심박 이상 감지:** 03:42

---

## 현황

- 심박수 110bpm으로 상승 (정상 범위 60-100)
- 혈압 148/92mmHg — 경계 고혈압
- 체온 37.8°C — 미열
- 산소포화도 96% — 정상 범위

\`\`\`xcon-chain-fixture
{
  "patient": { "name": "김OO", "age": 62, "gender": "M", "room": "3병실", "bed": "A" },
  "vitals": {
    "heartRate": 110, "hrStatus": "주의",
    "bp": "148/92", "bpStatus": "경계",
    "temp": 37.8, "tempStatus": "미열",
    "spo2": 96, "spo2Status": "정상"
  },
  "timeline": [
    { "time": "00:00", "hr": 72, "bp": "128/82", "temp": 36.8 },
    { "time": "01:00", "hr": 74, "bp": "130/84", "temp": 36.9 },
    { "time": "02:00", "hr": 78, "bp": "132/86", "temp": 37.1 },
    { "time": "03:00", "hr": 88, "bp": "138/88", "temp": 37.4 },
    { "time": "03:30", "hr": 102, "bp": "142/90", "temp": 37.6 },
    { "time": "03:42", "hr": 110, "bp": "148/92", "temp": 37.8 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Patient Vitals" 960x700
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#7f1d1d"
    border
      visible false
      radius 16
    title: label "3병실 김OO (M/62) — 바이탈 이상 감지" at 24 16 500 30
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "심박 110bpm ↑ | 혈압 148/92 | 체온 37.8°C | SpO₂ 96%" at 24 50 600 20
      color "#fca5a5"
      font
        size 13
        weight 600
    badge: label "주의" at 830 24 60 32
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
    k1l: label "심박수" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "110 bpm" at 16 32 140 28
      color "#ef4444"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "혈압" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "148/92" at 16 32 140 28
      color "#f59e0b"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "체온" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "37.8°C" at 16 32 140 28
      color "#f59e0b"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "산소포화도" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "96%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  hrChart: chart at 24 200 448 220
    chartType "line"
    chartData {"labels":["00:00","01:00","02:00","03:00","03:30","03:42"],"datasets":[{"label":"심박수 (bpm)","data":[72,74,78,88,102,110],"borderColor":"#ef4444","backgroundColor":"rgba(239,68,68,0.1)","fill":true,"tension":0.3},{"label":"정상 상한 (100)","data":[100,100,100,100,100,100],"borderColor":"#475569","borderDash":[5,5],"fill":false}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"심박수 추이","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"min":60,"max":120}}}
  bpChart: chart at 496 200 440 220
    chartType "line"
    chartData {"labels":["00:00","01:00","02:00","03:00","03:30","03:42"],"datasets":[{"label":"수축기 (mmHg)","data":[128,130,132,138,142,148],"borderColor":"#f59e0b","tension":0.3},{"label":"이완기","data":[82,84,86,88,90,92],"borderColor":"#60a5fa","tension":0.3},{"label":"경계 (140)","data":[140,140,140,140,140,140],"borderColor":"#475569","borderDash":[5,5],"fill":false}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"혈압 추이","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"min":70,"max":160}}}
  medGrid: spanGrid at 24 438 912 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":200,"cols":[{"width":120},{"width":120},{"width":140},{"width":140},{"width":140},{"width":140}],"rows":[{"height":34,"cells":[{"text":"시각","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"심박 (bpm)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"혈압 (mmHg)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"체온 (°C)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"SpO₂ (%)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"비고","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"00:00","foreColor":"#111827"},{"text":"72","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"128/82","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"36.8","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"97","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"02:00","foreColor":"#111827"},{"text":"78","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"132/86","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"37.1","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"97","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"미열 시작","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"03:00","foreColor":"#111827"},{"text":"88","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"138/88","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"37.4","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"96","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"상승 추세","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"03:42","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"110","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"148/92","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"37.8","foreColor":"#f59e0b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"96","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"당직의 알림","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
