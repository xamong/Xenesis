import type { MockScenario } from './types';

const CICD_PATTERN = /파이프라인|CI\s*\/?\s*CD|CI\/CD|배포.*현황|빌드.*상태|깃.*액션|github.*action|deploy/i;

export const cicdScenario: MockScenario = {
  id: 'cicd',
  label: 'CI/CD 파이프라인',
  priority: 55,
  match: (prompt) => CICD_PATTERN.test(prompt),
  generate: () => `# CI/CD 파이프라인 현황

**최근 배포:** build #4821 | **성공률:** 94.2% | **평균 시간:** 8.4분

\`\`\`xcon-chain-fixture
{
  "latest": { "build": 4821, "status": "success", "duration": "7m 22s", "branch": "main" },
  "stats": { "successRate": 94.2, "avgDuration": 8.4, "deploysToday": 12 },
  "history": [
    { "build": 4821, "branch": "main", "status": "success", "duration": 442, "time": "14:32" },
    { "build": 4820, "branch": "feature/auth", "status": "success", "duration": 508, "time": "13:15" },
    { "build": 4819, "branch": "main", "status": "failed", "duration": 182, "time": "12:48" },
    { "build": 4818, "branch": "hotfix/pay", "status": "success", "duration": 395, "time": "11:30" },
    { "build": 4817, "branch": "main", "status": "success", "duration": 462, "time": "10:05" }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "CICD Dashboard" 960x660
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "CI/CD 파이프라인 현황" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "build #4821 성공 | 성공률 94.2% | 평균 8.4분 | 오늘 12회" at 28 48 600 20
      color "#94a3b8"
      font
        size 13
        weight 600
    badge: label "PASS" at 840 28 50 24
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
    k1l: label "성공률" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "94.2%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "평균 시간" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "8.4분" at 16 32 120 28
      color "#fbbf24"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "오늘 배포" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "12회" at 16 32 120 28
      color "#60a5fa"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "최근 빌드" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "#4821" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  pipelineMap: networkDiagram at 24 200 448 200
    backgroundColor "#111827"
    nodeRadius 20
    primaryColor "#2563eb"
    nodeColor "#22c55e"
    accentColor "#f59e0b"
    linkColor "#475569"
    textColor "#f8fafc"
    showLabels true
    showArrows true
    nodes [{"id":"push","label":"Push","x":40,"y":100,"color":"#94a3b8"},{"id":"lint","label":"Lint","x":130,"y":60,"color":"#22c55e"},{"id":"test","label":"Test","x":130,"y":140,"color":"#22c55e"},{"id":"build","label":"Build","x":240,"y":100,"color":"#22c55e"},{"id":"stage","label":"Staging","x":340,"y":100,"color":"#f59e0b"},{"id":"prod","label":"Production","x":430,"y":100,"color":"#22c55e"}]
    links [{"source":"push","target":"lint"},{"source":"push","target":"test"},{"source":"lint","target":"build"},{"source":"test","target":"build"},{"source":"build","target":"stage"},{"source":"stage","target":"prod"}]
  durationChart: chart at 496 200 440 200
    chartType "bar"
    chartData {"labels":["#4817","#4818","#4819","#4820","#4821"],"datasets":[{"label":"소요 시간 (초)","data":[462,395,182,508,442],"backgroundColor":["#22c55e","#22c55e","#ef4444","#22c55e","#22c55e"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"최근 빌드 소요 시간","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"display":false}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  buildGrid: spanGrid at 24 418 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":100},{"width":180},{"width":120},{"width":120},{"width":120},{"width":160}],"rows":[{"height":34,"cells":[{"text":"빌드","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"브랜치","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"시각","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"소요","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"커밋","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"#4821","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"main","foreColor":"#111827"},{"text":"14:32","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"7m 22s","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"성공","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"fix: payment retry","foreColor":"#475569"}]},{"height":36,"cells":[{"text":"#4820","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"feature/auth","foreColor":"#111827"},{"text":"13:15","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"8m 28s","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"성공","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"feat: OAuth2 flow","foreColor":"#475569"}]},{"height":36,"cells":[{"text":"#4819","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"main","foreColor":"#111827"},{"text":"12:48","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"3m 02s","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"실패","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"test: snapshot fail","foreColor":"#ef4444"}]},{"height":36,"cells":[{"text":"#4818","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"hotfix/pay","foreColor":"#111827"},{"text":"11:30","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"6m 35s","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"성공","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"fix: amount calc","foreColor":"#475569"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`,
};
