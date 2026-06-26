# 운영 대시보드

Generated from: 운영 대시보드. Xenesis Desk에서 바로 렌더링되는 XCON/SKETCH 화면으로 생성한다. 어두운 운영실 스타일의 실사용 대시보드이며, 상단에는 서비스 상태 요약과 새로고침 시각, 좌측에는 핵심 KPI 카드 4개(가용성, 활성 인시던트, 평균 응답시간, 배포 성공률), 중앙에는 실시간 인시던트 테이블과 서비스별 상태 매트릭스, 우측에는 알림/장애 타임라인과 담당자 온콜 정보, 하단에는 배포 파이프라인 상태와 작업 큐를 배치한다. XCON/SKETCH 데이터 바인딩 예제가 포함되어야 하고, fixture는 인라인 JSON으로 포함한다. 기본 mode는 view로 렌더링한다. 디자인은 카드 반경 8px 이하, 운영 도구처럼 조밀하고 읽기 쉬운 정보 구조, 과한 장식 없이 선명한 대비와 상태 색상(정상/주의/장애)을 사용한다.

## Dashboard snapshot

- **Health score:** 87
- **Focus:** P95 142ms
- **Signal:** Latency is stable and no critical incidents are open.
- **Output:** Editable XCON/SKETCH dashboard opened through Xenesis Desk MCP

```xcon-sketch mode view
screen "운영 대시보드" 960x640 bg #f8fafc
  hero: panel at 24 24 912 118
    bg #111827
    radius 24
    eyebrow: label "Operations command center" at 28 20 280 20
      color #93c5fd
      font
        size 12
        weight 800
    title: label "운영 대시보드" at 28 44 430 30
      color white
      font
        size 24
        weight 800
    value: label "99.98%" at 28 76 190 36
      color #60a5fa
      font
        size 32
        weight 800
    valueLabel: label "SLO health" at 218 88 180 22
      color #a7f3d0
      font
        size 14
        weight 800
    statusBadge: label "ON TRACK" at 754 24 126 28
      bg #166534
      color white
      radius 14
      align center
      font
        size 12
        weight 800
    summary: label "Latency is stable and no critical incidents are open." at 520 62 360 40
      color #cbd5e1
      align right
      font
        size 13
        weight 600
  kpiGrid: panel at 24 166 912 118
    bg white
    radius 18
    border
      visible true
      color #d8e0ea
    kpi1: panel at 22 20 198 78
      bg #eff6ff
      radius 14
      label: label "Uptime" at 16 12 150 18
        color #1d4ed8
        font
          size 11
          weight 800
      value: label "99.98%" at 16 36 150 26
        color #1d4ed8
        font
          size 20
          weight 800
    kpi2: panel at 242 20 198 78
      bg #ecfdf5
      radius 14
      label: label "Incidents" at 16 12 150 18
        color #059669
        font
          size 11
          weight 800
      value: label "0" at 16 36 150 26
        color #059669
        font
          size 20
          weight 800
    kpi3: panel at 462 20 198 78
      bg #fff7ed
      radius 14
      label: label "Deploys" at 16 12 150 18
        color #ea580c
        font
          size 11
          weight 800
      value: label "12" at 16 36 150 26
        color #ea580c
        font
          size 20
          weight 800
    kpi4: panel at 682 20 198 78
      bg #fef2f2
      radius 14
      label: label "Alerts" at 16 12 150 18
        color #dc2626
        font
          size 11
          weight 800
      value: label "3" at 16 36 150 26
        color #dc2626
        font
          size 20
          weight 800
  chartBlock: panel at 24 312 438 226
    bg white
    radius 18
    border
      visible true
      color #d8e0ea
    chartTitle: label "Operations trend" at 24 22 240 24
      color #172033
      font
        size 17
        weight 800
    chartSub: label "Live artifact generated through Xenesis Desk MCP" at 24 48 330 18
      color #64748b
    trendChart: chart at 24 70 390 126
      chartType "bar"
      chartData {"labels":["API","Worker","DB","Edge"],"datasets":[{"label":"Operations","data":[96,88,92,84],"backgroundColor":"#60a5fa"}]}
  ownerBlock: panel at 486 312 450 226
    bg white
    radius 18
    border
      visible true
      color #d8e0ea
    ownerTitle: label "Owners and status" at 24 22 240 24
      color #172033
      font
        size 17
        weight 800
    ownerFocus: label "P95 142ms" at 300 24 126 22
      bg #dbeafe
      color #172033
      radius 11
      align center
      font
        size 12
        weight 800
    ownerGrid: spanGrid at 24 70 402 126
      backgroundColor white
      readonly true
      data [["Service","Owner","Status"],["API","Nia","Healthy"],["Worker","Jules","Review"],["Database","Mika","Ready"]]
      columns [{"id":"name","title":"Service","width":150},{"id":"owner","title":"Owner","width":96},{"id":"status","title":"Status","width":126}]
  actionBlock: panel at 24 564 912 52
    bg #0f172a
    radius 18
    next: label "Next step" at 24 16 90 20
      color #93c5fd
      font
        size 12
        weight 800
    actionText: label "Refine the operations dashboard, bind real data, then share it with the team." at 120 16 560 20
      color white
    action: button "Open in Xenesis Desk" at 740 10 142 32
      bg #2563eb
      color white
      radius 10
```
