import type { MockScenario } from './types';

const RELEASE_PATTERN = /릴리스|버전|변경.*사항|changelog|release.*note|배포.*노트/i;

export const releaseScenario: MockScenario = {
  id: 'release',
  label: '릴리스 노트',
  priority: 50,
  match: (prompt) => RELEASE_PATTERN.test(prompt),
  generate: () => `# 릴리스 노트 — v2.5.0

**릴리스:** 2026-06-20 | **커밋:** 47개 | **PR:** 12개 | **기여자:** 8명

---

## 변경 요약

- **신기능** 4건: OAuth2 로그인, 대시보드 공유, 알림 규칙, 일괄 내보내기
- **개선** 6건: 성능 최적화, UI 개선, API 응답 속도
- **버그 수정** 5건: 결제 오류, 세션 만료, 캐시 무효화
- **브레이킹** 1건: API v1 엔드포인트 제거

\`\`\`xcon-chain-fixture
{
  "version": "2.5.0",
  "date": "2026-06-20",
  "commits": 47,
  "prs": 12,
  "contributors": 8,
  "categories": [
    { "type": "신기능", "count": 4, "color": "#22c55e" },
    { "type": "개선", "count": 6, "color": "#3b82f6" },
    { "type": "버그 수정", "count": 5, "color": "#f59e0b" },
    { "type": "브레이킹", "count": 1, "color": "#ef4444" }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Release Notes" 960x660
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "릴리스 노트 — v2.5.0" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "2026-06-20 | 커밋 47개 | PR 12개 | 기여자 8명" at 28 48 500 20
      color "#94a3b8"
      font
        size 13
        weight 600
    badge: label "v2.5.0" at 820 28 80 24
      backgroundColor "#2563eb"
      color "#ffffff"
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
    k1l: label "신기능" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "4건" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "개선" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "6건" at 16 32 120 28
      color "#3b82f6"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "버그 수정" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "5건" at 16 32 120 28
      color "#f59e0b"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "브레이킹" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "1건" at 16 32 120 28
      color "#ef4444"
      font
        size 22
        weight 800
  categoryChart: chart at 24 200 448 200
    chartType "bar"
    chartData {"labels":["신기능","개선","버그 수정","브레이킹"],"datasets":[{"label":"건수","data":[4,6,5,1],"backgroundColor":["#22c55e","#3b82f6","#f59e0b","#ef4444"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"카테고리별 변경 사항","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"display":false}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  contributorChart: chart at 496 200 440 200
    chartType "bar"
    chartData {"labels":["김민준","이서연","박지훈","최유나","정도현","한소영","오재석","윤지아"],"datasets":[{"label":"커밋 수","data":[12,8,7,5,5,4,3,3],"backgroundColor":"#8b5cf6"}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"기여자별 커밋","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"display":false}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  changelogGrid: spanGrid at 24 418 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":100},{"width":340},{"width":120},{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"유형","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"내용","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"PR","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"담당","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"영향","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"신기능","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"OAuth2 소셜 로그인 (Google, GitHub)","foreColor":"#111827"},{"text":"#142","foreColor":"#3b82f6","textAlign":"MiddleCenter"},{"text":"김민준","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"높음","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"신기능","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"대시보드 공유 링크 생성 및 만료 설정","foreColor":"#111827"},{"text":"#145","foreColor":"#3b82f6","textAlign":"MiddleCenter"},{"text":"이서연","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"보통","backColor":"#dbeafe","foreColor":"#1d4ed8","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"버그수정","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"결제 webhook 재시도 로직 누락 수정","foreColor":"#111827"},{"text":"#148","foreColor":"#3b82f6","textAlign":"MiddleCenter"},{"text":"박지훈","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"긴급","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"브레이킹","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"API v1 엔드포인트 제거 (/api/v1/*)","foreColor":"#ef4444","font":"bold 9pt sans-serif"},{"text":"#150","foreColor":"#3b82f6","textAlign":"MiddleCenter"},{"text":"정도현","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"높음","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`,
};
