import type { MockScenario } from './types';

const CYBER_PATTERN = /보안|위협|침해|제로데이|취약점|공격|방화벽|SIEM|SOC|악성/i;

export const cyberScenario: MockScenario = {
  id: 'cyber',
  label: '사이버 보안',
  priority: 57,
  match: (prompt) => CYBER_PATTERN.test(prompt),
  generate: () => createCyberDashboard(),
};

function createCyberDashboard(): string {
  return `# 보안 위협 그래프

계정 탈취 징후가 API Gateway에서 발견되었습니다. NetworkDiagram은 서비스 의존성, forceGraph는 위협 전파 가능성을 시각화합니다.

\`\`\`xcon-sketch
screen "Cyber Threat Graph" 1040x720
  backgroundColor "#020617"
  header: panel at 24 20 992 76
    backgroundColor "#450a0a"
    border
      visible false
      radius 16
    title: label "보안 위협 그래프 — 계정 탈취 의심" at 26 18 430 28
      color "#ffffff"
      font
        size 22
        weight 800
    subtitle: label "위험도 HIGH | 영향 서비스 5개 | 차단 규칙 3개 배포 대기" at 26 48 520 18
      color "#fecaca"
      font
        size 13
        weight 700
  dependencyMap: networkDiagram at 24 118 470 250
    nodes [{"id":"edge","label":"Edge WAF","status":"ok"},{"id":"api","label":"API Gateway","status":"warning"},{"id":"auth","label":"Auth","status":"danger"},{"id":"billing","label":"Billing","status":"warning"},{"id":"storage","label":"Object Store","status":"ok"}]
    links [{"source":"edge","target":"api","label":"443"},{"source":"api","target":"auth","label":"JWT"},{"source":"api","target":"billing","label":"orders"},{"source":"billing","target":"storage","label":"invoice"}]
  threatForce: dataViz at 520 118 496 250
    vizType "forceGraph"
    data {"nodes":[{"id":"phishing","label":"Phishing","value":28,"color":"#ef4444"},{"id":"token","label":"Token reuse","value":22,"color":"#f97316"},{"id":"api","label":"API Gateway","value":35,"color":"#eab308"},{"id":"auth","label":"Auth","value":31,"color":"#ef4444"},{"id":"mfa","label":"MFA bypass","value":12,"color":"#64748b"}],"links":[{"source":"phishing","target":"token","value":3},{"source":"token","target":"api","value":5},{"source":"api","target":"auth","value":4},{"source":"mfa","target":"auth","value":2}]}
  eventChart: chart at 24 392 470 190
    chartType "line"
    chartData {"labels":["10:00","10:15","10:30","10:45","11:00"],"datasets":[{"label":"이상 로그인","data":[4,9,26,41,37],"borderColor":"#ef4444","backgroundColor":"rgba(239,68,68,0.2)"},{"label":"차단","data":[1,3,12,22,31],"borderColor":"#22c55e","backgroundColor":"rgba(34,197,94,0.2)"}]}
  responseGrid: spanGrid at 520 392 496 190
    backgroundColor "#ffffff"
    readonly true
    snapshot {"width":496,"height":190,"cols":[{"width":140},{"width":110},{"width":130},{"width":110}],"rows":[{"height":34,"cells":[{"text":"항목","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"상태","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"담당","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"},{"text":"ETA","backColor":"#1e293b","foreColor":"#f8fafc","font":"bold 10pt sans-serif","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"토큰 회수","foreColor":"#111827"},{"text":"진행","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"Auth","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"12분","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"WAF 룰","foreColor":"#111827"},{"text":"대기","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"SecOps","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"8분","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":38,"cells":[{"text":"고객 공지","foreColor":"#111827"},{"text":"초안","backColor":"#e0f2fe","foreColor":"#075985","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"CS","foreColor":"#111827","textAlign":"MiddleCenter"},{"text":"25분","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#334155","leftColor":"#334155","rightColor":"#334155","bottomColor":"#334155"},"fixed":{"row":1,"col":0}}
\`\`\`
`;
}
