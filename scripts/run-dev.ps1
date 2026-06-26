$ErrorActionPreference = "Stop"
$rootDir   = Join-Path $PSScriptRoot ".."
$serverDir = Join-Path $rootDir "server"

# ── 시스템 Node.js 경로 결정 (Cursor 내장 Node 제외) ────────────────────────
# Cursor 내장 node는 Electron용으로 컴파일 버전이 달라 서버 native 모듈과 충돌함
$systemNodePath = $null
$candidatePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe"
)
foreach ($candidate in $candidatePaths) {
    if (Test-Path $candidate) {
        $systemNodePath = $candidate
        break
    }
}
if (-not $systemNodePath) {
    # 시스템 경로에서 Cursor 내장 node를 제외하고 검색
    $allNodePaths = (Get-Command node -All -ErrorAction SilentlyContinue).Source
    foreach ($p in $allNodePaths) {
        if ($p -notlike "*cursor*" -and $p -notlike "*Cursor*") {
            $systemNodePath = $p
            break
        }
    }
}
if (-not $systemNodePath) {
    Write-Host "⚠ 시스템 Node.js를 찾을 수 없습니다. PATH의 기본 node를 사용합니다." -ForegroundColor Yellow
    $systemNodePath = (Get-Command node -ErrorAction Stop).Source
}
$systemNodeVer = (& $systemNodePath --version 2>&1).Trim()
Write-Host "🔍 서버용 Node.js: $systemNodePath ($systemNodeVer)" -ForegroundColor DarkGray

# npm 경로도 동일 디렉터리에서 찾기
$systemNpmPath = Join-Path (Split-Path $systemNodePath) "npm.cmd"
if (-not (Test-Path $systemNpmPath)) {
    $systemNpmPath = Join-Path (Split-Path $systemNodePath) "npm"
}

# ── 의존성 설치 ──────────────────────────────────────────────────────────────
npm install

# ── 서버 의존성 설치 및 native 모듈 재빌드 ────────────────────────────────────
$serverNm      = Join-Path $serverDir "node_modules"
$nodeVerFile   = Join-Path $serverDir ".node-version-built"
$currentNodeVer = $systemNodeVer

Push-Location $serverDir

if (-not (Test-Path $serverNm)) {
    Write-Host "📦 서버 의존성 설치 중..." -ForegroundColor Cyan
    npm install
}

# better-sqlite3 등 native 모듈은 Node.js 버전이 바뀌거나 .node 파일이 없으면 재빌드 필요
$builtVer    = if (Test-Path $nodeVerFile) { Get-Content $nodeVerFile -Raw } else { '' }
$sqliteNode  = Join-Path $serverDir "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
$needRebuild = ($builtVer.Trim() -ne $currentNodeVer) -or (-not (Test-Path $sqliteNode))

if ($needRebuild) {
    Write-Host "🔧 native 모듈 재빌드 중 (Node.js $currentNodeVer)..." -ForegroundColor Cyan
    # 반드시 시스템 Node.js용으로 rebuild (Cursor 내장 Node 버전 혼입 방지)
    $env:npm_config_nodedir = $null
    & $systemNpmPath rebuild
    $currentNodeVer | Out-File $nodeVerFile -Encoding utf8 -NoNewline
    Write-Host "✅ 재빌드 완료" -ForegroundColor Green
}

Pop-Location

$env:XENIS_HOME="$env:USERPROFILE\.xenis-dev"

# ── 설정 파일에서 서버 포트 읽기 ─────────────────────────────────────────────
# Xenesis Desk는 XENIS_HOME 또는 사용자 홈의 .xenis를 userData로 사용함
$serverPort   = 3001
$xenisHome = if ($env:XENIS_HOME) { $env:XENIS_HOME } else { Join-Path $env:USERPROFILE ".xenis" }
$settingsFile = Join-Path $xenisHome "settings.json"
if (Test-Path $settingsFile) {
    try {
        $settingsJson = Get-Content $settingsFile -Raw | ConvertFrom-Json
        if ($settingsJson.PSObject.Properties.Name -contains 'serverPort' -and
            $settingsJson.serverPort -ge 1024 -and $settingsJson.serverPort -le 65535) {
            $serverPort = [int]$settingsJson.serverPort
        }
    } catch {
        Write-Host "⚠ settings.json 읽기 실패 — 기본 포트 $serverPort 사용" -ForegroundColor Yellow
    }
}
Write-Host "🔌 내부 서버 포트: $serverPort" -ForegroundColor Cyan

# ── SQLite 서버 백그라운드 시작 ───────────────────────────────────────────────
$serverScript  = Join-Path $serverDir "index.js"
$serverProcess = $null

if (Test-Path $serverScript) {
    $nodePath = $systemNodePath

    Write-Host "🚀 SQLite 서버 시작 중 (port $serverPort, Node.js $systemNodeVer)..." -ForegroundColor Green

    # PORT 환경변수로 포트 전달 (서버가 process.env.PORT 를 우선 사용)
    $env:PORT = $serverPort

    $serverProcess = Start-Process `
        -FilePath    $nodePath `
        -ArgumentList "`"$serverScript`"" `
        -WorkingDirectory $serverDir `
        -NoNewWindow `
        -PassThru

    # 서버가 완전히 뜰 때까지 대기 (설정된 포트 점유 여부로 확인, 최대 15초)
    $waited = 0
    $ready  = $false
    while ($waited -lt 15) {
        Start-Sleep -Seconds 1
        $waited++
        $conn = Get-NetTCPConnection -LocalPort $serverPort -State Listen -ErrorAction SilentlyContinue
        if ($conn) { $ready = $true; break }
    }
    if ($ready) {
        Write-Host "✅ SQLite 서버 가동됨 (PID: $($serverProcess.Id), port: $serverPort)" -ForegroundColor Green
    } else {
        Write-Host "⚠ SQLite 서버가 15초 내에 포트 $serverPort 를 열지 않습니다. 계속 진행합니다." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ server/index.js 를 찾을 수 없어 서버를 시작하지 않습니다." -ForegroundColor Yellow
}

# ── Electron 개발 서버 시작 ───────────────────────────────────────────────────
try {
    npm run dev:electron
} finally {
    # Electron 종료 시 서버 프로세스도 정리
    if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
        Write-Host "`n🛑 SQLite 서버 종료 중 (PID: $($serverProcess.Id))..." -ForegroundColor Yellow
        $serverProcess.Kill()
        $serverProcess.WaitForExit(3000) | Out-Null
    }
}
