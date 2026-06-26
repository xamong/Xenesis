import type { MockScenario } from './types';

const ENERGY_PATTERN = /에너지|전력|그리드|발전|송전|변전|전압|수요|정전/i;

export const energyScenario: MockScenario = {
  id: 'energy',
  label: '에너지 그리드',
  priority: 52,
  match: (prompt) => ENERGY_PATTERN.test(prompt),
  generate: () => createEnergyDashboard(),
};

function createEnergyDashboard(): string {
  return `# 에너지 그리드 관제

수도권 전력 수요가 예측보다 6.4% 높습니다. NetworkDiagram은 발전-변전-수요 노드, 지도는 송전선 polyline과 위험 권역 polygon을 보여줍니다.

\`\`\`xcon-sketch
screen "Energy Grid Control" 1060x720
  backgroundColor "#07111f"
  header: panel at 24 20 1012 76
    backgroundColor "#064e3b"
    border
      visible false
      radius 16
    title: label "에너지 그리드 관제" at 26 18 300 28
      color "#ffffff"
      font
        size 22
        weight 800
    subtitle: label "수요 +6.4% | 예비율 9.8% | 변전소 온도 경보 2건" at 26 48 500 18
      color "#bbf7d0"
      font
        size 13
        weight 700
  gridNetwork: networkDiagram at 24 120 480 250
    nodes [{"id":"plantA","label":"발전 A","status":"ok"},{"id":"plantB","label":"발전 B","status":"ok"},{"id":"sub1","label":"동서울 변전","status":"warning"},{"id":"sub2","label":"서인천 변전","status":"ok"},{"id":"load","label":"수도권 수요","status":"danger"}]
    links [{"source":"plantA","target":"sub1","label":"345kV"},{"source":"plantB","target":"sub2","label":"345kV"},{"source":"sub1","target":"load","label":"72%"},{"source":"sub2","target":"load","label":"61%"}]
  gridMap: map at 528 120 508 250
    latitude 37.56
    longitude 127.08
    zoom 9
    provider "leaflet"
    tileLayer "OpenStreetMap"
    attribution "(C) OpenStreetMap contributors"
    markers [{"lat":37.62,"lng":127.12,"title":"동서울 변전소 경보"},{"lat":37.47,"lng":126.68,"title":"서인천 변전소 정상"},{"lat":37.55,"lng":127.02,"title":"수요 집중 권역"}]
    polylines [{"label":"345kV 북부 송전선","color":"#22c55e","weight":4,"points":[[37.72,127.2],[37.62,127.12],[37.55,127.02]]},{"label":"345kV 서부 송전선","color":"#38bdf8","weight":4,"points":[[37.47,126.68],[37.52,126.88],[37.55,127.02]]}]
    polygons [{"label":"부하 감시 권역","color":"#f97316","fillColor":"rgba(249,115,22,0.18)","points":[[37.44,126.9],[37.68,126.96],[37.65,127.2],[37.42,127.14]]}]
  demandChart: chart at 24 396 480 190
    chartType "line"
    chartData {"labels":["09시","10시","11시","12시","13시","14시"],"datasets":[{"label":"실수요","data":[81,84,89,94,96,95],"borderColor":"#f97316","backgroundColor":"rgba(249,115,22,0.18)"},{"label":"예측","data":[80,82,84,88,90,89],"borderColor":"#38bdf8","backgroundColor":"rgba(56,189,248,0.18)"}]}
  actionGrid: spanGrid at 528 396 508 190
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":508,"height":190,"cols":[{"width":150},{"width":120},{"width":120},{"width":110}],"rows":[{"height":34,"cells":[{"text":"자산","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"부하","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"조치","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"동서울 변전","foreColor":"#111827"},{"text":"경보","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"72%","foreColor":"#f97316","textAlign":"MiddleCenter"},{"text":"냉각 강화","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"서인천 변전","foreColor":"#111827"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"61%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"유지","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"수도권 수요","foreColor":"#111827"},{"text":"주의","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"+6.4%","foreColor":"#dc2626","textAlign":"MiddleCenter"},{"text":"DR 대기","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
