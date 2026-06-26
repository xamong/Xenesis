import type { MockScenario } from './types';

const NOC_PATTERN = /관제|NOC|SOC|장애|서버\s*상태|CPU\s*\d|메모리\s*\d|알림|alert|incident|outage/i;

export const nocScenario: MockScenario = {
  id: 'noc',
  label: 'NOC 관제실',
  priority: 80,
  match: (prompt) => NOC_PATTERN.test(prompt),
  generate: () => createNocDashboard(),
};

function createNocDashboard(): string {
  return `# Server-03 긴급 장애 대시보드

**상태:** CRITICAL | **발생 시각:** 2026-06-20 03:12:00 | **영향 서비스:** 3

---

## 장애 요약

- **Server-03** CPU 95.2%, Memory 87.3% — OOM Kill로 payment-worker 프로세스 종료
- 영향 범위: API-Gateway 응답 지연, Auth-Service 간헐 실패, Payment-Service 처리 중단
- 최근 배포 build #4821 (02:47) 이후 증상 시작 — **롤백 권장**

\`\`\`xcon-chain-fixture
{
  "servers": [
    { "name": "Server-01", "cpu": 32, "memory": 45, "disk": 38, "status": "정상" },
    { "name": "Server-02", "cpu": 48, "memory": 52, "disk": 41, "status": "정상" },
    { "name": "Server-03", "cpu": 95, "memory": 87, "disk": 72, "status": "CRITICAL" },
    { "name": "Server-04", "cpu": 28, "memory": 39, "disk": 55, "status": "정상" },
    { "name": "Server-05", "cpu": 41, "memory": 58, "disk": 44, "status": "정상" }
  ],
  "threshold": { "cpu": 80, "memory": 80, "disk": 90, "responseMs": 500 },
  "incident": {
    "severity": "CRITICAL",
    "affectedServices": 3,
    "responseMs": 2340,
    "uptime": "99.2%"
  }
}
\`\`\`

\`\`\`xcon-chain as alertServer
= servers | filter(status != "정상") | first
\`\`\`

\`\`\`xcon-sketch
screen "NOC Emergency Dashboard" 960x720
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#7f1d1d"
    border
      visible false
      radius 16
    title: label "Server-03 CRITICAL — 긴급 장애 발생" at 24 16 500 30
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "CPU 95.2% | Memory 87.3% | OOM Kill: payment-worker | 03:12:00" at 24 50 600 20
      color "#fca5a5"
      font
        size 13
        weight 600
    badge: label "CRITICAL" at 800 24 100 32
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
    k1l: label "CPU" at 16 10 80 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "95.2%" at 16 32 120 28
      color "#ef4444"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "Memory" at 16 10 80 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "87.3%" at 16 32 120 28
      color "#f59e0b"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "응답시간" at 16 10 80 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "2,340ms" at 16 32 120 28
      color "#ef4444"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "영향 서비스" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "3개" at 16 32 120 28
      color "#f59e0b"
      font
        size 22
        weight 800
  resourceChart: chart at 24 200 440 200
    chartType "bar"
    chartData {"labels":["Server-01","Server-02","Server-03","Server-04","Server-05"],"datasets":[{"label":"CPU %","data":[32,48,95,28,41],"backgroundColor":["#22c55e","#22c55e","#ef4444","#22c55e","#22c55e"]},{"label":"Memory %","data":[45,52,87,39,58],"backgroundColor":["#86efac","#86efac","#f59e0b","#86efac","#86efac"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"서버 리소스 현황","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"max":100}}}
  serviceMap: networkDiagram at 488 200 448 200
    backgroundColor "#111827"
    nodeRadius 20
    primaryColor "#ef4444"
    nodeColor "#22c55e"
    accentColor "#f59e0b"
    linkColor "#475569"
    refLinkColor "#ef4444"
    textColor "#f8fafc"
    showLabels true
    showArrows true
    nodes [{"id":"lb","label":"LoadBalancer","x":60,"y":100,"color":"#22c55e"},{"id":"srv3","label":"Server-03","x":220,"y":100,"color":"#ef4444"},{"id":"api","label":"API-GW","x":140,"y":40,"color":"#f59e0b"},{"id":"auth","label":"Auth","x":140,"y":160,"color":"#f59e0b"},{"id":"pay","label":"Payment","x":340,"y":60,"color":"#ef4444"},{"id":"worker","label":"pay-worker","x":340,"y":160,"color":"#ef4444"},{"id":"db","label":"DB-Primary","x":420,"y":100,"color":"#22c55e"}]
    links [{"source":"lb","target":"srv3"},{"source":"srv3","target":"api"},{"source":"srv3","target":"auth"},{"source":"api","target":"pay"},{"source":"pay","target":"worker","type":"ref"},{"source":"pay","target":"db"}]
  timeline: spanGrid at 24 420 912 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":200,"cols":[{"width":130},{"width":100},{"width":220},{"width":220},{"width":220}],"rows":[{"height":34,"cells":[{"text":"시각","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"심각도","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"이벤트","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"영향","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"조치","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"03:12:00","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"CRITICAL","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"Server-03 CPU 95.2% 도달","foreColor":"#111827"},{"text":"API-GW 응답 2340ms 지연","foreColor":"#111827"},{"text":"스케일아웃 검토 시작","foreColor":"#111827"}]},{"height":38,"cells":[{"text":"03:12:34","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"ERROR","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"OOM Kill: payment-worker (PID 28834)","foreColor":"#111827"},{"text":"Payment 결제 처리 중단","foreColor":"#111827"},{"text":"프로세스 재시작 필요","foreColor":"#111827"}]},{"height":38,"cells":[{"text":"03:13:01","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"WARN","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"Memory 87.3% — swap 사용 시작","foreColor":"#111827"},{"text":"Auth-Service 간헐 타임아웃","foreColor":"#111827"},{"text":"메모리 프로파일링 시작","foreColor":"#111827"}]},{"height":38,"cells":[{"text":"03:14:22","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"INFO","backColor":"#dbeafe","foreColor":"#1d4ed8","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"최근 배포: build #4821 (02:47)","foreColor":"#111827"},{"text":"배포 이후 CPU 상승 패턴 확인","foreColor":"#111827"},{"text":"롤백 준비 — 당직자 승인 대기","foreColor":"#111827"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
  footer: panel at 24 640 912 56
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    footerText: label "Xenesis NOC — 자동 생성 관제 대시보드 | build #4821 롤백 권장 | 텔레그램 당직자 승인 대기 중" at 24 16 800 24
      color "#94a3b8"
      font
        size 12
        weight 600
\`\`\`
`;
}
