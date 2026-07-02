import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RemoteFileProfile } from '../../shared/types';
import { createCodeMirrorAdapter } from '../editing/codeMirrorAdapter';
import { useEditableSurface } from '../editing/useEditableSurface';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useI18n } from '../i18n';
import { readEditableText, saveEditableText } from '../utils/editableFileIo';

interface CodePaneProps {
  filePath: string;
  fileName: string;
  ext: string;
  initialContent: string;
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  onContentUpdate?: (content: string) => void;
}

const LANG_EXTS: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  py: 'Python',
  html: 'HTML',
  htm: 'HTML',
  css: 'CSS',
  scss: 'CSS',
  json: 'JSON',
  xcon: 'XML',
  xml: 'XML',
  svg: 'XML',
  md: 'Markdown',
  markdown: 'Markdown',
  sh: 'Shell',
  bat: 'Batch',
  txt: 'Text',
  log: 'Log',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  cs: 'C#',
  rb: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
};

function getLanguageExtension(ext: string) {
  const e = ext.toLowerCase();
  if (['js', 'jsx', 'mjs', 'cjs'].includes(e)) return javascript({ jsx: true });
  if (['ts', 'tsx'].includes(e)) return javascript({ typescript: true, jsx: true });
  if (e === 'py') return python();
  if (['html', 'htm'].includes(e)) return html();
  if (['css', 'scss'].includes(e)) return css();
  if (e === 'json') return json();
  if (['xml', 'xcon', 'svg'].includes(e)) return xml();
  if (['md', 'markdown'].includes(e)) return markdown();
  return null;
}

export function CodePane({
  filePath,
  fileName,
  ext,
  initialContent,
  remoteFileProfile,
  remoteFilePath,
  onContentUpdate,
}: CodePaneProps) {
  const { t } = useI18n();
  const [content, setContent] = useState(initialContent);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [lineCount, setLineCount] = useState(initialContent.split('\n').length);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const langLabel = LANG_EXTS[ext.toLowerCase()] ?? (ext.toUpperCase() || 'Text');
  const langExt = getLanguageExtension(ext);

  // Sync to DockContent (debounced)
  useEffect(() => {
    const timer = setTimeout(() => onContentUpdate?.(content), 500);
    return () => clearTimeout(timer);
  }, [content, onContentUpdate]);

  const handleChange = useCallback((val: string) => {
    setContent(val);
    setIsModified(true);
    setLineCount(val.split('\n').length);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isModified || isSaving) return;
    try {
      setIsSaving(true);
      const result = await saveEditableText({ filePath, remoteFileProfile, remoteFilePath }, content);
      setSaveMsg(result.saved ? t('common.saved') : t('common.saveFailed'));
      if (result.saved) setIsModified(false);
    } catch {
      setSaveMsg(t('common.saveError'));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  }, [content, filePath, isModified, isSaving, remoteFilePath, remoteFileProfile, t]);

  const handleRefresh = useCallback(async () => {
    const result = await readEditableText({ filePath, remoteFileProfile, remoteFilePath });
    if (result?.content !== undefined) {
      setContent(result.content);
      setIsModified(false);
      setLineCount(result.content.split('\n').length);
    }
  }, [filePath, remoteFilePath, remoteFileProfile]);

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setSaveMsg(t('common.copied'));
      setTimeout(() => setSaveMsg(null), 1500);
    } catch {
      setSaveMsg(t('common.copyFailed'));
      setTimeout(() => setSaveMsg(null), 1500);
    }
  }, [content, t]);

  const codeEditAdapter = useMemo(
    () =>
      createCodeMirrorAdapter({
        id: `code:${filePath || fileName}`,
        label: fileName,
        getView: () => editorRef.current?.view,
        readOnly: () => isReadOnly,
        canSave: () => isModified && !isSaving,
        onSave: handleSave,
      }),
    [fileName, filePath, handleSave, isModified, isReadOnly, isSaving],
  );
  const codeEditSurface = useEditableSurface({ adapter: codeEditAdapter, includeSave: true });

  const extensions = [
    ...(langExt ? [langExt] : []),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        const sel = update.state.selection.main;
        const line = update.state.doc.lineAt(sel.head);
        setCursorPos({ line: line.number, col: sel.head - line.from + 1 });
      }
    }),
    // 폰트만 설정 — 높이는 CSS(position:absolute+inset:0)로 처리
    EditorView.theme({
      '.cm-scroller': { fontFamily: 'var(--font-mono, "Cascadia Code", Consolas, monospace)' },
      '.cm-content': { caretColor: '#abb2bf' },
    }),
  ];

  return (
    <div className="code-pane">
      <div className="code-toolbar">
        <span className="code-filename" title={filePath}>
          {fileName}
          {isModified ? ' •' : ''}
        </span>
        <span className="code-lang-badge">{langLabel}</span>
        <div className="code-toolbar-flex" />
        <button
          className={`code-readonly-btn${isReadOnly ? ' active' : ''}`}
          onClick={() => setIsReadOnly((r) => !r)}
          title={isReadOnly ? t('code.editMode') : t('code.readonlyMode')}
        >
          {isReadOnly ? '🔒' : '✏️'}
        </button>
        <button
          className={`pane-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
          onClick={refresh}
          disabled={isRefreshing}
          title={t('common.reloadFromDisk')}
        >
          ↺
        </button>
        <button className="code-copy-btn" onClick={handleCopyAll} title={t('common.copyAll')}>
          ⧉
        </button>
        <button
          className={`code-save-btn${isModified ? ' modified' : ''}`}
          onClick={handleSave}
          disabled={isSaving || !isModified || isReadOnly}
          title={t('common.saveCtrlS')}
        >
          {isSaving ? t('common.saving') : (saveMsg ?? t('common.save'))}
        </button>
      </div>

      {/* height 지정 없이 렌더 — CSS position:absolute+inset:0 이 크기를 담당 */}
      <div
        className="code-editor-wrap"
        onFocusCapture={codeEditSurface.onFocusCapture}
        onPointerDownCapture={codeEditSurface.onPointerDownCapture}
        onContextMenu={codeEditSurface.onContextMenu}
        onKeyDown={codeEditSurface.onKeyDown}
      >
        <CodeMirror
          ref={editorRef}
          value={content}
          theme={oneDark}
          extensions={extensions}
          readOnly={isReadOnly}
          onChange={handleChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            drawSelection: true,
            dropCursor: false, // 드롭 커서 오버레이 비활성화
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false, // 자동완성 팝업 오버레이 비활성화
            rectangularSelection: true,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
          }}
        />
      </div>
      {codeEditSurface.menuElement}

      <div className="code-statusbar">
        <span>{t('code.lineCol', { line: String(cursorPos.line), col: String(cursorPos.col) })}</span>
        <span>{t('code.totalLines', { n: String(lineCount) })}</span>
        <span>{t('code.chars', { n: content.length.toLocaleString() })}</span>
      </div>
    </div>
  );
}
