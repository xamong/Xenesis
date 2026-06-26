import type { MockScenario } from './types';

const TEAM_PATTERN = /팀\s*(현황|상태|보고)|인력|프로젝트.*진행|스프린트|팀원|부서/i;

export const teamScenario: MockScenario = {
  id: 'team',
  label: '팀 현황',
  priority: 72,
  match: (prompt) => TEAM_PATTERN.test(prompt),
  generate: () => createTeamDashboard(),
};

function createTeamDashboard(): string {
  return `# 팀 현황 대시보드 — 2026년 6월

**전체:** 28명 | **가용률:** 92% | **진행 프로젝트:** 9개 | **리스크:** 3건

\`\`\`xcon-chain-fixture
{
  "total": 28,
  "availability": 92,
  "projects": 9,
  "risks": 3,
  "completedThisWeek": 24,
  "targetThisWeek": 22
}
\`\`\`

\`\`\`xcon-sketch
screen "Team Dashboard" 960x660
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "팀 현황 — 2026년 6월" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "28명 | 가용률 92% | 프로젝트 9개 | 이번 주 완료 24건" at 28 48 600 20
      color "#94a3b8"
      font
        size 13
        weight 600
    badge: label "HEALTHY" at 800 28 90 24
      backgroundColor "#166534"
      color "#a7f3d0"
      align "center"
      border
        visible false
        radius 10
      font
        size 11
        weight 700
  kpi1: panel at 24 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k1l: label "전체 인원" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "28명" at 16 32 120 28
      color "#60a5fa"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "가용률" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "92%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "진행 프로젝트" at 16 10 120 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "9개" at 16 32 120 28
      color "#60a5fa"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "리스크 태스크" at 16 10 120 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "3건" at 16 32 120 28
      color "#f59e0b"
      font
        size 22
        weight 800
  progressChart: chart at 24 200 448 200
    chartType "bar"
    chartData {"labels":["개발","디자인","영업","운영"],"datasets":[{"label":"완료","data":[12,5,4,3],"backgroundColor":"#22c55e"},{"label":"진행 중","data":[4,2,5,2],"backgroundColor":"#3b82f6"},{"label":"지연","data":[1,0,2,0],"backgroundColor":"#ef4444"}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"팀별 태스크 현황","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"stacked":true,"ticks":{"color":"#94a3b8"}},"y":{"stacked":true,"ticks":{"color":"#94a3b8"}}}}
  weeklyChart: chart at 496 200 440 200
    chartType "line"
    chartData {"labels":["1주차","2주차","3주차","4주차"],"datasets":[{"label":"완료 태스크","data":[18,22,20,24],"borderColor":"#22c55e","tension":0.3},{"label":"목표","data":[20,20,22,22],"borderColor":"#475569","borderDash":[5,5]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"주간 완료 추이","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  teamGrid: spanGrid at 24 418 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":120},{"width":120},{"width":80},{"width":120},{"width":120},{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"팀","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"리드","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"인원","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"프로젝트","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"완료","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"지연","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"개발","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"이민수","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"10명","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"3개","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"12","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"1","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"디자인","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"김하은","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"5명","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"2개","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"5","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"0","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"영업","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"박준서","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"8명","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"3개","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"4","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"2","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"주의","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"운영","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"최지은","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"5명","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"1개","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"3","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"0","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
