import type { MockScenario } from './types';

const RETAIL_PATTERN = /리테일|매장|상권|재고|POS|매출\s*매장|점포|프로모션/i;

export const retailScenario: MockScenario = {
  id: 'retail',
  label: '리테일 운영',
  priority: 49,
  match: (prompt) => RETAIL_PATTERN.test(prompt),
  generate: () => createRetailDashboard(),
};

function createRetailDashboard(): string {
  return `# 리테일 매장 운영

서울 핵심 상권의 매출은 양호하지만, 강남 2호점 재고 부족과 홍대점 대기열이 병목입니다. 지도는 클러스터링과 매장 상태 아이콘을 포함합니다.

\`\`\`xcon-sketch
screen "Retail Store Ops" 1040x700
  backgroundColor "#f8fafc"
  header: panel at 24 20 992 76
    backgroundColor "#312e81"
    border
      visible false
      radius 16
    title: label "리테일 매장 운영 현황" at 26 18 360 28
      color "#ffffff"
      font
        size 22
        weight 800
    subtitle: label "일 매출 2.84억 | 재고 경고 3개 | 대기열 증가 2개 매장" at 26 48 500 18
      color "#ddd6fe"
      font
        size 13
        weight 700
  storeMap: map at 24 120 480 280
    latitude 37.55
    longitude 126.99
    zoom 11
    provider "leaflet"
    tileLayer "OpenStreetMap"
    attribution "(C) OpenStreetMap contributors"
    showControls true
    enableZoom true
    enablePan true
    clustering true
    markerIcons {"good":"#22c55e","watch":"#f59e0b","risk":"#ef4444"}
    markers [{"lat":37.4979,"lng":127.0276,"title":"강남 1호점","status":"good"},{"lat":37.5013,"lng":127.0396,"title":"강남 2호점 재고 부족","status":"risk"},{"lat":37.5563,"lng":126.9236,"title":"홍대점 대기 증가","status":"watch"},{"lat":37.5665,"lng":126.978,"title":"시청점","status":"good"},{"lat":37.5219,"lng":127.0228,"title":"압구정점","status":"good"}]
  salesChart: chart at 528 120 488 280
    chartType "bar"
    chartData {"labels":["강남1","강남2","홍대","시청","압구정"],"datasets":[{"label":"매출(백만)","data":[68,54,61,47,54],"backgroundColor":["#22c55e","#f59e0b","#f97316","#3b82f6","#14b8a6"]},{"label":"대기열","data":[12,21,34,8,10],"backgroundColor":"#a855f7"}]}
  storeGrid: spanGrid at 24 424 992 194
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":992,"height":194,"cols":[{"width":150},{"width":140},{"width":160},{"width":180},{"width":180}],"rows":[{"height":34,"cells":[{"text":"매장","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"매출","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"대기","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"재고","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"조치","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"강남 2호점","foreColor":"#111827"},{"text":"54백만","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"21명","foreColor":"#92400e","textAlign":"MiddleCenter"},{"text":"부족","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"긴급 보충","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"홍대점","foreColor":"#111827"},{"text":"61백만","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"34명","foreColor":"#dc2626","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"캐셔 증원","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"시청점","foreColor":"#111827"},{"text":"47백만","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"8명","foreColor":"#166534","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"유지","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
