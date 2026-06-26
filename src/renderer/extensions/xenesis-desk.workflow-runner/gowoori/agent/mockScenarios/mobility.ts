import type { MockScenario } from './types';

const MOBILITY_PATTERN = /스마트\s*시티|교통|모빌리티|정체|버스|택시|도로|신호|환승/i;

export const mobilityScenario: MockScenario = {
  id: 'mobility',
  label: '스마트 시티 모빌리티',
  priority: 54,
  match: (prompt) => MOBILITY_PATTERN.test(prompt),
  generate: () => createMobilityDashboard(),
};

function createMobilityDashboard(): string {
  return `# 스마트 시티 교통 관제

강남대로와 테헤란로 축의 평균 속도가 낮아지고 있습니다. 지도 레이어는 정체 구간 polyline, 교차로 heatmap, 주요 정류장 마커를 함께 보여줍니다.

\`\`\`xcon-sketch
screen "Smart City Mobility" 1040x720
  backgroundColor "#0f172a"
  header: panel at 24 20 992 82
    backgroundColor "#111827"
    border
      visible false
      radius 16
    title: label "스마트 시티 교통 관제" at 26 18 360 30
      color "#ffffff"
      font
        size 23
        weight 800
    subtitle: label "강남대로 정체 18분 증가 | 버스 정시율 87% | 긴급 우회 2건" at 26 50 600 20
      color "#bae6fd"
      font
        size 13
        weight 700
  mobilityMap: map at 24 122 612 322
    latitude 37.501
    longitude 127.035
    zoom 13
    provider "leaflet"
    tileLayer "OpenStreetMap"
    attribution "(C) OpenStreetMap contributors"
    showControls true
    enableZoom true
    enablePan true
    clustering true
    markerIcons {"station":"#2563eb","incident":"#ef4444","dispatch":"#22c55e"}
    markers [{"lat":37.4979,"lng":127.0276,"title":"강남역 환승센터","status":"station"},{"lat":37.5046,"lng":127.0492,"title":"테헤란로 정체","status":"incident"},{"lat":37.5112,"lng":127.0597,"title":"우회 배차","status":"dispatch"}]
    heatmap [[37.4979,127.0276,0.65],[37.5012,127.039,0.88],[37.5056,127.0475,0.92],[37.5104,127.057,0.71]]
    polylines [{"label":"강남대로 정체","color":"#ef4444","weight":5,"points":[[37.4979,127.0276],[37.5012,127.039],[37.5056,127.0475]]},{"label":"우회 경로","color":"#22c55e","weight":4,"points":[[37.4945,127.0305],[37.5002,127.044],[37.5112,127.0597]]}]
  flowChart: chart at 660 122 356 210
    chartType "line"
    chartData {"labels":["08:00","09:00","10:00","11:00","12:00"],"datasets":[{"label":"평균 속도","data":[34,28,22,24,27],"borderColor":"#38bdf8","backgroundColor":"rgba(56,189,248,0.18)"},{"label":"혼잡도","data":[42,58,76,71,63],"borderColor":"#f97316","backgroundColor":"rgba(249,115,22,0.18)"}]}
  kpiPanel: panel at 660 352 356 92
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    kpiOne: label "정체 지수 76 / 100" at 18 16 160 24
      color "#f97316"
      font
        size 18
        weight 800
    kpiTwo: label "신호 최적화 후보 5개 교차로" at 18 50 240 20
      color "#dbeafe"
      font
        size 13
        weight 700
  routeGrid: spanGrid at 24 468 992 190
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":992,"height":190,"cols":[{"width":160},{"width":160},{"width":180},{"width":170},{"width":170}],"rows":[{"height":34,"cells":[{"text":"구간","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"평균 속도","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"조치","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"예상 완화","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"강남대로","foreColor":"#111827"},{"text":"22km/h","foreColor":"#dc2626","textAlign":"MiddleCenter"},{"text":"혼잡","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"신호 주기 조정","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"18분","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"테헤란로","foreColor":"#111827"},{"text":"28km/h","foreColor":"#f97316","textAlign":"MiddleCenter"},{"text":"주의","backColor":"#ffedd5","foreColor":"#9a3412","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"우회 안내","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"11분","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"봉은사로","foreColor":"#111827"},{"text":"42km/h","foreColor":"#16a34a","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"관찰","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"-","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
