import type { MockScenario } from './types';

const EDUCATION_PATTERN = /광합성|학습|수업|실험|파라미터|교과|공부|튜토리얼|교육|선생|학생/i;

export const educationScenario: MockScenario = {
  id: 'education',
  label: '교육 / 학습',
  priority: 60,
  match: (prompt) => EDUCATION_PATTERN.test(prompt),
  generate: () => createEducationDashboard(),
};

function createEducationDashboard(): string {
  return `# 광합성 과정 — 인터랙티브 학습 자료

CO₂ + H₂O → C₆H₁₂O₆ + O₂

---

## 개요

광합성은 엽록체에서 빛 에너지를 이용하여 이산화탄소와 물을 포도당과 산소로 전환하는 과정입니다.

- **반응식:** 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂
- **장소:** 엽록체 (틸라코이드 + 스트로마)
- **에너지원:** 태양 빛 (가시광선 400-700nm)

\`\`\`xcon-chain-fixture
{
  "co2Levels": [100, 200, 300, 400, 500, 600, 700, 800],
  "photoRate": [12, 24, 35, 42, 46, 48, 49, 49],
  "tempData": [
    { "temp": 10, "rate": 15 },
    { "temp": 15, "rate": 25 },
    { "temp": 20, "rate": 38 },
    { "temp": 25, "rate": 48 },
    { "temp": 30, "rate": 52 },
    { "temp": 35, "rate": 45 },
    { "temp": 40, "rate": 28 },
    { "temp": 45, "rate": 10 }
  ],
  "experiment": [
    { "condition": "대조군 (300ppm)", "co2": 300, "temp": 25, "light": 100, "rate": 42 },
    { "condition": "고CO₂ (600ppm)", "co2": 600, "temp": 25, "light": 100, "rate": 48 },
    { "condition": "저온 (15°C)", "co2": 300, "temp": 15, "light": 100, "rate": 25 },
    { "condition": "고온 (40°C)", "co2": 300, "temp": 40, "light": 100, "rate": 28 },
    { "condition": "저광 (30%)", "co2": 300, "temp": 25, "light": 30, "rate": 18 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Photosynthesis Lab" 960x720
  backgroundColor "#f0fdf4"
  header: panel at 24 16 912 80
    backgroundColor "#14532d"
    border
      visible false
      radius 18
    title: label "광합성 과정 — 인터랙티브 학습 자료" at 28 16 500 28
      color "#ffffff"
      font
        size 22
        weight 800
    formula: label "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂" at 28 48 400 22
      color "#86efac"
      font
        size 14
        weight 700
    levelBadge: label "고등 생물" at 820 28 80 24
      backgroundColor "#166534"
      color "#a7f3d0"
      align "center"
      border
        visible false
        radius 10
      font
        size 11
        weight 700
  reactionFlow: networkDiagram at 24 112 440 200
    backgroundColor "#ffffff"
    nodeRadius 22
    primaryColor "#16a34a"
    nodeColor "#84cc16"
    accentColor "#eab308"
    linkColor "#86efac"
    textColor "#14532d"
    showLabels true
    showArrows true
    nodes [{"id":"co2","label":"CO₂","x":50,"y":100,"color":"#94a3b8"},{"id":"h2o","label":"H₂O","x":50,"y":180,"color":"#3b82f6"},{"id":"light","label":"빛 에너지","x":180,"y":50,"color":"#eab308"},{"id":"chloro","label":"엽록체","x":220,"y":140,"color":"#16a34a"},{"id":"glucose","label":"포도당","x":380,"y":100,"color":"#f59e0b"},{"id":"o2","label":"O₂","x":380,"y":180,"color":"#06b6d4"}]
    links [{"source":"co2","target":"chloro"},{"source":"h2o","target":"chloro"},{"source":"light","target":"chloro"},{"source":"chloro","target":"glucose"},{"source":"chloro","target":"o2"}]
  co2Chart: chart at 488 112 448 200
    chartType "line"
    chartData {"labels":["100","200","300","400","500","600","700","800"],"datasets":[{"label":"광합성 속도 (μmol/m²/s)","data":[12,24,35,42,46,48,49,49],"borderColor":"#16a34a","backgroundColor":"rgba(22,163,106,0.1)","fill":true,"tension":0.4}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"CO₂ 농도 vs 광합성 속도","font":{"size":14,"weight":"bold"}}},"scales":{"x":{"title":{"display":true,"text":"CO₂ 농도 (ppm)"}},"y":{"title":{"display":true,"text":"속도 (μmol/m²/s)"}}}}
  tempChart: chart at 24 330 440 200
    chartType "line"
    chartData {"labels":["10","15","20","25","30","35","40","45"],"datasets":[{"label":"광합성 속도 (μmol/m²/s)","data":[15,25,38,48,52,45,28,10],"borderColor":"#ef4444","backgroundColor":"rgba(239,68,68,0.1)","fill":true,"tension":0.4}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"온도 vs 광합성 속도 (최적 30°C)","font":{"size":14,"weight":"bold"}}},"scales":{"x":{"title":{"display":true,"text":"온도 (°C)"}},"y":{"title":{"display":true,"text":"속도 (μmol/m²/s)"}}}}
  experimentGrid: spanGrid at 488 330 448 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":448,"height":200,"cols":[{"width":150},{"width":60},{"width":60},{"width":60},{"width":80}],"rows":[{"height":32,"cells":[{"text":"조건","backColor":"#14532d","foreColor":"#f0fdf4","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"CO₂","backColor":"#14532d","foreColor":"#f0fdf4","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"온도","backColor":"#14532d","foreColor":"#f0fdf4","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"광량","backColor":"#14532d","foreColor":"#f0fdf4","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"속도","backColor":"#14532d","foreColor":"#f0fdf4","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"대조군 (300ppm)","foreColor":"#111827"},{"text":"300","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"25°C","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"100%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"42","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"고CO₂ (600ppm)","foreColor":"#111827"},{"text":"600","foreColor":"#16a34a","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"25°C","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"100%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"48","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"저온 (15°C)","foreColor":"#111827"},{"text":"300","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"15°C","foreColor":"#3b82f6","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"100%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"25","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"고온 (40°C)","foreColor":"#111827"},{"text":"300","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"40°C","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"100%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"28","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"저광 (30%)","foreColor":"#111827"},{"text":"300","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"25°C","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"30%","foreColor":"#f59e0b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"18","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#d1fae5","leftColor":"#d1fae5","rightColor":"#d1fae5","bottomColor":"#d1fae5"},"fixed":{"row":1,"col":0}}
  insight: panel at 24 548 912 48
    backgroundColor "#ecfdf5"
    border
      visible true
      width 1
      color "#a7f3d0"
      radius 10
    insightText: label "관찰: CO₂ 포화점은 약 600ppm, 최적 온도는 30°C. fixture 값을 바꿔가며 실험해 보세요." at 20 12 860 24
      color "#065f46"
      font
        size 13
        weight 700
\`\`\`
`;
}
