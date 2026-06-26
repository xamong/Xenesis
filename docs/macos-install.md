# Xenesis Desk macOS 설치 및 패키징 가이드

이 문서는 macOS에서 `Xenesis Desk`를 빌드하고 설치 가능한 `.dmg`, `.zip`, `.app` 결과물을 만드는 절차를 정리합니다.

## 지원 범위

공개 배포 기준 macOS 최소 지원은 다음과 같이 잡습니다.

- macOS 12 Monterey 이상
- Intel x64 Mac
- Apple Silicon arm64 Mac

현재 프로젝트는 Electron 41 기반입니다. Electron 38부터 macOS 11 Big Sur 지원이 제거되었으므로, README와 배포 문서에서는 macOS 12 이상을 최소 기준으로 표기합니다.

이 문서의 설치 절차는 로컬 빌드와 내부 테스트 설치를 우선 대상으로 합니다. 공개 배포용 macOS 앱은 Developer ID signing과 notarization 절차를 추가로 거쳐야 합니다.

## 필요한 사항

- macOS 12 이상이 설치된 Intel 또는 Apple Silicon Mac
- Node.js 22.12 이상
- npm 10 이상
- Xcode Command Line Tools
- Git
- 인터넷 연결
- 현재 repo의 로컬 file dependency가 존재하는 workspace 구조

현재 `package.json`은 다음 로컬 패키지를 참조합니다.

```text
../pomelo-suite/packages/timeline
../xcon-chain/packages/core
../xcon-viewer/packages/core
../xcon-viewer/packages/viewer
../xcon-workflow/packages/core
packages/xenesis
```

따라서 `xenesis-desk`만 단독으로 복사하면 `npm install`이 실패할 수 있습니다. macOS에서도 `pomelo-suite`, `xcon-viewer`, `xcon-chain`, `xcon-workflow`가 기존 상대 경로에 있어야 합니다.

Xcode Command Line Tools가 없으면 먼저 설치합니다.

```bash
xcode-select --install
```

## macOS 설치 스크립트

macOS 전용 스크립트는 다음 파일입니다.

```bash
scripts/macos-install.sh
```

기본 실행:

```bash
bash scripts/macos-install.sh
```

이 명령은 다음 순서로 진행합니다.

1. macOS, Node.js, npm, Xcode Command Line Tools 확인
2. workspace 상대 경로 dependency 확인
3. `npm install`
4. `npm run server:install`
5. `server`의 `better-sqlite3` native module 재빌드
6. Electron main process의 `@lydell/node-pty` native module 재빌드
7. 현재 Mac 아키텍처 기준으로 `npm run dist:mac` 실행
8. 생성된 `.app`에 quarantine 속성이 있으면 제거

## 빌드 아키텍처 선택

현재 Mac 기준 빌드:

```bash
bash scripts/macos-install.sh --arch current
```

Apple Silicon 빌드:

```bash
bash scripts/macos-install.sh --arch arm64
```

Intel Mac 빌드:

```bash
bash scripts/macos-install.sh --arch x64
```

Universal 빌드:

```bash
bash scripts/macos-install.sh --arch universal
```

주의: universal 빌드는 native module을 포함하므로 현재 아키텍처 단일 빌드보다 실패 가능성이 높습니다. 배포 전에는 Apple Silicon과 Intel 환경에서 각각 실행 테스트를 권장합니다.

## /Applications로 복사

패키징 후 `.app`을 `/Applications`로 복사하려면 `--install-app`을 붙입니다.

```bash
bash scripts/macos-install.sh --install-app
```

권한이 필요하면 스크립트가 `sudo ditto`를 사용합니다.

## package.json 스크립트

macOS 관련 npm 스크립트는 다음과 같습니다.

```bash
npm run pack:mac
npm run dist:mac
npm run dist:mac:arm64
npm run dist:mac:x64
npm run dist:mac:universal
```

`dist:mac`은 현재 실행 중인 Mac 아키텍처 기준으로 빌드합니다. 설치 배포본에는 `.dmg`가 필요하고, 자동 업데이트에는 `.zip` 메타데이터가 함께 필요합니다.

## 결과물

빌드 결과는 `release/` 아래에 생성됩니다.

예상 결과:

```text
release/
├── Xenesis Desk-0.1.0-mac-arm64.dmg
├── Xenesis Desk-0.1.0-mac-arm64.zip
├── latest-mac.yml
└── mac-arm64/Xenesis Desk.app
```

파일명은 버전, 아키텍처, electron-builder 생성 결과에 따라 달라질 수 있습니다.

## Gatekeeper와 서명

기본 스크립트는 Apple Developer ID가 없는 환경에서도 로컬 테스트 패키지를 만들 수 있도록, 서명 identity가 없으면 `CSC_IDENTITY_AUTO_DISCOVERY=false`를 설정합니다.

이 경우 결과물은 unsigned local build입니다. 다른 Mac으로 옮겨 실행할 때 Gatekeeper 경고가 나올 수 있습니다.

로컬 테스트에서 quarantine 때문에 실행이 막히면 다음 명령을 사용할 수 있습니다.

```bash
xattr -dr com.apple.quarantine "/Applications/Xenesis Desk.app"
```

공개 배포용 macOS 앱은 별도로 Developer ID 서명과 notarization 절차가 필요합니다. 현재 스크립트는 로컬 빌드와 내부 테스트 설치를 우선 대상으로 합니다.

## 빠른 점검

스크립트 변경 후 Windows/WSL 환경에서는 실제 macOS 패키징을 실행할 수 없습니다. 대신 정적 검증과 일반 빌드 검증을 실행합니다.

```bash
node --test scripts/packageMetadata.test.mjs
npm run typecheck
npm run build
```
