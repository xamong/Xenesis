import type { MockScenario } from './types';
import { today } from './types';

const STARTUP_PATTERN = /오늘|할\s*일|우선순위|스타트업|TODO|뭐.*해야|대시보드.*만들|아침/i;

export const startupScenario: MockScenario = {
  id: 'startup',
  label: '스타트업 우선순위',
  priority: 55,
  match: (prompt) => STARTUP_PATTERN.test(prompt),
  generate: () => createStartupDashboard(),
};

function createStartupDashboard(): string {
  const date = today();
  return `# 오늘의 우선순위 대시보드

**${date}** | 긴급 3건 | 서버 정상 | 매출 ₩340만

---

## 요약

- **긴급:** Stripe webhook 오류로 결제 실패 고객 3건 발생
- **서버:** CPU 42%, 메모리 61% — 정상 범위
- **GitHub:** 미답변 이슈 5건, PR 대기 2건
- **매출:** 오늘 ₩340만 (어제 대비 −12%)

\`\`\`xcon-chain-fixture
{
  "date": "${date}",
  "urgent": 3,
  "server": { "cpu": 42, "memory": 61, "disk": 38, "status": "정상" },
  "todayRevenue": 340,
  "yesterdayRevenue": 386,
  "openIssues": 5,
  "pendingPRs": 2,
  "tasks": [
    { "priority": "긴급", "category": "결제", "task": "Stripe webhook 오류 — 고객 3건 결제 실패", "status": "즉시" },
    { "priority": "긴급", "category": "CS", "task": "결제 실패 고객 사과 메일 발송", "status": "즉시" },
    { "priority": "긴급", "category": "버그", "task": "webhook retry 로직 핫픽스", "status": "오전 중" },
    { "priority": "높음", "category": "개발", "task": "PR #142 코드 리뷰 (Auth 리팩토링)", "status": "오전" },
    { "priority": "높음", "category": "개발", "task": "PR #145 머지 후 스테이징 배포", "status": "오후" },
    { "priority": "보통", "category": "마케팅", "task": "이번 주 뉴스레터 초안 작성", "status": "오후" },
    { "priority": "보통", "category": "운영", "task": "AWS 비용 리포트 확인 (6월)", "status": "내일까지" },
    { "priority": "낮음", "category": "문서", "task": "API 문서 v2.3 업데이트", "status": "이번 주" }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Daily Priority Dashboard" 960x720
  backgroundColor "#f8fafc"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "오늘의 우선순위" at 28 16 300 28
      color "#ffffff"
      font
        size 22
        weight 800
    dateLabel: label "${date}" at 28 48 200 20
      color "#94a3b8"
      font
        size 13
        weight 600
    urgentBadge: label "긴급 3건" at 800 24 100 32
      backgroundColor "#dc2626"
      color "#ffffff"
      align "center"
      border
        visible false
        radius 14
      font
        size 12
        weight 800
  kpi1: panel at 24 112 216 80
    backgroundColor "#fee2e2"
    border
      visible false
      radius 14
    kpi1l: label "긴급 태스크" at 16 12 120 18
      color "#991b1b"
      font
        size 11
        weight 700
    kpi1v: label "3건" at 16 36 120 28
      color "#dc2626"
      font
        size 22
        weight 800
    kpi1d: label "결제 실패 관련" at 16 64 140 14
      color "#f87171"
      font
        size 10
        weight 600
  kpi2: panel at 256 112 216 80
    backgroundColor "#ecfdf5"
    border
      visible false
      radius 14
    kpi2l: label "서버 상태" at 16 12 100 18
      color "#065f46"
      font
        size 11
        weight 700
    kpi2v: label "정상" at 16 36 120 28
      color "#059669"
      font
        size 22
        weight 800
    kpi2d: label "CPU 42% / Mem 61%" at 16 64 160 14
      color "#34d399"
      font
        size 10
        weight 600
  kpi3: panel at 488 112 216 80
    backgroundColor "#eff6ff"
    border
      visible false
      radius 14
    kpi3l: label "GitHub" at 16 12 100 18
      color "#1e40af"
      font
        size 11
        weight 700
    kpi3v: label "이슈 5 / PR 2" at 16 36 160 28
      color "#1d4ed8"
      font
        size 18
        weight 800
    kpi3d: label "미답변 이슈 확인 필요" at 16 64 160 14
      color "#60a5fa"
      font
        size 10
        weight 600
  kpi4: panel at 720 112 216 80
    backgroundColor "#fff7ed"
    border
      visible false
      radius 14
    kpi4l: label "오늘 매출" at 16 12 100 18
      color "#9a3412"
      font
        size 11
        weight 700
    kpi4v: label "₩340만" at 16 36 120 28
      color "#c2410c"
      font
        size 22
        weight 800
    kpi4d: label "▼ 어제 대비 −12%" at 16 64 160 14
      color "#f97316"
      font
        size 10
        weight 600
  revenueChart: chart at 24 210 440 200
    chartType "line"
    chartData {"labels":["6/14","6/15","6/16","6/17","6/18","6/19","6/20"],"datasets":[{"label":"일매출 (만원)","data":[380,412,395,402,386,386,340],"borderColor":"#2563eb","backgroundColor":"rgba(37,99,235,0.1)","fill":true,"tension":0.3}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"일별 매출 추이 (7일, 만원)","font":{"size":14,"weight":"bold"}}}}
  serverChart: chart at 488 210 448 200
    chartType "bar"
    chartData {"labels":["CPU","Memory","Disk"],"datasets":[{"label":"사용률 (%)","data":[42,61,38],"backgroundColor":["#22c55e","#f59e0b","#22c55e"]},{"label":"임계치","data":[80,80,90],"backgroundColor":["#e2e8f0","#e2e8f0","#e2e8f0"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"서버 리소스 현황","font":{"size":14,"weight":"bold"}}}}
  taskGrid: spanGrid at 24 428 912 240
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":240,"cols":[{"width":80},{"width":100},{"width":420},{"width":100}],"rows":[{"height":32,"cells":[{"text":"우선순위","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"카테고리","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"태스크","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"기한","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"긴급","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"결제","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"Stripe webhook 오류 — 고객 3건 결제 실패","foreColor":"#111827"},{"text":"즉시","foreColor":"#dc2626","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"긴급","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"CS","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"결제 실패 고객 사과 메일 발송","foreColor":"#111827"},{"text":"즉시","foreColor":"#dc2626","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"긴급","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"버그","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"webhook retry 로직 핫픽스","foreColor":"#111827"},{"text":"오전 중","foreColor":"#dc2626","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"높음","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"개발","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"PR #142 코드 리뷰 (Auth 리팩토링)","foreColor":"#111827"},{"text":"오전","foreColor":"#92400e","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"높음","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"개발","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"PR #145 머지 후 스테이징 배포","foreColor":"#111827"},{"text":"오후","foreColor":"#92400e","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"보통","backColor":"#dbeafe","foreColor":"#1d4ed8","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"마케팅","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"이번 주 뉴스레터 초안 작성","foreColor":"#111827"},{"text":"오후","foreColor":"#475569","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
