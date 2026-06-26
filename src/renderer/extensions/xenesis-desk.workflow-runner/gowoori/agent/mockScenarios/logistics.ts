import type { MockScenario } from './types';

const LOGISTICS_PATTERN = /물류|배송|배달|트럭|경로|택배|운송|창고|입출고/i;

export const logisticsScenario: MockScenario = {
  id: 'logistics',
  label: '물류 센터',
  priority: 50,
  match: (prompt) => LOGISTICS_PATTERN.test(prompt),
  generate: () => createLogisticsDashboard(),
};

function createLogisticsDashboard(): string {
  return `# 물류 센터 관제 대시보드

**상태:** 폭설 경보 | **지연 배송:** 142건 | **가동 차량:** 48/52대

---

## 현황 요약

- 서울 권역 폭설로 배송 지연 142건 발생
- 대체 경로 3건 적용 중, 고객 안내 발송 완료 87%
- 인천 물류센터 정상 가동, 부산 센터 출고 지연

\`\`\`xcon-chain-fixture
{
  "summary": { "delayed": 142, "vehicles": 48, "total": 52, "altRoutes": 3, "notified": 87 },
  "regions": [
    { "name": "서울", "delayed": 82, "total": 310, "status": "경보" },
    { "name": "경기", "delayed": 34, "total": 280, "status": "주의" },
    { "name": "인천", "delayed": 12, "total": 150, "status": "정상" },
    { "name": "부산", "delayed": 14, "total": 200, "status": "지연" }
  ],
  "hourly": [
    { "hour": "06시", "onTime": 45, "delayed": 8 },
    { "hour": "08시", "onTime": 62, "delayed": 22 },
    { "hour": "10시", "onTime": 58, "delayed": 38 },
    { "hour": "12시", "onTime": 41, "delayed": 52 },
    { "hour": "14시", "onTime": 35, "delayed": 22 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Logistics Dashboard" 960x700
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#92400e"
    border
      visible false
      radius 16
    title: label "물류 센터 관제 — 폭설 경보" at 24 16 500 30
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "서울 권역 배송 지연 142건 | 대체 경로 3건 | 고객 안내 87%" at 24 50 600 20
      color "#fed7aa"
      font
        size 13
        weight 600
    badge: label "폭설 경보" at 790 24 110 32
      backgroundColor "#dc2626"
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
    k1l: label "지연 배송" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "142건" at 16 32 120 28
      color "#ef4444"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "가동 차량" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "48 / 52" at 16 32 120 28
      color "#f59e0b"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "대체 경로" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "3건" at 16 32 120 28
      color "#60a5fa"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "고객 안내" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "87%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  mapPanel: map at 24 200 448 220
    latitude 37.5665
    longitude 126.978
    zoom 10
    provider "leaflet"
    tileLayer "OpenStreetMap"
    attribution "(C) OpenStreetMap contributors"
    markers [{"lat":37.5665,"lng":126.978,"title":"서울 (지연 82건)"},{"lat":37.4563,"lng":126.7052,"title":"인천 (정상)"},{"lat":35.1796,"lng":129.0756,"title":"부산 (지연 14건)"},{"lat":37.2636,"lng":127.0286,"title":"수원 (주의)"}]
  hourlyChart: chart at 496 200 440 220
    chartType "bar"
    chartData {"labels":["06시","08시","10시","12시","14시"],"datasets":[{"label":"정시 배송","data":[45,62,58,41,35],"backgroundColor":"#22c55e"},{"label":"지연","data":[8,22,38,52,22],"backgroundColor":"#ef4444"}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"시간대별 배송 현황","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"stacked":true,"ticks":{"color":"#94a3b8"}},"y":{"stacked":true,"ticks":{"color":"#94a3b8"}}}}
  regionGrid: spanGrid at 24 438 912 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":200,"cols":[{"width":150},{"width":150},{"width":150},{"width":150},{"width":150}],"rows":[{"height":34,"cells":[{"text":"권역","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"총 배송","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"지연","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"지연율","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"서울","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"310건","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"82건","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"26.5%","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"경보","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"경기","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"280건","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"34건","foreColor":"#f59e0b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"12.1%","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"주의","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"인천","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"150건","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"12건","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"8.0%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"부산","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"200건","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"14건","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"7.0%","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"지연","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
