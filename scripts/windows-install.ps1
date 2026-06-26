$ErrorActionPreference = "Stop"

# ── 7za.exe 래퍼 설치 ─────────────────────────────────────────────────────
# 문제: electron-builder 가 내부적으로 winCodeSign-2.6.0.7z 를 추출할 때
#        macOS dylib 심볼릭 링크를 생성하지 못해 7-Zip 이 exit code 2(경고)를
#        반환하고 electron-builder 는 이를 치명적 오류로 처리합니다.
#        결과: 아이콘 미적용, NSIS 인스톨러 미생성.
#
# 해결: 7za.exe 를 래퍼 exe 로 교체하여 exit code 2(경고) → 0(성공)으로 변환.
#       원본은 7za.original.exe 로 보존하고, 빌드 후 복원합니다.
# ─────────────────────────────────────────────────────────────────────────

$7zaDir  = [System.IO.Path]::GetFullPath("$PSScriptRoot\..\node_modules\7zip-bin\win\x64")
$7zaExe  = "$7zaDir\7za.exe"
$7zaOrig = "$7zaDir\7za.original.exe"
$csc     = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

$csCode = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Text;

class ZipWrapper {
    static int Main(string[] args) {
        string dir  = Path.GetDirectoryName(Process.GetCurrentProcess().MainModule.FileName);
        string orig = Path.Combine(dir, "7za.original.exe");
        var sb = new StringBuilder();
        foreach (var a in args) {
            if (sb.Length > 0) sb.Append(' ');
            if (a.IndexOfAny(new char[]{' ', '\t', '"'}) >= 0)
                sb.Append('"').Append(a.Replace("\"", "\"\"")).Append('"');
            else
                sb.Append(a);
        }
        var psi = new ProcessStartInfo(orig, sb.ToString()) { UseShellExecute = false };
        var p = Process.Start(psi);
        p.WaitForExit();
        return (p.ExitCode == 2) ? 0 : p.ExitCode;
    }
}
'@

$wrapperInstalled = $false
if (!(Test-Path $7zaOrig)) {
    Write-Host "== 7za.exe 래퍼 설치 중 (macOS symlink 경고 무시) ==" -ForegroundColor Cyan
    Copy-Item $7zaExe $7zaOrig -Force

    $csFile  = "$env:TEMP\xamong_zip_wrapper.cs"
    $tmpExe  = "$env:TEMP\xamong_zip_wrapper.exe"
    try {
        $csCode | Out-File -FilePath $csFile -Encoding UTF8 -Force
        & $csc /nologo /target:exe /out:"$tmpExe" "$csFile" 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "csc 컴파일 실패 (exit $LASTEXITCODE)" }
        Copy-Item $tmpExe $7zaExe -Force
        $wrapperInstalled = $true
        Write-Host "  7za.exe 래퍼 설치 완료 (exit 2 → 0)" -ForegroundColor Green
    } catch {
        Copy-Item $7zaOrig $7zaExe -Force
        Remove-Item $7zaOrig -ErrorAction SilentlyContinue
        Write-Host "  래퍼 설치 실패 (원본 복원됨): $_" -ForegroundColor Yellow
    } finally {
        Remove-Item $csFile  -ErrorAction SilentlyContinue
        Remove-Item $tmpExe  -ErrorAction SilentlyContinue
    }
} else {
    $wrapperInstalled = $true
    Write-Host "== 7za.exe 래퍼 이미 설치됨 ==" -ForegroundColor DarkGray
}

# ── rcedit 준비 (추가 안전망: winCodeSign 외부에서 rcedit 경로 지정) ──────────
$rceditDir = [System.IO.Path]::GetFullPath("$PSScriptRoot\..\build\rcedit")
if (!(Test-Path "$rceditDir\rcedit-x64.exe") -or !(Test-Path "$rceditDir\rcedit-x86.exe")) {
    Write-Host "== rcedit 다운로드 중 ==" -ForegroundColor Cyan
    New-Item -ItemType Directory -Force $rceditDir | Out-Null
    Invoke-WebRequest "https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe" `
        -OutFile "$rceditDir\rcedit-x64.exe" -UseBasicParsing
    Invoke-WebRequest "https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-ia32.exe" `
        -OutFile "$rceditDir\rcedit-x86.exe" -UseBasicParsing
    Write-Host "  rcedit 준비 완료" -ForegroundColor Green
} else {
    Write-Host "== rcedit 이미 준비됨 ==" -ForegroundColor DarkGray
}
$env:ELECTRON_BUILDER_RCEDIT_PATH = $rceditDir

Write-Host "== Xenesis Desk: main dependencies install ==" -ForegroundColor Cyan
node -v; npm -v
npm install

Write-Host "== Xenesis Desk: server dependencies install ==" -ForegroundColor Cyan
npm run server:install

Write-Host "== Xenesis Desk: rebuild better-sqlite3 (system Node.js) ==" -ForegroundColor Cyan
Push-Location "$PSScriptRoot\..\server"
npm rebuild
Pop-Location

# XAMONG-NOTE: xamongcode sidecar vendor staging 비활성화
#Write-Host "== Xenesis Desk: xamongcode sidecar vendor staging ==" -ForegroundColor Cyan
#$xamongCodeRoot = [System.IO.Path]::GetFullPath("$PSScriptRoot\..\..\xamongcode")
#$sidecarScript = "$xamongCodeRoot\scripts\copy-desk-vendor.mjs"
#if (!(Test-Path $sidecarScript)) {
#    throw "xamongcode sidecar staging script not found: $sidecarScript"
#}
#Push-Location $xamongCodeRoot
#npm run desk:vendor -- --desk "$([System.IO.Path]::GetFullPath("$PSScriptRoot\.."))"
#if ($LASTEXITCODE -ne 0) { throw "xamongcode sidecar vendor staging failed (exit $LASTEXITCODE)" }
#Pop-Location

Write-Host "== Xenesis Desk: build Windows installer + portable ==" -ForegroundColor Cyan
try {
    npm run dist:win
} finally {
    # 빌드 성공/실패 무관하게 7za.exe 원본 복원
    if ($wrapperInstalled -and (Test-Path $7zaOrig)) {
        Copy-Item $7zaOrig $7zaExe -Force
        Remove-Item $7zaOrig -Force
        Write-Host "7za.exe 원본 복원 완료" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "완료: release 폴더를 확인하세요." -ForegroundColor Green
Get-ChildItem ".\release" -ErrorAction SilentlyContinue |
    Where-Object { !$_.PSIsContainer } |
    Select-Object Name, @{N='SizeMB';E={[Math]::Round($_.Length/1MB,1)}} |
    Format-Table -AutoSize
