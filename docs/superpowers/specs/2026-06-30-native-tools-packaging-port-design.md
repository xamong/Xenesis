# Native Tools Packaging Port Design

Date: 2026-06-30
Status: Approved for implementation planning

## Goal

Port the native helper source tree from the sibling workspace
`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\tools` into this repository
without changing the current runtime behavior. The immediate objective is to
make the helper sources buildable and packageable from the current Xenesis Desk
repository while preserving the existing Windows PowerShell app-control
baseline.

## Confirmed User Choice

The user chose option 1: source plus build and packaging wiring only.

This spec intentionally avoids porting the broader runtime integration from the
sibling repository. That larger work includes expanded `xd.apps.*` actions,
macOS app-control adapter selection, `officeControl`, and CR wiring. Those are
out of scope for this slice.

## Source Findings

The sibling `tools` folder contains three native helper projects:

- `tools/windows-control-host`: .NET 8 Windows UIA/MSAA/Win32 helper for
  inspect, tree, element lookup, highlight, and element capture.
- `tools/office-control-host`: .NET 8 Windows COM helper for Excel-oriented
  Office automation.
- `tools/macos-control-host`: Swift package for macOS Accessibility, CGEvent,
  screenshot, highlight, and app-control helper actions.

The current repository has no top-level `tools` folder. Its current
`src/main/appControl` implementation is a Windows PowerShell baseline and does
not currently depend on native helper executables.

The sibling repository also has package-level helper build scripts and
electron-builder `extraResources` entries. Without that wiring, copying source
files alone would not make packaged releases include the helper binaries.

## Scope

Implement only the following:

- Copy native helper source files into this repository under top-level `tools/`.
- Do not copy generated build output:
  - `bin/`
  - `obj/`
  - `publish/`
  - `.build/`
- Add ignore rules for native helper build outputs.
- Add the macOS helper build script:
  - `scripts/build-macos-control-host.mjs`
- Add package scripts for helper builds:
  - `build:windows-control-host`
  - `build:windows-control-host:arm64`
  - `build:office-control-host`
  - `build:office-control-host:arm64`
  - `build:macos-control-host`
  - `build:helpers:win`
  - `build:helpers:win:x64`
  - `build:helpers:win:arm64`
  - `build:helpers:mac`
  - `build:helpers:linux`
- Update platform packaging commands so Windows and macOS package builds run
  the relevant helper build first.
- Add electron-builder platform `extraResources` entries for published helper
  outputs:
  - Windows: `tools/windows-control-host/publish` to `windows-control-host`
  - Windows: `tools/office-control-host/publish` to `office-control-host`
  - macOS: `tools/macos-control-host/publish` to `macos-control-host`

## Out Of Scope

Do not implement these in this slice:

- No changes to `src/main/appControl/windowsAppControl.ts`.
- No replacement of PowerShell app-control behavior with native host behavior.
- No expansion of `src/shared/externalAppControl.ts` action types.
- No `officeControl` service, shared model, settings, CR paths, or tests.
- No macOS app-control runtime adapter selection.
- No live CR behavior claims for native host usage.
- No generated helper binaries committed to Git.

## Architecture

The native helper projects will sit at the repository root under `tools/` as
source-only companion projects. The Electron application build remains
TypeScript-first, and helper builds are invoked only by explicit helper scripts
or platform package scripts.

```text
package.json scripts
  -> dotnet publish tools/windows-control-host
  -> dotnet publish tools/office-control-host
  -> node scripts/build-macos-control-host.mjs
  -> electron-builder platform package
  -> build.win/mac.extraResources includes tools/*/publish
```

This gives packaged builds a stable place to collect helper binaries later
without changing the runtime entry points in this slice.

## Error Handling

The build scripts should fail honestly when required platform tooling is not
available:

- Windows helper builds require `dotnet` and a Windows-compatible build target.
- macOS helper build requires macOS and Swift/Xcode Command Line Tools.
- Linux helper build remains a no-op informational command because this slice
  does not introduce Linux native helper support.

Runtime host-not-found behavior is not introduced in this slice because runtime
host clients are not ported.

## Testing And Verification

The implementation should verify the narrow package/build surface:

- `npm run typecheck`
- `npm run check:public-release`
- On Windows, run `npm run build:helpers:win:x64` if .NET 8 is available.
- The macOS helper build script can be statically verified on Windows, but the
  actual Swift build should be treated as macOS-only verification.

If helper build tooling is unavailable locally, record the exact command and
failure reason instead of claiming the helper build passed.

## Risks

- Adding helper build steps to `pack:win` and `dist:win` may make packaging
  depend on .NET 8 being installed. That is expected for helper-enabled Windows
  packaging but should be documented by the command behavior.
- Adding helper build steps to macOS package commands requires Swift/Xcode
  Command Line Tools on macOS.
- The sibling repository has broader runtime integration. Pulling it into this
  slice would expand the behavioral surface substantially, so this design keeps
  runtime code unchanged.

## Success Criteria

- The tracked `tools` source tree exists in this repository.
- Generated native build outputs are ignored and not committed.
- `package.json` exposes helper build commands.
- Windows and macOS package scripts build helpers before packaging.
- electron-builder includes helper publish directories as platform resources.
- Existing app-control runtime behavior remains unchanged.
- Verification results are recorded without claiming native runtime execution.
