import type { MockScenario } from './types';

const VIEWER_PATTERN =
  /xcon\s*viewer|xcon\s*뷰어|viewer\s*showcase|기능\s*쇼케이스|신규\s*기능|컴포넌트\s*쇼케이스|23종|시각\s*컴포넌트/i;

export const viewerScenario: MockScenario = {
  id: 'viewer',
  label: 'XCON Viewer 기능 쇼케이스',
  priority: 88,
  match: (prompt) => VIEWER_PATTERN.test(prompt),
  generate: () => createViewerShowcase(),
};

function createViewerShowcase(): string {
  return `# XCON Viewer 신규 기능 쇼케이스

이 데모는 XCON Viewer의 고급 렌더링 기능을 한 화면에서 확인하기 위한 쇼케이스입니다. 배너, QR, 진행률, 탭, 차트, D3 dataViz, 지도 레이어, 네트워크 다이어그램, SpanGrid를 함께 사용합니다.

\`\`\`xcon-sketch
screen "XCON Viewer Feature Showcase" 1180x820
  backgroundColor "#f8fafc"
  heroBanner: banner at 24 20 1132 100
    backgroundColor "#111827"
    border
      visible false
      radius 18
    heroTitle: label "XCON Viewer 신규 기능" at 28 18 360 30
      color "#ffffff"
      font
        size 24
        weight 800
    heroSub: label "문서형 UI에서 차트, 그리드, 지도, D3 시각화, QR, 상태 컨트롤을 함께 렌더링합니다." at 28 54 680 22
      color "#cbd5e1"
      font
        size 13
        weight 700
    heroBadge: badge "23+ visual components" at 920 30 170 26
      backgroundColor "#0ea5e9"
      color "#ffffff"
  navTabs: tabs at 24 140 430 44
    items ["Overview","Charts","Maps","Handoff"]
    active "Overview"
    backgroundColor "#ffffff"
    color "#0f172a"
  adoptionProgress: progressBar at 486 152 270 18
    value 78
    max 100
    color "#2563eb"
    backgroundColor "#dbeafe"
  qualityRating: rating at 796 142 170 36
    value 4.6
    max 5
    color "#f59e0b"
  liveSwitch: switch at 1010 146 96 32
    checked true
    label "Live"
  donutChart: chart at 24 210 260 220
    chartType "doughnut"
    chartData {"labels":["Chart","Grid","Map","QR"],"datasets":[{"label":"Usage","data":[34,28,24,14],"backgroundColor":["#2563eb","#14b8a6","#f59e0b","#8b5cf6"]}]}
  radarChart: chart at 304 210 260 220
    chartType "radar"
    chartData {"labels":["Safety","Density","Binding","Geo","Export"],"datasets":[{"label":"Readiness","data":[92,84,78,88,73],"borderColor":"#0ea5e9","backgroundColor":"rgba(14,165,233,0.22)"},{"label":"Demo depth","data":[76,90,83,95,68],"borderColor":"#a855f7","backgroundColor":"rgba(168,85,247,0.18)"}]}
  featureTree: dataViz at 584 210 260 220
    vizType "treemap"
    data [{"label":"Documents","value":32,"color":"#2563eb"},{"label":"Dashboards","value":26,"color":"#14b8a6"},{"label":"Maps","value":18,"color":"#f59e0b"},{"label":"Workflow","value":14,"color":"#8b5cf6"},{"label":"Handoff","value":10,"color":"#64748b"}]
  handoffCard: panel at 864 210 292 220
    backgroundColor "#ffffff"
    border
      visible true
      width 1
      color "#dbe4ee"
      radius 14
    handoffTitle: label "외부 공유" at 20 18 120 24
      color "#111827"
      font
        size 17
        weight 800
    handoffQr: qrCode at 20 54 116 116
      value "https://xconviewer.dev"
      foregroundColor "#111827"
      backgroundColor "#ffffff"
    handoffCopy: label "QR로 데모 문서를 공유하고, Viewer에서 안전하게 렌더링합니다." at 152 64 112 76
      color "#334155"
      font
        size 12
        weight 600
    handoffButton: button "Open demo" at 152 156 104 34
      backgroundColor "#2563eb"
      color "#ffffff"
      border
        visible false
        radius 16
  advancedMap: map at 24 462 430 230
    latitude 37.5665
    longitude 126.978
    zoom 12
    provider "leaflet"
    tileLayer "OpenStreetMap"
    attribution "(C) OpenStreetMap contributors"
    showControls true
    enableZoom true
    enablePan true
    clustering true
    markerIcons {"viewer":"#2563eb","workflow":"#14b8a6","alert":"#ef4444"}
    markers [{"lat":37.5665,"lng":126.978,"title":"Viewer hub","status":"viewer"},{"lat":37.5704,"lng":126.983,"title":"Workflow monitor","status":"workflow"},{"lat":37.561,"lng":126.99,"title":"Alert sample","status":"alert"}]
    heatmap [[37.5665,126.978,0.92],[37.5704,126.983,0.65],[37.561,126.99,0.74]]
    polylines [{"label":"render path","color":"#2563eb","weight":4,"points":[[37.5665,126.978],[37.5704,126.983],[37.561,126.99]]}]
    polygons [{"label":"demo zone","color":"#14b8a6","fillColor":"rgba(20,184,166,0.18)","points":[[37.558,126.973],[37.573,126.974],[37.575,126.994],[37.56,126.996]]}]
  flowNetwork: networkDiagram at 484 462 300 230
    nodes [{"id":"llm","label":"LLM","status":"ok"},{"id":"chain","label":"Chain","status":"ok"},{"id":"sketch","label":"SKETCH","status":"ok"},{"id":"viewer","label":"Viewer","status":"ok"},{"id":"workflow","label":"Workflow","status":"warning"}]
    links [{"source":"llm","target":"chain","label":"fixture"},{"source":"chain","target":"sketch","label":"alias"},{"source":"sketch","target":"viewer","label":"render"},{"source":"workflow","target":"chain","label":"update"}]
  featureGrid: spanGrid at 814 462 342 230
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":342,"height":230,"cols":[{"width":120},{"width":110},{"width":100}],"rows":[{"height":32,"cells":[{"text":"기능","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"컴포넌트","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"차트 분석","foreColor":"#111827"},{"text":"chart","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"READY","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"고급 지도","foreColor":"#111827"},{"text":"map","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"READY","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"D3 시각화","foreColor":"#111827"},{"text":"dataViz","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"READY","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"공유","foreColor":"#111827"},{"text":"qrCode","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"READY","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
