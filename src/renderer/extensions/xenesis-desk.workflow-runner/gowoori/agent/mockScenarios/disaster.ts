import type { MockScenario } from './types';

const DISASTER_PATTERN = /재난|태풍|대피|구조|긴급.*대응|지진|홍수|산불|재해/i;

export const disasterScenario: MockScenario = {
  id: 'disaster',
  label: '재난 대응',
  priority: 50,
  match: (prompt) => DISASTER_PATTERN.test(prompt),
  generate: () => `# 재난 대응 지휘본부 — 태풍 '나리' 접근

**상태:** 경계 | **대피소:** 12개 운영 | **대피 인원:** 1,847명

---

## 현황

- 태풍 '나리' 18시 수도권 상륙 예상, 최대 풍속 35m/s
- 대피소 12곳 운영 중, 3번 대피소 수용률 92% — 인근 분산 필요
- 구조대 8팀 투입, 미대응 신고 4건

\`\`\`xcon-chain-fixture
{
  "typhoon": { "name": "나리", "windSpeed": 35, "eta": "18:00", "category": "강" },
  "shelters": [
    { "id": 1, "name": "강남 체육관", "capacity": 300, "current": 245, "rate": 82 },
    { "id": 2, "name": "서초 복지관", "capacity": 200, "current": 168, "rate": 84 },
    { "id": 3, "name": "송파 문화센터", "capacity": 250, "current": 230, "rate": 92 },
    { "id": 4, "name": "강동 학교", "capacity": 400, "current": 280, "rate": 70 }
  ],
  "hourly": [
    { "hour": "09시", "evacuated": 320 },
    { "hour": "10시", "evacuated": 580 },
    { "hour": "11시", "evacuated": 920 },
    { "hour": "12시", "evacuated": 1340 },
    { "hour": "13시", "evacuated": 1650 },
    { "hour": "14시", "evacuated": 1847 }
  ]
}
\`\`\`

\`\`\`xcon-sketch
screen "Disaster Response" 960x700
  backgroundColor "#0f172a"
  header: panel at 24 16 912 80
    backgroundColor "#7f1d1d"
    border
      visible false
      radius 16
    title: label "재난 대응 — 태풍 나리 접근" at 24 16 500 30
      color "#ffffff"
      font
        size 22
        weight 800
    sub: label "18시 상륙 예상 | 풍속 35m/s | 대피소 12곳 | 대피 1,847명" at 24 50 600 20
      color "#fca5a5"
      font
        size 13
        weight 600
    badge: label "경계" at 830 24 60 32
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
    k1l: label "대피 인원" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k1v: label "1,847명" at 16 32 140 28
      color "#fbbf24"
      font
        size 22
        weight 800
  kpi2: panel at 256 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k2l: label "대피소" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k2v: label "12곳" at 16 32 120 28
      color "#60a5fa"
      font
        size 22
        weight 800
  kpi3: panel at 488 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k3l: label "구조대" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k3v: label "8팀" at 16 32 120 28
      color "#22c55e"
      font
        size 22
        weight 800
  kpi4: panel at 720 112 216 72
    backgroundColor "#1e293b"
    border
      visible false
      radius 12
    k4l: label "미대응 신고" at 16 10 100 18
      color "#94a3b8"
      font
        size 11
        weight 700
    k4v: label "4건" at 16 32 120 28
      color "#ef4444"
      font
        size 22
        weight 800
  shelterMap: map at 24 200 448 220
    latitude 37.5065
    longitude 127.053
    zoom 12
    provider "leaflet"
    tileLayer "OpenStreetMap"
    attribution "(C) OpenStreetMap contributors"
    markers [{"lat":37.4979,"lng":127.0276,"title":"강남 체육관 (82%)"},{"lat":37.4837,"lng":126.9990,"title":"서초 복지관 (84%)"},{"lat":37.5145,"lng":127.1050,"title":"송파 문화센터 (92%)"},{"lat":37.5301,"lng":127.1238,"title":"강동 학교 (70%)"}]
  evacueeChart: chart at 496 200 440 220
    chartType "line"
    chartData {"labels":["09시","10시","11시","12시","13시","14시"],"datasets":[{"label":"누적 대피 인원","data":[320,580,920,1340,1650,1847],"borderColor":"#f59e0b","backgroundColor":"rgba(245,158,11,0.1)","fill":true,"tension":0.3}]}
    chartOptions {"plugins":{"title":{"display":true,"text":"시간대별 대피 인원 추이","color":"#e2e8f0","font":{"size":14,"weight":"bold"}},"legend":{"labels":{"color":"#94a3b8"}}},"scales":{"x":{"ticks":{"color":"#94a3b8"}},"y":{"ticks":{"color":"#94a3b8"}}}}
  shelterGrid: spanGrid at 24 438 912 200
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":912,"height":200,"cols":[{"width":200},{"width":120},{"width":120},{"width":120},{"width":120},{"width":120}],"rows":[{"height":34,"cells":[{"text":"대피소","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"수용 가능","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"현재 인원","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"수용률","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"잔여","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f1f5f9","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"강남 체육관","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"300","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"245","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"82%","foreColor":"#f59e0b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"55","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"주의","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"서초 복지관","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"200","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"168","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"84%","foreColor":"#f59e0b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"32","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"주의","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"송파 문화센터","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"250","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"230","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"92%","foreColor":"#ef4444","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"20","foreColor":"#ef4444","textAlign":"MiddleCenter"},{"text":"포화 임박","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"강동 학교","foreColor":"#111827","font":"bold 9pt sans-serif"},{"text":"400","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"280","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"70%","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"120","foreColor":"#22c55e","textAlign":"MiddleCenter"},{"text":"여유","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`,
};
