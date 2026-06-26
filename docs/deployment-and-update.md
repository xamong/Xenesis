# Xenesis Desk 패키징, GitHub Release, 자동 업데이트 가이드

> 대상 앱: Xenesis Desk
> 현재 버전 기준: `package.json` `0.1.0`
> 빌드 도구: `electron-builder` 26, `electron-updater` 6
> 기본 배포 대상: Windows NSIS 설치본, Windows Portable, macOS DMG/ZIP

이 문서는 Xenesis Desk를 릴리스 빌드하고, GitHub Release에 등록하고, 자동 업데이트까지 운영하는 절차를 정리합니다.

macOS에서 로컬 설치/패키징을 준비하는 상세 절차는 [macOS 설치 및 패키징 가이드](./macos-install.md)를 먼저 확인합니다.

현재 저장소의 공개판 기본 설정은 다음과 같습니다.

```json
"publish": {
  "provider": "generic",
  "url": "https://update.xamong.com/xenesis-desk/"
}
```

즉, 현재 권장 운영 방식은 **GitHub Release에는 설치 파일을 공개 다운로드용으로 등록하고**, **자동 업데이트 메타데이터는 `https://update.xamong.com/xenesis-desk/` 같은 정적 업데이트 서버에 업로드**하는 방식입니다.

GitHub Releases 자체를 `electron-updater`의 업데이트 서버로 쓰는 방식도 가능하지만, 그 경우 `package.json`의 `build.publish`와 `scripts/publicReleaseCheck.mjs` 정책을 함께 바꿔야 합니다. 공개판 릴리스 가드는 현재 `generic` provider를 전제로 검사합니다.

---

## 1. 릴리스 전 확인

릴리스 전에 작업 트리를 정리하고, 공개판에 내부 확장이 섞이지 않는지 먼저 확인합니다.

```powershell
git status --short
npm run check:public-release
```

`npm run check:public-release`는 다음을 검사합니다.

| 항목 | 기대값 |
|---|---|
| 패키지 이름 | `xenesis-desk` |
| 제품명 | `Xenesis Desk` |
| appId | `com.xamong.xenesis.desk` |
| 업데이트 provider | `generic` |
| public stable feed | `https://update.xamong.com/xenesis-desk/` |
| 패키징 확장 | `extensions/sample.*/*`만 포함 |
| 내부 확장 | `.gitignore`로 제외 |

내부 개발용 확장을 GitHub 공개 저장소에서 제외하려면 아래 경로가 커밋 대상에 들어가지 않아야 합니다.

```text
extensions/xenesis-desk.core-tools/
extensions/xenesis-desk.data-tools/
src/renderer/extensions/xenesis-desk.core-tools/
src/renderer/extensions/xenesis-desk.data-tools/
extensions-private/
```

---

## 2. 버전 올리기

릴리스는 반드시 이전 배포 버전보다 높은 `package.json` `version`으로 만들어야 합니다. `electron-updater`는 배포된 버전과 현재 앱 버전을 비교해 업데이트를 판단합니다.

### 첫 공개 GitHub Release 버전

Xenesis Desk의 현재 공개판 시작 버전은 `package.json` 기준 `0.1.0`입니다. 아직 `0.1.0` 설치본 사용자가 없다면 첫 공개 GitHub Release는 `v0.1.0`으로 배포합니다.

권장 첫 공개 릴리스 값:

| 항목 | 값 |
|---|---|
| `package.json` version | `0.1.0` |
| Git tag | `v0.1.0` |
| GitHub Release title | `Xenesis Desk 0.1.0` |
| Release note 첫 문장 | `This is the first public GitHub release of Xenesis Desk.` |

자동 업데이트는 버전이 증가해야 동작하므로, `0.1.0` 배포 이후에는 반드시 더 높은 버전으로 릴리스합니다.

이미 같은 버전의 설치본을 내부 사용자에게 배포한 적이 있다면 공개 릴리스는 `0.1.1`처럼 패치 버전을 올려 충돌을 피합니다.

예:

```json
{
  "version": "0.1.1"
}
```

권장 태그 형식:

```text
v0.1.1
```

버전 변경 후 한 번 더 확인합니다.

```powershell
npm run check:public-release
npm run typecheck
node --test scripts\*.test.mjs
```

---

## 3. Windows 패키징

### 전체 릴리스 빌드

```powershell
npm run dist:win
```

이 명령은 내부적으로 다음을 실행합니다.

```powershell
npm run build
electron-builder --win --x64
```

`npm run build`는 TypeScript 타입 검사와 Electron main/preload/renderer 번들링을 수행합니다.

### 디렉터리 패키지만 만들기

설치 파일을 만들기 전에 패키징 결과만 빠르게 확인하려면:

```powershell
npm run pack:win
```

출력은 `release/win-unpacked/`에 생성됩니다.

### ARM64 빌드

```powershell
npm run dist:win:arm64
```

현재 `package.json`의 `win.target`은 x64 중심으로 설정되어 있으므로 ARM64 배포를 실제로 운영하려면 설치/업데이트 테스트를 별도로 진행해야 합니다.

---

## 3-1. macOS 패키징

macOS 패키징은 macOS에서 실행해야 합니다. 필요한 기본 조건은 Node.js 22.12 이상, npm 10 이상, Xcode Command Line Tools, 현재 workspace 상대 경로의 로컬 패키지입니다.

전용 스크립트:

```bash
bash scripts/macos-install.sh
```

이 스크립트는 의존성 설치, `server` native module 재빌드, Electron native module 재빌드 후 현재 Mac 아키텍처 기준으로 `npm run dist:mac`을 실행합니다.

아키텍처를 명시할 수도 있습니다.

```bash
bash scripts/macos-install.sh --arch arm64
bash scripts/macos-install.sh --arch x64
bash scripts/macos-install.sh --arch universal
```

`/Applications`로 복사하려면:

```bash
bash scripts/macos-install.sh --install-app
```

직접 npm script를 사용할 수도 있습니다.

```bash
npm run pack:mac
npm run dist:mac
npm run dist:mac:arm64
npm run dist:mac:x64
npm run dist:mac:universal
```

공개 배포용 macOS 앱은 Developer ID 서명과 notarization 절차가 별도로 필요합니다. 현재 `scripts/macos-install.sh`는 로컬 빌드와 내부 테스트 설치를 우선 대상으로 하며, 서명 identity가 없으면 unsigned local build로 진행합니다.

---

## 4. release 폴더 결과물

`npm run dist:win` 후 `release/` 폴더에 주요 파일이 생성됩니다.

```text
release/
├── Xenesis Desk-0.1.1-Setup-x64.exe
├── Xenesis Desk-0.1.1-Portable-x64.exe
├── Xenesis Desk-0.1.1-Setup-x64.exe.blockmap
├── latest.yml
└── win-unpacked/
```

| 파일 | 용도 | GitHub Release 등록 | 자동 업데이트 서버 업로드 |
|---|---|---:|---:|
| `Xenesis Desk-{version}-Setup-x64.exe` | 설치형 배포본 | 필요 | 필요 |
| `Xenesis Desk-{version}-Portable-x64.exe` | 수동 실행용 포터블 | 선택 | 불필요 |
| `Xenesis Desk-{version}-Setup-x64.exe.blockmap` | NSIS differential update | 권장 | 권장 |
| `latest.yml` | Windows 자동 업데이트 메타데이터 | 권장 | 필수 |
| `win-unpacked/` | 설치 전 smoke test용 | 불필요 | 불필요 |

`latest.yml`과 설치 파일은 항상 같은 빌드에서 나온 쌍을 업로드해야 합니다. 설치 파일만 다시 올리거나 이름을 바꾸면 `sha512` 불일치로 업데이트가 실패합니다.

---

## 5. 자동 업데이트 구조

Xenesis Desk는 `electron-updater`를 사용합니다.

현재 main process 동작:

| 설정 | 현재 동작 |
|---|---|
| provider | `generic` |
| public stable feed | `https://update.xamong.com/xenesis-desk/` |
| internal dev feed | `https://update.xamong.com/xenesis-desk/internal-dev/` |
| nightly feed | `https://update.xamong.com/xenesis-desk/nightly/` |
| local feed | 설정 화면에서 입력한 URL |
| auto download | `false` |
| auto install on quit | `true` |
| packaged app only | 개발 모드에서는 업데이트 확인 비활성 |

앱 시작 후 `autoCheck`가 켜져 있으면 약 5초 뒤 업데이트를 확인합니다.

```text
앱 시작
  └─ 5초 대기
      └─ checkForUpdates()
          ├─ update-not-available
          ├─ update-available
          │   └─ 사용자가 다운로드 버튼 클릭
          │       └─ downloadUpdate()
          │           └─ update-downloaded
          │               ├─ 사용자가 지금 설치
          │               └─ 앱 종료 시 자동 설치
          └─ error
```

설정 화면의 업데이트 채널은 다음과 같이 매핑됩니다.

| 채널 | `autoUpdater.channel` | feed URL |
|---|---|---|
| public stable | `latest` | `https://update.xamong.com/xenesis-desk/` |
| internal dev | `dev` | `https://update.xamong.com/xenesis-desk/internal-dev/` |
| nightly | `nightly` | `https://update.xamong.com/xenesis-desk/nightly/` |
| local | `latest` | 사용자가 입력한 URL |

---

## 6. 현재 권장 배포 방식: GitHub Release + generic 업데이트 서버

이 방식은 현재 저장소 설정을 바꾸지 않고 사용할 수 있습니다.

### 6.1 빌드

```powershell
npm run check:public-release
npm run dist:win
```

### 6.2 업데이트 서버에 업로드

`public stable` 채널이면 아래 위치에 업로드합니다.

```text
https://update.xamong.com/xenesis-desk/
├── latest.yml
├── Xenesis Desk-0.1.1-Setup-x64.exe
└── Xenesis Desk-0.1.1-Setup-x64.exe.blockmap
```

`internal dev` 채널이면:

```text
https://update.xamong.com/xenesis-desk/internal-dev/
├── dev.yml 또는 latest.yml
├── Xenesis Desk-0.1.1-Setup-x64.exe
└── Xenesis Desk-0.1.1-Setup-x64.exe.blockmap
```

`nightly` 채널이면:

```text
https://update.xamong.com/xenesis-desk/nightly/
├── nightly.yml 또는 latest.yml
├── Xenesis Desk-0.1.1-Setup-x64.exe
└── Xenesis Desk-0.1.1-Setup-x64.exe.blockmap
```

주의: channel별 메타데이터 파일명은 electron-builder 설정과 생성 결과를 기준으로 확인해야 합니다. `public stable`은 일반적으로 `latest.yml`입니다. prerelease 채널을 운영할 때는 빌드 결과물에 생성된 `*.yml` 파일명을 실제 feed URL에서 접근 가능하게 맞춰야 합니다.

### 6.3 GitHub Release 생성

GitHub 웹 UI 기준:

1. GitHub 저장소로 이동
2. `Releases` 클릭
3. `Draft a new release` 클릭
4. 태그 입력: `v0.1.1`
5. Release title 입력: `Xenesis Desk 0.1.1`
6. Release notes 작성
7. 아래 파일 업로드

업로드 권장 파일:

```text
Xenesis Desk-0.1.1-Setup-x64.exe
Xenesis Desk-0.1.1-Portable-x64.exe
latest.yml
Xenesis Desk-0.1.1-Setup-x64.exe.blockmap
```

자동 업데이트만 보면 GitHub Release에 `latest.yml`을 올리는 것은 필수는 아닙니다. 현재 앱은 `https://update.xamong.com/xenesis-desk/`를 확인하기 때문입니다. 다만 디버깅과 이력 보존을 위해 GitHub Release asset에도 함께 올리는 것을 권장합니다.

### 6.4 GitHub CLI로 Release 생성

GitHub CLI를 쓰면 다음처럼 등록할 수 있습니다.

```powershell
gh auth login
gh release create v0.1.1 `
  "release/Xenesis Desk-0.1.1-Setup-x64.exe" `
  "release/Xenesis Desk-0.1.1-Portable-x64.exe" `
  "release/Xenesis Desk-0.1.1-Setup-x64.exe.blockmap" `
  "release/latest.yml" `
  --title "Xenesis Desk 0.1.1" `
  --notes-file ".\release-notes-0.1.1.md"
```

이미 draft를 만들고 나중에 공개하려면:

```powershell
gh release create v0.1.1 `
  "release/Xenesis Desk-0.1.1-Setup-x64.exe" `
  "release/Xenesis Desk-0.1.1-Portable-x64.exe" `
  "release/Xenesis Desk-0.1.1-Setup-x64.exe.blockmap" `
  "release/latest.yml" `
  --title "Xenesis Desk 0.1.1" `
  --notes-file ".\release-notes-0.1.1.md" `
  --draft
```

### 6.5 Release notes 권장 형식

```markdown
## Xenesis Desk 0.1.1

### 변경 사항
- 워크스페이스/터미널/FTP 안정화
- 진단 번들 내보내기 개선
- 공개판 패키징 가드 업데이트

### 업데이트 방법
- 설치형 사용자는 앱 설정 > 앱 업데이트에서 업데이트를 확인할 수 있습니다.
- Portable 사용자는 아래 Portable 파일을 직접 다운로드해 교체해야 합니다.

### 파일
- `Xenesis Desk-0.1.1-Setup-x64.exe`: 설치형
- `Xenesis Desk-0.1.1-Portable-x64.exe`: 포터블
```

---

## 7. GitHub Releases를 자동 업데이트 provider로 직접 쓰는 방식

이 방식은 자체 업데이트 서버 없이 GitHub Releases만으로 자동 업데이트를 운영할 때 사용합니다.

현재 공개판 릴리스 가드는 `generic` provider를 요구하므로, 이 방식으로 전환하려면 `scripts/publicReleaseCheck.mjs`도 같이 바꿔야 합니다.

### 7.1 package.json 변경

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_OWNER",
  "repo": "xenesis-desk",
  "private": false
}
```

비공개 저장소를 업데이트 서버로 쓰는 것은 일반 배포에는 권장하지 않습니다. 사용자의 앱이 GitHub API를 사용해야 하고 rate limit, token 배포, 접근 권한 문제가 생길 수 있습니다.

### 7.2 main process feed 설정 변경

현재 `src/main/index.ts`는 런타임에 아래처럼 generic feed를 강제합니다.

```ts
autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
```

GitHub provider로 직접 전환하려면 이 구조를 channel별 GitHub provider 설정으로 바꾸거나, `setFeedURL` 호출을 제거하고 `package.json`의 `publish` 설정을 사용하도록 조정해야 합니다.

현재 구조에서는 channel별 `generic` URL을 사용하므로, GitHub provider 전환은 단순 문서 작업이 아니라 코드/검증 정책 변경 작업입니다.

### 7.3 GitHub Token 설정

빌드 머신에서 GitHub Release에 자동 업로드하려면 토큰이 필요합니다.

PowerShell:

```powershell
$env:GH_TOKEN = "<github-token>"
```

GitHub Actions에서는 보통 기본 `GITHUB_TOKEN`을 사용할 수 있습니다.

### 7.4 자동 업로드 빌드

```powershell
npm run dist:win -- --publish always
```

`--publish always`는 빌드 후 GitHub Release asset 업로드까지 수행합니다. 태그 기반으로만 publish하려면 CI에서 `--publish onTag` 전략을 사용할 수 있습니다.

---

## 8. GitHub Actions 예시

현재 권장 방식은 GitHub Release asset 업로드와 generic 업데이트 서버 업로드를 분리하는 것입니다. 아래는 뼈대 예시입니다.

```yaml
name: release-windows

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Public release guard
        run: npm run check:public-release

      - name: Test
        run: node --test scripts\*.test.mjs

      - name: Build installer
        run: npm run dist:win

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            release/*Setup-x64.exe
            release/*Portable-x64.exe
            release/*.blockmap
            release/latest.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

업데이트 서버 업로드는 사용하는 인프라에 맞춰 별도 step으로 추가합니다.

S3 예시:

```yaml
      - name: Upload update feed to S3
        run: |
          aws s3 cp release/latest.yml s3://YOUR_BUCKET/xenesis-desk/latest.yml
          aws s3 cp "release/Xenesis Desk-${{ github.ref_name }}-Setup-x64.exe" s3://YOUR_BUCKET/xenesis-desk/
          aws s3 cp release/*.blockmap s3://YOUR_BUCKET/xenesis-desk/
```

실제 파일명은 `v` prefix와 `package.json` version 형식 차이가 있으므로 배포 스크립트에서 명확히 맞추는 것이 안전합니다.

---

## 9. 코드 서명

Windows에서 코드 서명이 없으면 SmartScreen이 “알 수 없는 게시자” 경고를 표시할 수 있습니다. 공개 배포라면 코드 서명을 권장합니다.

PowerShell 환경변수:

```powershell
$env:CSC_LINK = "<path-to-windows-signing-certificate.pfx>"
$env:CSC_KEY_PASSWORD = "<certificate-password>"
```

그 다음 일반 빌드를 실행합니다.

```powershell
npm run dist:win
```

서명 확인:

```powershell
Get-AuthenticodeSignature ".\release\Xenesis Desk-0.1.1-Setup-x64.exe"
```

서명된 파일을 기준으로 생성된 `latest.yml`과 `.blockmap`을 함께 배포해야 합니다.

---

## 10. 설치본 smoke test

릴리스 전에 최소 한 번은 설치본으로 확인합니다.

1. 기존 설치본 제거 또는 테스트 VM 준비
2. `release/Xenesis Desk-{version}-Setup-x64.exe` 실행
3. 앱 실행 확인
4. 설정 > 앱 업데이트에서 현재 채널/feed URL 확인
5. `진단/로그 센터` 열기
6. 기본 기능 확인
   - 폴더 열기
   - 터미널 열기
   - 파일 미리보기
   - 확장 관리
   - FTP/SFTP 설정이 깨지지 않는지 확인

자동 업데이트 smoke test는 두 버전이 필요합니다.

```text
1. 0.1.0 설치
2. 0.1.1 빌드
3. 0.1.1의 latest.yml + Setup exe + blockmap을 업데이트 서버에 업로드
4. 0.1.0 실행
5. 설정 > 앱 업데이트 > 업데이트 확인
6. 새 버전 감지
7. 다운로드
8. 지금 설치
9. 앱 재시작 후 버전 확인
```

---

## 11. Portable 버전 주의사항

`electron-updater`의 Windows 자동 업데이트 대상은 NSIS 설치본입니다. Xenesis Desk의 Portable exe는 수동 다운로드용으로 다루는 것이 안전합니다.

| 배포물 | 자동 업데이트 |
|---|---|
| `Xenesis Desk-{version}-Setup-x64.exe` | 지원 |
| `Xenesis Desk-{version}-Portable-x64.exe` | 수동 교체 권장 |

GitHub Release에는 Portable을 올려도 되지만, 앱 내부 업데이트 흐름은 설치형 사용자를 기준으로 안내해야 합니다.

---

## 12. 문제 해결

### 업데이트가 감지되지 않음

확인할 것:

```powershell
Invoke-WebRequest https://update.xamong.com/xenesis-desk/latest.yml
```

- `latest.yml`이 404인지 확인
- 앱의 설정 > 앱 업데이트에서 feed URL이 맞는지 확인
- `package.json` version이 이전 배포보다 높은지 확인
- `latest.yml`의 `version`이 새 버전인지 확인
- GitHub provider를 쓴다면 Release가 draft 상태가 아닌지 확인

### 다운로드 중 sha512 오류

원인:

- `latest.yml`과 설치 exe가 서로 다른 빌드에서 생성됨
- 업로드 후 exe 파일명이 바뀜
- exe를 재서명하거나 수정했지만 `latest.yml`을 다시 만들지 않음

해결:

```powershell
npm run clean
npm run dist:win
```

새로 생성된 `latest.yml`, Setup exe, blockmap을 한 세트로 다시 업로드합니다.

### 개발 모드에서 업데이트 테스트가 안 됨

정상입니다. 현재 코드는 `app.isPackaged === false`일 때 자동 업데이트를 비활성화합니다.

업데이트 UI만 개발 모드에서 강제로 확인하려면 `autoUpdater.forceDevUpdateConfig = true`와 `dev-app-update.yml`이 필요하지만, 배포 전 반드시 원복해야 합니다.

`dev-app-update.yml` 예:

```yaml
provider: generic
url: https://update.xamong.com/xenesis-desk/
```

### GitHub Release asset은 있는데 앱이 업데이트를 못 찾음

현재 설정에서는 앱이 GitHub Release를 직접 보지 않고 `https://update.xamong.com/xenesis-desk/`를 봅니다.

따라서 GitHub Release에 파일을 올렸더라도 자동 업데이트 서버에 아래 파일이 없으면 앱은 업데이트를 찾지 못합니다.

```text
latest.yml
Xenesis Desk-{version}-Setup-x64.exe
Xenesis Desk-{version}-Setup-x64.exe.blockmap
```

---

## 13. 릴리스 체크리스트

```markdown
- [ ] package.json version 증가
- [ ] 변경 내용/릴리스 노트 작성
- [ ] npm run check:public-release
- [ ] npm run typecheck
- [ ] node --test scripts\*.test.mjs
- [ ] npm run dist:win
- [ ] 설치본 실행 smoke test
- [ ] 자동 업데이트 smoke test
- [ ] Git tag 생성: vX.Y.Z
- [ ] GitHub Release 생성
- [ ] Setup exe 업로드
- [ ] Portable exe 업로드
- [ ] latest.yml 업로드
- [ ] blockmap 업로드
- [ ] update.xamong.com public stable feed 업로드
- [ ] GitHub Release publish
- [ ] 설정 > 앱 업데이트에서 새 버전 감지 확인
```

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `package.json` | 버전, productName, electron-builder 설정, publish 설정 |
| `scripts/publicReleaseCheck.mjs` | 공개판 릴리스 가드 |
| `src/main/index.ts` | `electron-updater` 설정과 IPC 핸들러 |
| `src/preload/index.ts` | `updaterAPI` preload bridge |
| `src/shared/types.ts` | 업데이트 상태/설정 타입 |
| `src/renderer/panes/SettingsPane.tsx` | 설정 > 앱 업데이트 UI |
| `src/renderer/App.tsx` | 다운로드 완료 배너 |
| `docs/deployment-and-update.md` | 이 문서 |

## 참고 자료

- electron-builder Auto Update: https://www.electron.build/docs/features/auto-update
- electron-builder Publish 설정: https://www.electron.build/docs/publish
- electron-builder NSIS target: https://www.electron.build/nsis/
- GitHub Releases 개요: https://docs.github.com/articles/about-releases
- GitHub Release 생성/관리: https://docs.github.com/github/administering-a-repository/creating-releases
