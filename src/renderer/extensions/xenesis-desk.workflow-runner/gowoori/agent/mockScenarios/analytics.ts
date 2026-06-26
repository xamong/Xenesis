import type { MockScenario } from './types';

const ANALYTICS_PATTERN = /제품\s*분석|사용\s*분석|퍼널|리텐션|코호트|전환율|세그먼트|사용자\s*행동/i;

export const analyticsScenario: MockScenario = {
  id: 'analytics',
  label: '제품 분석',
  priority: 53,
  match: (prompt) => ANALYTICS_PATTERN.test(prompt),
  generate: () => createAnalyticsDashboard(),
};

function createAnalyticsDashboard(): string {
  return `# 제품 사용 분석

이번 주 신규 사용자는 늘었지만 고급 기능 도달률이 낮습니다. Treemap은 기능 사용 비중, Sunburst는 가입 후 행동 경로를 보여줍니다.

\`\`\`xcon-sketch
screen "Product Analytics" 1060x720
  backgroundColor "#f8fafc"
  header: panel at 24 20 1012 82
    backgroundColor "#172554"
    border
      visible false
      radius 16
    title: label "제품 사용 분석 대시보드" at 26 18 360 30
      color "#ffffff"
      font
        size 23
        weight 800
    subtitle: label "활성 사용자 48,200명 | 고급 기능 도달률 23% | 전환 병목: 초대 단계" at 26 50 620 20
      color "#bfdbfe"
      font
        size 13
        weight 700
  usageTree: dataViz at 24 124 316 250
    vizType "treemap"
    data [{"label":"Dashboard","value":42,"color":"#2563eb"},{"label":"Report","value":24,"color":"#14b8a6"},{"label":"Automation","value":14,"color":"#f97316"},{"label":"Export","value":10,"color":"#a855f7"},{"label":"Settings","value":10,"color":"#64748b"}]
  journeySunburst: dataViz at 364 124 316 250
    vizType "sunburst"
    data [{"label":"Signup","value":100,"color":"#2563eb"},{"label":"Invite","value":61,"color":"#14b8a6"},{"label":"First Report","value":44,"color":"#f97316"},{"label":"Automation","value":23,"color":"#a855f7"}]
  funnelChart: chart at 704 124 332 250
    chartType "bar"
    chartData {"labels":["방문","가입","초대","첫 보고서","자동화"],"datasets":[{"label":"사용자","data":[100,72,61,44,23],"backgroundColor":["#2563eb","#14b8a6","#f59e0b","#f97316","#dc2626"]}]}
  insightGrid: spanGrid at 24 404 1012 226
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":1012,"height":226,"cols":[{"width":190},{"width":160},{"width":160},{"width":260},{"width":180}],"rows":[{"height":34,"cells":[{"text":"세그먼트","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"활성률","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"도달률","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"병목","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"추천 실험","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":42,"cells":[{"text":"팀 플랜","foreColor":"#111827"},{"text":"68%","foreColor":"#166534","textAlign":"MiddleCenter"},{"text":"31%","foreColor":"#92400e","textAlign":"MiddleCenter"},{"text":"초대 전환","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"초대 템플릿","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":42,"cells":[{"text":"개인 플랜","foreColor":"#111827"},{"text":"44%","foreColor":"#92400e","textAlign":"MiddleCenter"},{"text":"12%","foreColor":"#dc2626","textAlign":"MiddleCenter"},{"text":"첫 보고서 생성","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"샘플 리포트","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":42,"cells":[{"text":"엔터프라이즈","foreColor":"#111827"},{"text":"81%","foreColor":"#166534","textAlign":"MiddleCenter"},{"text":"47%","foreColor":"#166534","textAlign":"MiddleCenter"},{"text":"자동화 승인","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"권한 프리셋","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
