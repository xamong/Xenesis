import type { MockScenario } from './types';

const CS_PATTERN = /고객.*서비스|문의|상담|CS|티켓|컴플레인|VOC|콜센터/i;

export const customerServiceScenario: MockScenario = {
  id: 'cs',
  label: '고객 서비스',
  priority: 50,
  match: (prompt) => CS_PATTERN.test(prompt),
  generate: () => `# 고객 서비스 센터 대시보드

**오늘:** 문의 342건 | **해결률:** 87% | **평균 응답:** 4.2분 | **만족도:** 4.3/5

\`\`\`xcon-chain-fixture
{
  "today": { "total": 342, "resolved": 298, "pending": 44, "avgResponseMin": 4.2, "satisfaction": 4.3 },
  "byCategory": [
    { "category": "결제 오류", "count": 82, "resolved": 68, "avgMin": 6.1 },
    { "category": "배송 문의", "count": 95, "resolved": 88, "avgMin": 3.2 },
    { "category": "환불 요청", "count": 48, "resolved": 35, "avgMin": 8.4 },
    { "category": "기능 문의", "count": 67, "resolved": 62, "avgMin": 2.8 },
    { "category": "기타", "count": 50, "resolved": 45, "avgMin": 3.5 }
  ],
  "hourly": [
    { "hour": "09시", "incoming": 42, "resolved": 38 },
    { "hour": "10시", "incoming": 58, "resolved": 52 },
    { "hour": "11시", "incoming": 65, "resolved": 58 },
    { "hour": "12시", "incoming": 38, "resolved": 35 },
    { "hour": "13시", "incoming": 52, "resolved": 48 },
    { "hour": "14시", "incoming": 87, "resolved": 67 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "CS Dashboard" 960x660
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "고객 서비스 센터 — 오늘 현황" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "문의 342건 | 해결 87% | 평균 응답 4.2분 | 만족도 4.3/5" at 28 48 600 20
      color "#94a3b8"
      font
        size 13
        weight 600
  kpi1: panel at 24 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k1l: label "총 문의" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "342건" at 16 32 120 28
      color "#60a5fa"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "해결률" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "87%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "평균 응답" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "4.2분" at 16 32 120 28
      color "#fbbf24"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "만족도" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "4.3/5" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  categoryChart: chart at 24 200 448 200
    chartType "bar"
    chartData {"labels":["결제 오류","배송 문의","환불 요청","기능 문의","기타"],"datasets":[{"label":"접수","data":[82,95,48,67,50],"backgroundColor":"#3b82f6"},{"label":"해결","data":[68,88,35,62,45],"backgroundColor":"#22c55e"}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"카테고리별 문의 현황","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  hourlyChart: chart at 496 200 440 200
    chartType "line"
    chartData {"labels":["09시","10시","11시","12시","13시","14시"],"datasets":[{"label":"접수","data":[42,58,65,38,52,87],"borderColor":"#3b82f6","tension":0.3},{"label":"해결","data":[38,52,58,35,48,67],"borderColor":"#22c55e","tension":0.3}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"시간대별 문의 추이","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  csGrid: spanGrid at 24 418 912 180
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":180,"cols":[{"width":160},{"width":100},{"width":100},{"width":120},{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"카테고리","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"접수","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"해결","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"해결률","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"평균 응답","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"결제 오류","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"82","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"68","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"83%","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"6.1분","foreColor":"#f59e0b","textAlign":"MiddleCenter"},{"text":"주의","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"배송 문의","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"95","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"88","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"93%","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"3.2분","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"환불 요청","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"48","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"35","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"73%","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"8.4분","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"경고","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"기능 문의","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"67","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"62","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"93%","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"2.8분","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`,
};
