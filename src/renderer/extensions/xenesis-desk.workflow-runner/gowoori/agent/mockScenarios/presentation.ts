import type { MockScenario } from './types';

const PRESENTATION_PATTERN = /발표|프레젠테이션|보고|요약|원페이저|one.?pager|리뷰|경영|월간|주간.*보고/i;

export const presentationScenario: MockScenario = {
  id: 'presentation',
  label: '프레젠테이션 / 원페이저',
  priority: 70,
  match: (prompt) => PRESENTATION_PATTERN.test(prompt),
  generate: () => createPresentationDashboard(),
};

function createPresentationDashboard(): string {
  return `# 월간 경영 리뷰 — 2026년 6월

**상태:** On Track | **건강 점수:** 87/100 (+4) | **핵심 액션:** 3건

---

## 핵심 수치

- **총 매출** ₩48.2억 — 목표 대비 +8.4%
- **순이익** ₩9.4억 — 영업이익률 19.5%
- **신규 계약** 127건, **갱신율** 84.3%
- **이탈률** 2.1% — 분기 최저

\`\`\`xcon-chain-fixture
{
  "kpi": {
    "revenue": "₩48.2억",
    "growth": "+8.4%",
    "nrr": "118%",
    "churn": "2.1%",
    "healthScore": 87,
    "healthDelta": "+4"
  },
  "monthly": [
    { "month": "1월", "revenue": 38.2, "profit": 6.8 },
    { "month": "2월", "revenue": 40.1, "profit": 7.2 },
    { "month": "3월", "revenue": 42.8, "profit": 8.1 },
    { "month": "4월", "revenue": 44.5, "profit": 8.6 },
    { "month": "5월", "revenue": 46.1, "profit": 8.9 },
    { "month": "6월", "revenue": 48.2, "profit": 9.4 }
  ],
  "actions": [
    { "task": "위험 고객 3곳 CS 연락", "owner": "CS팀 이수진", "due": "금요일", "status": "진행 중" },
    { "task": "Starter 2곳 연간 전환 제안", "owner": "영업 박지훈", "due": "다음 주", "status": "대기" },
    { "task": "Enterprise 5곳 확장 피치", "owner": "영업 김민준", "due": "이번 주", "status": "준비 중" }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Monthly Review" 960x660
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "월간 경영 리뷰 — 2026년 6월" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    statusBadge: label "On Track" at 810 28 90 24
      backgroundColor "#166534"
      color "#a7f3d0"
      align "center"
      border
        visible false
        radius 10
      font
        size 11
        weight 700
    sub: label "매출 ₩48.2억 (+8.4%) | NRR 118% | 이탈 2.1%" at 28 52 500 20
      color "#94a3b8"
      font
        size 13
        weight 600
  kpi1: panel at 24 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k1l: label "총 매출" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "₩48.2억" at 16 32 140 28
      color "#fbbf24"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "성장률" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "+8.4%" at 16 32 120 28
      color "#a7f3d0"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "NRR" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "118%" at 16 32 120 28
      color "#60a5fa"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "건강 점수" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "87/100" at 16 32 120 28
      color "#fbbf24"
      font
        size 22
        weight 800
  trendChart: chart at 24 200 448 200
    chartType "bar"
    chartData {"labels":["1월","2월","3월","4월","5월","6월"],"datasets":[{"label":"매출 (억원)","data":[38.2,40.1,42.8,44.5,46.1,48.2],"backgroundColor":"#2563eb"},{"label":"순이익","data":[6.8,7.2,8.1,8.6,8.9,9.4],"backgroundColor":"#22c55e"}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"월별 매출/순이익 추이 (억원)","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  costChart: chart at 496 200 440 200
    chartType "bar"
    chartData {"labels":["인건비","운영비","R&D","마케팅","순이익"],"datasets":[{"label":"금액 (억원)","data":[21.3,8.4,4.1,5.0,9.4],"backgroundColor":["#f59e0b","#ef4444","#8b5cf6","#06b6d4","#22c55e"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"비용 구조 (억원)","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  actionGrid: spanGrid at 24 418 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":320},{"width":180},{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"액션 아이템","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"담당","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"기한","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"위험 고객 3곳 CS 연락","foreColor":"#111827"},{"text":"CS팀 이수진","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"금요일","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"진행 중","backColor":"#dbeafe","foreColor":"#1d4ed8","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"Starter 2곳 연간 전환 제안","foreColor":"#111827"},{"text":"영업 박지훈","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"다음 주","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"대기","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"Enterprise 5곳 확장 피치","foreColor":"#111827"},{"text":"영업 김민준","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"이번 주","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"준비 중","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
  footer: panel at 24 616 912 28
    backgroundColor "transparent"
    border
      visible false
    footNote: label "Xenesis Desk — AI 자동 생성 경영 리뷰 | 데이터 변경 시 자동 갱신" at 16 4 800 20
      color "#475569"
      font
        size 11
        weight 500
\`\`\`
`;
}
