/**
 * TerminalHost — React 트리 외부에서 xterm 인스턴스를 관리하는 명령형 모듈.
 *
 * 핵심 아이디어:
 *   - xterm Terminal 인스턴스와 그 DOM 컨테이너는 React 생명주기에 종속되지 않음.
 *   - React TerminalPane 컴포넌트는 단순히 "마운트 포인트" 역할만 수행.
 *   - 탭 이동·패널 분리·플로트 등 레이아웃 변경 시 DOM 노드만 이동(move),
 *     PTY를 종료(kill)하거나 xterm을 재생성하지 않음.
 */

import { FitAddon } from '@xterm/addon-fit';
import { ImageAddon } from '@xterm/addon-image';
import { SearchAddon } from '@xterm/addon-search';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { type ITheme, Terminal } from '@xterm/xterm';
import type {
  LocalTerminalCliSelection,
  McpBridgeTerminalMetadata,
  ShellKind,
  TerminalSessionKind,
  TerminalSpawnConfig,
  ThemeName,
} from '../../shared/types';
import {
  buildTerminalCommandInputParts,
  dispatchTerminalCommandInputParts,
  type TerminalCommandInputMode,
} from './terminalWriteModel';
import {
  findKnownAppManagedNormalBufferCommand,
  isKnownAppManagedNormalBufferCommand,
  isKnownAppManagedNormalBufferPageControlCommand,
  isKnownAppManagedNormalBufferPageControlTranscript,
  isKnownAppManagedNormalBufferTranscript,
  reduceTerminalInputCommandLine,
  resolveAppManagedNormalBufferPageSequence,
  resolveAppManagedNormalBufferWheelAction,
  resolveTuiWheelAction,
  resolveWheelProbeScrollLines,
  shouldApplyScrollbackCorrectionAfterShrink,
  shouldResizePtyAfterFit,
} from './tuiScrollPolicy';
import { resolveXtermImageAddonPolicy } from './xtermImageAddonPolicy';

export interface TerminalHostSessionInfo {
  id: string;
  kind: TerminalSessionKind;
  label: string;
  detail: string;
  shell?: ShellKind;
  cwd?: string;
  initialCommand?: string;
  environmentText?: string;
  localCliAgentId?: LocalTerminalCliSelection;
  terminalMetadata?: McpBridgeTerminalMetadata;
  lastSentCommand?: string;
  shellContext: TerminalShellContext;
  groupId: string;
  groupName: string;
  active: boolean;
  fitLocked: boolean;
  isAltBuffer: boolean;
  imageAddonLoaded: boolean;
  imageAddonUnavailableReason?: string;
}

export interface TerminalShellContext {
  cwd?: string;
  lastSentCommand?: string;
  lastExitCode?: number;
  exited: boolean;
  connectionStatus: 'connected' | 'exited';
  updatedAt: number;
}

// ─── 테마 정의 ────────────────────────────────────────────────────────────────

const darkTheme: ITheme = {
  background: '#0d1117',
  foreground: '#e6edf3',
  cursor: '#e6edf3',
  selectionBackground: '#264f78',
  black: '#0d1117',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
};

const lightTheme: ITheme = {
  background: '#f8fafc',
  foreground: '#0f172a',
  cursor: '#0f172a',
  selectionBackground: '#cbd5e1',
  black: '#0f172a',
  red: '#be123c',
  green: '#15803d',
  yellow: '#a16207',
  blue: '#1d4ed8',
  magenta: '#7e22ce',
  cyan: '#0e7490',
  white: '#e2e8f0',
  brightBlack: '#64748b',
  brightRed: '#e11d48',
  brightGreen: '#16a34a',
  brightYellow: '#ca8a04',
  brightBlue: '#2563eb',
  brightMagenta: '#9333ea',
  brightCyan: '#0891b2',
  brightWhite: '#ffffff',
};

function getTheme(theme: ThemeName): ITheme {
  return theme === 'dark' ? darkTheme : lightTheme;
}

function parseOsc7Cwd(data: string): string {
  const raw = data.trim();
  if (!raw.startsWith('file://')) return '';
  try {
    const url = new URL(raw);
    const pathName = decodeURIComponent(url.pathname || '');
    if (!pathName) return '';
    if (/^\/[A-Za-z]:\//.test(pathName)) return pathName.slice(1).replace(/\//g, '\\');
    return pathName;
  } catch {
    return '';
  }
}

let recordedImageAddonPolicyDiagnostic = false;
let recordedImageAddonLoadDiagnostic = false;

function readRendererCsp(): string | undefined {
  const csp = document.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy" i]')?.content.trim();
  return csp || undefined;
}

function stringifyUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function recordImageAddonDiagnosticOnce(kind: 'policy' | 'load', payload: { message: string; detail?: string }): void {
  if (kind === 'policy') {
    if (recordedImageAddonPolicyDiagnostic) return;
    recordedImageAddonPolicyDiagnostic = true;
  } else {
    if (recordedImageAddonLoadDiagnostic) return;
    recordedImageAddonLoadDiagnostic = true;
  }

  window.diagnosticsAPI
    .record({
      level: kind === 'policy' ? 'warn' : 'error',
      source: 'renderer',
      scope: 'terminal.image-addon',
      message: payload.message,
      detail: payload.detail,
    })
    .catch(() => {});
}

// ─── TerminalInstance ─────────────────────────────────────────────────────────

class TerminalInstance {
  readonly termId: string;
  /** React 트리와 무관하게 살아있는 안정적인 DOM 컨테이너 */
  readonly container: HTMLDivElement;
  readonly term: Terminal;
  readonly fitAddon: FitAddon;
  imageAddon?: ImageAddon;
  private imageAddonUnavailableReason?: string;
  readonly searchAddon: SearchAddon;
  readonly serializeAddon: SerializeAddon;
  readonly spawnConfig: TerminalSpawnConfig;

  private resizeObs?: ResizeObserver;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  /** PTY resize를 xterm visual resize와 분리하기 위한 전용 타이머 */
  private ptyResizeTimer?: ReturnType<typeof setTimeout>;
  private readonly cleanups: Array<() => void> = [];

  /** React TerminalPane에서 등록하는 Ctrl+F 검색 토글 콜백 */
  onSearchToggle?: () => void;
  /** 우클릭 컨텍스트 메뉴 위치·선택 여부 콜백 */
  onContextMenu?: (x: number, y: number, hasSelection: boolean) => void;

  /**
   * 크기 고정 플래그 — true이면 fit() 호출이 무시됩니다.
   * Claude Code 등 화면 제어형 CLI 실행 중 활성화하면 SIGWINCH가 발생하지 않아
   * 앱이 화면을 다시 그리지 않고 스크롤백 내용을 유지합니다.
   */
  fitLocked = false;

  /**
   * 현재 alternate screen buffer 모드(TUI 앱 실행 중) 여부.
   * alternate 모드에서는 스크롤백이 없으므로 스크롤 버튼이 앱에 키 입력을 전달합니다.
   */
  isAltBuffer = false;

  /** React TerminalPane에서 등록하는 버퍼 모드 변경 콜백 */
  onBufferModeChange?: (isAlt: boolean) => void;

  private lastSentCommand = '';
  private pendingInputLine = '';
  private shellContext: TerminalShellContext = {
    exited: false,
    connectionStatus: 'connected',
    updatedAt: Date.now(),
  };

  constructor(
    termId: string,
    spawnConfig: TerminalSpawnConfig,
    theme: ThemeName,
    fontSize: number,
    onActivated?: (id: string) => void,
    onLink?: (url: string) => void,
    /** true이면 새 PTY를 스폰하지 않고 기존 세션에 채택(adopt) 모드로 연결 */
    adoptMode?: boolean,
    /** OSC 1337;CurrentDir= 시퀀스 수신 시 호출 — 탭 제목 갱신에 사용 */
    onCwdChange?: (termId: string, cwd: string) => void,
  ) {
    this.termId = termId;
    this.spawnConfig = spawnConfig;
    const initialAppManagedCommand = findKnownAppManagedNormalBufferCommand(
      spawnConfig.kind === 'shell' ? (spawnConfig.profile?.initialCommand ?? '') : '',
    );
    if (initialAppManagedCommand) this.markCommandSent(initialAppManagedCommand);

    // 안정적인 컨테이너 생성 — 절대로 파괴되지 않음 (kill() 전까지)
    this.container = document.createElement('div');
    this.container.className = 'term-dnd-host';
    this.container.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#0d1117;';

    // 컨테이너 클릭 → 활성 터미널 알림 (xterm.onFocus 대신 DOM 이벤트 사용)
    const onMouseDown = () => onActivated?.(termId);
    this.container.addEventListener('mousedown', onMouseDown);
    this.cleanups.push(() => this.container.removeEventListener('mousedown', onMouseDown));

    // ── 파일 탐색기 → 터미널 드래그 앤 드롭 ─────────────────────────────────
    // 드래그 데이터 타입: 'application/xamong-path' (내부 DnD) 또는 'text/plain'
    // dragover/dragenter에서는 .types 배열만 접근 가능 (getData는 drop에서만 가능)
    const isFileDrag = (e: DragEvent) =>
      e.dataTransfer?.types.includes('application/xamong-path') === true ||
      e.dataTransfer?.types.includes('text/plain') === true;

    const onDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      this.container.classList.add('is-drag-over');
    };
    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };
    const onDragLeave = (e: DragEvent) => {
      // relatedTarget이 컨테이너 내부면 자식 간 이동 — 클래스 유지
      if (!this.container.contains(e.relatedTarget as Node)) {
        this.container.classList.remove('is-drag-over');
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      this.container.classList.remove('is-drag-over');

      const raw = (
        e.dataTransfer?.getData('application/xamong-path') ||
        e.dataTransfer?.getData('text/plain') ||
        ''
      ).trim();
      if (!raw) return;

      // 공백이 포함된 경로는 큰따옴표로 묶어서 삽입
      const toInsert = raw.includes(' ') ? `"${raw}"` : raw;
      window.terminalAPI.write(this.termId, toInsert);
      requestAnimationFrame(() => this.term.focus());
    };

    this.container.addEventListener('dragenter', onDragEnter);
    this.container.addEventListener('dragover', onDragOver);
    this.container.addEventListener('dragleave', onDragLeave);
    this.container.addEventListener('drop', onDrop);
    this.cleanups.push(
      () => this.container.removeEventListener('dragenter', onDragEnter),
      () => this.container.removeEventListener('dragover', onDragOver),
      () => this.container.removeEventListener('dragleave', onDragLeave),
      () => this.container.removeEventListener('drop', onDrop),
    );

    // 우클릭 → 브라우저/Electron 기본 컨텍스트 메뉴 억제 후 커스텀 메뉴 열기
    const onCtxMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.onContextMenu?.(e.clientX, e.clientY, this.term.getSelection().length > 0);
    };
    this.container.addEventListener('contextmenu', onCtxMenu);
    this.cleanups.push(() => this.container.removeEventListener('contextmenu', onCtxMenu));

    this.term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      convertEol: true,
      fontFamily: '"Cascadia Code", "Cascadia Mono", Consolas, "Courier New", monospace',
      fontSize,
      lineHeight: 1.2,
      scrollback: 10_000,
      tabStopWidth: 4,
      theme: getTheme(theme),
    });

    this.fitAddon = new FitAddon();
    const imageAddonPolicy = resolveXtermImageAddonPolicy(readRendererCsp());
    if (imageAddonPolicy.canLoad) {
      try {
        this.imageAddon = new ImageAddon({
          sixelSupport: false,
          iipSupport: true,
        });
      } catch (error) {
        const message = stringifyUnknownError(error);
        this.imageAddonUnavailableReason = `Load failed: ${message.slice(0, 160)}`;
        recordImageAddonDiagnosticOnce('load', {
          message: 'xterm image addon initialization failed',
          detail: message,
        });
      }
    } else {
      this.imageAddonUnavailableReason = 'CSP blocks WebAssembly eval';
      recordImageAddonDiagnosticOnce('policy', {
        message: 'xterm image addon disabled by renderer CSP',
        detail: `effectiveScriptPolicy=${imageAddonPolicy.effectiveScriptPolicy}; ${imageAddonPolicy.detail}`,
      });
    }
    this.searchAddon = new SearchAddon();
    this.serializeAddon = new SerializeAddon();
    // 링크 클릭 시: onLink 콜백이 등록된 경우(→ 탭 열기) 우선, 없으면 OS 기본 브라우저
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      if (onLink) {
        onLink(uri);
      } else {
        window.fileAPI.openExternal(uri).catch(() => {});
      }
    });

    this.term.loadAddon(this.fitAddon);
    if (this.imageAddon) {
      try {
        this.term.loadAddon(this.imageAddon);
      } catch (error) {
        const message = stringifyUnknownError(error);
        this.imageAddon = undefined;
        this.imageAddonUnavailableReason = `Load failed: ${message.slice(0, 160)}`;
        recordImageAddonDiagnosticOnce('load', {
          message: 'xterm image addon activation failed',
          detail: message,
        });
      }
    }
    this.term.loadAddon(this.searchAddon);
    this.term.loadAddon(this.serializeAddon);
    this.term.loadAddon(webLinksAddon);

    // 컨테이너가 DOM에 없어도 open() 가능 (attachTo() 후 fit)
    this.term.open(this.container);

    // ── CWD 추적: OSC 1337;CurrentDir=<path> 시퀀스 파싱 ─────────────────────
    // PowerShell prompt hook이 매 프롬프트 표시 전 전송하는 iTerm2 확장 시퀀스.
    // xterm.js parser API로 가로채어 onCwdChange 콜백으로 전달한다.
    const oscDispose = this.term.parser.registerOscHandler(1337, (data) => {
      if (data.startsWith('CurrentDir=')) {
        const parsedCwd = data.slice('CurrentDir='.length);
        if (parsedCwd) {
          this.shellContext = { ...this.shellContext, cwd: parsedCwd, updatedAt: Date.now() };
          onCwdChange?.(termId, parsedCwd);
        }
      }
      return false; // 다른 핸들러에도 전달 허용
    });
    this.cleanups.push(() => oscDispose.dispose());

    const osc7Dispose = this.term.parser.registerOscHandler(7, (data) => {
      const parsedCwd = parseOsc7Cwd(data);
      if (parsedCwd) {
        this.shellContext = { ...this.shellContext, cwd: parsedCwd, updatedAt: Date.now() };
        onCwdChange?.(termId, parsedCwd);
      }
      return false;
    });
    this.cleanups.push(() => osc7Dispose.dispose());

    // IPC 구독
    const dataDispose = this.term.onData((data) => {
      this.trackManualInputCommand(data);
      window.terminalAPI.write(termId, data);
    });
    const removeData = window.terminalAPI.onData(termId, (e) => this.term.write(e.data));
    const removeExit = window.terminalAPI.onExit(termId, (e) => {
      this.markExited(e.exitCode);
      this.term.writeln(`\r\n\x1b[2m[Process exited (code: ${e.exitCode})]\x1b[0m`);
    });

    // 단축키 처리
    const keyDispose = this.term.onKey(({ domEvent }) => {
      // Ctrl+F: 검색 토글
      if (domEvent.ctrlKey && domEvent.key === 'f') {
        domEvent.preventDefault();
        this.onSearchToggle?.();
        return;
      }
      // Ctrl+Insert: 선택 영역 복사
      if (domEvent.ctrlKey && domEvent.key === 'Insert') {
        domEvent.preventDefault();
        const text = this.term.getSelection();
        if (text) navigator.clipboard.writeText(text).catch(() => {});
        return;
      }
      // Shift+Insert: 클립보드 붙여넣기
      if (domEvent.shiftKey && domEvent.key === 'Insert') {
        domEvent.preventDefault();
        navigator.clipboard
          .readText()
          .then((t) => {
            if (t) this.term.paste(t);
          })
          .catch(() => {});
        return;
      }
    });

    this.term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (
        !this.isAltBuffer &&
        this.isAppManagedNormalBufferPageControlSession() &&
        (event.key === 'PageUp' || event.key === 'PageDown')
      ) {
        event.preventDefault();
        window.terminalAPI.write(
          this.termId,
          resolveAppManagedNormalBufferPageSequence(event.key === 'PageUp' ? 'previous' : 'next'),
        );
        return false;
      }
      return true;
    });

    // ── Alternate buffer 전환 감지 ──────────────────────────────────────────
    // 일부 TUI 앱은 alternate screen buffer(DECSET ?1049h)를 사용한다.
    // Claude처럼 normal buffer 위에서 PageUp/PageDown을 직접 처리하는 앱은 명령 기반 정책으로 보완한다.
    // alternate 모드에서는 스크롤백이 없으므로 별도 처리가 필요함.
    const bufChangeDispose = this.term.buffer.onBufferChange((buf) => {
      this.isAltBuffer = buf.type === 'alternate';
      this.onBufferModeChange?.(this.isAltBuffer);
      // TUI 앱 종료(→ normal 복귀) 시 최신 출력으로 스크롤
      if (!this.isAltBuffer) {
        requestAnimationFrame(() => {
          if (!this.term.element) return; // dispose 후 RAF 실행 방어
          try {
            this.term.scrollToBottom();
          } catch {
            /* disposed */
          }
        });
      }
    });
    // 초기 상태 설정 (터미널 생성 시점에 이미 alternate일 경우 대비)
    this.isAltBuffer = this.term.buffer.active.type === 'alternate';

    // ── Alternate buffer 모드에서 마우스 휠 처리 ─────────────────────────
    // ⚠️ DOM container.addEventListener('wheel') 방식은 절대 사용하지 말 것.
    //   TUI 앱이 SGR 마우스 프로토콜을 활성화하면 xterm 자체 휠 핸들러가 PTY에
    //   마우스 이벤트 시퀀스를 전송하는 동시에, DOM 리스너도 Page Up/Down을
    //   전송하여 이중 입력으로 앱이 크래시됨.
    //
    // attachCustomWheelEventHandler는 xterm 내부 처리 파이프라인의 최전방에서
    // 실행되므로 return false 시 xterm의 스크롤 및 마우스 프로토콜 처리가 완전히 억제됨.
    this.term.attachCustomWheelEventHandler((e: WheelEvent) => {
      if (!this.isAltBuffer && this.isAppManagedNormalBufferPageControlSession()) {
        const action = resolveAppManagedNormalBufferWheelAction({
          deltaY: e.deltaY,
          deltaMode: e.deltaMode,
        });
        if (action.kind === 'key') {
          for (let i = 0; i < action.repeat; i++) {
            window.terminalAPI.write(this.termId, action.sequence);
          }
          return false;
        }
      }

      const action = resolveTuiWheelAction({
        isAltBuffer: this.isAltBuffer,
        mouseTrackingMode: this.term.modes.mouseTrackingMode,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        shiftKey: e.shiftKey,
      });

      if (action.kind === 'native') {
        // normal 모드 또는 mouse-aware alternate TUI: xterm 자체 처리에 위임.
        // TUI가 mouse tracking을 켠 경우 휠은 SGR mouse event로 앱에 전달된다.
        return true;
      }

      // mouse tracking이 없는 TUI 또는 Shift+휠: 기존 키 입력 fallback.
      for (let i = 0; i < action.repeat; i++) {
        window.terminalAPI.write(this.termId, action.sequence);
      }
      return false; // xterm 처리 차단 — 마우스 프로토콜 이중 전송 방지
    });

    this.cleanups.push(
      () => dataDispose.dispose(),
      () => removeData(),
      () => removeExit(),
      () => keyDispose.dispose(),
      () => bufChangeDispose.dispose(),
      () => clearTimeout(this.resizeTimer),
      () => clearTimeout(this.ptyResizeTimer),
    );

    // PTY 스폰 또는 기존 세션 채택 — 이중 RAF로 레이아웃 정착 후 실행.
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          this.fit();
          if (adoptMode) {
            // ── Adopt 모드: 기존 PTY 세션 소유권 이전 + 스크롤백 재생 ──────────
            const result = await window.terminalAPI.adopt(termId);
            if (result?.scrollback) {
              // 스크롤백 버퍼를 xterm에 직접 기록 (PTY 전달 없이 디스플레이만)
              this.term.write(result.scrollback);
            }
            // 스크롤백 재생 후 최신 출력 위치로 이동
            requestAnimationFrame(() => {
              try {
                this.term.scrollToBottom();
              } catch {
                /* disposed */
              }
            });
          } else {
            // ── Normal 모드: 새 PTY 스폰 ──────────────────────────────────────
            await window.terminalAPI.spawn({
              id: termId,
              ...spawnConfig,
              cols: this.term.cols || 80,
              rows: this.term.rows || 24,
            });
            // spawn 후 재fit (PTY 크기와 xterm 크기 동기화)
            requestAnimationFrame(() => this.fit());
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const label = adoptMode ? 'Terminal connection failed' : 'Shell start failed';
          this.term.writeln(`\x1b[31m${label}: ${msg}\x1b[0m`);
        }
      });
    });
  }

  fit(): void {
    // 크기 고정 모드: fit() 호출 전체 차단 — TUI 앱이 SIGWINCH를 받지 않아 화면을 다시 그리지 않음
    if (this.fitLocked) return;

    // 레이아웃이 아직 정착되지 않은 경우 (0×0, 극소 크기) fit을 건너뜀.
    // xterm-addon-fit이 0행으로 resize하면 PTY 상태가 오염되고 스크롤백이 깨짐.
    const { clientWidth, clientHeight } = this.container;
    if (clientWidth < 10 || clientHeight < 10) return;

    const prevRows = this.term.rows;
    const prevCols = this.term.cols;

    try {
      this.fitAddon.fit();
    } catch {
      return; // 컨테이너가 숨겨진 상태일 수 있음
    }

    const newRows = this.term.rows;
    const newCols = this.term.cols;

    // ── 스크롤백 복원 (xterm.js v5 resize 버그 워크어라운드) ──────────────────
    // xterm.js의 buffer.resize()는 커서(_y) 위치 기반으로 스크롤백 이동량을 계산함.
    // 커서가 뷰포트 하단이 아닌 중간에 있으면 (예: 프롬프트가 중간에 있을 때)
    // 창을 축소해도 기존 스크롤백 내용이 스크롤백으로 돌아가지 않는다.
    // → 내부 _ybase / _ydisp를 직접 수정하여 올바른 스크롤백 상태를 복원.
    if (newRows < prevRows) {
      requestAnimationFrame(() => this.fixScrollbackAfterShrink());
    }

    // ── PTY resize — xterm visual resize와 별도 디바운스 ────────────────────
    // ConPTY(Windows) 또는 PTY는 resize 시 reflow를 수행하며, 이 reflow 과정에서
    // 보내는 VT 시퀀스가 xterm 버퍼를 간섭할 수 있음.
    // 스플리터 드래그 중 PTY resize가 과다 발생하지 않도록 300ms 디바운스 적용.
    if (
      shouldResizePtyAfterFit({
        isAltBuffer: this.isAltBuffer,
        prevRows,
        prevCols,
        newRows,
        newCols,
      })
    ) {
      clearTimeout(this.ptyResizeTimer);
      this.ptyResizeTimer = setTimeout(() => {
        // PTY resize 직전 최신 cols/rows 사용 (드래그 완료 후의 최종 크기)
        if (this.term.cols > 0 && this.term.rows > 0) {
          window.terminalAPI.resize(this.termId, this.term.cols, this.term.rows);
        }
      }, 300);
    }
  }

  /**
   * xterm.js resize 버그 워크어라운드:
   *
   * 증상: 창을 축소하면 뷰포트에 있던 내용이 스크롤백으로 이동하지 않아
   *       최신 출력이 가려지거나 스크롤 불가 상태가 됨.
   *
   * 수정: xterm v6 공개 API(scrollToLine)로 올바른 뷰포트 위치를 복원.
   *       내부 API(_ybase/_ydisp) 직접 조작은 v6에서 렌더 갱신을 보장하지 않아 제거.
   */
  private fixScrollbackAfterShrink(): void {
    try {
      if (
        !shouldApplyScrollbackCorrectionAfterShrink({
          isAltBuffer: this.isAltBuffer,
          lastSentCommand: this.lastSentCommand,
        })
      )
        return;
      if (!this.term.element) return; // dispose 후 호출 방어
      const buf = this.term.buffer.normal;
      const totalLines = buf.length;
      const newRows = this.term.rows;
      // 전체 라인 수에서 현재 뷰포트 높이를 뺀 위치 = 최신 출력의 시작점
      const expectedBaseY = Math.max(0, totalLines - newRows);
      // viewportY가 이미 최신 위치면 수정 불필요
      if (buf.viewportY >= expectedBaseY) return;
      // 공개 API로 뷰포트를 최신 출력으로 이동
      this.term.scrollToLine(expectedBaseY);
    } catch {
      // xterm 버전 변경 또는 dispose 후 조용히 무시
    }
  }

  focus(): void {
    this.term.focus();
  }

  /**
   * 크기 고정 설정/해제.
   * locked=false (해제) 시 즉시 fit을 실행해 pane 크기와 동기화.
   */
  setFitLock(locked: boolean): void {
    this.fitLocked = locked;
    if (!locked) {
      requestAnimationFrame(() => requestAnimationFrame(() => this.fit()));
    }
  }

  /** 스크롤백 맨 위 (버퍼 처음)로 이동 */
  scrollToTop(): void {
    try {
      this.term.scrollToTop();
    } catch {
      /* disposed */
    }
  }

  /** 최신 출력(버퍼 끝)으로 이동 */
  scrollToBottom(): void {
    try {
      this.term.scrollToBottom();
    } catch {
      /* disposed */
    }
  }

  /** PTY 입력 없이 xterm 뷰포트를 직접 스크롤 */
  scrollLines(lines: number): void {
    if (!Number.isFinite(lines) || lines === 0) return;
    try {
      this.term.scrollLines(Math.trunc(lines));
    } catch {
      /* disposed */
    }
  }

  /** 현재 보이는 영역 높이만큼 xterm 뷰포트를 페이지 이동 */
  pageHistoryViewport(direction: 'previous' | 'next', viewportHeight: number): void {
    try {
      const containerHeight = this.container.clientHeight || viewportHeight || 1;
      const rowHeight = this.term.rows > 0 ? Math.max(1, containerHeight / this.term.rows) : 16;
      const visibleRows = Math.max(1, Math.floor((viewportHeight || containerHeight) / rowHeight));
      this.term.scrollLines(direction === 'previous' ? -visibleRows : visibleRows);
    } catch {
      // disposed
    }
  }

  getSelection(): string {
    return this.term.getSelection();
  }

  getBufferText(): string {
    const buffer = this.term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i += 1) {
      lines.push(buffer.getLine(i)?.translateToString(true) ?? '');
    }
    return lines.join('\n');
  }

  setLastSentCommand(command: string): void {
    this.markCommandSent(command);
  }

  markCommandSent(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;
    this.lastSentCommand = trimmed;
    this.pendingInputLine = '';
    this.shellContext = {
      ...this.shellContext,
      lastSentCommand: trimmed,
      exited: false,
      connectionStatus: 'connected',
      updatedAt: Date.now(),
    };
  }

  markExited(exitCode: number): void {
    this.shellContext = {
      ...this.shellContext,
      lastExitCode: exitCode,
      exited: true,
      connectionStatus: 'exited',
      updatedAt: Date.now(),
    };
  }

  getLastSentCommand(): string {
    return this.lastSentCommand;
  }

  private trackManualInputCommand(data: string): void {
    const result = reduceTerminalInputCommandLine(this.pendingInputLine, data);
    this.pendingInputLine = result.pendingLine;
    if (result.command) {
      this.markCommandSent(result.command);
    }
  }

  hasAppManagedNormalBufferTranscriptSignature(): boolean {
    const buffer = this.term.buffer.active;
    const start = Math.max(0, buffer.length - 200);
    const lines: string[] = [];
    for (let index = start; index < buffer.length; index += 1) {
      lines.push(buffer.getLine(index)?.translateToString(true) ?? '');
    }
    return isKnownAppManagedNormalBufferTranscript(lines.join('\n'));
  }

  hasAppManagedNormalBufferPageControlTranscriptSignature(): boolean {
    const buffer = this.term.buffer.active;
    const start = Math.max(0, buffer.length - 200);
    const lines: string[] = [];
    for (let index = start; index < buffer.length; index += 1) {
      lines.push(buffer.getLine(index)?.translateToString(true) ?? '');
    }
    return isKnownAppManagedNormalBufferPageControlTranscript(lines.join('\n'));
  }

  isAppManagedNormalBufferSession(): boolean {
    if (this.isAltBuffer) return false;
    return (
      isKnownAppManagedNormalBufferCommand(this.lastSentCommand) || this.hasAppManagedNormalBufferTranscriptSignature()
    );
  }

  isAppManagedNormalBufferPageControlSession(): boolean {
    if (this.isAltBuffer) return false;
    return (
      isKnownAppManagedNormalBufferPageControlCommand(this.lastSentCommand) ||
      this.hasAppManagedNormalBufferPageControlTranscriptSignature()
    );
  }

  copyToClipboard(): void {
    const text = this.term.getSelection();
    if (text) navigator.clipboard.writeText(text).catch(() => {});
  }

  pasteFromClipboard(): void {
    navigator.clipboard
      .readText()
      .then((t) => {
        if (t) this.term.paste(t);
      })
      .catch(() => {});
  }

  input(data: string): void {
    this.term.input(data, true);
  }

  paste(data: string): void {
    this.term.paste(data);
  }

  direct(data: string): void {
    window.terminalAPI.write(this.termId, data);
  }

  textInput(data: string): void {
    const textarea = this.term.textarea;
    if (!textarea) {
      this.input(data);
      return;
    }
    this.term.focus();
    const event = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      composed: false,
      data,
      inputType: 'insertText',
    });
    textarea.dispatchEvent(event);
  }

  enterKey(): void {
    const textarea = this.term.textarea;
    if (!textarea) {
      this.input('\r');
      return;
    }
    this.term.focus();
    const init = {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
    } as KeyboardEventInit;
    textarea.dispatchEvent(createTerminalKeyboardEvent('keydown', init));
    textarea.dispatchEvent(createTerminalKeyboardEvent('keyup', init));
  }

  selectAll(): void {
    this.term.selectAll();
  }

  // ── 화면 지우기 ──────────────────────────────────────────────────────────

  /** 현재 화면 내용을 스크롤백으로 밀어내고 화면 클리어 */
  clearScreen(): void {
    this.term.clear();
    this.term.focus();
  }

  /**
   * 화면 + 스크롤백 전체 초기화.
   * \x1b[H  : 커서 홈 위치
   * \x1b[2J : 화면 지우기
   * \x1b[3J : 스크롤백까지 지우기 (ED3 — xterm.js v5 지원)
   * term.write()는 xterm 디스플레이에 직접 작성 (PTY 전달 안 됨).
   */
  clearScrollback(): void {
    this.term.write('\x1b[H\x1b[2J\x1b[3J');
    this.term.focus();
  }

  /**
   * DOM 컨테이너를 새 마운트 포인트에 attach (이동).
   * 이전 부모에서 분리 후 새 부모에 append — xterm 인스턴스는 보존됨.
   */
  attachTo(mountPoint: HTMLElement): void {
    // 이전 ResizeObserver 해제
    this.resizeObs?.disconnect();

    // DOM 노드 이동 (destroy 없이)
    if (this.container.parentElement !== mountPoint) {
      mountPoint.appendChild(this.container);
    }

    // ResizeObserver: mountPoint(부모)와 컨테이너 모두 감시.
    // 디바운스 150ms — 스플리터 드래그 중 과다 호출로 인한 PTY 리사이즈 오염 방지.
    this.resizeObs = new ResizeObserver(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.fit(), 150);
    });
    this.resizeObs.observe(mountPoint);
    // 컨테이너 자체도 감시 (dock float/detach 시 mountPoint와 달리 container가 먼저 변할 수 있음)
    this.resizeObs.observe(this.container);

    // 이중 RAF: 복잡한 flex/absolute dock 레이아웃에서 단일 RAF로는
    // getComputedStyle(container).height가 0을 반환할 수 있어 이중으로 보장.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.fit());
    });
  }

  /**
   * DOM 컨테이너를 현재 마운트 포인트에서 분리 (detach).
   * PTY를 종료하지 않음 — 나중에 다른 위치에 re-attach 가능.
   */
  detach(): void {
    this.resizeObs?.disconnect();
    this.resizeObs = undefined;
    this.container.remove();
  }

  updateTheme(theme: ThemeName): void {
    this.term.options.theme = getTheme(theme);
  }

  updateFontSize(fontSize: number): void {
    this.term.options.fontSize = fontSize;
    // 폰트 크기 변경 후 셀 높이가 변경되므로 이중 RAF로 fit (단일 RAF는 부족)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.fit());
    });
  }

  findNext(query: string): void {
    this.searchAddon.findNext(query, { incremental: true, regex: false });
  }

  findPrev(query: string): void {
    this.searchAddon.findPrevious(query, { incremental: false, regex: false });
  }

  /**
   * PTY를 종료하지 않고 xterm 인스턴스와 IPC 리스너만 정리.
   * 터미널 탭을 다른 창으로 이동(분리/합치기)할 때 사용.
   * PTY는 Main Process에서 계속 실행되며, 새 창에서 adoptTerminal()로 재연결된다.
   */
  releaseXterm(): void {
    this.resizeObs?.disconnect();
    this.cleanups.forEach((fn) => fn()); // IPC 리스너 + DOM 이벤트 리스너 정리
    this.container.remove();
    this.term.dispose();
    // window.terminalAPI.kill() 호출하지 않음 — PTY 유지
  }

  /** PTY + xterm 완전 종료 */
  destroy(): void {
    this.resizeObs?.disconnect();
    this.cleanups.forEach((fn) => fn());
    this.container.remove();
    window.terminalAPI.kill(this.termId);
    this.term.dispose();
  }

  getSessionInfo(activeTermId: string): TerminalHostSessionInfo {
    const isShellSession = this.spawnConfig.kind !== 'ssh' && this.spawnConfig.kind !== 'telnet';
    const cwd = this.shellContext.cwd || (isShellSession ? this.spawnConfig.cwd : undefined);
    const localProfile = isShellSession ? this.spawnConfig.profile : undefined;
    return {
      id: this.termId,
      kind: resolveSessionKind(this.spawnConfig),
      label: resolveSessionLabel(this.spawnConfig, this.termId),
      detail: resolveSessionDetail(this.spawnConfig),
      shell: isShellSession ? this.spawnConfig.shell : undefined,
      cwd,
      initialCommand: localProfile?.initialCommand || undefined,
      environmentText: localProfile?.environmentText,
      localCliAgentId: localProfile?.localCliAgentId,
      terminalMetadata: this.spawnConfig.metadata,
      lastSentCommand: this.lastSentCommand || undefined,
      shellContext: {
        ...this.shellContext,
        cwd,
        lastSentCommand: this.lastSentCommand || this.shellContext.lastSentCommand,
      },
      groupId: resolveSessionGroupId(this.spawnConfig),
      groupName: resolveSessionGroupName(this.spawnConfig),
      active: this.termId === activeTermId,
      fitLocked: this.fitLocked,
      isAltBuffer: this.isAltBuffer,
      imageAddonLoaded: this.imageAddon !== undefined,
      imageAddonUnavailableReason: this.imageAddonUnavailableReason,
    };
  }
}

function resolveSessionKind(config: TerminalSpawnConfig): TerminalSessionKind {
  if (config.kind === 'ssh' || config.kind === 'telnet') return config.kind;
  return 'shell';
}

function resolveSessionLabel(config: TerminalSpawnConfig, fallbackId: string): string {
  if (config.kind === 'ssh' || config.kind === 'telnet') {
    return config.profile.name.trim() || config.profile.host.trim() || fallbackId.slice(0, 8);
  }
  const profileName = config.profile?.name?.trim();
  if (profileName) return profileName;
  return config.shell || 'shell';
}

function resolveSessionDetail(config: TerminalSpawnConfig): string {
  if (config.kind === 'ssh' || config.kind === 'telnet') {
    const profile = config.profile;
    const user = profile.username.trim();
    const host = profile.host.trim();
    const endpoint = user ? `${user}@${host}` : host;
    return `${profile.protocol.toUpperCase()} ${endpoint}:${profile.port}`;
  }
  const cwd = config.cwd?.trim();
  const shell = config.shell || 'shell';
  return cwd ? `${shell} - ${cwd}` : shell;
}

function resolveSessionGroupId(config: TerminalSpawnConfig): string {
  return String(config.profile?.groupId || '').trim();
}

function resolveSessionGroupName(config: TerminalSpawnConfig): string {
  return resolveSessionGroupId(config);
}

// ─── TerminalHostManager ──────────────────────────────────────────────────────

class TerminalHostManager {
  private readonly instances = new Map<string, TerminalInstance>();

  /** 현재 포커스된 터미널 ID */
  private _activeTermId = '';
  /** 활성 터미널이 바뀔 때 호출 (App.tsx에서 setActiveTermId 등록) */
  onActivate?: (termId: string) => void;
  /**
   * 터미널 내 링크 클릭 시 호출.
   * App.tsx에서 등록하면 내부 브라우저 탭으로 열리고,
   * 미등록 시 OS 기본 브라우저(shell.openExternal)로 폴백.
   */
  onOpenUrl?: (url: string) => void;
  /**
   * OSC 1337;CurrentDir= 시퀀스 수신 시 호출.
   * App.tsx에서 등록하면 도킹 탭 제목을 현재 경로의 마지막 폴더명으로 갱신한다.
   */
  onCwdChange?: (termId: string, cwd: string) => void;

  get activeTermId(): string {
    return this._activeTermId;
  }

  private handleActivated = (termId: string): void => {
    this._activeTermId = termId;
    this.onActivate?.(termId);
  };

  /** WebLinksAddon 에서 클릭 시각마다 호출 — onOpenUrl 유무를 런타임에 판별 */
  private handleLinkOpen = (url: string): void => {
    if (this.onOpenUrl) {
      this.onOpenUrl(url);
    } else {
      window.fileAPI.openExternal(url).catch(() => {});
    }
  };

  /** OSC 1337 CWD 시퀀스 수신 시 TerminalInstance에서 호출 */
  private handleCwdChange = (termId: string, cwd: string): void => {
    this.onCwdChange?.(termId, cwd);
  };

  private recordSentCommand(termId: string, command: string): void {
    this.instances.get(termId)?.setLastSentCommand(command);
  }

  /**
   * 새 터미널 인스턴스를 생성하고 PTY 스폰을 준비.
   * engine.addContent() 이전에 호출해 React 렌더링 전에 인스턴스를 준비.
   */
  spawn(termId: string, spawnConfig: TerminalSpawnConfig, theme: ThemeName, fontSize: number): void {
    if (this.instances.has(termId)) return;
    const inst = new TerminalInstance(
      termId,
      spawnConfig,
      theme,
      fontSize,
      this.handleActivated,
      this.handleLinkOpen,
      false, // adoptMode
      this.handleCwdChange,
    );
    this.instances.set(termId, inst);
  }

  /** React TerminalPane 마운트 시 호출 — DOM 노드를 마운트 포인트에 attach */
  attachTo(termId: string, mountPoint: HTMLElement): void {
    this.instances.get(termId)?.attachTo(mountPoint);
  }

  /** React TerminalPane 언마운트 시 호출 — DOM 노드만 분리, PTY 유지 */
  detach(termId: string): void {
    this.instances.get(termId)?.detach();
  }

  /**
   * xterm 인스턴스만 정리하고 PTY는 유지.
   * 터미널 탭을 다른 창으로 이동(분리/합치기)할 때 사용.
   * 이후 대상 창에서 adoptTerminal()로 PTY에 재연결된다.
   */
  release(termId: string): void {
    const inst = this.instances.get(termId);
    if (!inst) return;
    inst.releaseXterm();
    this.instances.delete(termId);
    if (this._activeTermId === termId) {
      const next = this.instances.keys().next().value ?? '';
      this._activeTermId = next;
      if (next) this.onActivate?.(next);
    }
  }

  /**
   * 다른 창에서 실행 중인 기존 PTY 세션에 새 xterm을 연결.
   * PTY 소유권을 현재 창으로 이전하고 스크롤백을 재생한다.
   * 이미 인스턴스가 존재하면 중복 생성하지 않는다.
   */
  adoptTerminal(termId: string, theme: ThemeName, fontSize: number): void {
    if (this.instances.has(termId)) return;
    const inst = new TerminalInstance(
      termId,
      { kind: 'shell', shell: 'powershell' }, // adoptMode=true 시 spawnConfig는 무시됨
      theme,
      fontSize,
      this.handleActivated,
      this.handleLinkOpen,
      true, // adoptMode
      this.handleCwdChange,
    );
    this.instances.set(termId, inst);
  }

  /** PTY + xterm 완전 종료 — 탭 닫기 시 명시적으로 호출 */
  kill(termId: string): void {
    const inst = this.instances.get(termId);
    if (!inst) return;
    inst.destroy();
    this.instances.delete(termId);
    if (this._activeTermId === termId) {
      // 남은 터미널 중 첫 번째를 활성으로 설정
      const next = this.instances.keys().next().value ?? '';
      this._activeTermId = next;
      if (next) this.onActivate?.(next);
    }
  }

  /** 모든 터미널 종료 — 레이아웃 초기화 시 호출 */
  killAll(): void {
    for (const [termId, inst] of this.instances.entries()) {
      inst.destroy();
      this.instances.delete(termId);
    }
    this._activeTermId = '';
    this.onActivate?.('');
  }

  has(termId: string): boolean {
    return this.instances.has(termId);
  }

  listSessions(): TerminalHostSessionInfo[] {
    return [...this.instances.values()].map((inst) => inst.getSessionInfo(this._activeTermId));
  }

  getLastSentCommand(termId = this._activeTermId): string {
    return this.instances.get(termId)?.getLastSentCommand() ?? '';
  }

  fit(termId: string): void {
    this.instances.get(termId)?.fit();
  }

  /** 크기 고정 설정/해제 */
  setFitLock(termId: string, locked: boolean): void {
    this.instances.get(termId)?.setFitLock(locked);
  }

  /** 현재 크기 고정 상태 반환 */
  isFitLocked(termId: string): boolean {
    return this.instances.get(termId)?.fitLocked ?? false;
  }

  /** 스크롤백 맨 위로 이동 (normal 모드) / Page Up 전송 (alternate 모드) */
  scrollToTop(termId: string): void {
    const inst = this.instances.get(termId);
    if (!inst) return;
    if (inst.isAltBuffer || this.isAppManagedNormalBufferPageControl(termId)) {
      window.terminalAPI.write(termId, resolveAppManagedNormalBufferPageSequence('previous'));
    } else {
      inst.scrollToTop();
    }
  }

  /** 최신 출력(버퍼 끝)으로 이동 (normal 모드) / Page Down 전송 (alternate 모드) */
  scrollToBottom(termId: string): void {
    const inst = this.instances.get(termId);
    if (!inst) return;
    if (inst.isAltBuffer || this.isAppManagedNormalBufferPageControl(termId)) {
      window.terminalAPI.write(termId, resolveAppManagedNormalBufferPageSequence('next'));
    } else {
      inst.scrollToBottom();
    }
  }

  /** 앱 입력이 아니라 xterm 뷰포트 자체를 최신 위치로 이동 */
  scrollViewportToBottom(termId: string): void {
    this.instances.get(termId)?.scrollToBottom();
  }

  /** 현재 표시 영역 기준으로 xterm 히스토리 뷰포트를 한 페이지 이동 */
  pageHistoryViewport(termId: string, direction: 'previous' | 'next', viewportHeight: number): void {
    this.instances.get(termId)?.pageHistoryViewport(direction, viewportHeight);
  }

  /** app-managed normal buffer 앱에 PageUp/PageDown 입력을 강제로 전달 */
  sendAppManagedPage(termId: string, direction: 'previous' | 'next'): void {
    if (!this.instances.has(termId)) return;
    window.terminalAPI.write(termId, resolveAppManagedNormalBufferPageSequence(direction));
  }

  /** app-managed normal buffer 앱에 휠 델타를 키 입력으로 변환해 전달 */
  sendAppManagedWheelDelta(termId: string, deltaY: number, deltaMode: number): void {
    if (!this.instances.has(termId)) return;
    const action = resolveAppManagedNormalBufferWheelAction({ deltaY, deltaMode });
    if (action.kind !== 'key') return;
    for (let index = 0; index < action.repeat; index += 1) {
      window.terminalAPI.write(termId, action.sequence);
    }
  }

  /** 실험용 휠 패널: 휠 델타를 현재 모드에 맞는 스크롤/키 입력으로 변환한다. */
  scrollByWheelDelta(termId: string, deltaY: number, deltaMode: number): void {
    const inst = this.instances.get(termId);
    if (!inst) return;
    if (inst.isAltBuffer) {
      const action = resolveTuiWheelAction({
        isAltBuffer: true,
        mouseTrackingMode: 'none',
        deltaY,
        deltaMode,
        shiftKey: true,
      });
      if (action.kind === 'key') {
        for (let index = 0; index < action.repeat; index += 1) {
          window.terminalAPI.write(termId, action.sequence);
        }
      }
      return;
    }
    if (this.isAppManagedNormalBufferPageControl(termId)) {
      this.sendAppManagedWheelDelta(termId, deltaY, deltaMode);
      return;
    }
    inst.scrollLines(resolveWheelProbeScrollLines({ deltaY, deltaMode }));
  }

  focus(termId: string): void {
    this.instances.get(termId)?.focus();
    // 탭 전환·신규 생성 시에도 activeTermId 갱신
    if (this.instances.has(termId)) {
      this._activeTermId = termId;
      this.onActivate?.(termId);
    }
  }

  /**
   * 창 크기 변경 등 외부 이벤트로 모든 터미널을 재fit 해야 할 때 호출.
   * 이중 RAF로 레이아웃이 완전히 정착된 후 실행.
   */
  fitAll(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for (const inst of this.instances.values()) {
          inst.fit();
        }
      });
    });
  }

  /**
   * 활성(또는 지정) 터미널에 명령 한 줄을 전송 (Enter 포함).
   * @param termId 대상 터미널 ID. 생략 시 현재 activeTermId 사용.
   */
  sendLine(termId: string, command: string, lineEnding = '\r', inputMode: TerminalCommandInputMode = 'typed'): void {
    if (!this.instances.has(termId)) return;
    this.recordSentCommand(termId, command);
    writeCommandParts(this.instances.get(termId), buildTerminalCommandInputParts(command, lineEnding, inputMode));
    requestAnimationFrame(() => this.instances.get(termId)?.focus());
  }

  sendLineMany(
    termIds: string[],
    command: string,
    lineEnding = '\r',
    inputMode: TerminalCommandInputMode = 'typed',
  ): number {
    const uniqueTermIds = [...new Set(termIds)].filter((termId) => this.instances.has(termId));
    for (const termId of uniqueTermIds) {
      this.recordSentCommand(termId, command);
      writeCommandParts(this.instances.get(termId), buildTerminalCommandInputParts(command, lineEnding, inputMode));
    }
    return uniqueTermIds.length;
  }

  setSearchToggle(termId: string, cb: (() => void) | undefined): void {
    const inst = this.instances.get(termId);
    if (inst) inst.onSearchToggle = cb;
  }

  setContextMenu(termId: string, cb: ((x: number, y: number, hasSelection: boolean) => void) | undefined): void {
    const inst = this.instances.get(termId);
    if (inst) inst.onContextMenu = cb;
  }

  /** 버퍼 모드 변경(normal ↔ alternate) 콜백 등록 */
  setBufferModeCallback(termId: string, cb: ((isAlt: boolean) => void) | undefined): void {
    const inst = this.instances.get(termId);
    if (inst) inst.onBufferModeChange = cb;
  }

  /** 현재 alternate buffer 모드(TUI 앱 실행 중) 여부 반환 */
  isAltBuffer(termId: string): boolean {
    return this.instances.get(termId)?.isAltBuffer ?? false;
  }

  /** normal buffer 위에서 화면을 직접 관리하는 CLI(Codex/Claude 등) 여부 */
  isAppManagedNormalBuffer(termId: string): boolean {
    const inst = this.instances.get(termId);
    return inst?.isAppManagedNormalBufferSession() ?? false;
  }

  /** normal buffer에서 PageUp/PageDown 입력을 직접 처리하는 CLI(Claude 등) 여부 */
  isAppManagedNormalBufferPageControl(termId: string): boolean {
    const inst = this.instances.get(termId);
    return inst?.isAppManagedNormalBufferPageControlSession() ?? false;
  }

  // ── 클립보드 / 선택 ──────────────────────────────────────────────────────

  getSelection(termId: string): string {
    return this.instances.get(termId)?.getSelection() ?? '';
  }

  getBufferText(termId: string): string {
    return this.instances.get(termId)?.getBufferText() ?? '';
  }

  copy(termId: string): void {
    this.instances.get(termId)?.copyToClipboard();
  }

  paste(termId: string): void {
    this.instances.get(termId)?.pasteFromClipboard();
  }

  selectAll(termId: string): void {
    this.instances.get(termId)?.selectAll();
  }

  clearScreen(termId: string): void {
    this.instances.get(termId)?.clearScreen();
  }

  clearScrollback(termId: string): void {
    this.instances.get(termId)?.clearScrollback();
  }

  findNext(termId: string, query: string): void {
    this.instances.get(termId)?.findNext(query);
  }

  findPrev(termId: string, query: string): void {
    this.instances.get(termId)?.findPrev(query);
  }

  /** 테마·폰트 크기 변경 시 모든 인스턴스에 일괄 적용 */
  updateAllSettings(theme: ThemeName, fontSize: number): void {
    for (const inst of this.instances.values()) {
      inst.updateTheme(theme);
      inst.updateFontSize(fontSize);
    }
  }
}

/** 앱 전역 싱글턴 */
export const terminalHost = new TerminalHostManager();

function createTerminalKeyboardEvent(type: 'keydown' | 'keyup', init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent(type, init);
  defineKeyboardNumber(event, 'keyCode', 13);
  defineKeyboardNumber(event, 'which', 13);
  defineKeyboardNumber(event, 'charCode', 0);
  return event;
}

function defineKeyboardNumber(event: KeyboardEvent, property: 'keyCode' | 'which' | 'charCode', value: number): void {
  try {
    Object.defineProperty(event, property, { get: () => value });
  } catch {
    // Some runtimes may keep deprecated keyboard fields non-configurable.
  }
}

function writeCommandParts(
  inst: TerminalInstance | undefined,
  parts: ReturnType<typeof buildTerminalCommandInputParts>,
): void {
  if (!inst) return;
  dispatchTerminalCommandInputParts(parts, {
    input: (data) => inst.input(data),
    paste: (data) => inst.paste(data),
    direct: (data) => inst.direct(data),
    textInput: (data) => inst.textInput(data),
    enterKey: () => inst.enterKey(),
    setTimeout: (callback, delay) => {
      window.setTimeout(callback, delay);
    },
  });
}
