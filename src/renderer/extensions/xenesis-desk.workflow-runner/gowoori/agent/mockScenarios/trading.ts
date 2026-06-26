import type { MockScenario } from './types';

const TRADING_PATTERN = /주식|포트폴리오|종목|트레이딩|매수|매도|투자|수익률|시장|코스피/i;

export const tradingScenario: MockScenario = {
  id: 'trading',
  label: '트레이딩 데스크',
  priority: 50,
  match: (prompt) => TRADING_PATTERN.test(prompt),
  generate: () => createTradingDashboard(),
};

function createTradingDashboard(): string {
  return `# 포트폴리오 현황 — 실시간

**총 평가액:** ₩8.42억 | **일간 수익:** +1.8% | **YTD:** +14.2%

---

## 요약

- 해외 시장 급변동 — 아시아 지수 전반 하락
- 포트폴리오 내 반도체 섹터 노출도 높음 (38%)
- 삼성전자 -2.1%, SK하이닉스 -3.4% → 헤지 검토 필요

\`\`\`xcon-chain-fixture
{
  "portfolio": { "value": 84200, "dailyReturn": 1.8, "ytd": 14.2 },
  "holdings": [
    { "name": "삼성전자", "weight": 22, "return": -2.1, "value": 18524 },
    { "name": "SK하이닉스", "weight": 16, "return": -3.4, "value": 13472 },
    { "name": "네이버", "weight": 12, "return": 0.8, "value": 10104 },
    { "name": "카카오", "weight": 10, "return": 1.2, "value": 8420 },
    { "name": "현대차", "weight": 8, "return": 0.5, "value": 6736 },
    { "name": "기타", "weight": 32, "return": 1.4, "value": 26944 }
  ],
  "sectorExposure": [
    { "sector": "반도체", "weight": 38 },
    { "sector": "인터넷", "weight": 22 },
    { "sector": "자동차", "weight": 12 },
    { "sector": "금융", "weight": 10 },
    { "sector": "기타", "weight": 18 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Trading Desk" 960x680
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#111827"
    border
      visible false
      radius 18
    title: label "포트폴리오 현황 — 실시간" at 28 16 400 28
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "총 ₩8.42억 | 일간 +1.8% | YTD +14.2% | 반도체 노출 38%" at 28 48 600 20
      color "#94a3b8"
      font
        size 13
        weight 600
    badge: label "+1.8%" at 830 28 60 24
      backgroundColor "#166534"
      color "#a7f3d0"
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
    k1l: label "총 평가액" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "₩8.42억" at 16 32 140 28
      color "#fbbf24"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "일간 수익" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "+1.8%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "YTD 수익" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "+14.2%" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "반도체 노출" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "38%" at 16 32 120 28
      color "#f59e0b"
      font
        size 22
        weight 800
  sectorChart: chart at 24 200 448 200
    chartType "bar"
    chartData {"labels":["반도체","인터넷","자동차","금융","기타"],"datasets":[{"label":"비중 (%)","data":[38,22,12,10,18],"backgroundColor":["#ef4444","#3b82f6","#22c55e","#f59e0b","#94a3b8"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"섹터별 포트폴리오 비중","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"display":false}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"},"max":50}}}
  returnChart: chart at 496 200 440 200
    chartType "bar"
    chartData {"labels":["삼성전자","SK하이닉스","네이버","카카오","현대차","기타"],"datasets":[{"label":"일간 수익률 (%)","data":[-2.1,-3.4,0.8,1.2,0.5,1.4],"backgroundColor":["#ef4444","#ef4444","#22c55e","#22c55e","#22c55e","#22c55e"]}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"종목별 일간 수익률","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"display":false}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  holdingsGrid: spanGrid at 24 418 912 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":200,"cols":[{"width":160},{"width":120},{"width":140},{"width":140},{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"종목","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"비중","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"평가액 (만원)","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"일간 수익률","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"섹터","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"신호","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"삼성전자","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"22%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"18,524","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"-2.1%","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"반도체","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"주의","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"SK하이닉스","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"16%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"13,472","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"-3.4%","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"반도체","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"경고","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"네이버","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"12%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"10,104","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+0.8%","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"인터넷","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":34,"cells":[{"text":"카카오","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"10%","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"8,420","foreColor":"#111827","textAlign":"MiddleRight"},{"text":"+1.2%","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"인터넷","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"정상","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
