# Xenesis Desk 정식 릴리즈 빌드 및 GitHub Release 절차

이 문서는 Xenesis Desk를 Windows/macOS 설치 파일로 빌드하고, GitHub Release를 통해 배포하는 실무 절차를 정리한다.

현재 기준:

- 앱 버전: `package.json`의 `version`
- 빌드 도구: `electron-vite`, `electron-builder`
- 출력 폴더: `release/`
- Windows 산출물: NSIS installer + Portable exe
- macOS 산출물: DMG + ZIP
- 자동 업데이트 provider: `generic`
- 자동 업데이트 URL: `https://update.xamong.com/xenesis-desk/`
- GitHub 저장소: `https://github.com/xamong/xenesis-desk`

중요: 현재 `package.json`의 `build.publish`는 GitHub provider가 아니라 `generic` provider다. 따라서 GitHub Release는 다운로드/이력 보관 채널로 사용할 수 있지만, 앱의 자동 업데이트는 기본적으로 `https://update.xamong.com/xenesis-desk/`를 본다. 자동 업데이트까지 동작시키려면 GitHub Release 업로드와 별도로 update server에도 `latest.yml`, `latest-mac.yml`, 설치 파일, blockmap 파일을 같은 빌드 세트로 업로드해야 한다.

---

## 1. 공통 릴리즈 준비

### 1-1. 작업 브랜치와 원격 확인

```powershell
git status --short
git branch --show-current
git remote -v
```

정식 릴리즈는 `main` 기준으로 만드는 것을 권장한다.

```powershell
git checkout main
git pull origin main
```

### 1-2. 버전 결정

릴리즈 버전은 `package.json`의 `version`과 Git tag를 맞춘다.

예시:

```text
package.json version: 0.1.0
Git tag: v0.1.0
Release title: Xenesis Desk v0.1.0
```

버전을 올릴 때는 `package.json`과 `package-lock.json`을 같이 갱신한다.

```powershell
npm version patch --no-git-tag-version
```

또는 직접 `package.json`을 수정한 뒤 다음 명령으로 lockfile을 맞춘다.

```powershell
npm install --package-lock-only
```

### 1-3. 의존성 설치

새 머신이나 CI에서는 `npm ci`를 사용한다.

```powershell
npm ci
```

로컬 개발 중 dependency 변경을 반영해야 하는 경우에만 `npm install`을 사용한다.

### 1-4. 릴리즈 전 검증

최소 검증:

```powershell
npm run typecheck
npm run check:docs-public
npm run check:public-release
```

렌더러, Gowoori, XCON/SKETCH, map, chart, SpanGrid 쪽을 수정했다면 DEV 앱을 켠 뒤 해당 기능을 직접 확인한다.

```powershell
npm run dev
node scripts/xd.mjs --dev state
node scripts/xd.mjs --dev capabilities
```

유지보수자 전용 visual, CR, Gowoori smoke runner가 있는 로컬 개발 환경에서는 해당 runner를 추가로 실행한다. 공개 npm script 표면은 ignored smoke runner에 의존하지 않는다.

### 1-5. 이전 빌드 산출물 정리

`release/`는 빌드 출력 폴더다. 새 릴리즈 전에 기존 산출물을 정리한다.

PowerShell:

```powershell
if (Test-Path release) {
  Remove-Item -Recurse -Force release
}
```

Bash:

```bash
rm -rf release
```

---

## 2. Windows 정식 빌드

### 2-1. Windows 빌드 요구사항

권장 환경:

- Windows 10/11 x64
- Node.js `>=22.12.0`
- npm `>=10`
- Git
- Visual Studio Build Tools 2022, Desktop development with C++ workload
- 코드 서명 인증서, 정식 공개 배포 시 권장

native module rebuild나 install 단계에서 실패하면 Visual Studio Build Tools와 Python/node-gyp 환경을 먼저 확인한다.

### 2-2. Windows x64 빌드

```powershell
npm ci
npm run typecheck
npm run check:public-release
npm run dist:win
```

`dist:win`은 내부적으로 다음을 실행한다.

```powershell
npm run build
electron-builder --win --x64
```

### 2-3. Windows arm64 빌드

필요할 때만 별도 생성한다.

```powershell
npm run dist:win:arm64
```

### 2-4. Windows 테스트용 unpacked 빌드

설치 파일을 만들기 전에 패키지 내부 구조만 확인하려면:

```powershell
npm run pack:win
```

예상 출력:

```text
release/
└── win-unpacked/
    ├── Xenesis Desk.exe
    └── resources/
        ├── app.asar
        └── provider-assets/
```

Provider asset 포함 여부를 확인한다.

```powershell
node ./scripts/publicReleaseCheck.mjs
```

### 2-5. Windows 최종 산출물

`npm run dist:win` 후 예상 산출물:

```text
release/
├── Xenesis Desk-0.1.0-Setup-x64.exe
├── Xenesis Desk-0.1.0-Setup-x64.exe.blockmap
├── Xenesis Desk-0.1.0-Portable-x64.exe
├── Xenesis Desk-0.1.0-Portable-x64.exe.blockmap
├── latest.yml
└── win-unpacked/
```

파일명은 버전, 아키텍처, electron-builder 결과에 따라 달라질 수 있다. GitHub Release와 update server에는 실제 생성된 파일명을 기준으로 업로드한다.

### 2-6. Windows 코드 서명

unsigned installer도 만들 수는 있지만, 정식 공개 배포에서는 SmartScreen 경고가 강하게 뜰 수 있다. 공개 배포용은 코드 서명 인증서를 사용하는 것이 좋다.

예시:

```powershell
$env:CSC_LINK = "<path-to-windows-signing-certificate.pfx>"
$env:CSC_KEY_PASSWORD = "<certificate-password>"
npm run dist:win
```

주의:

- 서명된 파일을 다시 수정하거나 재서명하면 `latest.yml`의 `sha512`와 맞지 않을 수 있다.
- 자동 업데이트용 `latest.yml`, installer, blockmap은 반드시 같은 빌드에서 나온 세트여야 한다.
- 파일명을 임의로 바꾸면 updater metadata와 불일치할 수 있다.

### 2-7. Windows 설치 검증

최소 확인:

1. NSIS installer 실행
2. 설치 경로 변경 가능 여부 확인
3. 시작 메뉴/바탕화면 shortcut 확인
4. 앱 실행
5. `Settings > AI Provider`에서 Hermes Plug-in/Local CLI 설치 asset 접근 확인
6. `Settings > Xenesis Agent > Gateway` 상태 확인
7. Terminal Command Center에서 새 터미널 실행 확인
8. 앱 종료 후 재실행 확인
9. Portable exe 실행 확인

---

## 3. macOS 정식 빌드

### 3-1. macOS 빌드 요구사항

권장 환경:

- macOS 12 Monterey 이상
- Apple Silicon Mac 또는 Intel Mac
- Node.js `>=22.12.0`
- npm `>=10`
- Git
- Xcode Command Line Tools
- Apple Developer Program 계정, 정식 공개 배포 시 필요
- Developer ID Application certificate
- notarization credential

Xcode Command Line Tools 설치:

```bash
xcode-select --install
```

macOS DMG/ZIP의 서명과 notarization은 macOS에서 처리하는 것을 원칙으로 한다. Windows에서 macOS 정식 배포본을 안정적으로 만드는 흐름은 권장하지 않는다.

### 3-2. macOS 로컬 준비

```bash
git checkout main
git pull origin main
npm ci
npm run typecheck
npm run check:public-release
```

### 3-3. 현재 Mac 아키텍처 빌드

```bash
npm run dist:mac
```

### 3-4. Apple Silicon 빌드

```bash
npm run dist:mac:arm64
```

### 3-5. Intel Mac 빌드

```bash
npm run dist:mac:x64
```

### 3-6. Universal 빌드

```bash
npm run dist:mac:universal
```

Universal 빌드는 배포 파일 수를 줄일 수 있지만 native module 때문에 단일 아키텍처 빌드보다 실패 가능성이 높다. 정식 릴리즈 전에는 Apple Silicon과 Intel 환경에서 각각 실행 테스트를 권장한다.

### 3-7. macOS 최종 산출물

예상 산출물:

```text
release/
├── Xenesis Desk-0.1.0-mac-arm64.dmg
├── Xenesis Desk-0.1.0-mac-arm64.dmg.blockmap
├── Xenesis Desk-0.1.0-mac-arm64.zip
├── Xenesis Desk-0.1.0-mac-arm64.zip.blockmap
├── latest-mac.yml
└── mac-arm64/
    └── Xenesis Desk.app
```

아키텍처별 빌드를 모두 만들면 `x64`, `arm64`, `universal` 파일이 함께 생길 수 있다.

### 3-8. macOS 서명과 notarization

현재 `package.json`에는 다음 macOS 설정이 있다.

```json
"mac": {
  "target": ["dmg", "zip"],
  "category": "public.app-category.developer-tools",
  "hardenedRuntime": true,
  "gatekeeperAssess": false
}
```

정식 공개 배포에는 Developer ID signing과 notarization이 필요하다. 현재 설정에는 별도 notarization 블록이 없으므로, 실제 공개 배포 전에 electron-builder 26 기준 notarization 설정을 추가해야 한다.

일반적으로 필요한 환경 변수:

```bash
export CSC_NAME="Developer ID Application: Your Company Name (TEAMID)"
export APPLE_ID="apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="<apple-app-specific-password>"
export APPLE_TEAM_ID="TEAMID"
npm run dist:mac:arm64
```

주의:

- Apple ID 비밀번호는 일반 계정 비밀번호가 아니라 app-specific password를 사용한다.
- notarization 설정은 electron-builder 버전에 맞춰 검증해야 한다.
- notarization이 완료된 DMG/APP를 기준으로 최종 Gatekeeper 검증을 수행한다.

### 3-9. macOS Gatekeeper 검증

```bash
spctl -a -vvv -t install "release/Xenesis Desk-0.1.0-mac-arm64.dmg"
xcrun stapler validate "release/Xenesis Desk-0.1.0-mac-arm64.dmg"
```

설치 후 앱도 확인한다.

```bash
spctl -a -vvv "/Applications/Xenesis Desk.app"
```

로컬 unsigned 테스트에서만 quarantine 제거가 필요할 수 있다.

```bash
xattr -dr com.apple.quarantine "/Applications/Xenesis Desk.app"
```

이 명령은 정식 배포 절차를 대체하지 않는다.

### 3-10. macOS 실행 검증

최소 확인:

1. DMG mount
2. `/Applications`로 복사
3. Gatekeeper 경고 없이 실행
4. `Settings > AI Provider` asset 접근 확인
5. Terminal Command Center에서 `zsh`, `bash`, `fish` 등 주요 shell 확인
6. Xenesis Agent panel 실행 확인
7. 앱 종료 후 재실행 확인
8. ZIP 기반 updater metadata가 생성됐는지 확인

---

## 4. Git tag 만들기

빌드와 검증이 끝나면 버전 태그를 만든다.

```powershell
git status --short
git add package.json package-lock.json
git commit -m "Release v0.1.0"
git tag -a v0.1.0 -m "Xenesis Desk v0.1.0"
git push origin main
git push origin v0.1.0
```

이미 버전 커밋을 만든 상태라면 `git add`와 `git commit`은 생략하고 tag만 만든다.

```powershell
git tag -a v0.1.0 -m "Xenesis Desk v0.1.0"
git push origin v0.1.0
```

---

## 5. GitHub Release로 배포하기

### 5-1. GitHub 웹 UI 방식

1. GitHub 저장소로 이동
   - `https://github.com/xamong/xenesis-desk`
2. 오른쪽 또는 상단의 `Releases` 클릭
3. `Draft a new release` 클릭
4. `Choose a tag`에서 `v0.1.0` 선택
5. Release title 입력
   - `Xenesis Desk v0.1.0`
6. Release notes 작성
7. Early alpha이면 `Set as a pre-release` 체크 권장
8. 산출물 업로드
9. `Publish release` 클릭

### 5-2. GitHub CLI 방식

GitHub CLI가 설치되어 있고 로그인되어 있다면:

```powershell
gh auth status
```

Release 생성 예시:

```powershell
gh release create v0.1.0 `
  --repo xamong/xenesis-desk `
  --title "Xenesis Desk v0.1.0" `
  --notes "Early alpha release of Xenesis Desk." `
  --prerelease `
  "release/Xenesis Desk-0.1.0-Setup-x64.exe" `
  "release/Xenesis Desk-0.1.0-Setup-x64.exe.blockmap" `
  "release/Xenesis Desk-0.1.0-Portable-x64.exe" `
  "release/latest.yml" `
  "release/Xenesis Desk-0.1.0-mac-arm64.dmg" `
  "release/Xenesis Desk-0.1.0-mac-arm64.dmg.blockmap" `
  "release/Xenesis Desk-0.1.0-mac-arm64.zip" `
  "release/Xenesis Desk-0.1.0-mac-arm64.zip.blockmap" `
  "release/latest-mac.yml"
```

실제 파일명은 `Get-ChildItem release` 또는 `ls release`로 확인한 뒤 바꿔 넣는다.

### 5-3. 업로드할 파일

Windows:

- `Xenesis Desk-<version>-Setup-x64.exe`
- `Xenesis Desk-<version>-Setup-x64.exe.blockmap`
- `Xenesis Desk-<version>-Portable-x64.exe`
- `latest.yml`

macOS:

- `Xenesis Desk-<version>-mac-arm64.dmg`
- `Xenesis Desk-<version>-mac-arm64.dmg.blockmap`
- `Xenesis Desk-<version>-mac-arm64.zip`
- `Xenesis Desk-<version>-mac-arm64.zip.blockmap`
- `latest-mac.yml`

Universal 또는 x64 macOS 빌드를 배포한다면 해당 DMG/ZIP/blockmap도 함께 업로드한다.

### 5-4. Release notes 권장 구조

```markdown
## Xenesis Desk v0.1.0

Early alpha release.

### Highlights
- Terminal-first AI workbench
- Xenesis Agent panel
- MCP bridge and Capability Registry
- Gowoori artifact rendering
- Hermes Plug-in and Local CLI installation assets

### Downloads
- Windows: use `Xenesis Desk-0.1.0-Setup-x64.exe`
- Windows portable: use `Xenesis Desk-0.1.0-Portable-x64.exe`
- macOS Apple Silicon: use `Xenesis Desk-0.1.0-mac-arm64.dmg`

### Notes
- This is an early alpha release.
- PRs and issue reports are welcome.
- macOS builds should be signed and notarized for public distribution.
```

---

## 6. 자동 업데이트 배포

GitHub Release asset 업로드만으로 현재 앱의 자동 업데이트가 동작하지 않는다. 현재 앱은 generic update server를 사용한다.

현재 설정:

```json
"publish": {
  "provider": "generic",
  "url": "https://update.xamong.com/xenesis-desk/"
}
```

앱 코드도 generic feed URL을 사용한다.

```text
autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
```

따라서 정식 자동 업데이트를 운영하려면 다음 파일들을 update server에도 올린다.

Windows public stable:

```text
https://update.xamong.com/xenesis-desk/latest.yml
https://update.xamong.com/xenesis-desk/Xenesis Desk-0.1.0-Setup-x64.exe
https://update.xamong.com/xenesis-desk/Xenesis Desk-0.1.0-Setup-x64.exe.blockmap
```

macOS public stable:

```text
https://update.xamong.com/xenesis-desk/latest-mac.yml
https://update.xamong.com/xenesis-desk/Xenesis Desk-0.1.0-mac-arm64.zip
https://update.xamong.com/xenesis-desk/Xenesis Desk-0.1.0-mac-arm64.zip.blockmap
https://update.xamong.com/xenesis-desk/Xenesis Desk-0.1.0-mac-arm64.dmg
```

주의:

- `latest.yml`과 `latest-mac.yml`은 설치 파일과 같은 빌드에서 생성된 것을 사용한다.
- 파일명을 바꾸면 metadata 내부 경로와 불일치할 수 있다.
- Windows 자동 업데이트는 NSIS installer를 기준으로 운영하는 것이 안전하다.
- Portable exe는 수동 다운로드용으로 취급한다.
- macOS 자동 업데이트는 ZIP metadata가 중요하다. DMG는 수동 설치용으로 함께 제공한다.

---

## 7. GitHub Release와 auto-update를 GitHub로 통합하려면

현재 구조는 `generic` provider다. GitHub Release를 자동 업데이트 feed로 직접 쓰려면 다음 변경이 필요하다.

1. `package.json`의 `build.publish`를 GitHub provider로 변경
2. `scripts/publicReleaseCheck.mjs`의 provider 정책 업데이트
3. `src/main/index.ts`의 `autoUpdater.setFeedURL` 사용 방식 검토
4. release channel 정책 정리
5. `GH_TOKEN` 또는 GitHub Actions token 기반 publish 절차 구성

예시 방향:

```json
"publish": {
  "provider": "github",
  "owner": "xamong",
  "repo": "xenesis-desk"
}
```

그 다음 빌드 시:

```powershell
$env:GH_TOKEN = "<github-token>"
npm run dist:win -- --publish always
```

다만 이 변경은 현재 공개 릴리즈 가드 정책과 다르므로 별도 작업으로 다뤄야 한다. 지금 상태에서는 GitHub Release는 다운로드 채널, `update.xamong.com`은 자동 업데이트 채널로 분리해서 운영하는 것이 안전하다.

---

## 8. 릴리즈 후 검증

GitHub Release publish 후 확인:

```powershell
gh release view v0.1.0 --repo xamong/xenesis-desk
```

다운로드 URL 확인:

```powershell
gh release download v0.1.0 --repo xamong/xenesis-desk --dir .tmp-release-download
```

자동 업데이트 feed 확인:

```powershell
Invoke-WebRequest https://update.xamong.com/xenesis-desk/latest.yml
Invoke-WebRequest https://update.xamong.com/xenesis-desk/latest-mac.yml
```

최종 수동 체크:

1. GitHub Release 페이지에서 모든 asset이 보이는지 확인
2. Windows clean VM에서 installer 설치
3. Windows Portable 실행
4. macOS clean user 환경에서 DMG 설치
5. 앱 내 update check 실행
6. `Settings > AI Provider`에서 provider installer asset 확인
7. Terminal Command Center에서 shell 실행
8. Xenesis Agent panel 실행
9. Diagnostics/Log Center에서 시작 오류 확인

---

## 9. 문제 해결

### `npm ci` 실패

- Node.js 버전이 `>=22.12.0`인지 확인
- npm 버전이 `>=10`인지 확인
- `package-lock.json`이 최신인지 확인

### Windows native module 빌드 실패

- Visual Studio Build Tools 2022 설치 확인
- Desktop development with C++ workload 확인
- Python/node-gyp 환경 확인

### Windows SmartScreen 경고

- unsigned build이면 정상적으로 발생할 수 있다.
- 정식 배포는 코드 서명 인증서를 사용한다.

### macOS 앱 실행 차단

- Developer ID signing 여부 확인
- notarization 완료 여부 확인
- `spctl`과 `stapler validate` 결과 확인

### 자동 업데이트가 새 버전을 못 찾음

- 앱 버전이 이전 배포보다 높은지 확인
- update server에 `latest.yml` 또는 `latest-mac.yml`이 있는지 확인
- metadata의 `version`이 새 버전인지 확인
- metadata에 적힌 파일명이 실제 URL에서 접근 가능한지 확인
- installer/zip과 metadata가 같은 빌드 세트인지 확인

### 다운로드는 되는데 업데이트 설치 실패

- 파일을 업로드 후 재서명하거나 수정하지 않았는지 확인
- blockmap과 installer/zip이 같은 빌드 세트인지 확인
- GitHub Release용으로 파일명을 바꾼 뒤 같은 파일을 update server에 올리지 않았는지 확인

---

## 10. 릴리즈 체크리스트

공통:

- [ ] `main` 최신화
- [ ] `package.json` version 결정
- [ ] `package-lock.json` 동기화
- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `node --test scripts/publicReleaseCheck.test.mjs`
- [ ] `npm run check:public-release`
- [ ] 필요 시 visual gate 실행
- [ ] 필요 시 Xenesis Agent scenario gate 실행

Windows:

- [ ] `npm run dist:win`
- [ ] Setup exe 생성
- [ ] Portable exe 생성
- [ ] `latest.yml` 생성
- [ ] blockmap 생성
- [ ] 코드 서명 확인
- [ ] clean VM 설치 테스트

macOS:

- [ ] `npm run dist:mac:arm64` 또는 대상 아키텍처 빌드
- [ ] DMG 생성
- [ ] ZIP 생성
- [ ] `latest-mac.yml` 생성
- [ ] blockmap 생성
- [ ] Developer ID signing
- [ ] notarization
- [ ] Gatekeeper 검증

GitHub Release:

- [ ] `vX.Y.Z` tag push
- [ ] Draft release 작성
- [ ] Early alpha이면 prerelease 체크
- [ ] Windows assets 업로드
- [ ] macOS assets 업로드
- [ ] Release notes 작성
- [ ] Publish release
- [ ] 다운로드 테스트

자동 업데이트:

- [ ] Windows installer + blockmap + `latest.yml` update server 업로드
- [ ] macOS zip + blockmap + `latest-mac.yml` update server 업로드
- [ ] feed URL 접근 확인
- [ ] 앱 내 update check 확인
